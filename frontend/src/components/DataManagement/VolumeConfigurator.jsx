import { useState } from 'react';

const DEFAULT_PRIORITIES = {
  oncologicoPrioritario: 15,
  oncologicoEstandar: 10,
  cardiaca: 5,
  garantizado180: 20,
  referenciaP1: 15,
  referenciaP2: 25,
  referenciaP3: 10,
};

const PRIORITY_LABELS = {
  oncologicoPrioritario: 'Oncológico Prioritario',
  oncologicoEstandar: 'Oncológico Estándar',
  cardiaca: 'Cardíaca',
  garantizado180: 'Garantizado 180',
  referenciaP1: 'Referencia P1',
  referenciaP2: 'Referencia P2',
  referenciaP3: 'Referencia P3',
};

const DEFAULT_VOLUMES = {
  waitingList: 500,
  historicalMonths: 12,
  historicalPerDay: 15,
  emergencies: 120,
  referrals: 40,
  dropouts: 60,
};

export default function VolumeConfigurator({ onGenerate, generating }) {
  const [volumes, setVolumes] = useState(DEFAULT_VOLUMES);
  const [priorities, setPriorities] = useState(DEFAULT_PRIORITIES);

  const prioritySum = Object.values(priorities).reduce((a, b) => a + b, 0);
  const isValidPriority = prioritySum === 100;

  function updateVolume(key, value) {
    setVolumes((prev) => ({ ...prev, [key]: Math.max(0, Number(value)) }));
  }

  function updatePriority(key, value) {
    setPriorities((prev) => ({ ...prev, [key]: Math.max(0, Math.min(100, Number(value))) }));
  }

  function handleGenerate() {
    const priorityDistribution = {};
    for (const [k, v] of Object.entries(priorities)) {
      priorityDistribution[k] = v / 100;
    }
    onGenerate({ ...volumes, priorityDistribution });
  }

  // Estimated quantities preview
  const estimates = {
    patients: volumes.waitingList,
    historicalRecords: Math.round(volumes.historicalPerDay * volumes.historicalMonths * 22),
    emergencies: volumes.emergencies,
    referrals: volumes.referrals,
    dropouts: volumes.dropouts,
  };

  return (
    <div className="space-y-6">
      {/* Volume controls */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <VolumeInput
          label="Total pacientes LEQ"
          value={volumes.waitingList}
          onChange={(v) => updateVolume('waitingList', v)}
          min={10} max={5000} step={10}
        />
        <VolumeInput
          label="Meses de histórico"
          value={volumes.historicalMonths}
          onChange={(v) => updateVolume('historicalMonths', v)}
          min={1} max={60} step={1}
        />
        <VolumeInput
          label="Cirugías / día laborable"
          value={volumes.historicalPerDay}
          onChange={(v) => updateVolume('historicalPerDay', v)}
          min={1} max={50} step={1}
        />
        <VolumeInput
          label="Urgencias totales"
          value={volumes.emergencies}
          onChange={(v) => updateVolume('emergencies', v)}
          min={0} max={1000} step={5}
        />
        <VolumeInput
          label="Derivaciones totales"
          value={volumes.referrals}
          onChange={(v) => updateVolume('referrals', v)}
          min={0} max={500} step={5}
        />
        <VolumeInput
          label="Bajas de LEQ"
          value={volumes.dropouts}
          onChange={(v) => updateVolume('dropouts', v)}
          min={0} max={500} step={5}
        />
      </div>

      {/* Priority distribution */}
      <div className="p-4 bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">Distribución por prioridad CatSalut (%)</h4>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isValidPriority
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            Suma: {prioritySum}%
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {Object.entries(priorities).map(([key, value]) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1 truncate" title={PRIORITY_LABELS[key]}>
                {PRIORITY_LABELS[key]}
              </label>
              <input
                type="number"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={value}
                onChange={(e) => updatePriority(key, e.target.value)}
                min={0} max={100}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Preview estimates */}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-700 mb-2">Previsualización de cantidades estimadas</h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 text-sm">
          <div>
            <span className="text-blue-500">Pacientes LEQ:</span>{' '}
            <strong className="text-blue-800">{estimates.patients.toLocaleString('es-ES')}</strong>
          </div>
          <div>
            <span className="text-blue-500">Act. histórica:</span>{' '}
            <strong className="text-blue-800">~{estimates.historicalRecords.toLocaleString('es-ES')}</strong>
          </div>
          <div>
            <span className="text-blue-500">Urgencias:</span>{' '}
            <strong className="text-blue-800">{estimates.emergencies}</strong>
          </div>
          <div>
            <span className="text-blue-500">Derivaciones:</span>{' '}
            <strong className="text-blue-800">{estimates.referrals}</strong>
          </div>
          <div>
            <span className="text-blue-500">Bajas:</span>{' '}
            <strong className="text-blue-800">{estimates.dropouts}</strong>
          </div>
        </div>
      </div>

      {/* Generate button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={!isValidPriority || generating}
          className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? 'Generando...' : 'Generar datos sintéticos'}
        </button>
        {!isValidPriority && (
          <p className="text-sm text-red-600">La distribución por prioridad debe sumar 100%</p>
        )}
      </div>
    </div>
  );
}

function VolumeInput({ label, value, onChange, min, max, step }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min} max={max} step={step}
        />
        <input
          type="number"
          className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min} max={max} step={step}
        />
      </div>
    </div>
  );
}
