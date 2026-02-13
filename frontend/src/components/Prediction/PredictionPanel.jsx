import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { runPrediction, getLatestPrediction } from '../../services/api';
import PredictionResults from './PredictionResults';

const MODULES = [
  { key: 'demand', label: 'Demanda (nuevas entradas LEQ)' },
  { key: 'emergencies', label: 'Urgencias (diferidas e inmediatas)' },
  { key: 'referrals', label: 'Derivaciones a concertados' },
  { key: 'dropouts', label: 'Bajas de LEQ' },
];

export default function PredictionPanel() {
  const { cutoffDate } = useOutletContext();
  const [include, setInclude] = useState({
    demand: true,
    emergencies: true,
    referrals: true,
    dropouts: true,
  });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loadingLatest, setLoadingLatest] = useState(false);

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const res = await runPrediction(cutoffDate.toISOString(), include);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setRunning(false);
    }
  }

  async function handleLoadLatest() {
    setLoadingLatest(true);
    setError(null);
    try {
      const res = await getLatestPrediction();
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'No hay predicciones guardadas');
    } finally {
      setLoadingLatest(false);
    }
  }

  function toggleModule(key) {
    setInclude((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const anySelected = Object.values(include).some(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Módulo Predictivo</h1>
        <p className="text-sm text-gray-500">
          Predicciones hasta la fecha de corte:{' '}
          <strong>{cutoffDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
        </p>
      </div>

      {/* Configuration */}
      <div className="p-5 bg-white rounded-xl border border-gray-200 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Selecciona los módulos a predecir</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {MODULES.map((m) => (
            <label key={m.key} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                checked={include[m.key]}
                onChange={() => toggleModule(m.key)}
              />
              <span className="text-sm text-gray-700">{m.label}</span>
            </label>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleRun}
            disabled={running || !anySelected}
            className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running ? 'Ejecutando predicción...' : 'Ejecutar predicción'}
          </button>
          <button
            onClick={handleLoadLatest}
            disabled={loadingLatest}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {loadingLatest ? 'Cargando...' : 'Cargar última predicción'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {result && <PredictionResults data={result} />}
    </div>
  );
}
