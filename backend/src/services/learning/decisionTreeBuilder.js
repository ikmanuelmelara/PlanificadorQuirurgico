const HistoricalActivity = require('../../models/HistoricalActivity');

/**
 * Simplified decision tree (ID3-style) for extracting interpretable IF-THEN rules.
 * Predicts: which operating room a service should use, expected session type, etc.
 */
async function buildDecisionTree(options = {}) {
  const { maxDepth = 4, minSamples = 5, target = 'room' } = options;

  const activities = await HistoricalActivity.find({ outcome: 'completed' })
    .populate('surgicalService', 'code name')
    .populate('operatingRoom', 'code name')
    .lean();

  if (activities.length < 20) {
    return { tree: null, rules: [], message: 'Insufficient data for decision tree' };
  }

  // Build dataset: rows of categorical features -> target
  const dataset = activities.map((a) => ({
    service: a.surgicalService?.code || 'unknown',
    sessionType: a.sessionType || 'morning',
    dayOfWeek: a.date ? ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'][new Date(a.date).getDay()] : 'lun',
    priority: a.priority || 'referenciaP3',
    durationBucket: durationBucket(a.actualDurationMinutes || a.plannedDurationMinutes || 60),
    // Targets
    room: a.operatingRoom?.code || 'unknown',
  }));

  const features = ['service', 'sessionType', 'dayOfWeek', 'priority', 'durationBucket'].filter((f) => f !== target);

  // Build tree recursively
  const tree = buildNode(dataset, features, target, 0, maxDepth, minSamples);

  // Extract rules from tree
  const rules = [];
  extractRules(tree, [], rules, target);

  // Compute feature importance (how often each feature is used as a split)
  const splitCounts = {};
  countSplits(tree, splitCounts);
  const totalSplits = Object.values(splitCounts).reduce((a, b) => a + b, 0) || 1;
  const featureImportance = Object.entries(splitCounts)
    .map(([feature, count]) => ({ feature, importance: Math.round((count / totalSplits) * 1000) / 1000 }))
    .sort((a, b) => b.importance - a.importance);

  return {
    tree: serializeTree(tree),
    rules: rules.slice(0, 50), // Limit to top 50 rules
    featureImportance,
    totalSamples: dataset.length,
    params: { maxDepth, minSamples, target },
  };
}

function durationBucket(minutes) {
  if (minutes <= 45) return 'short';
  if (minutes <= 90) return 'medium';
  if (minutes <= 150) return 'long';
  return 'very_long';
}

function entropy(data, target) {
  const counts = {};
  for (const row of data) {
    counts[row[target]] = (counts[row[target]] || 0) + 1;
  }
  let ent = 0;
  const total = data.length;
  for (const count of Object.values(counts)) {
    const p = count / total;
    if (p > 0) ent -= p * Math.log2(p);
  }
  return ent;
}

function bestSplit(data, features, target) {
  const baseEntropy = entropy(data, target);
  let bestGain = -1, bestFeature = null;

  for (const feature of features) {
    const groups = {};
    for (const row of data) {
      const val = row[feature];
      if (!groups[val]) groups[val] = [];
      groups[val].push(row);
    }

    let weightedEntropy = 0;
    for (const group of Object.values(groups)) {
      weightedEntropy += (group.length / data.length) * entropy(group, target);
    }

    const gain = baseEntropy - weightedEntropy;
    if (gain > bestGain) {
      bestGain = gain;
      bestFeature = feature;
    }
  }

  return { feature: bestFeature, gain: bestGain };
}

function majorityClass(data, target) {
  const counts = {};
  for (const row of data) {
    counts[row[target]] = (counts[row[target]] || 0) + 1;
  }
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0];
}

function buildNode(data, features, target, depth, maxDepth, minSamples) {
  // Base cases
  const classes = new Set(data.map((r) => r[target]));
  if (classes.size === 1) {
    return { type: 'leaf', value: data[0][target], count: data.length };
  }
  if (depth >= maxDepth || features.length === 0 || data.length < minSamples) {
    return { type: 'leaf', value: majorityClass(data, target), count: data.length };
  }

  const { feature, gain } = bestSplit(data, features, target);
  if (!feature || gain <= 0.01) {
    return { type: 'leaf', value: majorityClass(data, target), count: data.length };
  }

  // Split data by best feature
  const groups = {};
  for (const row of data) {
    const val = row[feature];
    if (!groups[val]) groups[val] = [];
    groups[val].push(row);
  }

  const remainingFeatures = features.filter((f) => f !== feature);
  const children = {};
  for (const [val, group] of Object.entries(groups)) {
    children[val] = buildNode(group, remainingFeatures, target, depth + 1, maxDepth, minSamples);
  }

  return { type: 'split', feature, gain: Math.round(gain * 1000) / 1000, children, count: data.length };
}

function extractRules(node, conditions, rules, target) {
  if (node.type === 'leaf') {
    if (conditions.length > 0) {
      rules.push({
        conditions: [...conditions],
        prediction: node.value,
        support: node.count,
        description: conditions.map((c) => `${c.feature}=${c.value}`).join(' AND ') + ` → ${target}=${node.value}`,
      });
    }
    return;
  }

  for (const [val, child] of Object.entries(node.children)) {
    extractRules(child, [...conditions, { feature: node.feature, value: val }], rules, target);
  }
}

function countSplits(node, counts) {
  if (node.type === 'leaf') return;
  counts[node.feature] = (counts[node.feature] || 0) + 1;
  for (const child of Object.values(node.children)) {
    countSplits(child, counts);
  }
}

function serializeTree(node, depth = 0) {
  if (node.type === 'leaf') {
    return { type: 'leaf', value: node.value, count: node.count, depth };
  }
  const children = {};
  for (const [val, child] of Object.entries(node.children)) {
    children[val] = serializeTree(child, depth + 1);
  }
  return { type: 'split', feature: node.feature, gain: node.gain, count: node.count, depth, children };
}

module.exports = { buildDecisionTree };
