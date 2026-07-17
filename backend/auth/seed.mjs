import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Account from './models/Account.js';
import Patient from './models/Patient.js';
import Clinic from './models/Clinic.js';

dotenv.config();

// Try Atlas MONGO_URI from .env first, fallback to local MongoDB
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/arogax2";

console.log("Connecting seed script to:", MONGO_URI);

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB successfully");

    // Clean existing mock seed data
    await Account.deleteMany({ email: { $in: ['test-patient@example.com', 'test-clinic@example.com'] } });
    await Patient.deleteMany({ fullName: 'Prakash Kumar' });
    await Clinic.deleteMany({ clinicName: 'Hale Family Clinic' });
    
    // Create Clinic
    const clinicAccountId = new mongoose.Types.ObjectId();
    const clinicProfileId = new mongoose.Types.ObjectId();
    
    const clinicAccount = new Account({
      _id: clinicAccountId,
      email: 'test-clinic@example.com',
      googleId: 'google-mock-clinic-123',
      accountName: 'Dr. Marcus Hale',
      members: [{
        role: 'clinic',
        profileId: clinicProfileId,
        name: 'Hale Family Clinic'
      }]
    });

    const clinicProfile = new Clinic({
      _id: clinicProfileId,
      accountId: clinicAccountId,
      isVerified: true,
      verificationStatus: 'approved',
      onboardingComplete: true,
      clinicName: 'Hale Family Clinic',
      ownerName: 'Dr. Marcus Hale',
      specialityType: 'Family Medicine',
      consultationFee: '120',
      address: '101 Pine St, Seattle, WA',
      phoneNumber: '206-555-0199',
      latitude: 47.6082,
      longitude: -122.3351,
      availabilitySlots: [
        { dayType: 'everyday', time: '09:00 - 10:00' },
        { dayType: 'everyday', time: '10:00 - 11:00' },
        { dayType: 'weekday', time: '14:00 - 15:00' },
        { dayType: 'weekday', time: '15:00 - 16:00' }
      ]
    });

    // Create Patient
    const patientAccountId = new mongoose.Types.ObjectId();
    const patientProfileId = new mongoose.Types.ObjectId();

    const patientAccount = new Account({
      _id: patientAccountId,
      email: 'test-patient@example.com',
      googleId: 'google-mock-patient-123',
      accountName: 'Prakash Kumar',
      members: [{
        role: 'patient',
        profileId: patientProfileId,
        name: 'Prakash Kumar'
      }]
    });

    const patientProfile = new Patient({
      _id: patientProfileId,
      accountId: patientAccountId,
      isVerified: true,
      verificationStatus: 'approved',
      onboardingComplete: true,
      fullName: 'Prakash Kumar',
      dob: '1990-05-15',
      gender: 'Male',
      bloodGroup: 'O+',
      address: 'Seattle, WA',
      contactMethods: ['206-555-0144'],
      allergies: ['Peanuts'],
      chronicConditions: ['None']
    });

    await clinicAccount.save();
    await clinicProfile.save();
    await patientAccount.save();
    await patientProfile.save();

    console.log("Mock data seeded successfully!");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

run();
