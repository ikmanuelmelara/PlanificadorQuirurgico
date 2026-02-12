const mongoose = require('mongoose');

const learnedConstraintSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['explicit', 'discovered'],
    required: true,
  },
  category: {
    type: String,
    enum: ['room', 'session', 'sequence', 'combination', 'temporal', 'unknown'],
    required: true,
  },

  // Human-readable description of the constraint
  description: { type: String, required: true },

  // Machine-readable rule (flexible structure per discovery method)
  rule: { type: mongoose.Schema.Types.Mixed, required: true },

  // Statistical quality metrics (association rules)
  support: { type: Number, min: 0, max: 1 },
  confidence: { type: Number, min: 0, max: 1 },
  lift: { type: Number },

  // Validation
  isValidated: { type: Boolean, default: false },
  validatedBy: { type: String },
  validatedAt: { type: Date },

  // How this constraint was discovered
  discoveryMethod: {
    type: String,
    enum: [
      'association_rules',
      'clustering',
      'decision_tree',
      'anomaly_detection',
      'correlation',
      'manual',
    ],
    required: true,
  },

  // Which entities this constraint involves
  relatedServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SurgicalService' }],
  relatedRooms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OperatingRoom' }],

  // Whether to use this constraint in the optimization engine
  activeInOptimization: { type: Boolean, default: false },
}, {
  timestamps: true,
});

// Indexes for querying constraints by type and usage
learnedConstraintSchema.index({ type: 1, category: 1 });
learnedConstraintSchema.index({ activeInOptimization: 1 });
learnedConstraintSchema.index({ discoveryMethod: 1 });

module.exports = mongoose.model('LearnedConstraint', learnedConstraintSchema);
