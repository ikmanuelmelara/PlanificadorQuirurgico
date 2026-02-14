import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getCriteria, runOptimization, getLatestOptimization } from '../../services/api';
import CriteriaSelector from './CriteriaSelector';
import OptimizationConfig from './OptimizationConfig';
import OptimizationResults from './OptimizationResults';

export default function OptimizationPanel() {
  const { cutoffDate } = useOutletContext();
  const [criteria, setCriteria] = useState([]);
  const [config, setConfig] = useState({
    useCurrentAllocation: true,
    usePredictions: true,
    maxIterations: 1000,
  });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loadingCriteria, setLoadingCriteria] = useState(true);

  // Load criteria definitions on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await getCriteria();
        const defs = res.data.map((c) => ({
          ...c,
          isSelected: true,
          isHardConstraint: false,
          weight: c.defaultWeight,
        }));
        setCriteria(defs);
      } catch {
        setError('No se pudieron cargar los criterios');
      } finally {
        setLoadingCriteria(false);
      }
    }
    load();
  }, []);

  async function handleOptimize() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await runOptimization({
        cutoffDate: cutoffDate.toISOString(),
        criteria: criteria.map((c) => ({
          code: c.code,
          isSelected: c.isSelected,
          isHardConstraint: c.isHardConstraint,
          weight: c.weight,
        })),
        ...config,
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setRunning(false);
    }
  }

  async function handleLoadLatest() {
    setError(null);
    try {
      const res = await getLatestOptimization();
      setResult(res.data.scores ? {
        scores: res.data.scores,
        comparison: res.data.comparison,
        criteriaUsed: res.data.criteriaUsed,
        totalSessions: res.data.optimalSchedule?.length || 0,
        iterations: res.data.config?.maxIterations || 0,
        improvement: 0,
        hardConstraintsMet: res.data.scores?.hardConstraintsMet ?? true,
      } : null);
    } catch {
      setError('No hay optimizaciones previas');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Optimización</h1>
          <p className="text-sm text-gray-500">
            Genera la planilla óptima de sesiones — Fecha de corte:{' '}
            <strong>{cutoffDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
          </p>
        </div>
        <button
          onClick={handleLoadLatest}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cargar última optimización
        </button>
      </div>

      {/* Loading indicator */}
      {running && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-blue-700">Ejecutando optimización (Simulated Annealing, {config.maxIterations} iteraciones)...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {/* Criteria selector */}
      {loadingCriteria ? (
        <div className="p-8 text-center text-gray-400 text-sm">Cargando criterios...</div>
      ) : (
        <div className="p-5 bg-white rounded-xl border border-gray-200 space-y-5">
          <CriteriaSelector criteria={criteria} onChange={setCriteria} />
          <div className="border-t border-gray-100 pt-4">
            <OptimizationConfig
              config={config}
              onChange={setConfig}
              onOptimize={handleOptimize}
              running={running}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {result && <OptimizationResults data={result} />}
    </div>
  );
}
