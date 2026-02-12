const mongoose = require('mongoose');

const DROPOUT_REASONS = {
  fallecimiento: 'Fallecimiento',
  renuncia: 'Renuncia voluntaria',
  contraindicacion: 'Contraindicación médica',
  resolucion_espontanea: 'Resolución espontánea',
  otro: 'Otro motivo',
};

const dropoutRecordSchema = new mongoose.Schema({
  identifier: {
    system: { type: String, default: 'urn:hospital:dropout' },
    value: { type: String, required: true, unique: true },
  },

  // Patient
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  patientIdentifier: { type: String },

  // Origin
  surgicalService: { type: mongoose.Schema.Types.ObjectId, ref: 'SurgicalService', required: true },
  waitingListEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'WaitingList' },

  // Dropout details
  dropoutDate: { type: Date, required: true },
  reason: {
    type: String,
    enum: Object.keys(DROPOUT_REASONS),
    required: true,
  },
  reasonDetail: { type: String },

  // Snapshot of waiting list state at dropout
  priority: {
    type: String,
    enum: [
      'oncologicoPrioritario', 'oncologicoEstandar', 'cardiaca',
      'garantizado180', 'referenciaP1', 'referenciaP2', 'referenciaP3',
    ],
  },
  entryDate: { type: Date },
  daysInWaitingListAtDropout: { type: Number },
  wasOutOfGuarantee: { type: Boolean },
}, {
  timestamps: true,
});

// Indexes for prediction of dropout rates
dropoutRecordSchema.index({ surgicalService: 1, dropoutDate: 1 });
dropoutRecordSchema.index({ dropoutDate: 1 });
dropoutRecordSchema.index({ reason: 1 });

dropoutRecordSchema.statics.DROPOUT_REASONS = DROPOUT_REASONS;

module.exports = mongoose.model('DropoutRecord', dropoutRecordSchema);
