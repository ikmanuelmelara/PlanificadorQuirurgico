const mongoose = require('mongoose');

const operatingRoomSchema = new mongoose.Schema({
  // FHIR Location alignment
  identifier: {
    system: { type: String, default: 'urn:hospital:location' },
    value: { type: String, required: true, unique: true },
  },
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  active: { type: Boolean, default: true },

  // Physical characteristics
  floor: { type: Number },
  wing: { type: String },

  // Equipment available (FHIR Device reference pattern)
  equipment: [{
    code: { type: String, required: true },
    display: { type: String, required: true },
    available: { type: Boolean, default: true },
  }],

  // Which surgical services can operate here
  allowedServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SurgicalService' }],

  // Allowed session types for this room
  allowedSessionTypes: [{
    type: String,
    enum: ['morning', 'afternoon', 'continuous'],
  }],

  // Weekly availability template (which days of the week this OR is usable)
  weeklyAvailability: [{
    dayOfWeek: {
      type: String,
      enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    },
    available: { type: Boolean, default: true },
    sessions: [{
      type: String,
      enum: ['morning', 'afternoon', 'continuous'],
    }],
  }],

  // Maintenance / out-of-service periods
  outOfServicePeriods: [{
    start: Date,
    end: Date,
    reason: String,
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('OperatingRoom', operatingRoomSchema);
