const mongoose = require('mongoose');

const emergencyRecordSchema = new mongoose.Schema({
  identifier: {
    system: { type: String, default: 'urn:hospital:emergency' },
    value: { type: String, required: true, unique: true },
  },

  // Emergency type
  emergencyType: {
    type: String,
    enum: ['immediate', 'deferred'],
    required: true,
  },

  // Patient (optional FHIR ref)
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  patientIdentifier: { type: String },

  // Clinical
  surgicalService: { type: mongoose.Schema.Types.ObjectId, ref: 'SurgicalService', required: true },
  procedure: {
    code: String,
    display: String,
  },
  diagnosis: {
    code: String,
    display: String,
  },

  // Timeline
  arrivalDate: { type: Date, required: true },
  surgeryDate: { type: Date },
  durationMinutes: { type: Number },

  // Where it was resolved
  operatingRoom: { type: mongoose.Schema.Types.ObjectId, ref: 'OperatingRoom' },
  sessionType: {
    type: String,
    enum: ['morning', 'afternoon', 'continuous'],
  },

  // Did this emergency displace a scheduled surgery?
  displacedSession: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },

  // Outcome
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'completed', 'cancelled'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

// Indexes for prediction of emergency arrivals
emergencyRecordSchema.index({ surgicalService: 1, arrivalDate: 1 });
emergencyRecordSchema.index({ emergencyType: 1, arrivalDate: 1 });
emergencyRecordSchema.index({ arrivalDate: 1 });

module.exports = mongoose.model('EmergencyRecord', emergencyRecordSchema);
