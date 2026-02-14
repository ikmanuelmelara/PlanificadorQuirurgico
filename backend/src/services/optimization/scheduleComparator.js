/**
 * Compares an optimal schedule against the current allocation.
 */
function compare(optimal, current) {
  const currentMap = buildMap(current);
  const optimalMap = buildMap(optimal);

  // Overall changes
  const allKeys = new Set([...currentMap.keys(), ...optimalMap.keys()]);
  let added = 0, removed = 0, modified = 0, unchanged = 0;

  for (const key of allKeys) {
    const cur = currentMap.get(key);
    const opt = optimalMap.get(key);
    if (!cur && opt) added++;
    else if (cur && !opt) removed++;
    else if (cur && opt && cur.surgicalServiceCode !== opt.surgicalServiceCode) modified++;
    else unchanged++;
  }

  const totalChanges = added + removed + modified;
  const totalSessions = Math.max(currentMap.size, optimalMap.size) || 1;

  // By service
  const serviceChanges = {};
  for (const s of current) {
    const code = s.surgicalServiceCode;
    if (!serviceChanges[code]) serviceChanges[code] = { service: code, name: s.surgicalServiceName, current: 0, optimal: 0 };
    serviceChanges[code].current++;
  }
  for (const s of optimal) {
    const code = s.surgicalServiceCode;
    if (!serviceChanges[code]) serviceChanges[code] = { service: code, name: s.surgicalServiceName, current: 0, optimal: 0 };
    serviceChanges[code].optimal++;
  }

  const byService = Object.values(serviceChanges).map((sc) => ({
    ...sc,
    added: Math.max(0, sc.optimal - sc.current),
    removed: Math.max(0, sc.current - sc.optimal),
    net: sc.optimal - sc.current,
  })).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

  // By room
  const roomChanges = {};
  for (const s of [...current, ...optimal]) {
    const code = s.operatingRoomCode;
    if (!roomChanges[code]) roomChanges[code] = { room: code, name: s.operatingRoomName, current: 0, optimal: 0 };
  }
  for (const s of current) roomChanges[s.operatingRoomCode].current++;
  for (const s of optimal) roomChanges[s.operatingRoomCode].optimal++;

  const byRoom = Object.values(roomChanges).map((rc) => ({
    ...rc,
    changes: rc.optimal - rc.current,
  })).sort((a, b) => Math.abs(b.changes) - Math.abs(a.changes));

  return {
    sessionsChanged: totalChanges,
    sessionsChangedPercent: Math.round((totalChanges / totalSessions) * 100),
    added,
    removed,
    modified,
    unchanged,
    totalCurrent: current.length,
    totalOptimal: optimal.length,
    byService,
    byRoom,
  };
}

function buildMap(sessions) {
  const map = new Map();
  for (const s of sessions) {
    const key = `${s.operatingRoomCode}|${s.date}|${s.type}`;
    map.set(key, s);
  }
  return map;
}

module.exports = { compare };
