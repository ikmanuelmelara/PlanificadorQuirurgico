const mongoose = require('mongoose');

// Session types with their time ranges
const SESSION_TYPES = {
  morning:    { start: '08:00', end: '15:00', durationMinutes: 420 },
  afternoon:  { start: '15:00', end: '22:00', durationMinutes: 420 },
  continuous: { start: '08:00', end: '20:00', durationMinutes: 720 },
};

const sessionSchema = new mongoose.Schema({
  // FHIR Schedule alignment
  identifier: {
    system: { type: String, default: 'urn:hospital:session' },
    value: { type: String, required: true, unique: true },
  },

  operatingRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OperatingRoom',
    required: true,
  },
  surgicalService: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SurgicalService',
    required: true,
  },

  date: { type: Date, required: true },

  type: {
    type: String,
    enum: ['morning', 'afternoon', 'continuous'],
    required: true,
  },

  // Time window (derived from type, stored for query convenience)
  startTime: { type: String },
  endTime: { type: String },
  durationMinutes: { type: Number },

  // Origin of this session
  source: {
    type: String,
    enum: ['current', 'optimized'],
    default: 'current',
  },

  // Whether this session differs from the current allocation
  isChanged: { type: Boolean, default: false },

  // Which optimization run generated this session (null if source=current)
  optimizationRun: { type: mongoose.Schema.Types.ObjectId, ref: 'OptimalSchedule' },
}, {
  timestamps: true,
});

// Auto-fill time fields from session type before saving
sessionSchema.pre('validate', function () {
  if (this.type && SESSION_TYPES[this.type]) {
    const def = SESSION_TYPES[this.type];
    this.startTime = def.start;
    this.endTime = def.end;
    this.durationMinutes = def.durationMinutes;
  }
});

// Compound index: one session per room per date per type
sessionSchema.index({ operatingRoom: 1, date: 1, type: 1 }, { unique: true });
// Query by service and date range
sessionSchema.index({ surgicalService: 1, date: 1 });

sessionSchema.statics.SESSION_TYPES = SESSION_TYPES;

module.exports = mongoose.model('Session', sessionSchema);
