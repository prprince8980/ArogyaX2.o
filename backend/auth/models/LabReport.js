import mongoose from 'mongoose';

const labReportSchema = new mongoose.Schema({
  // Patient reference
  patientId: { type: String, required: true, trim: true },
  patientName: { type: String, required: true, trim: true },

  // Lab reference
  labId: { type: String, required: true, trim: true },
  labName: { type: String, required: true, trim: true },

  // Report metadata
  reportTitle: { type: String, required: true, trim: true },
  testType: { type: String, default: 'General', trim: true },

  // File data stored as base64 string
  fileName: { type: String, required: true, trim: true },
  fileType: { type: String, enum: ['pdf', 'image'], required: true },
  fileData: { type: String, required: true }, // base64 encoded file
  fileMimeType: { type: String, required: true }, // e.g. 'application/pdf' or 'image/jpeg'

  // Status
  status: { type: String, enum: ['Pending Review', 'Reviewed', 'Normal', 'Abnormal'], default: 'Pending Review' },

  date: { type: String, default: () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
  uploadedAt: { type: Date, default: Date.now },
});

const LabReport = mongoose.models.LabReport || mongoose.model('LabReport', labReportSchema);
export default LabReport;
