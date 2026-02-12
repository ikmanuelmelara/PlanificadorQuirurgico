const mongoose = require('mongoose');

/**
 * FHIR R4 Patient resource (simplified for surgical planning context).
 * See: https://www.hl7.org/fhir/R4/patient.html
 */
const patientSchema = new mongoose.Schema({
  resourceType: { type: String, default: 'Patient', immutable: true },

  // FHIR Identifier
  identifier: [{
    system: { type: String, default: 'urn:hospital:patient' },
    value: { type: String, required: true },
  }],

  active: { type: Boolean, default: true },

  // FHIR HumanName
  name: [{
    use: { type: String, enum: ['official', 'usual', 'temp', 'nickname', 'anonymous'], default: 'official' },
    family: { type: String, required: true },
    given: [String],
  }],

  // Demographics
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'unknown'],
  },
  birthDate: { type: Date },

  // FHIR Address (simplified)
  address: [{
    use: { type: String, enum: ['home', 'work', 'temp'], default: 'home' },
    city: String,
    state: String,
    postalCode: String,
  }],

  // FHIR ContactPoint (simplified)
  telecom: [{
    system: { type: String, enum: ['phone', 'email'] },
    value: String,
    use: { type: String, enum: ['home', 'work', 'mobile'] },
  }],
}, {
  timestamps: true,
});

// Unique patient identifier
patientSchema.index({ 'identifier.value': 1 }, { unique: true });
patientSchema.index({ 'name.family': 1, 'name.given': 1 });

module.exports = mongoose.model('Patient', patientSchema);
