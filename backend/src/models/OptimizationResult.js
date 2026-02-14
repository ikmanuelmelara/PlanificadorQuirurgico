const mongoose = require('mongoose');

const optimizationResultSchema = new mongoose.Schema({
  cutoffDate: { type: Date, required: true },
  criteriaUsed: [{ type: mongoose.Schema.Types.Mixed }],
  optimalSchedule: [{ type: mongoose.Schema.Types.Mixed }],
  scores: { type: mongoose.Schema.Types.Mixed },
  comparison: { type: mongoose.Schema.Types.Mixed },
  config: {
    useCurrentAllocation: { type: Boolean, default: true },
    usePredictions: { type: Boolean, default: true },
    maxIterations: { type: Number, default: 1000 },
  },
}, { timestamps: true });

optimizationResultSchema.index({ createdAt: -1 });

module.exports = mongoose.model('OptimizationResult', optimizationResultSchema);
