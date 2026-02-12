const mongoose = require('mongoose');

/**
 * FHIR R4 ServiceRequest resource (surgical request context).
 * Represents a request for a surgical procedure — maps to a waiting list entry.
 * See: https://www.hl7.org/fhir/R4/servicerequest.html
 */
const serviceRequestSchema = new mongoose.Schema({
  resourceType: { type: String, default: 'ServiceRequest', immutable: true },

  // FHIR Identifier
  identifier: [{
    system: { type: String, default: 'urn:hospital:service-request' },
    value: { type: String, required: true },
  }],

  // FHIR status
  status: {
    type: String,
    enum: ['draft', 'active', 'on-hold', 'revoked', 'completed', 'entered-in-error'],
    default: 'active',
    required: true,
  },

  // FHIR intent
  intent: {
    type: String,
    enum: ['proposal', 'plan', 'order', 'original-order', 'reflex-order', 'filler-order'],
    default: 'order',
  },

  // Priority (FHIR + CatSalut mapping)
  priority: {
    type: String,
    enum: ['routine', 'urgent', 'asap', 'stat'],
    default: 'routine',
  },
  catSalutPriority: {
    type: String,
    enum: [
      'oncologicoPrioritario', 'oncologicoEstandar', 'cardiaca',
      'garantizado180', 'referenciaP1', 'referenciaP2', 'referenciaP3',
    ],
  },

  // FHIR CodeableConcept — what procedure is requested
  code: {
    coding: [{
      system: { type: String, default: 'urn:hospital:procedure' },
      code: String,
      display: String,
    }],
    text: String,
  },

  // Subject — the patient
  subject: {
    reference: { type: String },           // e.g. "Patient/<id>"
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  },

  // Requester — the requesting clinician/service
  requester: {
    reference: { type: String },
    surgicalService: { type: mongoose.Schema.Types.ObjectId, ref: 'SurgicalService' },
  },

  // Reason (diagnosis)
  reasonCode: [{
    coding: [{
      system: String,
      code: String,
      display: String,
    }],
    text: String,
  }],

  // When the request was authored
  authoredOn: { type: Date, default: Date.now },

  // Occurrence — when the procedure should happen (FHIR Period)
  occurrencePeriod: {
    start: Date,
    end: Date,
  },

  // Link to waiting list entry
  waitingListEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'WaitingList' },
}, {
  timestamps: true,
});

serviceRequestSchema.index({ 'identifier.value': 1 }, { unique: true });
serviceRequestSchema.index({ status: 1 });
serviceRequestSchema.index({ 'subject.patient': 1 });
serviceRequestSchema.index({ 'requester.surgicalService': 1 });

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
