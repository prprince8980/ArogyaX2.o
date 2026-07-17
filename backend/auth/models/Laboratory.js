import mongoose from 'mongoose';

const laboratorySchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  isVerified: { type: Boolean, default: false },
  verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  onboardingComplete: { type: Boolean, default: false },
  labName: { type: String, required: true },
  logoUrl: String,
  labType: String,
  operatingModel: String,
  registrationNumber: String,
  chiefDoctorName: String,
  licenseNumber: String,
  certificateName: String,
  certificateData: String,
  businessEmail: String,
  mapsLink: String,
  bankAccountNumber: String,
  bankAccountName: String,
  bankCode: String,
  chequeName: String,
  chequeData: String,
  workingDays: [String],
  openingTime: String,
  closingTime: String,
  weeklyOff: [String],
  homeCollection: Boolean,
  availableTests: [String],
  pricingSheet: String,
  createdAt: { type: Date, default: Date.now },
});

const Laboratory = mongoose.models.Laboratory || mongoose.model('Laboratory', laboratorySchema);
export default Laboratory;
