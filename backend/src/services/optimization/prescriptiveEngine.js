const WaitingList = require('../../models/WaitingList');
const OperatingRoom = require('../../models/OperatingRoom');
const SurgicalService = require('../../models/SurgicalService');
const { getLatestPrediction } = require('../prediction/predictionOrchestrator');
const { getCriteria } = require('./criteriaDefinitions');
const { evaluateAll } = require('./criteriaEvaluator');
const { generateInitial, generateNeighbor } = require('./scheduleGenerator');
const { compare } = require('./scheduleComparator');
const OptimizationResult = require('../../models/OptimizationResult');

/**
 * Main optimization engine using Simulated Annealing.
 *
 * @param {Object} request
 * @param {Date}   request.cutoffDate
 * @param {Array}  request.criteria — [{ code, isSelected, isHardConstraint, weight }]
 * @param {boolean} request.useCurrentAllocation
 * @param {boolean} request.usePredictions
 * @param {number}  request.maxIterations
 */
async function optimize(request) {
  const {
    cutoffDate,
    criteria: userCriteria = [],
    useCurrentAllocation = true,
    usePredictions = true,
    maxIterations = 1000,
  } = request;

  const parsedCutoff = new Date(cutoffDate);
  const planningDays = Math.max(1, Math.ceil((parsedCutoff - new Date()) / (1000 * 60 * 60 * 24)));

  // Build context for evaluators
  const [waitingList, rooms, services, predictions] = await Promise.all([
    WaitingList.find({ status: 'active' }).lean(),
    OperatingRoom.find({ active: true }).populate('allowedServices', 'code name').lean(),
    SurgicalService.find({ active: true }).lean(),
    usePredictions ? getLatestPrediction() : Promise.resolve(null),
  ]);

  const context = {
    waitingList,
    rooms,
    services,
    predictions: predictions?.results || null,
    cutoffDate: parsedCutoff,
    planningDays,
    currentSessions: null,
  };

  // Merge user criteria with definitions
  const allCriteria = getCriteria();
  const mergedCriteria = allCriteria.map((def) => {
    const user = userCriteria.find((u) => u.code === def.code);
    return {
      code: def.code,
      name: def.name,
      isSelected: user ? user.isSelected : true,
      isHardConstraint: user ? (user.isHardConstraint && def.canBeHard) : false,
      weight: user?.weight ?? def.defaultWeight,
    };
  });

  // Generate initial schedule
  const initial = await generateInitial(parsedCutoff, useCurrentAllocation);
  context.currentSessions = useCurrentAllocation ? initial.sessions : [];

  let currentSchedule = initial.sessions;
  let currentEval = await evaluateAll(currentSchedule, mergedCriteria, context);

  let bestSchedule = currentSchedule;
  let bestEval = currentEval;

  // Simulated Annealing
  const T0 = 100;
  const alpha = 0.995;
  let temperature = T0;

  for (let iter = 0; iter < maxIterations; iter++) {
    const neighbor = generateNeighbor(currentSchedule, initial.rooms, initial.services, initial.constraints);
    const neighborEval = await evaluateAll(neighbor, mergedCriteria, context);

    const delta = neighborEval.totalScore - currentEval.totalScore;

    // Accept if better, or probabilistically if worse (SA)
    if (delta > 0 || Math.random() < Math.exp(delta / temperature)) {
      currentSchedule = neighbor;
      currentEval = neighborEval;
    }

    // Track best
    if (currentEval.totalScore > bestEval.totalScore) {
      // Prefer solutions that meet all hard constraints
      if (currentEval.hardConstraintsMet || !bestEval.hardConstraintsMet) {
        bestSchedule = currentSchedule;
        bestEval = currentEval;
      }
    }

    temperature *= alpha;
  }

  // Compare optimal vs initial
  const comparison = compare(bestSchedule, context.currentSessions.length > 0 ? context.currentSessions : initial.sessions);

  // Persist result
  const result = await OptimizationResult.create({
    cutoffDate: parsedCutoff,
    criteriaUsed: mergedCriteria,
    optimalSchedule: bestSchedule,
    scores: bestEval,
    comparison,
    config: {
      useCurrentAllocation,
      usePredictions,
      maxIterations,
    },
  });

  return {
    id: result._id,
    cutoffDate: parsedCutoff,
    criteriaUsed: mergedCriteria.filter((c) => c.isSelected),
    scores: bestEval,
    comparison,
    optimalSchedule: bestSchedule,
    iterations: maxIterations,
    improvement: bestEval.totalScore - (await evaluateAll(context.currentSessions.length > 0 ? context.currentSessions : initial.sessions, mergedCriteria, context)).totalScore,
    hardConstraintsMet: bestEval.hardConstraintsMet,
    totalSessions: bestSchedule.length,
  };
}

module.exports = { optimize };
