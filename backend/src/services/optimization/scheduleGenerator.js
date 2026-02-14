const Session = require('../../models/Session');
const SurgicalService = require('../../models/SurgicalService');
const OperatingRoom = require('../../models/OperatingRoom');
const LearnedConstraint = require('../../models/LearnedConstraint');

/**
 * Generates the initial schedule, either from current sessions or from scratch.
 */
async function generateInitial(cutoffDate, useCurrentAllocation = true) {
  const services = await SurgicalService.find({ active: true }).lean();
  const rooms = await OperatingRoom.find({ active: true }).populate('allowedServices', 'code name').lean();
  const constraints = await LearnedConstraint.find({ activeInOptimization: true }).lean();

  if (useCurrentAllocation) {
    const current = await Session.find({ source: 'current' })
      .populate('surgicalService', 'code name')
      .populate('operatingRoom', 'code name')
      .lean();

    if (current.length > 0) {
      return {
        sessions: current.map((s) => toScheduleEntry(s)),
        services,
        rooms,
        constraints,
      };
    }
  }

  // Generate from scratch: fill available room-day-type slots
  const now = new Date();
  const planningDays = Math.ceil((cutoffDate - now) / (1000 * 60 * 60 * 24));
  const sessions = [];

  for (let d = 0; d < planningDays; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue; // Skip weekends

    for (const room of rooms) {
      const allowedTypes = room.allowedSessionTypes?.length > 0
        ? room.allowedSessionTypes
        : ['morning', 'afternoon'];

      for (const type of allowedTypes) {
        // Pick a random allowed service for this room
        const allowedServices = room.allowedServices || [];
        if (allowedServices.length === 0) continue;

        const svc = allowedServices[Math.floor(Math.random() * allowedServices.length)];

        sessions.push({
          operatingRoom: String(room._id),
          operatingRoomCode: room.code,
          operatingRoomName: room.name,
          surgicalService: String(svc._id),
          surgicalServiceCode: svc.code,
          surgicalServiceName: svc.name,
          date: date.toISOString().split('T')[0],
          type,
          source: 'optimized',
          isChanged: true,
        });
      }
    }
  }

  return { sessions, services, rooms, constraints };
}

/**
 * Generates a neighbor solution by applying a random mutation.
 * Mutations: swap service, change session type, add/remove session.
 */
function generateNeighbor(schedule, rooms, services, constraints) {
  const sessions = schedule.map((s) => ({ ...s }));
  if (sessions.length === 0) return sessions;

  const mutation = Math.random();

  if (mutation < 0.4) {
    // Swap: change the service assigned to a random session
    swapService(sessions, rooms, services, constraints);
  } else if (mutation < 0.7) {
    // Change type: switch session type (morning <-> afternoon)
    changeType(sessions, rooms);
  } else if (mutation < 0.85 && sessions.length > 5) {
    // Remove: remove a random session
    const idx = Math.floor(Math.random() * sessions.length);
    sessions.splice(idx, 1);
  } else {
    // Add: duplicate a random session with a different service
    addSession(sessions, rooms, services);
  }

  return sessions;
}

function swapService(sessions, rooms, services, constraints) {
  const idx = Math.floor(Math.random() * sessions.length);
  const session = sessions[idx];
  const room = rooms.find((r) => String(r._id) === session.operatingRoom || r.code === session.operatingRoomCode);
  if (!room) return;

  const allowed = (room.allowedServices || []).filter((s) => {
    const sCode = s.code || s;
    return sCode !== session.surgicalServiceCode;
  });
  if (allowed.length === 0) return;

  // Check learned constraints
  const pick = allowed[Math.floor(Math.random() * allowed.length)];
  const svc = services.find((s) => String(s._id) === String(pick._id || pick));
  if (!svc) return;

  // Check if any constraint forbids this combination
  const forbidden = constraints.some((c) => {
    if (c.category === 'combination' && c.rule?.anomalyType === 'never_used_combination') {
      return c.rule.details?.service === svc.code && c.rule.details?.room === room.code;
    }
    return false;
  });

  if (!forbidden) {
    session.surgicalService = String(svc._id);
    session.surgicalServiceCode = svc.code;
    session.surgicalServiceName = svc.name;
    session.isChanged = true;
  }
}

function changeType(sessions, rooms) {
  const idx = Math.floor(Math.random() * sessions.length);
  const session = sessions[idx];
  const room = rooms.find((r) => String(r._id) === session.operatingRoom || r.code === session.operatingRoomCode);
  const allowedTypes = room?.allowedSessionTypes?.length > 0
    ? room.allowedSessionTypes
    : ['morning', 'afternoon'];

  const otherTypes = allowedTypes.filter((t) => t !== session.type);
  if (otherTypes.length === 0) return;

  // Check no duplicate room+date+type
  const newType = otherTypes[Math.floor(Math.random() * otherTypes.length)];
  const conflict = sessions.some((s, i) =>
    i !== idx && s.operatingRoomCode === session.operatingRoomCode && s.date === session.date && s.type === newType
  );
  if (!conflict) {
    session.type = newType;
    session.isChanged = true;
  }
}

function addSession(sessions, rooms, services) {
  if (sessions.length === 0) return;

  const template = sessions[Math.floor(Math.random() * sessions.length)];
  const room = rooms.find((r) => String(r._id) === template.operatingRoom || r.code === template.operatingRoomCode);
  if (!room) return;

  const allowed = room.allowedServices || [];
  if (allowed.length === 0) return;

  const svc = allowed[Math.floor(Math.random() * allowed.length)];
  const fullSvc = services.find((s) => String(s._id) === String(svc._id || svc));
  if (!fullSvc) return;

  const types = ['morning', 'afternoon'];
  const newType = types[Math.floor(Math.random() * types.length)];

  // Check no duplicate
  const conflict = sessions.some((s) =>
    s.operatingRoomCode === template.operatingRoomCode && s.date === template.date && s.type === newType
  );

  if (!conflict) {
    sessions.push({
      operatingRoom: template.operatingRoom,
      operatingRoomCode: template.operatingRoomCode,
      operatingRoomName: template.operatingRoomName,
      surgicalService: String(fullSvc._id),
      surgicalServiceCode: fullSvc.code,
      surgicalServiceName: fullSvc.name,
      date: template.date,
      type: newType,
      source: 'optimized',
      isChanged: true,
    });
  }
}

function toScheduleEntry(session) {
  return {
    operatingRoom: String(session.operatingRoom?._id || session.operatingRoom),
    operatingRoomCode: session.operatingRoom?.code || '',
    operatingRoomName: session.operatingRoom?.name || '',
    surgicalService: String(session.surgicalService?._id || session.surgicalService),
    surgicalServiceCode: session.surgicalService?.code || '',
    surgicalServiceName: session.surgicalService?.name || '',
    date: session.date ? new Date(session.date).toISOString().split('T')[0] : '',
    type: session.type,
    source: session.source,
    isChanged: false,
  };
}

module.exports = { generateInitial, generateNeighbor };
