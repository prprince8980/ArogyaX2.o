import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  isVerified: { type: Boolean, default: false },
  verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  onboardingComplete: { type: Boolean, default: false },
  fullName: { type: String, required: true },
  specialization: String,
  experienceYears: Number,
  medicalLicenseNumber: String,
  qualifications: [String],
  clinicName: String, // If they work at a specific clinic
  consultationFee: String,
  createdAt: { type: Date, default: Date.now },
});

const Doctor = mongoose.models.Doctor || mongoose.model('Doctor', doctorSchema);
export default Doctor;
