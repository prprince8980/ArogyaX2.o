import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Account from './models/Account.js';
import Patient from './models/Patient.js';
import Clinic from './models/Clinic.js';
import Hospital from './models/Hospital.js';
import Laboratory from './models/Laboratory.js';
import Doctor from './models/Doctor.js';
import ClinicReport from './models/ClinicReport.js';
import * as clinicController from './controllers/clinicLocationController.js';
import { openApiSpec, swaggerHtml } from './swagger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const ADMIN_EMAIL = 'princep4732355@gmail.com';
const fallbackAccounts = new Map();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(async (error) => {
    console.error('MongoDB connection failed, trying local MongoDB:', error.message);
    try {
      await mongoose.connect("mongodb://localhost:27017/arogax2");
      console.log('Connected to Local MongoDB');
    } catch (localError) {
      console.error('Local MongoDB connection failed:', localError.message);
    }
  });

const db = mongoose.connection;
db.on('error', (error) => console.error('MongoDB connection error:', error));
db.once('open', () => console.log('Connected to MongoDB'));

app.get('/api/auth/health', (req, res) => {
  const databaseStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({ status: 'Auth backend is running', database: databaseStates[db.readyState] || 'unknown' });
});

const getAccountByEmail = async (email) => {
  if (db.readyState === 1) {
    return Account.findOne({ email });
  }
  return fallbackAccounts.get(email) || null;
};

const saveAccount = async (account) => {
  if (db.readyState === 1) {
    return account.save();
  }
  const accData = account.toObject ? account.toObject() : account;
  fallbackAccounts.set(accData.email, accData);
  return accData;
};

app.get('/api/auth/check', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  let account = await getAccountByEmail(email);
  if (!account) {
    return res.json({ exists: false });
  }

  // Inject admin member if missing for the special admin email
  if (email === 'princep4732355@gmail.com' || email === 'princep4732355@gamil.com') {
    const hasAdmin = account.members.some(m => m.role === 'admin');
    if (!hasAdmin) {
      account.members.push({
        role: 'admin',
        profileId: new mongoose.Types.ObjectId(),
        name: 'Admin'
      });
      await saveAccount(account);
    }
  }

  res.json({ exists: true, account });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, googleId, role } = req.body;
  if (!name || !email || !googleId) {
    return res.status(400).json({ message: 'Missing registration fields' });
  }

  let account = await getAccountByEmail(email);
  if (!account) {
    account = new Account({
      email,
      googleId,
      accountName: name,
      members: []
    });
    
    // Auto admin
    if (email === 'princep4732355@gmail.com' || email === 'princep4732355@gamil.com') {
      account.members.push({
        role: 'admin',
        profileId: new mongoose.Types.ObjectId(), // dummy id for admin
        name: 'Admin'
      });
    }
    
    await saveAccount(account);
  }

  res.json({ account });
});

// Generic endpoint to get full profile of a specific member
app.get('/api/auth/member/:memberId', async (req, res) => {
  const { memberId } = req.params;
  const { role } = req.query;
  
  if (db.readyState !== 1) return res.json({ profile: {} });

  let profile = null;
  if (role === 'patient') profile = await Patient.findById(memberId);
  else if (role === 'clinic') profile = await Clinic.findById(memberId);
  else if (role === 'hospital') profile = await Hospital.findById(memberId);
  else if (role === 'laboratory') profile = await Laboratory.findById(memberId);
  else if (role === 'doctor') profile = await Doctor.findById(memberId);

  res.json({ profile });
});

app.post('/api/auth/patient-profile', async (req, res) => {
  const { email, profile, memberName } = req.body;
  const account = await getAccountByEmail(email);
  if (!account) return res.status(404).json({ message: 'Account not found' });

  let patient;
  if (db.readyState === 1) {
    patient = new Patient({
      accountId: account._id,
      ...profile,
      onboardingComplete: true
    });
    await patient.save();
  } else {
    patient = { _id: new mongoose.Types.ObjectId(), ...profile };
  }

  account.members.push({
    role: 'patient',
    profileId: patient._id,
    name: memberName || profile.fullName || account.accountName
  });
  await saveAccount(account);

  res.json({ account, profile: patient });
});

app.post('/api/auth/clinic-profile', async (req, res) => {
  const { email, clinicProfile } = req.body;
  const account = await getAccountByEmail(email);
  if (!account) return res.status(404).json({ message: 'Account not found' });

  let clinic;
  if (db.readyState === 1) {
    clinic = new Clinic({
      accountId: account._id,
      ...clinicProfile,
      onboardingComplete: true,
      verificationStatus: 'pending'
    });
    await clinic.save();
  } else {
    clinic = { _id: new mongoose.Types.ObjectId(), ...clinicProfile };
  }

  account.members.push({
    role: 'clinic',
    profileId: clinic._id,
    name: clinicProfile.clinicName || 'Clinic'
  });
  await saveAccount(account);

  res.json({ account, profile: clinic });
});

app.post('/api/auth/lab-profile', async (req, res) => {
  const { email, labProfile } = req.body;
  const account = await getAccountByEmail(email);
  if (!account) return res.status(404).json({ message: 'Account not found' });

  let lab;
  if (db.readyState === 1) {
    lab = new Laboratory({
      accountId: account._id,
      ...labProfile,
      onboardingComplete: true,
      verificationStatus: 'pending'
    });
    await lab.save();
  } else {
    lab = { _id: new mongoose.Types.ObjectId(), ...labProfile };
  }

  account.members.push({
    role: 'laboratory',
    profileId: lab._id,
    name: labProfile.labName || 'Laboratory'
  });
  await saveAccount(account);

  res.json({ account, profile: lab });
});

app.post('/api/auth/hospital-profile', async (req, res) => {
  const { email, hospitalProfile } = req.body;
  const account = await getAccountByEmail(email);
  if (!account) return res.status(404).json({ message: 'Account not found' });

  let hospital;
  if (db.readyState === 1) {
    hospital = new Hospital({
      accountId: account._id,
      ...hospitalProfile,
      onboardingComplete: true,
      verificationStatus: 'pending'
    });
    await hospital.save();
  } else {
    hospital = { _id: new mongoose.Types.ObjectId(), ...hospitalProfile };
  }

  account.members.push({
    role: 'hospital',
    profileId: hospital._id,
    name: hospitalProfile.hospitalName || 'Hospital'
  });
  await saveAccount(account);

  res.json({ account, profile: hospital });
});

app.get('/api/auth/pending-verifications', async (req, res) => {
  if (db.readyState !== 1) return res.json({ pending: [] });

  const clinics = await Clinic.find({ verificationStatus: 'pending' }).lean().then(docs => docs.map(d => ({...d, role: 'clinic'})));
  const labs = await Laboratory.find({ verificationStatus: 'pending' }).lean().then(docs => docs.map(d => ({...d, role: 'laboratory'})));
  const hospitals = await Hospital.find({ verificationStatus: 'pending' }).lean().then(docs => docs.map(d => ({...d, role: 'hospital'})));
  const doctors = await Doctor.find({ verificationStatus: 'pending' }).lean().then(docs => docs.map(d => ({...d, role: 'doctor'})));

  const pending = [...clinics, ...labs, ...hospitals, ...doctors].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Attach email from Account
  for (const profile of pending) {
    if (profile.accountId) {
      const acc = await Account.findById(profile.accountId).lean();
      if (acc) {
        profile.email = acc.email;
      }
    }
  }
  
  res.json({ pending });
});

app.post('/api/auth/verify-user', async (req, res) => {
  const { role, profileId, status } = req.body;
  if (!profileId || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Valid profileId and status are required' });
  }

  if (db.readyState === 1) {
    let model;
    if (role === 'clinic') model = Clinic;
    else if (role === 'laboratory') model = Laboratory;
    else if (role === 'hospital') model = Hospital;
    else if (role === 'doctor') model = Doctor;
    else if (role === 'patient') model = Patient;

    if (model) {
      const doc = await model.findById(profileId);
      if (doc) {
        doc.isVerified = status === 'approved';
        doc.verificationStatus = status;
        await doc.save();
        return res.json({ success: true, profile: doc });
      }
    }
  }
  res.status(404).json({ message: 'Profile not found' });
});

// Get patient by ID (for QR code scanner)
app.get('/api/auth/patient-by-id', async (req, res) => {
  const { patientId } = req.query;

  if (!patientId) {
    return res.status(400).json({ message: 'Patient ID is required' });
  }

  try {
    // Find patient by ID
    let patient;
    if (db.readyState === 1) {
      patient = await Patient.findById(patientId).lean();
    } else {
      // Try to find patient in fallback map (not implemented here, just return null)
      patient = null;
    }

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Find the associated account
    let account = null;
    if (db.readyState === 1 && patient.accountId) {
      account = await Account.findById(patient.accountId).lean();
    }

    res.json({
      success: true,
      patient: {
        id: patient._id,
        fullName: patient.fullName,
        picture: patient.picture,
        dob: patient.dob,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        address: patient.address,
        emergencyContactName: patient.emergencyContactName,
        emergencyRelationship: patient.emergencyRelationship,
        emergencyPhone: patient.emergencyPhone,
        allergies: patient.allergies,
        chronicConditions: patient.chronicConditions,
        currentMedications: patient.currentMedications,
        insuranceProvider: patient.insuranceProvider,
        policyNumber: patient.policyNumber,
        preferredLanguage: patient.preferredLanguage,
        isVerified: patient.isVerified,
        verificationStatus: patient.verificationStatus,
        createdAt: patient.createdAt
      },
      account: account ? {
        email: account.email,
        googleId: account.googleId,
        accountName: account.accountName,
        members: account.members
      } : null
    });
  } catch (error) {
    console.error('Error fetching patient by ID:', error);
    res.status(500).json({ message: 'Error fetching patient', error: error.message });
  }
});

// Get all patients (for QR scanner simulator select dropdown)
app.get('/api/auth/patients', async (req, res) => {
  try {
    if (db.readyState === 1) {
      const patients = await Patient.find({}).lean();
      res.json({ success: true, patients });
    } else {
      res.json({ success: true, patients: [] });
    }
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ message: 'Error fetching patients', error: error.message });
  }
});

// Get patients associated with an account email (for doctor search by email)
app.get('/api/auth/patients-by-email', async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  try {
    const account = await getAccountByEmail(email);
    if (!account) {
      return res.json({ success: true, exists: false, patients: [] });
    }

    // Filter patient members
    const patientMembers = account.members.filter(m => m.role === 'patient');
    
    // Fetch full profiles for each member
    const patients = [];
    if (db.readyState === 1) {
      for (const member of patientMembers) {
        const profile = await Patient.findById(member.profileId).lean();
        if (profile) {
          patients.push({
            memberId: member.profileId,
            name: member.name,
            profile: profile
          });
        }
      }
    }
    res.json({ success: true, exists: true, patients, accountId: account._id });
  } catch (error) {
    console.error('Error fetching patients by email:', error);
    res.status(500).json({ message: 'Error fetching patients by email', error: error.message });
  }
});

// GET /api/auth/clinic-reports-by-clinic?clinicId=<id>  —  Fetch all reports written by a clinic
app.get('/api/auth/clinic-reports-by-clinic', async (req, res) => {
  const { clinicId } = req.query;
  if (!clinicId) {
    return res.status(400).json({ message: 'clinicId is required' });
  }
  try {
    const reports = await ClinicReport.find({ clinicId }).sort({ createdAt: -1 });
    res.json({ success: true, reports });
  } catch (error) {
    console.error('Error fetching reports by clinic:', error);
    res.status(500).json({ message: 'Error fetching reports', error: error.message });
  }
});

// ── Clinic Reports ────────────────────────────────────────────────────────────

// POST /api/auth/clinic-report  —  Save a clinic report for a patient
app.post('/api/auth/clinic-report', async (req, res) => {
  const { patientId, patientName, clinicId, clinicName, doctorName, title, type, notes } = req.body;
  if (!patientId || !patientName || !clinicId || !clinicName || !doctorName || !title) {
    return res.status(400).json({ message: 'patientId, patientName, clinicId, clinicName, doctorName, and title are required' });
  }
  try {
    const report = new ClinicReport({
      patientId,
      patientName,
      clinicId,
      clinicName,
      doctorName,
      title,
      type: type || 'Diagnosis',
      notes: notes || '',
      date: new Date().toISOString().split('T')[0],
    });
    await report.save();
    res.json({ success: true, report });
  } catch (error) {
    console.error('Error saving clinic report:', error);
    res.status(500).json({ message: 'Error saving report', error: error.message });
  }
});

// GET /api/auth/clinic-reports?patientId=<id>  —  Fetch all reports for a patient
app.get('/api/auth/clinic-reports', async (req, res) => {
  const { patientId } = req.query;
  if (!patientId) {
    return res.status(400).json({ message: 'patientId is required' });
  }
  try {
    const reports = await ClinicReport.find({ patientId }).sort({ createdAt: -1 });
    res.json({ success: true, reports });
  } catch (error) {
    console.error('Error fetching clinic reports:', error);
    res.status(500).json({ message: 'Error fetching reports', error: error.message });
  }
});

// Clinic API routes
app.get('/api/clinic/all', (req, res) => clinicController.getAllClinics(req, res, db));
app.get('/api/clinic/nearby', (req, res) => clinicController.getNearbyClinics(req, res, db));
app.post('/api/clinic/coordinates', (req, res) => clinicController.saveClinicLocation(req, res, db));

// GET /api/auth/hospitals/all - Fetch all hospitals
app.get('/api/auth/hospitals/all', async (req, res) => {
  try {
    if (db.readyState === 1) {
      const hospitals = await Hospital.find({}).lean();
      res.json({ success: true, hospitals });
    } else {
      res.json({ success: true, hospitals: [] });
    }
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    res.status(500).json({ success: false, message: 'Error fetching hospitals', error: error.message });
  }
});

// PUT /api/auth/clinic/location - Save clinic location
app.put('/api/auth/clinic/location', async (req, res) => {
  const { clinicId, latitude, longitude, clinicAddress } = req.body;
  if (!clinicId || latitude === undefined || longitude === undefined || !clinicAddress) {
    return res.status(400).json({ success: false, message: 'clinicId, latitude, longitude, and clinicAddress are required' });
  }
  
  try {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    const clinic = await Clinic.findByIdAndUpdate(
      clinicId,
      {
        latitude: lat,
        longitude: lng,
        clinicAddress,
        location: {
          type: 'Point',
          coordinates: [lng, lat] // MongoDB expects [longitude, latitude]
        }
      },
      { new: true }
    );
    
    if (!clinic) return res.status(404).json({ success: false, message: 'Clinic not found' });
    
    res.json({ success: true, clinic });
  } catch (error) {
    console.error('Error updating clinic location:', error);
    res.status(500).json({ success: false, message: 'Error updating location', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Auth backend running on port ${PORT}`);
});
