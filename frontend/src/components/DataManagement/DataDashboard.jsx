import { useState, useCallback } from 'react';
import { generateData, getStatistics } from '../../services/api';
import VolumeConfigurator from './VolumeConfigurator';
import WaitingListViewer from './DatasetViewer/WaitingListViewer';
import FileUploader from './FileUploader';
import FileDownloader from './FileDownloader';

const TABS = [
  { id: 'generate', label: 'Generar datos' },
  { id: 'leq', label: 'LEQ' },
  { id: 'download', label: 'Descargar JSON' },
  { id: 'upload', label: 'Subir fichero' },
];

export default function DataDashboard() {
  const [activeTab, setActiveTab] = useState('generate');
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleGenerate = useCallback(async (config) => {
    setGenerating(true);
    setGenResult(null);
    try {
      const result = await generateData(config);
      setGenResult({ ok: true, summary: result.data });
      // Refresh statistics after generation
      const statsRes = await getStatistics();
      setStats(statsRes.data);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setGenResult({ ok: false, error: err.response?.data?.error || err.message });
    } finally {
      setGenerating(false);
    }
  }, []);

  const handleImported = useCallback(async () => {
    try {
      const statsRes = await getStatistics();
      setStats(statsRes.data);
      setRefreshKey((k) => k + 1);
    } catch { /* ignore */ }
  }, []);

  const totals = stats?.totals || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Datos</h1>
        <p className="text-sm text-gray-500">Genera, visualiza, importa y exporta datasets sintéticos</p>
      </div>

      {/* Quick stats bar */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <MiniStat label="LEQ" value={totals.waitingList} />
          <MiniStat label="Histórico" value={totals.historicalActivities} />
          <MiniStat label="Sesiones" value={totals.sessions} />
          <MiniStat label="Urgencias" value={totals.emergencies} />
          <MiniStat label="Derivaciones" value={totals.referrals} />
          <MiniStat label="Bajas" value={totals.dropouts} />
        </div>
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

      {/* Tab content */}
      <div>
        {activeTab === 'generate' && (
          <div className="space-y-4">
            <VolumeConfigurator onGenerate={handleGenerate} generating={generating} />
            {genResult && (
              <GenerationResult result={genResult} />
            )}
          </div>
        )}

        {activeTab === 'leq' && (
          <WaitingListViewer key={refreshKey} />
        )}

        {activeTab === 'download' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Descarga cada dataset como archivo JSON:</p>
            <FileDownloader />
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Sube un archivo JSON para importar datos:</p>
            <FileUploader onImported={handleImported} />
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="px-3 py-2 bg-white rounded-lg border border-gray-200 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-800">{value?.toLocaleString('es-ES') ?? '—'}</p>
    </div>
  );
}

function GenerationResult({ result }) {
  if (!result.ok) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
        Error: {result.error}
      </div>
    );
  }

  const s = result.summary || {};
  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2">
      <p className="text-sm font-semibold text-green-700">Datos generados correctamente</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm text-green-800">
        {s.services != null && <div>Servicios: <strong>{s.services}</strong></div>}
        {s.operatingRooms != null && <div>Quirófanos: <strong>{s.operatingRooms}</strong></div>}
        {s.waitingList != null && <div>Pacientes LEQ: <strong>{s.waitingList}</strong></div>}
        {s.patients != null && <div>Pacientes FHIR: <strong>{s.patients}</strong></div>}
        {s.historicalActivities != null && <div>Histórico: <strong>{s.historicalActivities}</strong></div>}
        {s.sessions != null && <div>Sesiones: <strong>{s.sessions}</strong></div>}
        {s.emergencies != null && <div>Urgencias: <strong>{s.emergencies}</strong></div>}
        {s.referrals != null && <div>Derivaciones: <strong>{s.referrals}</strong></div>}
        {s.dropouts != null && <div>Bajas: <strong>{s.dropouts}</strong></div>}
      </div>
    </div>
  );
}
