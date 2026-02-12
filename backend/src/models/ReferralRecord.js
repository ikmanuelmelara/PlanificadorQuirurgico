const mongoose = require('mongoose');

const referralRecordSchema = new mongoose.Schema({
  identifier: {
    system: { type: String, default: 'urn:hospital:referral' },
    value: { type: String, required: true, unique: true },
  },

  // Patient
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  patientIdentifier: { type: String },

  // Origin
  surgicalService: { type: mongoose.Schema.Types.ObjectId, ref: 'SurgicalService', required: true },
  waitingListEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'WaitingList' },

  // Referral details
  referralDate: { type: Date, required: true },
  reason: {
    type: String,
    enum: ['guarantee_exceeded', 'capacity', 'specialization', 'patient_request', 'other'],
    required: true,
  },
  reasonDetail: { type: String },

  // Destination
  destinationCenter: { type: String, required: true },
  destinationService: { type: String },

  // Priority at time of referral
  priority: {
    type: String,
    enum: [
      'oncologicoPrioritario', 'oncologicoEstandar', 'cardiaca',
      'garantizado180', 'referenciaP1', 'referenciaP2', 'referenciaP3',
    ],
  },
  daysInWaitingListAtReferral: { type: Number },

  // Outcome
  status: {
    type: String,
    enum: ['referred', 'accepted', 'returned', 'completed'],
    default: 'referred',
  },
  returnDate: { type: Date },
}, {
  timestamps: true,
});

// Indexes for prediction of referral volume
referralRecordSchema.index({ surgicalService: 1, referralDate: 1 });
referralRecordSchema.index({ referralDate: 1 });
referralRecordSchema.index({ reason: 1 });

module.exports = mongoose.model('ReferralRecord', referralRecordSchema);
