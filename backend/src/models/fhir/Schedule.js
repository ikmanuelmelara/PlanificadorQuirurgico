const mongoose = require('mongoose');

/**
 * FHIR R4 Schedule resource (operating room schedule context).
 * Represents a time slot container for a specific room + service + period.
 * See: https://www.hl7.org/fhir/R4/schedule.html
 */
const scheduleSchema = new mongoose.Schema({
  resourceType: { type: String, default: 'Schedule', immutable: true },

  // FHIR Identifier
  identifier: [{
    system: { type: String, default: 'urn:hospital:schedule' },
    value: { type: String, required: true },
  }],

  active: { type: Boolean, default: true },

  // FHIR serviceType — what kind of sessions this schedule covers
  serviceType: [{
    coding: [{
      system: { type: String, default: 'urn:hospital:session-type' },
      code: { type: String, enum: ['morning', 'afternoon', 'continuous'] },
      display: String,
    }],
    text: String,
  }],

  // Actor references — who/what this schedule is for
  actor: {
    operatingRoom: { type: mongoose.Schema.Types.ObjectId, ref: 'OperatingRoom' },
    surgicalService: { type: mongoose.Schema.Types.ObjectId, ref: 'SurgicalService' },
  },

  // Planning horizon (FHIR Period)
  planningHorizon: {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
  },

  // Origin of this schedule
  source: {
    type: String,
    enum: ['current', 'optimized'],
    default: 'current',
  },

  // The individual sessions within this schedule
  sessions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Session' }],

  // Optimization metadata
  optimizationRun: {
    runId: String,
    generatedAt: Date,
    objectiveValue: Number,
  },
}, {
  timestamps: true,
});

scheduleSchema.index({ 'identifier.value': 1 }, { unique: true });
scheduleSchema.index({ 'actor.operatingRoom': 1, 'planningHorizon.start': 1 });
scheduleSchema.index({ 'actor.surgicalService': 1, 'planningHorizon.start': 1 });
scheduleSchema.index({ source: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
