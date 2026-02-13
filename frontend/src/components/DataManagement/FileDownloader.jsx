import { useState } from 'react';
import { exportData } from '../../services/api';

const TYPES = [
  { value: 'waiting-list', label: 'Lista de espera' },
  { value: 'historical', label: 'Actividad histórica' },
  { value: 'emergencies', label: 'Urgencias' },
  { value: 'referrals', label: 'Derivaciones' },
  { value: 'dropouts', label: 'Bajas' },
  { value: 'sessions', label: 'Sesiones' },
  { value: 'services', label: 'Servicios' },
  { value: 'rooms', label: 'Quirófanos' },
  { value: 'patients', label: 'Pacientes (FHIR)' },
  { value: 'service-requests', label: 'ServiceRequest (FHIR)' },
];

export default function FileDownloader() {
  const [downloading, setDownloading] = useState(null);

  async function handleDownload(type, label) {
    setDownloading(type);
    try {
      const blob = await exportData(type);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — the button just stops spinning
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {TYPES.map((t) => (
        <button
          key={t.value}
          onClick={() => handleDownload(t.value, t.label)}
          disabled={downloading === t.value}
          className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="truncate">{downloading === t.value ? 'Descargando...' : t.label}</span>
        </button>
      ))}
    </div>
  );
}
