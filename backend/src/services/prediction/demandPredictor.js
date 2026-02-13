const WaitingList = require('../../models/WaitingList');
const HistoricalActivity = require('../../models/HistoricalActivity');
const SurgicalService = require('../../models/SurgicalService');

/**
 * Predicts new LEQ entries until the cutoff date, broken down by surgical service.
 * Uses historical entry rates per service with optional seasonality.
 */
async function predictDemand(cutoffDate) {
  const now = new Date();
  const periodDays = Math.max(1, Math.ceil((cutoffDate - now) / (1000 * 60 * 60 * 24)));

  const services = await SurgicalService.find({ active: true }).lean();

  // Determine the historical observation window
  const oldestEntry = await WaitingList.findOne().sort({ entryDate: 1 }).lean();
  const histStart = oldestEntry ? new Date(oldestEntry.entryDate) : new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const histDays = Math.max(1, Math.ceil((now - histStart) / (1000 * 60 * 60 * 24)));

  // Count historical entries per service
  const entryCounts = await WaitingList.aggregate([
    { $group: { _id: '$surgicalService', count: { $sum: 1 } } },
  ]);
  const countMap = {};
  for (const e of entryCounts) {
    countMap[String(e._id)] = e.count;
  }

  // Optional: use HistoricalActivity as a secondary signal
  const activityCounts = await HistoricalActivity.aggregate([
    { $group: { _id: '$surgicalService', count: { $sum: 1 } } },
  ]);
  const activityMap = {};
  for (const a of activityCounts) {
    activityMap[String(a._id)] = a.count;
  }

  // Seasonality factor: compare current month's historical share vs average
  const monthNum = now.getMonth();
  const monthlyActivity = await HistoricalActivity.aggregate([
    { $group: { _id: { $month: '$date' }, count: { $sum: 1 } } },
  ]);
  let seasonalityFactor = 1.0;
  if (monthlyActivity.length >= 6) {
    const avgPerMonth = monthlyActivity.reduce((s, m) => s + m.count, 0) / monthlyActivity.length;
    const currentMonth = monthlyActivity.find((m) => m._id === monthNum + 1);
    if (currentMonth && avgPerMonth > 0) {
      seasonalityFactor = Math.max(0.5, Math.min(1.5, currentMonth.count / avgPerMonth));
    }
  }

  let total = 0;
  const byService = [];

  for (const svc of services) {
    const svcId = String(svc._id);
    const entries = countMap[svcId] || 0;
    const dailyRate = entries / histDays;
    const predicted = Math.round(dailyRate * periodDays * seasonalityFactor);
    total += predicted;

    byService.push({
      serviceId: svcId,
      serviceCode: svc.code,
      serviceName: svc.name,
      predictedEntries: predicted,
      avgDailyRate: Math.round(dailyRate * 100) / 100,
      confidence: computeConfidence(entries, histDays),
    });
  }

  // Sort by predicted entries descending
  byService.sort((a, b) => b.predictedEntries - a.predictedEntries);

  return {
    total,
    byService,
    method: monthlyActivity.length >= 6 ? 'historical_rate_with_seasonality' : 'historical_rate',
    seasonalityFactor: Math.round(seasonalityFactor * 100) / 100,
    periodDays,
    historicalDaysUsed: histDays,
  };
}

function computeConfidence(sampleSize, histDays) {
  // Simple heuristic: more data + longer history = higher confidence
  if (sampleSize >= 50 && histDays >= 180) return 0.85;
  if (sampleSize >= 20 && histDays >= 90) return 0.70;
  if (sampleSize >= 5 && histDays >= 30) return 0.55;
  return 0.40;
}

module.exports = { predictDemand };
