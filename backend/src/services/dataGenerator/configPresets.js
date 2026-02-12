// Default configuration presets for synthetic data generation

// --- Surgical Services catalog ---
const SERVICES = [
  { code: 'CG',  name: 'Cirugía General',        specialties: [{ code: 'GEN', display: 'General Surgery' }] },
  { code: 'TRA', name: 'Traumatología',           specialties: [{ code: 'ORT', display: 'Orthopaedics' }] },
  { code: 'URO', name: 'Urología',                specialties: [{ code: 'URO', display: 'Urology' }] },
  { code: 'GIN', name: 'Ginecología',             specialties: [{ code: 'GYN', display: 'Gynaecology' }] },
  { code: 'OFT', name: 'Oftalmología',            specialties: [{ code: 'OPH', display: 'Ophthalmology' }] },
  { code: 'ORL', name: 'Otorrinolaringología',    specialties: [{ code: 'ENT', display: 'Otolaryngology' }] },
  { code: 'DIG', name: 'Cirugía Digestiva',       specialties: [{ code: 'DIG', display: 'Digestive Surgery' }] },
  { code: 'VAS', name: 'Cirugía Vascular',        specialties: [{ code: 'VAS', display: 'Vascular Surgery' }] },
  { code: 'TOR', name: 'Cirugía Torácica',        specialties: [{ code: 'THO', display: 'Thoracic Surgery' }] },
  { code: 'NEU', name: 'Neurocirugía',            specialties: [{ code: 'NEU', display: 'Neurosurgery' }] },
];

// Probability of a patient being assigned to each service
const SERVICE_DISTRIBUTION = {
  CG: 0.18, TRA: 0.16, URO: 0.12, GIN: 0.12, OFT: 0.10,
  ORL: 0.08, DIG: 0.08, VAS: 0.06, TOR: 0.05, NEU: 0.05,
};

// --- Operating Rooms catalog ---
const OPERATING_ROOMS = [
  { code: 'Q01', name: 'Quirófano 1', floor: 2, wing: 'A', equipment: [{ code: 'LAP', display: 'Laparoscopia' }] },
  { code: 'Q02', name: 'Quirófano 2', floor: 2, wing: 'A', equipment: [{ code: 'LAP', display: 'Laparoscopia' }] },
  { code: 'Q03', name: 'Quirófano 3', floor: 2, wing: 'A', equipment: [{ code: 'MIC', display: 'Microscopio' }] },
  { code: 'Q04', name: 'Quirófano 4', floor: 2, wing: 'B', equipment: [{ code: 'ART', display: 'Artroscopia' }] },
  { code: 'Q05', name: 'Quirófano 5', floor: 2, wing: 'B', equipment: [{ code: 'ROB', display: 'Robot Da Vinci' }] },
  { code: 'Q06', name: 'Quirófano 6', floor: 3, wing: 'A', equipment: [{ code: 'NAV', display: 'Neuronavegador' }] },
  { code: 'Q07', name: 'Quirófano 7', floor: 3, wing: 'A', equipment: [] },
  { code: 'Q08', name: 'Quirófano 8', floor: 3, wing: 'B', equipment: [{ code: 'LAP', display: 'Laparoscopia' }] },
];

// Which services are allowed in which rooms (by code)
const ROOM_SERVICE_MAP = {
  Q01: ['CG', 'DIG', 'VAS'],
  Q02: ['CG', 'DIG', 'GIN'],
  Q03: ['OFT', 'ORL', 'NEU'],
  Q04: ['TRA'],
  Q05: ['URO', 'GIN', 'DIG'],
  Q06: ['NEU', 'TOR'],
  Q07: ['CG', 'TRA', 'URO', 'GIN', 'ORL'],
  Q08: ['CG', 'VAS', 'TOR', 'DIG'],
};

// --- CatSalut Priority distributions ---
const PRIORITY_DISTRIBUTION = {
  oncologicoPrioritario: 0.15,
  oncologicoEstandar:    0.10,
  cardiaca:              0.05,
  garantizado180:        0.20,
  referenciaP1:          0.15,
  referenciaP2:          0.25,
  referenciaP3:          0.10,
};

// --- Default volume configuration ---
const DEFAULT_VOLUMES = {
  waitingList:      500,    // Active patients in LEQ
  historicalMonths: 12,     // Months of historical data to generate
  historicalPerDay: 15,     // Average surgeries per working day
  emergencies:      120,    // Emergency records over the historical period
  referrals:        40,     // Referral records over the historical period
  dropouts:         60,     // Dropout records over the historical period
};

// --- Historical activity config ---
const HISTORICAL_CONFIG = {
  outcomeDistribution: {
    completed: 0.88,
    cancelled: 0.08,
    suspended: 0.04,
  },
  emergencyRate: 0.05,           // 5% of historical activities were emergencies
  durationVariance: 0.25,        // ±25% variance from planned duration
  sessionTypeDistribution: {
    morning: 0.55,
    afternoon: 0.35,
    continuous: 0.10,
  },
};

// --- Emergency config ---
const EMERGENCY_CONFIG = {
  typeDistribution: {
    immediate: 0.35,
    deferred:  0.65,
  },
  statusDistribution: {
    completed: 0.85,
    cancelled: 0.10,
    pending:   0.05,
  },
};

// --- Referral config ---
const REFERRAL_CONFIG = {
  reasonDistribution: {
    guarantee_exceeded: 0.45,
    capacity:           0.30,
    specialization:     0.10,
    patient_request:    0.10,
    other:              0.05,
  },
  destinations: [
    'Hospital de Bellvitge',
    'Hospital Clínic',
    'Hospital del Mar',
    'Hospital Vall d\'Hebron',
    'Hospital Sant Pau',
  ],
};

// --- Dropout config ---
const DROPOUT_CONFIG = {
  reasonDistribution: {
    fallecimiento:          0.05,
    renuncia:               0.40,
    contraindicacion:       0.20,
    resolucion_espontanea:  0.25,
    otro:                   0.10,
  },
};

// --- Synthetic patient name pools ---
const NAMES = {
  given: [
    'María', 'Juan', 'Ana', 'Carlos', 'Laura', 'Pedro', 'Carmen', 'José',
    'Marta', 'Antonio', 'Lucía', 'Miguel', 'Elena', 'Francisco', 'Isabel',
    'David', 'Rosa', 'Manuel', 'Pilar', 'Javier', 'Teresa', 'Rafael',
    'Cristina', 'Alejandro', 'Patricia', 'Fernando', 'Beatriz', 'Alberto',
    'Silvia', 'Jorge', 'Nuria', 'Pablo', 'Sara', 'Andrés', 'Raquel',
  ],
  family: [
    'García', 'Martínez', 'López', 'Sánchez', 'González', 'Rodríguez',
    'Fernández', 'Pérez', 'Gómez', 'Díaz', 'Muñoz', 'Álvarez', 'Romero',
    'Ruiz', 'Jiménez', 'Moreno', 'Navarro', 'Torres', 'Domínguez', 'Gil',
    'Serrano', 'Ramos', 'Blanco', 'Molina', 'Suárez', 'Castro', 'Ortega',
  ],
};

// --- Procedure catalog (simplified, per service) ---
const PROCEDURES = {
  CG:  [{ code: 'COL',  display: 'Colecistectomía' }, { code: 'HER', display: 'Herniorrafia' }, { code: 'APE', display: 'Apendicectomía' }],
  TRA: [{ code: 'PTC',  display: 'Prótesis total cadera' }, { code: 'PTR', display: 'Prótesis total rodilla' }, { code: 'OTS', display: 'Osteosíntesis' }],
  URO: [{ code: 'RTUP', display: 'RTU próstata' }, { code: 'NEF', display: 'Nefrectomía' }, { code: 'LIT', display: 'Litotricia' }],
  GIN: [{ code: 'HIS',  display: 'Histerectomía' }, { code: 'OOF', display: 'Ooforectomía' }, { code: 'MIO', display: 'Miomectomía' }],
  OFT: [{ code: 'CAT',  display: 'Cataratas' }, { code: 'VIT', display: 'Vitrectomía' }, { code: 'GLA', display: 'Glaucoma' }],
  ORL: [{ code: 'SEP',  display: 'Septoplastia' }, { code: 'AMI', display: 'Amigdalectomía' }, { code: 'TIM', display: 'Timpanoplastia' }],
  DIG: [{ code: 'GAE',  display: 'Gastrectomía' }, { code: 'PAN', display: 'Pancreatectomía' }, { code: 'COR', display: 'Colectomía' }],
  VAS: [{ code: 'BPA',  display: 'Bypass aortofemoral' }, { code: 'END', display: 'Endarterectomía' }, { code: 'VAR', display: 'Varicectomía' }],
  TOR: [{ code: 'LOB',  display: 'Lobectomía' }, { code: 'MED', display: 'Mediastinoscopia' }, { code: 'PNE', display: 'Neumotorax' }],
  NEU: [{ code: 'CRA',  display: 'Craneotomía' }, { code: 'LAM', display: 'Laminectomía' }, { code: 'DVP', display: 'Derivación VP' }],
};

module.exports = {
  SERVICES,
  SERVICE_DISTRIBUTION,
  OPERATING_ROOMS,
  ROOM_SERVICE_MAP,
  PRIORITY_DISTRIBUTION,
  DEFAULT_VOLUMES,
  HISTORICAL_CONFIG,
  EMERGENCY_CONFIG,
  REFERRAL_CONFIG,
  DROPOUT_CONFIG,
  NAMES,
  PROCEDURES,
};
