import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  isVerified: { type: Boolean, default: true },
  verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  onboardingComplete: { type: Boolean, default: false },
  
  // --- STEP 1: Basic Identity ---
  fullName: { type: String, required: true, trim: true },
  picture: { type: String, default: "" }, // Stores secure URL after handling file upload
  dob: { type: Date, required: true }, 
  gender: { 
    type: String, 
    required: true,
    enum: ['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say', 'Select'] // Matches your dynamic state fallback
  },
  bloodGroup: { 
    type: String, 
    enum: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'] // Added empty string to catch 'Select' defaults safely
  },
  preferredLanguage: { type: String, required: true },

  // --- STEP 2: Contact & Emergency ---
  // Changed from a structured sub-document to a single string to match profile.address in your frontend
  address: { type: String, required: true, trim: true },
  contactMethods: { 
    type: [String], 
    required: true,
    enum: ['WhatsApp', 'SMS', 'Email'] 
  },
  emergencyContactName: { type: String, required: true, trim: true },
  emergencyRelationship: { type: String, required: true },
  emergencyPhone: { type: String, required: true },

  // --- STEP 3: Medical Controls ---
  allergies: { type: String, default: "" }, // Flattened from [String] to String to match your single text input
  chronicConditions: { 
    type: [String], 
    default: [],
    enum: ['Diabetes', 'High Blood Pressure', 'Asthma', 'None'] // Aligned to your checkbox options
  },
  currentMedications: { type: String, default: "" }, // Matches single scanned/typed text string

  // --- STEP 4 & FUTURE EXTENSIONS ---
  dietaryPreferences: { type: String, default: "" },
  lifestyleHabits: { type: String, default: "" },
  familyMedicalHistory: { type: [String], default: [] },
  insuranceProvider: { type: String, default: "" },
  policyNumber: { type: String, default: "" },
  consentGiven: { type: Boolean, required: true, default: false }, // Crucial field validation for Step 4
  
  createdAt: { type: Date, default: Date.now },
});

const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema);
export default Patient;