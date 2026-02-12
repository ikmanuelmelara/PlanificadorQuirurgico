const mongoose = require('mongoose');

const surgicalServiceSchema = new mongoose.Schema({
  // FHIR HealthcareService alignment
  identifier: {
    system: { type: String, default: 'urn:hospital:service' },
    value: { type: String, required: true, unique: true },
  },
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  active: { type: Boolean, default: true },

  // Specialties this service covers (FHIR CodeableConcept pattern)
  specialties: [{
    code: String,
    display: String,
  }],

  // Average surgery durations by priority (in minutes)
  avgDurations: {
    oncologicoPrioritario: { type: Number, default: 120 },
    oncologicoEstandar: { type: Number, default: 120 },
    cardiaca: { type: Number, default: 180 },
    garantizado180: { type: Number, default: 90 },
    referenciaP1: { type: Number, default: 90 },
    referenciaP2: { type: Number, default: 75 },
    referenciaP3: { type: Number, default: 60 },
  },

  // Allowed operating rooms for this service
  allowedRooms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OperatingRoom' }],

  // Preferred session types
  preferredSessionTypes: [{
    type: String,
    enum: ['morning', 'afternoon', 'continuous'],
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('SurgicalService', surgicalServiceSchema);
