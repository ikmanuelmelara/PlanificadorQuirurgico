const HistoricalActivity = require('../../models/HistoricalActivity');

/**
 * Simplified K-Means clustering on historical sessions.
 * Groups sessions by numerical features and identifies outliers via DBSCAN-like approach.
 */
async function clusterPatterns(options = {}) {
  const { k = 5, maxIterations = 50, outlierStdDevs = 2.5 } = options;

  const activities = await HistoricalActivity.find({ outcome: 'completed' })
    .populate('surgicalService', 'code name')
    .populate('operatingRoom', 'code name')
    .lean();

  if (activities.length < k * 3) {
    return { clusters: [], outliers: [], message: 'Insufficient data for clustering' };
  }

  // Feature extraction: numeric vectors
  const sessionTypeMap = { morning: 0, afternoon: 1, continuous: 2 };
  const dayMap = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };

  const dataPoints = activities.map((a) => ({
    id: a._id,
    features: [
      a.actualDurationMinutes || a.plannedDurationMinutes || 60,
      sessionTypeMap[a.sessionType] ?? 0,
      a.date ? dayMap[new Date(a.date).getDay()] : 0,
      a.wasEmergency ? 1 : 0,
    ],
    meta: {
      service: a.surgicalService?.code,
      serviceName: a.surgicalService?.name,
      room: a.operatingRoom?.code,
      sessionType: a.sessionType,
      duration: a.actualDurationMinutes || a.plannedDurationMinutes,
      date: a.date,
    },
  }));

  // Normalize features
  const dim = dataPoints[0].features.length;
  const mins = Array(dim).fill(Infinity);
  const maxs = Array(dim).fill(-Infinity);
  for (const dp of dataPoints) {
    for (let i = 0; i < dim; i++) {
      mins[i] = Math.min(mins[i], dp.features[i]);
      maxs[i] = Math.max(maxs[i], dp.features[i]);
    }
  }
  for (const dp of dataPoints) {
    dp.norm = dp.features.map((v, i) => maxs[i] - mins[i] > 0 ? (v - mins[i]) / (maxs[i] - mins[i]) : 0);
  }

  // K-Means
  // Initialize centroids via K-Means++ style
  const centroids = [dataPoints[Math.floor(Math.random() * dataPoints.length)].norm.slice()];
  while (centroids.length < k) {
    const dists = dataPoints.map((dp) => {
      const minDist = Math.min(...centroids.map((c) => euclidean(dp.norm, c)));
      return minDist * minDist;
    });
    const totalDist = dists.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalDist;
    for (let i = 0; i < dists.length; i++) {
      r -= dists[i];
      if (r <= 0) { centroids.push(dataPoints[i].norm.slice()); break; }
    }
  }

  let assignments = new Array(dataPoints.length).fill(0);
  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign points to nearest centroid
    const newAssignments = dataPoints.map((dp) => {
      let minDist = Infinity, best = 0;
      for (let c = 0; c < centroids.length; c++) {
        const d = euclidean(dp.norm, centroids[c]);
        if (d < minDist) { minDist = d; best = c; }
      }
      return best;
    });

    // Check convergence
    const changed = newAssignments.some((a, i) => a !== assignments[i]);
    assignments = newAssignments;
    if (!changed) break;

    // Recompute centroids
    for (let c = 0; c < k; c++) {
      const members = dataPoints.filter((_, i) => assignments[i] === c);
      if (members.length === 0) continue;
      for (let d = 0; d < dim; d++) {
        centroids[c][d] = members.reduce((s, m) => s + m.norm[d], 0) / members.length;
      }
    }
  }

  // Build cluster summaries
  const clusters = [];
  for (let c = 0; c < k; c++) {
    const members = dataPoints.filter((_, i) => assignments[i] === c);
    if (members.length === 0) continue;

    const services = {};
    const rooms = {};
    const sessionTypes = {};
    let totalDuration = 0;
    for (const m of members) {
      services[m.meta.service] = (services[m.meta.service] || 0) + 1;
      rooms[m.meta.room] = (rooms[m.meta.room] || 0) + 1;
      sessionTypes[m.meta.sessionType] = (sessionTypes[m.meta.sessionType] || 0) + 1;
      totalDuration += m.meta.duration || 0;
    }

    clusters.push({
      id: c,
      size: members.length,
      avgDuration: Math.round(totalDuration / members.length),
      topServices: topN(services, 3),
      topRooms: topN(rooms, 3),
      sessionTypes: topN(sessionTypes, 3),
      centroid: centroids[c].map((v) => Math.round(v * 1000) / 1000),
    });
  }

  // Outlier detection: points far from their centroid
  const distances = dataPoints.map((dp, i) => ({
    point: dp,
    cluster: assignments[i],
    distance: euclidean(dp.norm, centroids[assignments[i]]),
  }));
  const meanDist = distances.reduce((s, d) => s + d.distance, 0) / distances.length;
  const stdDist = Math.sqrt(distances.reduce((s, d) => s + (d.distance - meanDist) ** 2, 0) / distances.length);
  const threshold = meanDist + outlierStdDevs * stdDist;

  const outliers = distances
    .filter((d) => d.distance > threshold)
    .map((d) => ({
      ...d.point.meta,
      distance: Math.round(d.distance * 1000) / 1000,
      cluster: d.cluster,
    }));

  clusters.sort((a, b) => b.size - a.size);

  return {
    clusters,
    outliers,
    totalPoints: dataPoints.length,
    params: { k, outlierStdDevs },
  };
}

function euclidean(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

function topN(obj, n) {
  return Object.entries(obj)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

module.exports = { clusterPatterns };
