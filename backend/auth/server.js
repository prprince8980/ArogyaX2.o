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
import LabReport from './models/LabReport.js';
import * as clinicController from './controllers/clinicLocationController.js';
import { openApiSpec, swaggerHtml } from './swagger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const ADMIN_EMAIL = 'princep4732355@gmail.com';
const fallbackAccounts = new Map();

// Deployment-ready CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'https://arogyax2-o.onrender.com'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, self-ping) or matched origins
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production' || origin.endsWith('.onrender.com')) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive CORS for deployed API compatibility
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' })); // Increased limit for base64 file uploads
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Health and Self-Ping keep-alive endpoints
app.get('/ping', (req, res) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/auth/health', (req, res) => {
  const databaseStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({ status: 'Auth backend is running', database: databaseStates[db.readyState] || 'unknown', timestamp: new Date().toISOString() });
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

app.put('/api/auth/lab-profile/:profileId', async (req, res) => {
  const { profileId } = req.params;

  if (db.readyState !== 1) {
    return res.status(503).json({ success: false, message: 'Database not connected' });
  }

  try {
    const lab = await Laboratory.findById(profileId);
    if (!lab) {
      return res.status(404).json({ success: false, message: 'Laboratory profile not found' });
    }

    const allowedFields = ['labName', 'businessEmail', 'registrationNumber', 'labType'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        lab[field] = req.body[field];
      }
    }

    await lab.save();

    if (lab.accountId && req.body.labName) {
      const account = await Account.findById(lab.accountId);
      if (account) {
        const member = account.members.find((item) => String(item.profileId) === String(profileId) && item.role === 'laboratory');
        if (member) {
          member.name = req.body.labName;
          await account.save();
        }
      }
    }

    res.json({ success: true, profile: lab });
  } catch (error) {
    console.error('Error updating lab profile:', error);
    res.status(500).json({ success: false, message: 'Error updating lab profile', error: error.message });
  }
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

// ── Hospital Employee Schema & Endpoints ─────────────────────────────────────────
const hospitalEmployeeSchema = new mongoose.Schema({
  hospitalId: String,
  hospitalName: String,
  email: { type: String, required: true },
  name: { type: String, required: true },
  phone: String,
  gender: String,
  dob: String,
  address: String,
  joiningDate: String,
  department: String,
  photo: String,
  emergencyContact: String,
  role: { type: String, default: 'doctor' }, // doctor, nurse, staff

  // Doctor specific fields
  specialization: String,
  medicalLicenseNo: String,
  qualification: String,
  experienceYears: String,
  consultationTimings: String,
  consultationFees: String,

  // Nurse specific fields
  nursingRegNo: String,
  assignedWard: String,
  shiftTimings: String,
  nurseExperience: String,

  // Staff specific fields
  designation: String,
  responsibilities: String,
  employeeId: String,

  // Status & Timestamps
  status: { type: String, default: 'Active' }, // Active / Inactive
  createdAt: { type: Date, default: Date.now },
});

const HospitalEmployee = mongoose.models.HospitalEmployee || mongoose.model('HospitalEmployee', hospitalEmployeeSchema);
const fallbackEmployees = [
  {
    _id: 'emp-101',
    hospitalId: 'HOSP-2026-904',
    hospitalName: 'AaroGyaX Central Hospital',
    email: 'marcus.hale@arogyax.com',
    name: 'Dr. Marcus Hale',
    phone: '+1 555 0172',
    gender: 'Male',
    dob: '1982-04-14',
    address: '42 Medical Arts Plaza, Metro City',
    joiningDate: '2021-03-15',
    role: 'doctor',
    department: 'Cardiology',
    photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200',
    emergencyContact: '+1 555 9110',
    specialization: 'Cardiologist',
    medicalLicenseNo: 'MED-LIC-98401',
    qualification: 'MD, FACC',
    experienceYears: '12 Years',
    consultationTimings: '09:00 AM - 02:00 PM',
    consultationFees: '$120',
    status: 'Active'
  },
  {
    _id: 'emp-102',
    hospitalId: 'HOSP-2026-904',
    hospitalName: 'AaroGyaX Central Hospital',
    email: 'ortiz@arogyax.com',
    name: 'Dr. Lena Ortiz',
    phone: '+1 555 0148',
    gender: 'Female',
    dob: '1988-09-22',
    address: '108 Healthcare Ave, Metro City',
    joiningDate: '2022-01-10',
    role: 'doctor',
    department: 'General Medicine',
    photo: 'https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=200',
    emergencyContact: '+1 555 9112',
    specialization: 'Internal Medicine',
    medicalLicenseNo: 'MED-LIC-44102',
    qualification: 'MBBS, MD',
    experienceYears: '8 Years',
    consultationTimings: '08:00 AM - 04:00 PM',
    consultationFees: '$90',
    status: 'Active'
  },
  {
    _id: 'emp-103',
    hospitalId: 'HOSP-2026-904',
    hospitalName: 'AaroGyaX Central Hospital',
    email: 'sarah.j@arogyax.com',
    name: 'Sarah Jenkins',
    phone: '+1 555 0199',
    gender: 'Female',
    dob: '1992-06-18',
    address: '15 Hope Lane, Metro City',
    joiningDate: '2023-06-01',
    role: 'nurse',
    department: 'ICU & Emergency',
    photo: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=200',
    emergencyContact: '+1 555 9115',
    nursingRegNo: 'NUR-REG-7701',
    assignedWard: 'ICU Ward 2',
    shiftTimings: '07:00 PM - 07:00 AM (Night Shift)',
    nurseExperience: '6 Years',
    status: 'Active'
  },
  {
    _id: 'emp-104',
    hospitalId: 'HOSP-2026-904',
    hospitalName: 'AaroGyaX Central Hospital',
    email: 'prakash.k@arogyax.com',
    name: 'Prakash Kumar',
    phone: '+1 555 0133',
    gender: 'Male',
    dob: '1990-11-05',
    address: '77 Civic Center Dr, Metro City',
    joiningDate: '2024-02-01',
    role: 'staff',
    department: 'Reception & Billing',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    emergencyContact: '+1 555 9118',
    designation: 'Receptionist',
    responsibilities: 'Patient check-in, appointments scheduling, initial query resolution',
    employeeId: 'STF-2026-809',
    status: 'Active'
  }
];

// Add / Create Hospital Employee
app.post('/api/auth/hospital-employee', async (req, res) => {
  const { hospitalId, hospitalName, employee } = req.body;
  if (!employee || !employee.email || !employee.name) {
    return res.status(400).json({ success: false, message: 'Employee name and email are required' });
  }

  const cleanEmail = employee.email.toLowerCase().trim();
  const empData = {
    hospitalId: hospitalId || 'HOSP-2026-904',
    hospitalName: hospitalName || 'AaroGyaX Central Hospital',
    email: cleanEmail,
    name: employee.name,
    phone: employee.phone || '',
    gender: employee.gender || 'Male',
    dob: employee.dob || '',
    address: employee.address || '',
    joiningDate: employee.joiningDate || new Date().toISOString().split('T')[0],
    department: employee.department || 'General',
    photo: employee.photo || '',
    emergencyContact: employee.emergencyContact || '',
    role: employee.role || 'doctor',

    specialization: employee.specialization || '',
    medicalLicenseNo: employee.medicalLicenseNo || '',
    qualification: employee.qualification || '',
    experienceYears: employee.experienceYears || '',
    consultationTimings: employee.consultationTimings || '',
    consultationFees: employee.consultationFees || '',

    nursingRegNo: employee.nursingRegNo || '',
    assignedWard: employee.assignedWard || '',
    shiftTimings: employee.shiftTimings || '',
    nurseExperience: employee.nurseExperience || '',

    designation: employee.designation || 'Staff Member',
    responsibilities: employee.responsibilities || '',
    employeeId: employee.employeeId || `EMP-${Date.now().toString().slice(-4)}`,

    status: employee.status || 'Active'
  };

  try {
    if (db.readyState === 1) {
      let existing = await HospitalEmployee.findOne({ 
        hospitalId: empData.hospitalId, 
        email: cleanEmail 
      });

      if (existing) {
        Object.assign(existing, empData);
        await existing.save();
        return res.json({ success: true, employee: existing, message: 'Employee profile updated' });
      } else {
        const newEmp = new HospitalEmployee(empData);
        await newEmp.save();
        return res.json({ success: true, employee: newEmp, message: 'Employee registered successfully' });
      }
    } else {
      const existingIndex = fallbackEmployees.findIndex(
        e => e.email === cleanEmail && e.hospitalId === empData.hospitalId
      );
      if (existingIndex >= 0) {
        fallbackEmployees[existingIndex] = { ...fallbackEmployees[existingIndex], ...empData };
        return res.json({ success: true, employee: fallbackEmployees[existingIndex], message: 'Employee profile updated' });
      } else {
        const newEmp = { _id: `emp-${Date.now()}`, ...empData };
        fallbackEmployees.unshift(newEmp);
        return res.json({ success: true, employee: newEmp, message: 'Employee registered successfully' });
      }
    }
  } catch (err) {
    console.error('Error adding hospital employee:', err);
    res.status(500).json({ success: false, message: 'Failed to save employee', error: err.message });
  }
});

// Update Hospital Employee by ID
app.put('/api/auth/hospital-employee/:id', async (req, res) => {
  const { id } = req.params;
  const updatedFields = req.body;

  try {
    if (db.readyState === 1) {
      const emp = await HospitalEmployee.findByIdAndUpdate(id, updatedFields, { new: true });
      if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });
      return res.json({ success: true, employee: emp, message: 'Employee updated successfully' });
    } else {
      const index = fallbackEmployees.findIndex(e => e._id === id || e.id === id);
      if (index >= 0) {
        fallbackEmployees[index] = { ...fallbackEmployees[index], ...updatedFields };
        return res.json({ success: true, employee: fallbackEmployees[index], message: 'Employee updated successfully' });
      }
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
  } catch (err) {
    console.error('Error updating hospital employee:', err);
    res.status(500).json({ success: false, message: 'Failed to update employee', error: err.message });
  }
});

// Toggle Employee Status (Active <-> Inactive)
app.patch('/api/auth/hospital-employee/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    if (db.readyState === 1) {
      const emp = await HospitalEmployee.findById(id);
      if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });
      emp.status = status || (emp.status === 'Active' ? 'Inactive' : 'Active');
      await emp.save();
      return res.json({ success: true, employee: emp, message: `Status changed to ${emp.status}` });
    } else {
      const emp = fallbackEmployees.find(e => e._id === id || e.id === id);
      if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });
      emp.status = status || (emp.status === 'Active' ? 'Inactive' : 'Active');
      return res.json({ success: true, employee: emp, message: `Status changed to ${emp.status}` });
    }
  } catch (err) {
    console.error('Error toggling employee status:', err);
    res.status(500).json({ success: false, message: 'Failed to update status', error: err.message });
  }
});

// Delete Hospital Employee by ID
app.delete('/api/auth/hospital-employee/:id', async (req, res) => {
  const { id } = req.params;

  try {
    if (db.readyState === 1) {
      const deleted = await HospitalEmployee.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ success: false, message: 'Employee not found' });
      return res.json({ success: true, message: 'Employee deleted successfully' });
    } else {
      const index = fallbackEmployees.findIndex(e => e._id === id || e.id === id);
      if (index >= 0) {
        fallbackEmployees.splice(index, 1);
        return res.json({ success: true, message: 'Employee deleted successfully' });
      }
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
  } catch (err) {
    console.error('Error deleting hospital employee:', err);
    res.status(500).json({ success: false, message: 'Failed to delete employee', error: err.message });
  }
});

// Fetch Hospital Employees for a Hospital
app.get('/api/auth/hospital-employees', async (req, res) => {
  const { hospitalId, hospitalName } = req.query;
  try {
    if (db.readyState === 1) {
      const query = {};
      if (hospitalId) query.hospitalId = hospitalId;
      else if (hospitalName) query.hospitalName = hospitalName;
      const employees = await HospitalEmployee.find(query).sort({ createdAt: -1 });
      res.json({ success: true, employees });
    } else {
      const filtered = fallbackEmployees.filter(
        e => (!hospitalId || e.hospitalId === hospitalId) && (!hospitalName || e.hospitalName === hospitalName)
      );
      res.json({ success: true, employees: filtered });
    }
  } catch (err) {
    console.error('Error fetching hospital employees:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch employees', error: err.message });
  }
});

// Fetch Associated Hospitals for a Doctor/User by Email
app.get('/api/auth/doctor-hospitals', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  const cleanEmail = email.toLowerCase().trim();

  try {
    let empRecords = [];
    if (db.readyState === 1) {
      empRecords = await HospitalEmployee.find({ email: cleanEmail }).lean();
    } else {
      empRecords = fallbackEmployees.filter(e => e.email === cleanEmail);
    }

    // Default fallback hospital if none explicitly added yet for demonstration
    if (empRecords.length === 0) {
      empRecords = [{
        hospitalId: 'HOSP-2026-904',
        hospitalName: 'AaroGyaX Central Hospital',
        department: 'Cardiology',
        specialization: 'Senior Specialist',
        designation: 'Attending Physician',
        email: cleanEmail,
        role: 'doctor'
      }];
    }

    res.json({ success: true, hospitals: empRecords });
  } catch (err) {
    console.error('Error fetching doctor hospitals:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch associated hospitals', error: err.message });
  }
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

// ── Lab Reports ──────────────────────────────────────────────────────────────

// POST /api/auth/lab-report  —  Lab uploads a report (PDF/Image as base64) for a patient
app.post('/api/auth/lab-report', async (req, res) => {
  let { patientId, patientName, labId, labName, reportTitle, testType, fileName, fileType, fileData, fileMimeType } = req.body;

  patientName = patientName || 'Patient';
  labId = labId || 'LAB-DEFAULT';
  labName = labName || 'Laboratory';
  reportTitle = reportTitle || fileName || 'Lab Report';
  fileType = fileType || 'image';
  fileMimeType = fileMimeType || (fileType === 'pdf' ? 'application/pdf' : 'image/jpeg');

  if (!patientId || !fileData || !fileName) {
    return res.status(400).json({ message: 'Missing required report file data or patient reference.' });
  }

  try {
    const report = new LabReport({
      patientId,
      patientName,
      labId,
      labName,
      reportTitle,
      testType: testType || 'General',
      fileName,
      fileType,
      fileData,
      fileMimeType,
      status: 'Pending Review',
    });
    await report.save();
    res.json({ success: true, report: { ...report.toObject(), fileData: undefined } });
  } catch (error) {
    console.error('Error saving lab report:', error);
    res.status(500).json({ message: 'Error saving lab report', error: error.message });
  }
});

// GET /api/auth/lab-reports?patientId=<id>  —  Patient fetches all their lab reports
app.get('/api/auth/lab-reports', async (req, res) => {
  const { patientId } = req.query;
  if (!patientId) {
    return res.status(400).json({ message: 'patientId is required' });
  }
  try {
    if (db.readyState !== 1) return res.json({ success: true, reports: [] });
    const reports = await LabReport.find({ patientId }).sort({ uploadedAt: -1 });
    res.json({ success: true, reports });
  } catch (error) {
    console.error('Error fetching lab reports:', error);
    res.status(500).json({ message: 'Error fetching lab reports', error: error.message });
  }
});

// GET /api/auth/lab-report-file/:reportId  —  Fetch single report file data for viewing/download
app.get('/api/auth/lab-report-file/:reportId', async (req, res) => {
  const { reportId } = req.params;
  try {
    if (db.readyState !== 1) return res.status(503).json({ message: 'Database not connected' });
    const report = await LabReport.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json({ success: true, fileData: report.fileData, fileMimeType: report.fileMimeType, fileName: report.fileName });
  } catch (error) {
    console.error('Error fetching report file:', error);
    res.status(500).json({ message: 'Error fetching report file', error: error.message });
  }
});

// GET /api/auth/lab-reports-by-lab?labId=<id>  —  Lab fetches all reports it has uploaded
app.get('/api/auth/lab-reports-by-lab', async (req, res) => {
  const { labId } = req.query;
  if (!labId) {
    return res.status(400).json({ message: 'labId is required' });
  }
  try {
    if (db.readyState !== 1) return res.json({ success: true, reports: [] });
    const reports = await LabReport.find({ labId }).sort({ uploadedAt: -1 }).select('-fileData');
    res.json({ success: true, reports });
  } catch (error) {
    console.error('Error fetching lab reports by lab:', error);
    res.status(500).json({ message: 'Error fetching lab reports', error: error.message });
  }
});

// Catch-all route to return JSON 404 for any unmatched requests
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Error handling middleware to catch unhandled errors and return JSON
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Auth backend running on port ${PORT}`);

  // Auto-ping mechanism: automatically pings itself every 60 seconds (1 minute)
  // so free hosting services like Render do not enter idle sleep state.
  setInterval(() => {
    const targetUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    fetch(`${targetUrl}/ping`)
      .then((res) => res.json())
      .then((data) => console.log(`[Keep-Alive Ping OK]: ${data.timestamp}`))
      .catch((err) => console.warn(`[Keep-Alive Ping Warning]: ${err.message}`));
  }, 60000);
});
