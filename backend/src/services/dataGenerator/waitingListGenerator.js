const WaitingList = require('../../models/WaitingList');
const Patient = require('../../models/fhir/Patient');
const ServiceRequest = require('../../models/fhir/ServiceRequest');
const {
  PRIORITY_DISTRIBUTION,
  SERVICE_DISTRIBUTION,
  NAMES,
  PROCEDURES,
} = require('./configPresets');

// --- Helpers ---

function weightedRandom(distribution) {
  const r = Math.random();
  let cumulative = 0;
  for (const [key, weight] of Object.entries(distribution)) {
    cumulative += weight;
    if (r <= cumulative) return key;
  }
  // Fallback to last key (rounding safety)
  return Object.keys(distribution).at(-1);
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Exponential distribution for realistic entry date spread
function exponentialDays(mean) {
  return Math.ceil(-mean * Math.log(1 - Math.random()));
}

function generatePatientId(index) {
  return `PAT-${String(index).padStart(6, '0')}`;
}

function randomBirthDate() {
  const age = randomInt(18, 90);
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  d.setMonth(randomInt(0, 11));
  d.setDate(randomInt(1, 28));
  return d;
}

function randomGender() {
  return Math.random() < 0.5 ? 'male' : 'female';
}

// Maps CatSalut priority to FHIR priority
const CATSALUT_TO_FHIR = {
  oncologicoPrioritario: 'stat',
  oncologicoEstandar: 'asap',
  cardiaca: 'urgent',
  garantizado180: 'routine',
  referenciaP1: 'urgent',
  referenciaP2: 'routine',
  referenciaP3: 'routine',
};

// --- Main generator ---

async function generateWaitingList(serviceMap, config = {}) {
  const count = config.waitingList || 500;
  const priorityDist = config.priorityDistribution || PRIORITY_DISTRIBUTION;
  const serviceDist = config.serviceDistribution || SERVICE_DISTRIBUTION;
  const meanDaysInList = config.meanDaysInList || 60;

  const patients = [];
  const serviceRequests = [];
  const waitingListEntries = [];

  // Build service code → ObjectId lookup
  const serviceCodeToId = {};
  for (const [code, svc] of Object.entries(serviceMap)) {
    serviceCodeToId[code] = svc._id;
  }
  const serviceCodes = Object.keys(serviceCodeToId);

  // Normalize service distribution to only include available services
  const availableServiceDist = {};
  let totalWeight = 0;
  for (const code of serviceCodes) {
    if (serviceDist[code]) {
      availableServiceDist[code] = serviceDist[code];
      totalWeight += serviceDist[code];
    }
  }
  for (const code of Object.keys(availableServiceDist)) {
    availableServiceDist[code] /= totalWeight;
  }

  for (let i = 0; i < count; i++) {
    const patientId = generatePatientId(i + 1);
    const gender = randomGender();
    const givenName = randomElement(NAMES.given);
    const familyName = randomElement(NAMES.family);
    const birthDate = randomBirthDate();

    // 1. Create FHIR Patient
    const patient = new Patient({
      identifier: [{ system: 'urn:hospital:patient', value: patientId }],
      name: [{ use: 'official', family: familyName, given: [givenName] }],
      gender,
      birthDate,
      telecom: [{ system: 'phone', value: `6${randomInt(10000000, 99999999)}`, use: 'mobile' }],
    });
    patients.push(patient);

    // 2. Pick service and priority
    const serviceCode = weightedRandom(availableServiceDist);
    const serviceId = serviceCodeToId[serviceCode];
    const priority = weightedRandom(priorityDist);

    // 3. Compute entry date (exponential distribution, days ago from now)
    const daysAgo = exponentialDays(meanDaysInList);
    const entryDate = new Date();
    entryDate.setDate(entryDate.getDate() - daysAgo);

    // 4. Pick procedure for this service
    const procedures = PROCEDURES[serviceCode] || [{ code: 'GEN', display: 'Procedimiento general' }];
    const procedure = randomElement(procedures);

    // 5. Estimate duration from service avgDurations defaults
    const svc = serviceMap[serviceCode];
    const baseDuration = svc?.avgDurations?.[priority] || 90;
    const estimatedDuration = baseDuration + randomInt(-15, 30);

    // 6. Create WaitingList entry
    const wlEntry = new WaitingList({
      identifier: { system: 'urn:hospital:leq', value: `LEQ-${String(i + 1).padStart(6, '0')}` },
      patient: {
        identifier: patientId,
        name: `${givenName} ${familyName}`,
        birthDate,
        gender,
      },
      surgicalService: serviceId,
      priority,
      diagnosis: { code: `DX-${procedure.code}`, display: `Diagnóstico para ${procedure.display}` },
      procedure,
      estimatedDurationMinutes: estimatedDuration,
      entryDate,
      status: 'active',
    });
    waitingListEntries.push(wlEntry);

    // 7. Create FHIR ServiceRequest
    const sr = new ServiceRequest({
      identifier: [{ system: 'urn:hospital:service-request', value: `SR-${String(i + 1).padStart(6, '0')}` }],
      status: 'active',
      intent: 'order',
      priority: CATSALUT_TO_FHIR[priority] || 'routine',
      catSalutPriority: priority,
      code: {
        coding: [{ system: 'urn:hospital:procedure', code: procedure.code, display: procedure.display }],
        text: procedure.display,
      },
      subject: { reference: `Patient/${patientId}` },
      requester: { surgicalService: serviceId },
      reasonCode: [{
        coding: [{ system: 'urn:hospital:dx', code: `DX-${procedure.code}`, display: `Diagnóstico para ${procedure.display}` }],
        text: `Diagnóstico para ${procedure.display}`,
      }],
      authoredOn: entryDate,
    });
    serviceRequests.push(sr);
  }

  // Bulk insert
  const savedPatients = await Patient.insertMany(patients);
  const savedWL = await WaitingList.insertMany(waitingListEntries);
  const savedSR = await ServiceRequest.insertMany(serviceRequests);

  return {
    patients: savedPatients,
    waitingList: savedWL,
    serviceRequests: savedSR,
  };
}

module.exports = { generateWaitingList };
