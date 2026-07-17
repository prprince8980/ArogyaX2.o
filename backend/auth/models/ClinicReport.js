import mongoose from 'mongoose';

const clinicReportSchema = new mongoose.Schema({
  patientId: { type: String, required: true },  // Patient._id as string
  patientName: { type: String, required: true },
  clinicId: { type: String, required: true },   // Clinic._id as string
  clinicName: { type: String, required: true },
  doctorName: { type: String, required: true },
  title: { type: String, required: true },
  type: {
    type: String,
    enum: ['Diagnosis', 'Clinical note', 'Prescription', 'Referral', 'Lab Request'],
    default: 'Diagnosis',
  },
  notes: { type: String, default: '' },
  date: { type: String, required: true },       // ISO date string YYYY-MM-DD
  createdAt: { type: Date, default: Date.now },
});

const ClinicReport = mongoose.models.ClinicReport || mongoose.model('ClinicReport', clinicReportSchema);
export default ClinicReport;
