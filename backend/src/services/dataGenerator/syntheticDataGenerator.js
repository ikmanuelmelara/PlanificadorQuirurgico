const mongoose = require('mongoose');
const SurgicalService = require('../../models/SurgicalService');
const OperatingRoom = require('../../models/OperatingRoom');
const Session = require('../../models/Session');
const WaitingList = require('../../models/WaitingList');
const HistoricalActivity = require('../../models/HistoricalActivity');
const EmergencyRecord = require('../../models/EmergencyRecord');
const ReferralRecord = require('../../models/ReferralRecord');
const DropoutRecord = require('../../models/DropoutRecord');
const Patient = require('../../models/fhir/Patient');
const ServiceRequest = require('../../models/fhir/ServiceRequest');
const { generateWaitingList } = require('./waitingListGenerator');
const presets = require('./configPresets');

// --- Helpers ---

function weightedRandom(distribution) {
  const r = Math.random();
  let cumulative = 0;
  for (const [key, weight] of Object.entries(distribution)) {
    cumulative += weight;
    if (r <= cumulative) return key;
  }
  return Object.keys(distribution).at(-1);
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function isWorkday(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

// --- Seed services & rooms ---

async function seedServicesAndRooms() {
  // Upsert surgical services
  const serviceMap = {};
  for (const svc of presets.SERVICES) {
    const existing = await SurgicalService.findOneAndUpdate(
      { code: svc.code },
      {
        $setOnInsert: {
          identifier: { system: 'urn:hospital:service', value: `SVC-${svc.code}` },
          name: svc.name,
          code: svc.code,
          specialties: svc.specialties,
          preferredSessionTypes: ['morning', 'afternoon'],
        },
      },
      { upsert: true, new: true },
    );
    serviceMap[svc.code] = existing;
  }

  // Upsert operating rooms, linking allowed services
  const roomMap = {};
  for (const room of presets.OPERATING_ROOMS) {
    const allowedServiceCodes = presets.ROOM_SERVICE_MAP[room.code] || [];
    const allowedServiceIds = allowedServiceCodes.map((c) => serviceMap[c]?._id).filter(Boolean);

    const existing = await OperatingRoom.findOneAndUpdate(
      { code: room.code },
      {
        $setOnInsert: {
          identifier: { system: 'urn:hospital:location', value: `ROOM-${room.code}` },
          name: room.name,
          code: room.code,
          floor: room.floor,
          wing: room.wing,
          equipment: room.equipment,
          allowedServices: allowedServiceIds,
          allowedSessionTypes: ['morning', 'afternoon', 'continuous'],
          weeklyAvailability: ['mon', 'tue', 'wed', 'thu', 'fri'].map((day) => ({
            dayOfWeek: day,
            available: true,
            sessions: ['morning', 'afternoon'],
          })),
        },
      },
      { upsert: true, new: true },
    );
    roomMap[room.code] = existing;
  }

  // Back-link allowedRooms into services
  for (const room of presets.OPERATING_ROOMS) {
    const allowedServiceCodes = presets.ROOM_SERVICE_MAP[room.code] || [];
    for (const svcCode of allowedServiceCodes) {
      const svc = serviceMap[svcCode];
      if (svc && !svc.allowedRooms.some((id) => id.equals(roomMap[room.code]._id))) {
        svc.allowedRooms.push(roomMap[room.code]._id);
        await svc.save();
      }
    }
  }

  return { serviceMap, roomMap };
}

// --- Generate historical activity ---

async function generateHistorical(serviceMap, roomMap, config) {
  const months = config.historicalMonths || presets.DEFAULT_VOLUMES.historicalMonths;
  const perDay = config.historicalPerDay || presets.DEFAULT_VOLUMES.historicalPerDay;
  const hCfg = presets.HISTORICAL_CONFIG;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const serviceCodes = Object.keys(serviceMap);
  const roomCodes = Object.keys(roomMap);
  const records = [];
  let counter = 0;

  const current = new Date(startDate);
  while (current <= endDate) {
    if (isWorkday(current)) {
      const todayCount = perDay + randomInt(-3, 3);
      for (let i = 0; i < todayCount; i++) {
        counter++;
        const svcCode = weightedRandom(presets.SERVICE_DISTRIBUTION);
        if (!serviceMap[svcCode]) continue;

        // Pick a room that allows this service
        const allowedRoomCodes = roomCodes.filter((rc) =>
          (presets.ROOM_SERVICE_MAP[rc] || []).includes(svcCode),
        );
        const roomCode = allowedRoomCodes.length > 0 ? randomElement(allowedRoomCodes) : randomElement(roomCodes);

        const priority = weightedRandom(presets.PRIORITY_DISTRIBUTION);
        const sessionType = weightedRandom(hCfg.sessionTypeDistribution);
        const procedures = presets.PROCEDURES[svcCode] || [{ code: 'GEN', display: 'General' }];
        const procedure = randomElement(procedures);
        const baseDuration = serviceMap[svcCode].avgDurations?.[priority] || 90;
        const planned = baseDuration + randomInt(-10, 20);
        const variance = Math.round(planned * hCfg.durationVariance * (Math.random() * 2 - 1));
        const actual = Math.max(30, planned + variance);

        records.push({
          identifier: { system: 'urn:hospital:activity', value: `ACT-${String(counter).padStart(6, '0')}` },
          date: new Date(current),
          operatingRoom: roomMap[roomCode]._id,
          surgicalService: serviceMap[svcCode]._id,
          sessionType,
          priority,
          procedure,
          plannedDurationMinutes: planned,
          actualDurationMinutes: actual,
          wasEmergency: Math.random() < hCfg.emergencyRate,
          outcome: weightedRandom(hCfg.outcomeDistribution),
        });
      }
    }
    current.setDate(current.getDate() + 1);
  }

  const saved = await HistoricalActivity.insertMany(records);
  return saved;
}

// --- Generate emergency records ---

async function generateEmergencies(serviceMap, roomMap, config) {
  const count = config.emergencies || presets.DEFAULT_VOLUMES.emergencies;
  const eCfg = presets.EMERGENCY_CONFIG;
  const serviceCodes = Object.keys(serviceMap);
  const roomCodes = Object.keys(roomMap);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - (config.historicalMonths || 12));

  const records = [];
  for (let i = 0; i < count; i++) {
    const svcCode = weightedRandom(presets.SERVICE_DISTRIBUTION);
    if (!serviceMap[svcCode]) continue;

    const arrivalDate = randomDate(startDate, endDate);
    const emergencyType = weightedRandom(eCfg.typeDistribution);
    const status = weightedRandom(eCfg.statusDistribution);

    const allowedRoomCodes = roomCodes.filter((rc) =>
      (presets.ROOM_SERVICE_MAP[rc] || []).includes(svcCode),
    );
    const roomCode = allowedRoomCodes.length > 0 ? randomElement(allowedRoomCodes) : randomElement(roomCodes);
    const procedures = presets.PROCEDURES[svcCode] || [{ code: 'GEN', display: 'General' }];
    const procedure = randomElement(procedures);

    const surgeryDate = status === 'completed' ? new Date(arrivalDate.getTime() + randomInt(0, 48) * 3600000) : undefined;

    records.push({
      identifier: { system: 'urn:hospital:emergency', value: `EMG-${String(i + 1).padStart(6, '0')}` },
      emergencyType,
      patientIdentifier: `PAT-EMG-${String(i + 1).padStart(5, '0')}`,
      surgicalService: serviceMap[svcCode]._id,
      procedure,
      diagnosis: { code: `DX-${procedure.code}`, display: `Urgencia ${procedure.display}` },
      arrivalDate,
      surgeryDate,
      durationMinutes: randomInt(45, 240),
      operatingRoom: roomMap[roomCode]._id,
      sessionType: randomElement(['morning', 'afternoon', 'continuous']),
      status,
    });
  }

  return EmergencyRecord.insertMany(records);
}

// --- Generate referral records ---

async function generateReferrals(serviceMap, config) {
  const count = config.referrals || presets.DEFAULT_VOLUMES.referrals;
  const rCfg = presets.REFERRAL_CONFIG;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - (config.historicalMonths || 12));

  const records = [];
  for (let i = 0; i < count; i++) {
    const svcCode = weightedRandom(presets.SERVICE_DISTRIBUTION);
    if (!serviceMap[svcCode]) continue;

    const priority = weightedRandom(presets.PRIORITY_DISTRIBUTION);
    const referralDate = randomDate(startDate, endDate);

    records.push({
      identifier: { system: 'urn:hospital:referral', value: `REF-${String(i + 1).padStart(6, '0')}` },
      patientIdentifier: `PAT-REF-${String(i + 1).padStart(5, '0')}`,
      surgicalService: serviceMap[svcCode]._id,
      referralDate,
      reason: weightedRandom(rCfg.reasonDistribution),
      destinationCenter: randomElement(rCfg.destinations),
      priority,
      daysInWaitingListAtReferral: randomInt(30, 400),
      status: 'referred',
    });
  }

  return ReferralRecord.insertMany(records);
}

// --- Generate dropout records ---

async function generateDropouts(serviceMap, config) {
  const count = config.dropouts || presets.DEFAULT_VOLUMES.dropouts;
  const dCfg = presets.DROPOUT_CONFIG;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - (config.historicalMonths || 12));

  const records = [];
  for (let i = 0; i < count; i++) {
    const svcCode = weightedRandom(presets.SERVICE_DISTRIBUTION);
    if (!serviceMap[svcCode]) continue;

    const priority = weightedRandom(presets.PRIORITY_DISTRIBUTION);
    const dropoutDate = randomDate(startDate, endDate);
    const daysInList = randomInt(10, 300);
    const entryDate = new Date(dropoutDate);
    entryDate.setDate(entryDate.getDate() - daysInList);

    const maxDays = WaitingList.PRIORITIES[priority]?.maxDays || 180;

    records.push({
      identifier: { system: 'urn:hospital:dropout', value: `DRP-${String(i + 1).padStart(6, '0')}` },
      patientIdentifier: `PAT-DRP-${String(i + 1).padStart(5, '0')}`,
      surgicalService: serviceMap[svcCode]._id,
      dropoutDate,
      reason: weightedRandom(dCfg.reasonDistribution),
      priority,
      entryDate,
      daysInWaitingListAtDropout: daysInList,
      wasOutOfGuarantee: daysInList > maxDays,
    });
  }

  return DropoutRecord.insertMany(records);
}

// --- Generate current sessions (planilla actual) ---

async function generateCurrentSessions(serviceMap, roomMap, config) {
  const weeksAhead = config.planningWeeks || 4;
  const records = [];
  let counter = 0;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // Start next Monday
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + weeksAhead * 7);

  const serviceCodes = Object.keys(serviceMap);
  const roomCodes = Object.keys(roomMap);

  const current = new Date(startDate);
  while (current < endDate) {
    if (isWorkday(current)) {
      for (const roomCode of roomCodes) {
        // Each room gets 1-2 sessions per day
        const sessionTypes = Math.random() < 0.3
          ? ['morning', 'afternoon']
          : [Math.random() < 0.6 ? 'morning' : 'afternoon'];

        for (const sType of sessionTypes) {
          counter++;
          const allowedSvcCodes = (presets.ROOM_SERVICE_MAP[roomCode] || []).filter(
            (c) => serviceMap[c],
          );
          const svcCode = allowedSvcCodes.length > 0 ? randomElement(allowedSvcCodes) : randomElement(serviceCodes);

          records.push({
            identifier: { system: 'urn:hospital:session', value: `SES-${String(counter).padStart(6, '0')}` },
            operatingRoom: roomMap[roomCode]._id,
            surgicalService: serviceMap[svcCode]._id,
            date: new Date(current),
            type: sType,
            source: 'current',
          });
        }
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return Session.insertMany(records);
}

// --- Orchestrator ---

async function clearAllData() {
  await Promise.all([
    Patient.deleteMany({}),
    ServiceRequest.deleteMany({}),
    WaitingList.deleteMany({}),
    HistoricalActivity.deleteMany({}),
    EmergencyRecord.deleteMany({}),
    ReferralRecord.deleteMany({}),
    DropoutRecord.deleteMany({}),
    Session.deleteMany({}),
    SurgicalService.deleteMany({}),
    OperatingRoom.deleteMany({}),
  ]);
}

async function generateAll(config = {}) {
  const startTime = Date.now();

  // 1. Clear existing data
  await clearAllData();

  // 2. Seed services and rooms
  const { serviceMap, roomMap } = await seedServicesAndRooms();

  // 3. Generate all datasets in parallel where possible
  const [wlResult, historical, emergencies, referrals, dropouts, sessions] = await Promise.all([
    generateWaitingList(serviceMap, config),
    generateHistorical(serviceMap, roomMap, config),
    generateEmergencies(serviceMap, roomMap, config),
    generateReferrals(serviceMap, config),
    generateDropouts(serviceMap, config),
    generateCurrentSessions(serviceMap, roomMap, config),
  ]);

  const elapsedMs = Date.now() - startTime;

  return {
    summary: {
      services: Object.keys(serviceMap).length,
      operatingRooms: Object.keys(roomMap).length,
      patients: wlResult.patients.length,
      waitingList: wlResult.waitingList.length,
      serviceRequests: wlResult.serviceRequests.length,
      historicalActivities: historical.length,
      emergencies: emergencies.length,
      referrals: referrals.length,
      dropouts: dropouts.length,
      sessions: sessions.length,
      elapsedMs,
    },
  };
}

async function getStatistics() {
  const [
    services, rooms, patients, waitingList, serviceRequests,
    historical, emergencies, referrals, dropouts, sessions,
  ] = await Promise.all([
    SurgicalService.countDocuments(),
    OperatingRoom.countDocuments(),
    Patient.countDocuments(),
    WaitingList.countDocuments(),
    ServiceRequest.countDocuments(),
    HistoricalActivity.countDocuments(),
    EmergencyRecord.countDocuments(),
    ReferralRecord.countDocuments(),
    DropoutRecord.countDocuments(),
    Session.countDocuments(),
  ]);

  // Waiting list breakdown
  const wlByPriority = await WaitingList.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$priority', count: { $sum: 1 } } },
  ]);
  const wlByService = await WaitingList.aggregate([
    { $match: { status: 'active' } },
    {
      $lookup: { from: 'surgicalservices', localField: 'surgicalService', foreignField: '_id', as: 'svc' },
    },
    { $unwind: '$svc' },
    { $group: { _id: '$svc.code', name: { $first: '$svc.name' }, count: { $sum: 1 } } },
  ]);
  const outOfGuarantee = await WaitingList.countDocuments({ status: 'active', isOutOfGuarantee: true });

  return {
    totals: {
      services, operatingRooms: rooms, patients, waitingList,
      serviceRequests, historicalActivities: historical,
      emergencies, referrals, dropouts, sessions,
    },
    waitingListBreakdown: {
      byPriority: wlByPriority,
      byService: wlByService,
      outOfGuarantee,
    },
  };
}

module.exports = { generateAll, getStatistics, clearAllData };
