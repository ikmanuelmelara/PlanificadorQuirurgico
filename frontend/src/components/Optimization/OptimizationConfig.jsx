import { useState } from 'react';

export default function OptimizationConfig({ config, onChange, onOptimize, running }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  function update(key, value) {
    onChange({ ...config, [key]: value });
  }

  function handleOptimize() {
    setConfirmOpen(false);
    onOptimize();
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Opciones adicionales</h3>

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            checked={config.useCurrentAllocation}
            onChange={(e) => update('useCurrentAllocation', e.target.checked)}
          />
          Partir del reparto actual
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            checked={config.usePredictions}
            onChange={(e) => update('usePredictions', e.target.checked)}
          />
          Usar predicciones del módulo predictivo
        </label>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Máx. iteraciones:</label>
          <input
            type="number"
            className="w-24 px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={config.maxIterations}
            onChange={(e) => update('maxIterations', Math.max(100, Math.min(10000, Number(e.target.value))))}
            min={100} max={10000} step={100}
          />
        </div>
      </div>

      {/* Optimize button with confirmation */}
      <div className="flex items-center gap-3 pt-2">
        {!confirmOpen ? (
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={running}
            className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running ? 'Optimizando...' : 'Optimizar'}
          </button>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-sm text-amber-800">
              Esto generará una planilla óptima. ¿Continuar?
            </span>
            <button
              onClick={handleOptimize}
              className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              Confirmar
            </button>
            <button
              onClick={() => setConfirmOpen(false)}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
