const mongoose = require('mongoose');
const { predictDemand } = require('./demandPredictor');
const { predictEmergencies } = require('./emergencyPredictor');
const { predictReferrals } = require('./referralPredictor');
const { predictDropouts } = require('./dropoutPredictor');

// Lightweight schema to persist prediction results
const predictionResultSchema = new mongoose.Schema({
  cutoffDate: { type: Date, required: true },
  runDate: { type: Date, default: Date.now },
  included: {
    demand: { type: Boolean, default: false },
    emergencies: { type: Boolean, default: false },
    referrals: { type: Boolean, default: false },
    dropouts: { type: Boolean, default: false },
  },
  results: {
    demand: { type: mongoose.Schema.Types.Mixed },
    emergencies: { type: mongoose.Schema.Types.Mixed },
    referrals: { type: mongoose.Schema.Types.Mixed },
    dropouts: { type: mongoose.Schema.Types.Mixed },
  },
}, { timestamps: true });

predictionResultSchema.index({ runDate: -1 });

const PredictionResult = mongoose.models.PredictionResult ||
  mongoose.model('PredictionResult', predictionResultSchema);

/**
 * Runs all selected predictors and persists the consolidated result.
 *
 * @param {Date} cutoffDate — prediction horizon
 * @param {Object} options — { demand: true, emergencies: true, referrals: true, dropouts: true }
 * @returns {Object} consolidated prediction
 */
async function runAllPredictions(cutoffDate, options = {}) {
  const include = {
    demand: options.demand !== false,
    emergencies: options.emergencies !== false,
    referrals: options.referrals !== false,
    dropouts: options.dropouts !== false,
  };

  const results = {};

  // Run selected predictors in parallel
  const tasks = [];

  if (include.demand) {
    tasks.push(predictDemand(cutoffDate).then((r) => { results.demand = r; }));
  }
  if (include.emergencies) {
    tasks.push(predictEmergencies(cutoffDate).then((r) => { results.emergencies = r; }));
  }
  if (include.referrals) {
    tasks.push(predictReferrals(cutoffDate).then((r) => { results.referrals = r; }));
  }
  if (include.dropouts) {
    tasks.push(predictDropouts(cutoffDate).then((r) => { results.dropouts = r; }));
  }

  await Promise.all(tasks);

  // Persist result
  const record = await PredictionResult.create({
    cutoffDate,
    included: include,
    results,
  });

  return {
    id: record._id,
    cutoffDate,
    runDate: record.runDate,
    included: include,
    results,
  };
}

/**
 * Returns the most recent prediction result.
 */
async function getLatestPrediction() {
  return PredictionResult.findOne().sort({ runDate: -1 }).lean();
}

/**
 * Returns a paginated list of past prediction results (metadata only).
 */
async function getPredictionHistory(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    PredictionResult.find()
      .sort({ runDate: -1 })
      .skip(skip)
      .limit(limit)
      .select('cutoffDate runDate included')
      .lean(),
    PredictionResult.countDocuments(),
  ]);

  return {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

module.exports = { runAllPredictions, getLatestPrediction, getPredictionHistory, PredictionResult };
