const LearnedConstraint = require('../../models/LearnedConstraint');
const OperatingRoom = require('../../models/OperatingRoom');
const SurgicalService = require('../../models/SurgicalService');
const { mineAssociationRules } = require('./associationRulesMiner');
const { clusterPatterns } = require('./patternClusterer');
const { buildDecisionTree } = require('./decisionTreeBuilder');
const { detectAnomalies } = require('./anomalyDetector');

/**
 * Orchestrator that runs all learning methods, classifies results as
 * explicit or discovered constraints, and persists them in LearnedConstraint.
 */
async function learnFromHistory(options = {}) {
  const {
    runAssociationRules = true,
    runClustering = true,
    runDecisionTree = true,
    runAnomalyDetection = true,
    minSupport = 0.05,
    minConfidence = 0.6,
  } = options;

  // 1. Gather explicit constraints from config
  const explicitConstraints = await extractExplicitConstraints();

  // 2. Run learning algorithms in parallel
  const tasks = {};
  if (runAssociationRules) {
    tasks.associationRules = mineAssociationRules({ minSupport, minConfidence });
  }
  if (runClustering) {
    tasks.clustering = clusterPatterns({ k: 5 });
  }
  if (runDecisionTree) {
    tasks.decisionTree = buildDecisionTree({ maxDepth: 4, target: 'room' });
  }
  if (runAnomalyDetection) {
    tasks.anomalyDetection = detectAnomalies();
  }

  const keys = Object.keys(tasks);
  const results = await Promise.all(Object.values(tasks));
  const rawResults = {};
  keys.forEach((k, i) => { rawResults[k] = results[i]; });

  // 3. Convert algorithm outputs into LearnedConstraint records
  const discovered = [];

  // From association rules
  if (rawResults.associationRules) {
    for (const rule of rawResults.associationRules.rules) {
      discovered.push(buildConstraint({
        type: 'discovered',
        category: classifyRule(rule),
        description: ruleToDescription(rule),
        rule: { antecedent: rule.antecedent, consequent: rule.consequent },
        support: rule.support,
        confidence: rule.confidence,
        lift: rule.lift,
        discoveryMethod: 'association_rules',
      }));
    }
  }

  // From clustering: outliers become constraints
  if (rawResults.clustering) {
    for (const outlier of rawResults.clustering.outliers) {
      discovered.push(buildConstraint({
        type: 'discovered',
        category: 'combination',
        description: `Sesión atípica: ${outlier.service} en ${outlier.room} (${outlier.sessionType}, ${outlier.duration}min)`,
        rule: { outlier },
        support: outlier.distance,
        confidence: Math.min(0.9, 0.5 + outlier.distance * 0.3),
        discoveryMethod: 'clustering',
      }));
    }

    // Cluster profiles as soft constraints
    for (const cluster of rawResults.clustering.clusters) {
      if (cluster.size >= 10 && cluster.topServices.length > 0) {
        discovered.push(buildConstraint({
          type: 'discovered',
          category: 'combination',
          description: `Patrón típico: ${cluster.topServices.map((s) => s.key).join(', ')} en ${cluster.topRooms.map((r) => r.key).join(', ')} (duración media ${cluster.avgDuration}min)`,
          rule: { clusterProfile: cluster },
          support: cluster.size / rawResults.clustering.totalPoints,
          confidence: 0.7,
          discoveryMethod: 'clustering',
        }));
      }
    }
  }

  // From decision tree rules
  if (rawResults.decisionTree) {
    for (const rule of rawResults.decisionTree.rules) {
      const support = rule.support / rawResults.decisionTree.totalSamples;
      if (support < 0.01) continue; // Skip very weak rules
      discovered.push(buildConstraint({
        type: 'discovered',
        category: classifyTreeRule(rule),
        description: rule.description,
        rule: { conditions: rule.conditions, prediction: rule.prediction },
        support: Math.round(support * 1000) / 1000,
        confidence: Math.min(0.95, 0.5 + support * 2),
        discoveryMethod: 'decision_tree',
      }));
    }
  }

  // From anomaly detection
  if (rawResults.anomalyDetection) {
    for (const anomaly of rawResults.anomalyDetection.anomalies) {
      discovered.push(buildConstraint({
        type: 'discovered',
        category: anomaly.category,
        description: anomaly.description,
        rule: { anomalyType: anomaly.type, details: anomaly.details },
        support: anomaly.score,
        confidence: anomaly.score,
        discoveryMethod: 'anomaly_detection',
      }));
    }
  }

  // 4. Persist: clear old unvalidated, keep validated, insert new
  await LearnedConstraint.deleteMany({ isValidated: false });

  const allConstraints = [...explicitConstraints, ...discovered];
  if (allConstraints.length > 0) {
    await LearnedConstraint.insertMany(allConstraints, { ordered: false }).catch(() => {});
  }

  // 5. Build summary
  const total = await LearnedConstraint.countDocuments();
  const summary = {
    total,
    explicit: await LearnedConstraint.countDocuments({ type: 'explicit' }),
    discovered: await LearnedConstraint.countDocuments({ type: 'discovered' }),
    validated: await LearnedConstraint.countDocuments({ isValidated: true }),
    byMethod: await LearnedConstraint.aggregate([
      { $group: { _id: '$discoveryMethod', count: { $sum: 1 } } },
    ]),
    byCategory: await LearnedConstraint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    rawResults: {
      associationRules: rawResults.associationRules ? { rulesFound: rawResults.associationRules.rules.length, transactions: rawResults.associationRules.totalTransactions } : null,
      clustering: rawResults.clustering ? { clusters: rawResults.clustering.clusters.length, outliers: rawResults.clustering.outliers.length } : null,
      decisionTree: rawResults.decisionTree ? { rulesExtracted: rawResults.decisionTree.rules.length, featureImportance: rawResults.decisionTree.featureImportance } : null,
      anomalyDetection: rawResults.anomalyDetection ? { anomaliesFound: rawResults.anomalyDetection.anomalies.length } : null,
    },
  };

  return summary;
}

/**
 * Extracts explicit constraints from the OperatingRoom and SurgicalService configuration.
 */
async function extractExplicitConstraints() {
  const rooms = await OperatingRoom.find({ active: true }).populate('allowedServices', 'code name').lean();
  const services = await SurgicalService.find({ active: true }).lean();
  const constraints = [];

  for (const room of rooms) {
    // Room-service allowed list
    if (room.allowedServices?.length > 0) {
      const allowedNames = room.allowedServices.map((s) => s.name).join(', ');
      constraints.push(buildConstraint({
        type: 'explicit',
        category: 'room',
        description: `${room.name} solo permite: ${allowedNames}`,
        rule: { roomCode: room.code, allowedServices: room.allowedServices.map((s) => s.code) },
        support: 1.0,
        confidence: 1.0,
        discoveryMethod: 'manual',
        relatedRooms: [room._id],
        relatedServices: room.allowedServices.map((s) => s._id),
      }));
    }

    // Session type restrictions
    if (room.allowedSessionTypes?.length > 0 && room.allowedSessionTypes.length < 3) {
      constraints.push(buildConstraint({
        type: 'explicit',
        category: 'session',
        description: `${room.name} solo opera en sesiones: ${room.allowedSessionTypes.join(', ')}`,
        rule: { roomCode: room.code, allowedSessionTypes: room.allowedSessionTypes },
        support: 1.0,
        confidence: 1.0,
        discoveryMethod: 'manual',
        relatedRooms: [room._id],
      }));
    }
  }

  return constraints;
}

function buildConstraint(data) {
  return {
    type: data.type,
    category: data.category || 'unknown',
    description: data.description,
    rule: data.rule,
    support: data.support || 0,
    confidence: data.confidence || 0,
    lift: data.lift,
    discoveryMethod: data.discoveryMethod,
    relatedServices: data.relatedServices || [],
    relatedRooms: data.relatedRooms || [],
    isValidated: data.type === 'explicit',
    activeInOptimization: data.type === 'explicit',
  };
}

function classifyRule(rule) {
  const items = [...rule.antecedent, ...rule.consequent];
  if (items.some((i) => i.startsWith('room:'))) return 'room';
  if (items.some((i) => i.startsWith('session:'))) return 'session';
  if (items.some((i) => i.startsWith('day:'))) return 'temporal';
  return 'combination';
}

function classifyTreeRule(rule) {
  if (rule.conditions.some((c) => c.feature === 'sessionType')) return 'session';
  if (rule.conditions.some((c) => c.feature === 'dayOfWeek')) return 'temporal';
  if (rule.conditions.some((c) => c.feature === 'durationBucket')) return 'temporal';
  return 'room';
}

function ruleToDescription(rule) {
  const ant = rule.antecedent.map(itemLabel).join(' Y ');
  const cons = rule.consequent.map(itemLabel).join(' Y ');
  return `Si ${ant} → entonces ${cons} (confianza ${Math.round(rule.confidence * 100)}%, lift ${rule.lift})`;
}

function itemLabel(item) {
  const [type, value] = item.split(':');
  const labels = { service: 'servicio', room: 'quirófano', session: 'sesión', day: 'día', priority: 'prioridad' };
  const sessionLabels = { morning: 'Mañana', afternoon: 'Tarde', continuous: 'Continuada' };
  const displayValue = sessionLabels[value] || value;
  return `${labels[type] || type}=${displayValue}`;
}

/**
 * Returns a summary of all learned constraints.
 */
async function getSummary() {
  const [total, byType, byCategory, byMethod, validated] = await Promise.all([
    LearnedConstraint.countDocuments(),
    LearnedConstraint.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
    LearnedConstraint.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    LearnedConstraint.aggregate([{ $group: { _id: '$discoveryMethod', count: { $sum: 1 } } }]),
    LearnedConstraint.countDocuments({ isValidated: true }),
  ]);

  return { total, validated, byType, byCategory, byMethod };
}

module.exports = { learnFromHistory, getSummary };
