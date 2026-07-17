import mongoose from 'mongoose';

const clinicSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  isVerified: { type: Boolean, default: false },
  verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  onboardingComplete: { type: Boolean, default: false },
  clinicName: { type: String, required: true },
  logoUrl: String,
  specialityType: String,
  establishmentYear: String,
  registrationNumber: String,
  ownerName: String,
  taxId: String,
  proofDocumentName: String,
  proofDocumentData: String,
  address: String,
  mapsLink: String,
  phoneNumber: String,
  emergencyPhone: String,
  workingDays: [String],
  morningHours: String,
  eveningHours: String,
  consultationTime: String,
  consultationFee: String,
  latitude: { type: Number, default: 0 },
  longitude: { type: Number, default: 0 },
  // Geospatial location fields
  location: {
    type: {
      type: String,
      default: "Point",
      enum: ['Point']
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  clinicAddress: String,
  availabilitySlots: [{
    dayType: { type: String, enum: ['everyday', 'weekday', 'weekend', 'custom'], default: 'everyday' },
    customDays: [String],
    time: String // e.g. "09:00 - 10:00"
  }],
  createdAt: { type: Date, default: Date.now },
});

// Create geospatial index for location queries
clinicSchema.index({ location: '2dsphere' });

const Clinic = mongoose.models.Clinic || mongoose.model('Clinic', clinicSchema);
export default Clinic;
