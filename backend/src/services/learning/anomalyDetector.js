const HistoricalActivity = require('../../models/HistoricalActivity');
const OperatingRoom = require('../../models/OperatingRoom');
const SurgicalService = require('../../models/SurgicalService');

/**
 * Detects anomalies and missing patterns (constraints by absence).
 * What NEVER happens is likely a constraint:
 *   - Service-room combinations that never appear
 *   - Session types never used by a service
 *   - Unusual duration outliers (Isolation Forest-like scoring)
 */
async function detectAnomalies(options = {}) {
  const { durationThresholdStdDevs = 2.0 } = options;

  const [activities, rooms, services] = await Promise.all([
    HistoricalActivity.find({ outcome: 'completed' })
      .populate('surgicalService', 'code name')
      .populate('operatingRoom', 'code name')
      .lean(),
    OperatingRoom.find({ active: true }).lean(),
    SurgicalService.find({ active: true }).lean(),
  ]);

  const anomalies = [];

  // 1. Never-used combinations (constraint by absence)
  const usedCombos = new Set();
  const serviceRoomCounts = {};
  for (const a of activities) {
    const sCode = a.surgicalService?.code;
    const rCode = a.operatingRoom?.code;
    if (sCode && rCode) {
      const key = `${sCode}|${rCode}`;
      usedCombos.add(key);
      serviceRoomCounts[key] = (serviceRoomCounts[key] || 0) + 1;
    }
  }

  // Check which allowed room-service pairs never actually appear
  for (const room of rooms) {
    for (const svc of services) {
      const roomAllows = room.allowedServices?.some((id) => String(id) === String(svc._id));
      const key = `${svc.code}|${room.code}`;
      if (roomAllows && !usedCombos.has(key)) {
        anomalies.push({
          type: 'never_used_combination',
          category: 'combination',
          description: `${svc.name} tiene permitido el ${room.name} pero nunca lo ha usado`,
          details: { service: svc.code, serviceName: svc.name, room: room.code, roomName: room.name },
          score: 0.7,
          explanation: 'Combinación permitida pero ausente en el histórico — posible restricción implícita',
        });
      }
    }
  }

  // 2. Service-session-type never-used patterns
  const serviceSessionUsed = {};
  for (const a of activities) {
    const sCode = a.surgicalService?.code;
    if (sCode && a.sessionType) {
      const key = `${sCode}|${a.sessionType}`;
      serviceSessionUsed[key] = (serviceSessionUsed[key] || 0) + 1;
    }
  }
  for (const svc of services) {
    for (const st of ['morning', 'afternoon', 'continuous']) {
      const key = `${svc.code}|${st}`;
      if (!serviceSessionUsed[key] && activities.length > 50) {
        anomalies.push({
          type: 'never_used_session_type',
          category: 'session',
          description: `${svc.name} nunca opera en sesión ${sessionTypeLabel(st)}`,
          details: { service: svc.code, serviceName: svc.name, sessionType: st },
          score: 0.6,
          explanation: 'Tipo de sesión nunca utilizado por este servicio — posible restricción temporal',
        });
      }
    }
  }

  // 3. Duration outliers (z-score based, like simplified Isolation Forest)
  const serviceStats = {};
  for (const a of activities) {
    const sCode = a.surgicalService?.code;
    const dur = a.actualDurationMinutes;
    if (sCode && dur) {
      if (!serviceStats[sCode]) serviceStats[sCode] = { durations: [], name: a.surgicalService?.name };
      serviceStats[sCode].durations.push(dur);
    }
  }

  const durationAnomalies = [];
  for (const [sCode, stats] of Object.entries(serviceStats)) {
    const durations = stats.durations;
    if (durations.length < 10) continue;
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    const std = Math.sqrt(durations.reduce((s, d) => s + (d - mean) ** 2, 0) / durations.length);
    if (std === 0) continue;

    // Find activities with extreme durations
    for (const a of activities) {
      if (a.surgicalService?.code !== sCode || !a.actualDurationMinutes) continue;
      const zScore = Math.abs(a.actualDurationMinutes - mean) / std;
      if (zScore > durationThresholdStdDevs) {
        durationAnomalies.push({
          type: 'duration_outlier',
          category: 'temporal',
          description: `Duración atípica: ${a.actualDurationMinutes}min en ${stats.name} (media: ${Math.round(mean)}min)`,
          details: {
            service: sCode,
            serviceName: stats.name,
            room: a.operatingRoom?.code,
            duration: a.actualDurationMinutes,
            mean: Math.round(mean),
            std: Math.round(std),
            zScore: Math.round(zScore * 100) / 100,
            date: a.date,
          },
          score: Math.min(1, 0.3 + zScore * 0.15),
          explanation: `Duración ${zScore.toFixed(1)} desviaciones del promedio del servicio`,
        });
      }
    }
  }

  // Limit duration anomalies to top 20 by score
  durationAnomalies.sort((a, b) => b.score - a.score);
  anomalies.push(...durationAnomalies.slice(0, 20));

  // 4. Rarely used combinations (very low frequency)
  const totalActivities = activities.length;
  for (const [key, count] of Object.entries(serviceRoomCounts)) {
    const ratio = count / totalActivities;
    if (ratio < 0.005 && count <= 2) {
      const [sCode, rCode] = key.split('|');
      const svc = services.find((s) => s.code === sCode);
      const room = rooms.find((r) => r.code === rCode);
      if (svc && room) {
        anomalies.push({
          type: 'rare_combination',
          category: 'combination',
          description: `${svc.name} en ${room.name}: solo ${count} vez(es) en el histórico`,
          details: { service: sCode, serviceName: svc.name, room: rCode, roomName: room.name, count, ratio: Math.round(ratio * 10000) / 100 },
          score: 0.5,
          explanation: 'Combinación extremadamente infrecuente — podría ser un error o excepción',
        });
      }
    }
  }

  anomalies.sort((a, b) => b.score - a.score);

  return {
    anomalies,
    totalActivitiesAnalyzed: activities.length,
    params: { durationThresholdStdDevs },
  };
}

function sessionTypeLabel(t) {
  return { morning: 'Mañana', afternoon: 'Tarde', continuous: 'Continuada' }[t] || t;
}

module.exports = { detectAnomalies };
