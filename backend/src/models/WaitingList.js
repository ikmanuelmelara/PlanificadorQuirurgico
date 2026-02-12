const mongoose = require('mongoose');

// CatSalut priority definitions with maximum days allowed
const PRIORITIES = {
  oncologicoPrioritario: { code: 'ONCO_PRIO', display: 'Oncológico Prioritario', maxDays: 45 },
  oncologicoEstandar:    { code: 'ONCO_STD',  display: 'Oncológico Estándar',    maxDays: 60 },
  cardiaca:              { code: 'CARDIAC',    display: 'Cardíaca',               maxDays: 90 },
  garantizado180:        { code: 'GAR_180',    display: 'Garantizado 180 días',   maxDays: 180 },
  referenciaP1:          { code: 'REF_P1',     display: 'Referencia P1',          maxDays: 90 },
  referenciaP2:          { code: 'REF_P2',     display: 'Referencia P2',          maxDays: 180 },
  referenciaP3:          { code: 'REF_P3',     display: 'Referencia P3',          maxDays: 365 },
};

const waitingListSchema = new mongoose.Schema({
  // FHIR ServiceRequest alignment
  identifier: {
    system: { type: String, default: 'urn:hospital:leq' },
    value: { type: String, required: true, unique: true },
  },

  // Patient info (FHIR Patient reference)
  patient: {
    identifier: { type: String, required: true },
    name: { type: String, required: true },
    birthDate: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other', 'unknown'] },
  },

  // Clinical data
  surgicalService: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SurgicalService',
    required: true,
  },
  priority: {
    type: String,
    enum: Object.keys(PRIORITIES),
    required: true,
  },
  diagnosis: {
    code: String,
    display: String,
  },
  procedure: {
    code: String,
    display: String,
  },
  estimatedDurationMinutes: { type: Number },

  // Waiting list dates
  entryDate: { type: Date, required: true },
  guaranteeDeadline: { type: Date },

  // Computed fields
  daysInWaitingList: { type: Number },
  isOutOfGuarantee: { type: Boolean, default: false },

  // Status
  status: {
    type: String,
    enum: ['active', 'scheduled', 'completed', 'cancelled', 'referred', 'dropped'],
    default: 'active',
  },

  // If dropped, reason
  dropoutReason: {
    type: String,
    enum: ['fallecimiento', 'renuncia', 'contraindicacion', 'resolucion_espontanea', 'otro'],
  },
  dropoutDate: { type: Date },

  // If referred to external center
  referralDate: { type: Date },
  referralCenter: { type: String },
}, {
  timestamps: true,
});

// Auto-compute guaranteeDeadline, daysInWaitingList, isOutOfGuarantee before saving
waitingListSchema.pre('validate', function () {
  const priorityDef = PRIORITIES[this.priority];

  // Compute guarantee deadline from entry date + max days
  if (this.entryDate && priorityDef && !this.guaranteeDeadline) {
    const deadline = new Date(this.entryDate);
    deadline.setDate(deadline.getDate() + priorityDef.maxDays);
    this.guaranteeDeadline = deadline;
  }

  // Compute days in waiting list
  if (this.entryDate) {
    const now = new Date();
    this.daysInWaitingList = Math.floor((now - this.entryDate) / (1000 * 60 * 60 * 24));
  }

  // Check if out of guarantee
  if (this.guaranteeDeadline) {
    this.isOutOfGuarantee = new Date() > this.guaranteeDeadline;
  }
});

// Indexes for common queries
waitingListSchema.index({ surgicalService: 1, status: 1 });
waitingListSchema.index({ priority: 1, status: 1 });
waitingListSchema.index({ isOutOfGuarantee: 1, status: 1 });
waitingListSchema.index({ entryDate: 1 });

waitingListSchema.statics.PRIORITIES = PRIORITIES;

module.exports = mongoose.model('WaitingList', waitingListSchema);
