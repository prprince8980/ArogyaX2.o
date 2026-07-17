import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  isVerified: { type: Boolean, default: false },
  verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  onboardingComplete: { type: Boolean, default: false },
  hospitalName: { type: String, required: true },
  logoUrl: String,
  hospitalType: String,
  registrationNumber: String,
  licenseNumber: String,
  licenseName: String,
  licenseData: String,
  totalBeds: String,
  icuBeds: String,
  ambulanceAvailable: Boolean,
  address: String,
  mapsLink: String,
  emergencyLandline: String,
  bankAccountNumber: String,
  bankAccountName: String,
  bankIFSC: String,
  createdAt: { type: Date, default: Date.now },
});

const Hospital = mongoose.models.Hospital || mongoose.model('Hospital', hospitalSchema);
export default Hospital;
