const METHOD_LABELS = {
  association_rules: 'Reglas de asociación',
  clustering: 'Clustering (K-Means)',
  decision_tree: 'Árbol de decisión',
  anomaly_detection: 'Detección de anomalías',
  manual: 'Configuración manual',
};

const CATEGORY_LABELS = {
  room: 'Quirófano',
  session: 'Sesión',
  sequence: 'Secuencia',
  combination: 'Combinación',
  temporal: 'Temporal',
  unknown: 'Otro',
};

export default function ConstraintDetail({ constraint, onClose, onValidate }) {
  const c = constraint;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Detalle de restricción</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                c.type === 'explicit' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
              }`}>
                {c.type === 'explicit' ? 'Explícita' : 'Descubierta'}
              </span>
              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                {CATEGORY_LABELS[c.category] || c.category}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-5">
          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Descripción</label>
            <p className="mt-1 text-sm text-gray-800">{c.description}</p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-3">
            <MetricBox label="Soporte" value={c.support?.toFixed(3)} />
            <MetricBox label="Confianza" value={c.confidence?.toFixed(3)} />
            <MetricBox label="Lift" value={c.lift?.toFixed(3) || '—'} />
            <MetricBox label="Estado" value={c.isValidated ? 'Validada' : 'Pendiente'} />
          </div>

          {/* Method */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Método de descubrimiento</label>
            <p className="mt-1 text-sm text-gray-700">{METHOD_LABELS[c.discoveryMethod] || c.discoveryMethod}</p>
          </div>

          {/* Rule (JSON formatted) */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Regla (estructura completa)</label>
            <pre className="mt-1 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 overflow-x-auto border border-gray-200">
              {JSON.stringify(c.rule, null, 2)}
            </pre>
          </div>

          {/* Related entities */}
          {(c.relatedServices?.length > 0 || c.relatedRooms?.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {c.relatedServices?.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Servicios relacionados</label>
                  <p className="mt-1 text-sm text-gray-600">{c.relatedServices.length} servicio(s)</p>
                </div>
              )}
              {c.relatedRooms?.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Quirófanos relacionados</label>
                  <p className="mt-1 text-sm text-gray-600">{c.relatedRooms.length} quirófano(s)</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with actions */}
        {!c.isValidated && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <button
              onClick={() => onValidate(false)}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              Rechazar
            </button>
            <button
              onClick={() => onValidate(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              Validar restricción
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricBox({ label, value }) {
  return (
    <div className="p-2 bg-gray-50 rounded-lg text-center border border-gray-100">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-gray-800 font-mono">{value ?? '—'}</p>
    </div>
  );
}
