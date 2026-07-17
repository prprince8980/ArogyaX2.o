import mongoose from 'mongoose';

const cancelledSlotSchema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  slot: { type: String, required: true }, // Format: "10:00 - 11:00"
  createdAt: { type: Date, default: Date.now },
});

const CancelledSlot = mongoose.models.CancelledSlot || mongoose.model('CancelledSlot', cancelledSlotSchema);
export default CancelledSlot;
