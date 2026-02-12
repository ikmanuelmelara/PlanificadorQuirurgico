const mongoose = require('mongoose');

const historicalActivitySchema = new mongoose.Schema({
  identifier: {
    system: { type: String, default: 'urn:hospital:activity' },
    value: { type: String, required: true, unique: true },
  },

  // When and where
  date: { type: Date, required: true },
  operatingRoom: { type: mongoose.Schema.Types.ObjectId, ref: 'OperatingRoom', required: true },
  surgicalService: { type: mongoose.Schema.Types.ObjectId, ref: 'SurgicalService', required: true },
  sessionType: {
    type: String,
    enum: ['morning', 'afternoon', 'continuous'],
    required: true,
  },

  // Patient (optional FHIR ref)
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },

  // Clinical details
  priority: {
    type: String,
    enum: [
      'oncologicoPrioritario', 'oncologicoEstandar', 'cardiaca',
      'garantizado180', 'referenciaP1', 'referenciaP2', 'referenciaP3',
    ],
    required: true,
  },
  procedure: {
    code: String,
    display: String,
  },

  // Duration tracking
  plannedDurationMinutes: { type: Number },
  actualDurationMinutes: { type: Number },

  // Was this an emergency that consumed a scheduled session?
  wasEmergency: { type: Boolean, default: false },

  // Outcome
  outcome: {
    type: String,
    enum: ['completed', 'cancelled', 'suspended'],
    default: 'completed',
  },
  cancellationReason: { type: String },
}, {
  timestamps: true,
});

// Indexes for prediction module queries
historicalActivitySchema.index({ surgicalService: 1, date: 1 });
historicalActivitySchema.index({ operatingRoom: 1, date: 1 });
historicalActivitySchema.index({ priority: 1, date: 1 });
historicalActivitySchema.index({ date: 1, sessionType: 1 });

module.exports = mongoose.model('HistoricalActivity', historicalActivitySchema);
