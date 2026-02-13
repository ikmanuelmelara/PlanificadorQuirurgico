import { useState, useEffect, useCallback } from 'react';
import { runLearning, getConstraints, getLearningSummary } from '../../services/api';
import ConstraintsList from './ConstraintsList';
import DiscoveryMethodsChart from './DiscoveryMethodsChart';

const TABS = [
  { id: 'all', label: 'Todas', filter: {} },
  { id: 'explicit', label: 'Explícitas', filter: { type: 'explicit' } },
  { id: 'discovered', label: 'Descubiertas', filter: { type: 'discovered' } },
  { id: 'validated', label: 'Validadas', filter: { isValidated: 'true' } },
  { id: 'pending', label: 'Pendientes', filter: { isValidated: 'false' } },
];

export default function ConstraintsDashboard() {
  const [activeTab, setActiveTab] = useState('all');
  const [learning, setLearning] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [learningResult, setLearningResult] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadSummary = useCallback(async () => {
    try {
      const res = await getLearningSummary();
      setSummary(res.data);
    } catch { /* first time, no data */ }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary, refreshKey]);

  async function handleLearn() {
    setLearning(true);
    setError(null);
    setLearningResult(null);
    try {
      const res = await runLearning({});
      setLearningResult(res.data);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLearning(false);
    }
  }

  const currentFilter = TABS.find((t) => t.id === activeTab)?.filter || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restricciones Aprendidas</h1>
          <p className="text-sm text-gray-500">
            Descubre restricciones explícitas e implícitas del histórico quirúrgico
          </p>
        </div>
        <button
          onClick={handleLearn}
          disabled={learning}
          className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {learning ? 'Aprendiendo...' : 'Aprender del histórico'}
        </button>
      </div>

      {/* Progress / loading indicator */}
      {learning && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-blue-700">
              Ejecutando algoritmos de aprendizaje (association rules, clustering, decision tree, anomaly detection)...
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Total restricciones" value={summary.total} color="primary" />
          <SummaryCard
            label="Explícitas"
            value={summary.byType?.find((t) => t._id === 'explicit')?.count || 0}
            color="green"
          />
          <SummaryCard
            label="Descubiertas"
            value={summary.byType?.find((t) => t._id === 'discovered')?.count || 0}
            color="purple"
          />
          <SummaryCard label="Validadas" value={summary.validated} color="amber" />
        </div>
      )}

      {/* Learning result detail */}
      {learningResult && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2">
          <p className="text-sm font-semibold text-green-700">
            Aprendizaje completado: {learningResult.total} restricciones ({learningResult.explicit} explícitas, {learningResult.discovered} descubiertas)
          </p>
          {learningResult.rawResults && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs text-green-800">
              {learningResult.rawResults.associationRules && (
                <div>Reglas asociación: <strong>{learningResult.rawResults.associationRules.rulesFound}</strong></div>
              )}
              {learningResult.rawResults.clustering && (
                <div>Clusters: <strong>{learningResult.rawResults.clustering.clusters}</strong> / Outliers: <strong>{learningResult.rawResults.clustering.outliers}</strong></div>
              )}
              {learningResult.rawResults.decisionTree && (
                <div>Reglas árbol: <strong>{learningResult.rawResults.decisionTree.rulesExtracted}</strong></div>
              )}
              {learningResult.rawResults.anomalyDetection && (
                <div>Anomalías: <strong>{learningResult.rawResults.anomalyDetection.anomaliesFound}</strong></div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      {summary && (summary.byMethod?.length > 0 || summary.byCategory?.length > 0) && (
        <DiscoveryMethodsChart byMethod={summary.byMethod} byCategory={summary.byCategory} />
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Constraints list */}
      <ConstraintsList key={`${activeTab}-${refreshKey}`} filter={currentFilter} onUpdate={() => setRefreshKey((k) => k + 1)} />
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  const colors = {
    primary: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <div className={`rounded-xl border p-4 text-center ${colors[color]}`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value ?? '—'}</p>
    </div>
  );
}
