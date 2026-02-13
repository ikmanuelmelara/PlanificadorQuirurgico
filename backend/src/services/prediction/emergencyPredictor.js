const EmergencyRecord = require('../../models/EmergencyRecord');
const SurgicalService = require('../../models/SurgicalService');

/**
 * Predicts deferred and immediate emergencies until the cutoff date,
 * broken down by surgical service.
 */
async function predictEmergencies(cutoffDate) {
  const now = new Date();
  const periodDays = Math.max(1, Math.ceil((cutoffDate - now) / (1000 * 60 * 60 * 24)));
  const periodWeeks = periodDays / 7;

  const services = await SurgicalService.find({ active: true }).lean();

  // Determine historical observation window
  const oldest = await EmergencyRecord.findOne().sort({ arrivalDate: 1 }).lean();
  const histStart = oldest ? new Date(oldest.arrivalDate) : new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const histWeeks = Math.max(1, (now - histStart) / (1000 * 60 * 60 * 24 * 7));

  // Aggregate by service and type
  const agg = await EmergencyRecord.aggregate([
    {
      $group: {
        _id: { service: '$surgicalService', type: '$emergencyType' },
        count: { $sum: 1 },
      },
    },
  ]);

  // Build lookup: { serviceId: { immediate: N, deferred: N } }
  const map = {};
  for (const row of agg) {
    const sId = String(row._id.service);
    if (!map[sId]) map[sId] = { immediate: 0, deferred: 0 };
    map[sId][row._id.type] = row.count;
  }

  const deferred = { total: 0, byService: [] };
  const immediate = { total: 0, byService: [] };

  for (const svc of services) {
    const sId = String(svc._id);
    const counts = map[sId] || { immediate: 0, deferred: 0 };

    const defWeeklyRate = counts.deferred / histWeeks;
    const immWeeklyRate = counts.immediate / histWeeks;
    const defPredicted = Math.round(defWeeklyRate * periodWeeks);
    const immPredicted = Math.round(immWeeklyRate * periodWeeks);

    deferred.total += defPredicted;
    deferred.byService.push({
      serviceId: sId,
      serviceCode: svc.code,
      serviceName: svc.name,
      predicted: defPredicted,
      avgWeeklyRate: Math.round(defWeeklyRate * 100) / 100,
    });

    immediate.total += immPredicted;
    immediate.byService.push({
      serviceId: sId,
      serviceCode: svc.code,
      serviceName: svc.name,
      predicted: immPredicted,
      avgWeeklyRate: Math.round(immWeeklyRate * 100) / 100,
    });
  }

  deferred.byService.sort((a, b) => b.predicted - a.predicted);
  immediate.byService.sort((a, b) => b.predicted - a.predicted);

  const totalRecords = agg.reduce((s, r) => s + r.count, 0);

  return {
    deferred,
    immediate,
    periodDays,
    historicalWeeksUsed: Math.round(histWeeks * 10) / 10,
    confidence: computeConfidence(totalRecords, histWeeks),
  };
}

function computeConfidence(sampleSize, histWeeks) {
  if (sampleSize >= 80 && histWeeks >= 26) return 0.85;
  if (sampleSize >= 30 && histWeeks >= 12) return 0.70;
  if (sampleSize >= 10 && histWeeks >= 4) return 0.55;
  return 0.40;
}

module.exports = { predictEmergencies };
