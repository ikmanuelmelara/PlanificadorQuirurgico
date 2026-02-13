const DropoutRecord = require('../../models/DropoutRecord');
const SurgicalService = require('../../models/SurgicalService');

/**
 * Predicts LEQ dropouts until the cutoff date,
 * broken down by surgical service and by reason.
 */
async function predictDropouts(cutoffDate) {
  const now = new Date();
  const periodDays = Math.max(1, Math.ceil((cutoffDate - now) / (1000 * 60 * 60 * 24)));
  const periodMonths = periodDays / 30;

  const services = await SurgicalService.find({ active: true }).lean();

  // Historical observation window
  const oldest = await DropoutRecord.findOne().sort({ dropoutDate: 1 }).lean();
  const histStart = oldest ? new Date(oldest.dropoutDate) : new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const histMonths = Math.max(1, (now - histStart) / (1000 * 60 * 60 * 24 * 30));

  // Aggregate by service
  const byServiceAgg = await DropoutRecord.aggregate([
    { $group: { _id: '$surgicalService', count: { $sum: 1 } } },
  ]);
  const serviceMap = {};
  for (const row of byServiceAgg) {
    serviceMap[String(row._id)] = row.count;
  }

  // Aggregate by reason
  const byReasonAgg = await DropoutRecord.aggregate([
    { $group: { _id: '$reason', count: { $sum: 1 } } },
  ]);
  const totalHistorical = byReasonAgg.reduce((s, r) => s + r.count, 0);

  let total = 0;
  const byService = [];

  for (const svc of services) {
    const sId = String(svc._id);
    const count = serviceMap[sId] || 0;
    const monthlyRate = count / histMonths;
    const predicted = Math.round(monthlyRate * periodMonths);
    total += predicted;

    byService.push({
      serviceId: sId,
      serviceCode: svc.code,
      serviceName: svc.name,
      predicted,
      avgMonthlyRate: Math.round(monthlyRate * 100) / 100,
    });
  }

  byService.sort((a, b) => b.predicted - a.predicted);

  // Reason breakdown projected
  const byReason = byReasonAgg.map((r) => {
    const share = totalHistorical > 0 ? r.count / totalHistorical : 0;
    return {
      reason: r._id,
      count: Math.round(share * total),
      percentage: Math.round(share * 1000) / 10,
    };
  }).sort((a, b) => b.count - a.count);

  return {
    total,
    byService,
    byReason,
    periodDays,
    historicalMonthsUsed: Math.round(histMonths * 10) / 10,
    confidence: computeConfidence(totalHistorical, histMonths),
  };
}

function computeConfidence(sampleSize, histMonths) {
  if (sampleSize >= 40 && histMonths >= 6) return 0.80;
  if (sampleSize >= 15 && histMonths >= 3) return 0.65;
  if (sampleSize >= 5 && histMonths >= 1) return 0.50;
  return 0.35;
}

module.exports = { predictDropouts };
