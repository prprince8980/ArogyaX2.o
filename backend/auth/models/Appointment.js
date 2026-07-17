import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  patientId: { type: String, required: true }, // Patient or family member profile ID (e.g. PAT-xxx)
  patientName: { type: String, required: true }, // Name of patient
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  clinicName: { type: String, required: true },
  doctorName: { type: String, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  slot: { type: String, required: true }, // Format: "10:00 - 11:00"
  status: { type: String, enum: ['booked', 'cancelled'], default: 'booked' },
  cancellationReason: { type: String, default: '' },
  gender: String,
  age: String,
  bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true }, // User account that made the booking
  createdAt: { type: Date, default: Date.now },
});

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
export default Appointment;
