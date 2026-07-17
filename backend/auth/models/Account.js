import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  googleId: { type: String, required: true },
  accountName: { type: String, required: true },
  members: [{
    role: { type: String, enum: ['admin', 'patient', 'clinic', 'doctor', 'laboratory', 'hospital'], required: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true }
  }],
  createdAt: { type: Date, default: Date.now },
});

const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);
export default Account;
