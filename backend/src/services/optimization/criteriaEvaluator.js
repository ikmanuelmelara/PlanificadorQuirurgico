const WaitingList = require('../../models/WaitingList');
const SurgicalService = require('../../models/SurgicalService');
const OperatingRoom = require('../../models/OperatingRoom');

/**
 * Evaluates a schedule against a single criterion. Returns a score 0–100.
 */
async function evaluate(schedule, criterion, context) {
  const evaluators = {
    ZERO_OUT_OF_GUARANTEE: evaluateGuarantee,
    MIN_CHANGE: evaluateMinChange,
    MAX_UTILIZATION: evaluateUtilization,
    BALANCE_LOAD: evaluateBalance,
    PRIORITIZE_ONCOLOGIC: evaluateOncologic,
    MIN_REFERRALS: evaluateReferrals,
    RESERVE_EMERGENCY: evaluateEmergencyReserve,
    CONSIDER_DROPOUTS: evaluateDropouts,
  };

  const fn = evaluators[criterion.code];
  if (!fn) return { score: 50, details: 'Unknown criterion' };
  return fn(schedule, context);
}

/**
 * Evaluates a schedule against all selected criteria.
 */
async function evaluateAll(schedule, criteria, context) {
  const scores = [];
  const violations = [];
  let totalWeighted = 0;
  let totalWeight = 0;

  for (const c of criteria) {
    if (!c.isSelected) continue;
    const result = await evaluate(schedule, c, context);
    scores.push({
      code: c.code,
      name: c.name,
      score: result.score,
      weight: c.weight,
      isHardConstraint: c.isHardConstraint,
      details: result.details,
    });

    if (c.isHardConstraint && result.score < 100) {
      violations.push({ code: c.code, name: c.name, score: result.score, details: result.details });
    }

    totalWeighted += result.score * c.weight;
    totalWeight += c.weight;
  }

  const totalScore = totalWeight > 0 ? Math.round(totalWeighted / totalWeight) : 0;

  return {
    scores,
    totalScore,
    violations,
    hardConstraintsMet: violations.length === 0,
  };
}

// --- Individual evaluators ---

async function evaluateGuarantee(schedule, ctx) {
  const { waitingList, cutoffDate } = ctx;
  if (!waitingList || waitingList.length === 0) return { score: 100, details: 'No patients in LEQ' };

  // Count sessions per service in the schedule
  const sessionsPerService = {};
  for (const s of schedule) {
    const svcId = String(s.surgicalService);
    sessionsPerService[svcId] = (sessionsPerService[svcId] || 0) + 1;
  }

  // Estimate how many patients each service can attend
  const atRisk = waitingList.filter((p) => p.isOutOfGuarantee || willExceedGuarantee(p, cutoffDate));
  if (atRisk.length === 0) return { score: 100, details: 'No patients at risk' };

  // Rough: each session handles ~3 patients on average
  let covered = 0;
  const serviceRisk = {};
  for (const p of atRisk) {
    const svcId = String(p.surgicalService);
    serviceRisk[svcId] = (serviceRisk[svcId] || 0) + 1;
  }

  for (const [svcId, riskCount] of Object.entries(serviceRisk)) {
    const sessions = sessionsPerService[svcId] || 0;
    const capacity = sessions * 3;
    covered += Math.min(riskCount, capacity);
  }

  const pct = covered / atRisk.length;
  return {
    score: Math.round(pct * 100),
    details: `${covered}/${atRisk.length} pacientes en riesgo cubiertos`,
  };
}

function willExceedGuarantee(patient, cutoffDate) {
  if (!patient.guaranteeDeadline) return false;
  return new Date(patient.guaranteeDeadline) <= cutoffDate;
}

async function evaluateMinChange(schedule, ctx) {
  const { currentSessions } = ctx;
  if (!currentSessions || currentSessions.length === 0) return { score: 100, details: 'No current sessions to compare' };

  const currentSet = new Set(currentSessions.map((s) => `${s.operatingRoom}|${s.date}|${s.type}|${s.surgicalService}`));
  const newSet = new Set(schedule.map((s) => `${s.operatingRoom}|${s.date}|${s.type}|${s.surgicalService}`));

  let unchanged = 0;
  for (const key of currentSet) {
    if (newSet.has(key)) unchanged++;
  }

  const total = Math.max(currentSet.size, newSet.size);
  const pct = total > 0 ? unchanged / total : 1;
  return {
    score: Math.round(pct * 100),
    details: `${unchanged}/${total} sesiones sin cambio`,
  };
}

async function evaluateUtilization(schedule, ctx) {
  const { rooms, planningDays } = ctx;
  if (!rooms || rooms.length === 0) return { score: 50, details: 'No rooms data' };

  // Count total available slots (each room can have up to 2 sessions/day)
  const totalSlots = rooms.length * planningDays * 2;
  const usedSlots = schedule.length;
  const pct = totalSlots > 0 ? Math.min(1, usedSlots / totalSlots) : 0;

  return {
    score: Math.round(pct * 100),
    details: `${usedSlots}/${totalSlots} slots utilizados`,
  };
}

async function evaluateBalance(schedule, ctx) {
  const { services, waitingList } = ctx;
  if (!services || services.length === 0) return { score: 50, details: 'No services data' };

  // Ideal: sessions proportional to waiting list size per service
  const wlByService = {};
  for (const p of (waitingList || [])) {
    const sId = String(p.surgicalService);
    wlByService[sId] = (wlByService[sId] || 0) + 1;
  }
  const totalWL = Object.values(wlByService).reduce((a, b) => a + b, 0) || 1;

  const sessByService = {};
  for (const s of schedule) {
    const sId = String(s.surgicalService);
    sessByService[sId] = (sessByService[sId] || 0) + 1;
  }
  const totalSess = schedule.length || 1;

  let deviationSum = 0;
  for (const svc of services) {
    const sId = String(svc._id);
    const idealShare = (wlByService[sId] || 0) / totalWL;
    const actualShare = (sessByService[sId] || 0) / totalSess;
    deviationSum += Math.abs(idealShare - actualShare);
  }

  const maxDeviation = 2;
  const score = Math.max(0, 100 - (deviationSum / maxDeviation) * 100);
  return {
    score: Math.round(score),
    details: `Desviación acumulada: ${(deviationSum * 100).toFixed(1)}%`,
  };
}

async function evaluateOncologic(schedule, ctx) {
  const { waitingList } = ctx;
  const onco = (waitingList || []).filter((p) =>
    p.priority === 'oncologicoPrioritario' || p.priority === 'oncologicoEstandar'
  );
  if (onco.length === 0) return { score: 100, details: 'No oncologic patients' };

  const sessByService = {};
  for (const s of schedule) {
    const sId = String(s.surgicalService);
    sessByService[sId] = (sessByService[sId] || 0) + 1;
  }

  let covered = 0;
  const serviceOnco = {};
  for (const p of onco) {
    const sId = String(p.surgicalService);
    serviceOnco[sId] = (serviceOnco[sId] || 0) + 1;
  }

  for (const [sId, count] of Object.entries(serviceOnco)) {
    const sessions = sessByService[sId] || 0;
    covered += Math.min(count, sessions * 2);
  }

  const pct = covered / onco.length;
  return {
    score: Math.round(pct * 100),
    details: `${covered}/${onco.length} oncológicos cubiertos`,
  };
}

async function evaluateReferrals(schedule, ctx) {
  const { predictions } = ctx;
  if (!predictions?.referrals) return { score: 80, details: 'No referral predictions' };

  const predicted = predictions.referrals.total || 0;
  if (predicted === 0) return { score: 100, details: 'No referrals predicted' };

  // More sessions = fewer referrals needed
  const extraCapacity = schedule.length * 3;
  const avoidable = Math.min(predicted, Math.floor(extraCapacity * 0.1));
  const pct = avoidable / predicted;
  return {
    score: Math.round(Math.min(100, 60 + pct * 40)),
    details: `${avoidable}/${predicted} derivaciones potencialmente evitables`,
  };
}

async function evaluateEmergencyReserve(schedule, ctx) {
  const { predictions, rooms, planningDays } = ctx;
  if (!predictions?.emergencies) return { score: 70, details: 'No emergency predictions' };

  const totalEmerg = (predictions.emergencies.deferred?.total || 0) + (predictions.emergencies.immediate?.total || 0);
  if (totalEmerg === 0) return { score: 100, details: 'No emergencies predicted' };

  const totalSlots = (rooms?.length || 8) * (planningDays || 28) * 2;
  const usedSlots = schedule.length;
  const freeSlots = totalSlots - usedSlots;
  const reserveNeeded = Math.ceil(totalEmerg * 0.5);

  const pct = reserveNeeded > 0 ? Math.min(1, freeSlots / reserveNeeded) : 1;
  return {
    score: Math.round(pct * 100),
    details: `${freeSlots} slots libres vs ${reserveNeeded} necesarios para urgencias`,
  };
}

async function evaluateDropouts(schedule, ctx) {
  const { predictions, waitingList } = ctx;
  if (!predictions?.dropouts) return { score: 80, details: 'No dropout predictions' };

  const predictedDropouts = predictions.dropouts.total || 0;
  const totalWL = (waitingList || []).length;
  if (totalWL === 0) return { score: 100, details: 'Empty waiting list' };

  // Adjusted demand: total WL - predicted dropouts
  const adjustedDemand = Math.max(0, totalWL - predictedDropouts);
  const capacity = schedule.length * 3;
  const pct = adjustedDemand > 0 ? Math.min(1, capacity / adjustedDemand) : 1;

  return {
    score: Math.round(pct * 100),
    details: `Demanda ajustada: ${adjustedDemand} (${totalWL} - ${predictedDropouts} bajas)`,
  };
}

module.exports = { evaluate, evaluateAll };
