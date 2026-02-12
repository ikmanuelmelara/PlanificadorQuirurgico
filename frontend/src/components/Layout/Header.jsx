import { useState } from 'react';

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export default function Header({ cutoffDate, onCutoffDateChange }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Planificador de Sesiones Quirúrgicas
        </h2>
        <p className="text-xs text-gray-500">
          Optimización del reparto de sesiones por servicio
        </p>
      </div>

      {/* Cutoff date selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Fecha de corte:</label>
        {isEditing ? (
          <input
            type="date"
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={formatDate(cutoffDate)}
            onChange={(e) => {
              onCutoffDateChange(new Date(e.target.value));
              setIsEditing(false);
            }}
            onBlur={() => setIsEditing(false)}
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
          >
            {cutoffDate.toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </button>
        )}
      </div>
    </header>
  );
}
