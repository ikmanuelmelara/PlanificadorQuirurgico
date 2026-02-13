import { useState, useRef } from 'react';
import { importData } from '../../services/api';

const TYPES = [
  { value: 'waiting-list', label: 'Lista de espera' },
  { value: 'historical', label: 'Actividad histórica' },
  { value: 'emergencies', label: 'Urgencias' },
  { value: 'referrals', label: 'Derivaciones' },
  { value: 'dropouts', label: 'Bajas' },
  { value: 'sessions', label: 'Sesiones' },
  { value: 'services', label: 'Servicios' },
  { value: 'rooms', label: 'Quirófanos' },
];

export default function FileUploader({ onImported }) {
  const [type, setType] = useState('waiting-list');
  const [replace, setReplace] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState(null); // { ok, message }
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  async function processFile(file) {
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      setStatus({ ok: false, message: 'El archivo debe ser JSON (.json)' });
      return;
    }

    setUploading(true);
    setStatus(null);
    try {
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        setStatus({ ok: false, message: 'El archivo no contiene JSON válido' });
        setUploading(false);
        return;
      }

      // Accept either raw array or { data: [...] }
      const dataArray = Array.isArray(parsed) ? parsed : parsed.data;
      if (!Array.isArray(dataArray)) {
        setStatus({ ok: false, message: 'El JSON debe ser un array o contener un campo "data" con un array' });
        setUploading(false);
        return;
      }

      const result = await importData(type, dataArray, replace);
      setStatus({ ok: true, message: result.message || `Importados ${result.count} registros` });
      onImported?.();
    } catch (err) {
      setStatus({ ok: false, message: err.response?.data?.error || err.message });
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            checked={replace}
            onChange={(e) => setReplace(e.target.checked)}
          />
          Reemplazar datos existentes
        </label>
      </div>

      {/* Drop zone */}
      <div
        className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          dragging
            ? 'border-primary-400 bg-primary-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm text-gray-500">
          {uploading ? 'Subiendo...' : 'Arrastra un archivo JSON aquí o haz clic para seleccionar'}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => processFile(e.target.files[0])}
        />
      </div>

      {status && (
        <div className={`p-3 text-sm rounded-lg ${
          status.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {status.message}
        </div>
      )}
    </div>
  );
}
