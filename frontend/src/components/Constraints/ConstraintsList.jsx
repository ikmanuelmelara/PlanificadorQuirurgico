import { useState, useEffect, useCallback } from 'react';
import { getConstraints, validateConstraint } from '../../services/api';
import ConstraintDetail from './ConstraintDetail';

const CATEGORY_LABELS = {
  room: 'Quirófano',
  session: 'Sesión',
  sequence: 'Secuencia',
  combination: 'Combinación',
  temporal: 'Temporal',
  unknown: 'Otro',
};

const METHOD_LABELS = {
  association_rules: 'Reglas asociación',
  clustering: 'Clustering',
  decision_tree: 'Árbol decisión',
  anomaly_detection: 'Anomalías',
  manual: 'Manual',
};

const CATEGORY_COLORS = {
  room: 'bg-blue-100 text-blue-700',
  session: 'bg-green-100 text-green-700',
  sequence: 'bg-purple-100 text-purple-700',
  combination: 'bg-orange-100 text-orange-700',
  temporal: 'bg-cyan-100 text-cyan-700',
  unknown: 'bg-gray-100 text-gray-600',
};

export default function ConstraintsList({ filter, onUpdate }) {
  const [constraints, setConstraints] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { ...filter, page, limit: 20 };
      if (categoryFilter) params.category = categoryFilter;
      if (methodFilter) params.discoveryMethod = methodFilter;
      const res = await getConstraints(params);
      setConstraints(res.data);
      setPagination(res.pagination);
    } catch {
      setConstraints([]);
    } finally {
      setLoading(false);
    }
  }, [filter, categoryFilter, methodFilter]);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  async function handleValidate(id, isValid) {
    try {
      await validateConstraint(id, isValid);
      fetchData(pagination.page);
      onUpdate?.();
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
        >
          <option value="">Todos los métodos</option>
          {Object.entries(METHOD_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3 text-center">Soporte</th>
              <th className="px-4 py-3 text-center">Confianza</th>
              <th className="px-4 py-3 text-center">Lift</th>
              <th className="px-4 py-3">Método</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
            ) : constraints.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No hay restricciones. Pulsa &quot;Aprender del histórico&quot; para descubrirlas.</td></tr>
            ) : constraints.map((c) => (
              <tr key={c._id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.type === 'explicit' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {c.type === 'explicit' ? 'Explícita' : 'Descubierta'}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[c.category] || CATEGORY_COLORS.unknown}`}>
                    {CATEGORY_LABELS[c.category] || c.category}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-700 max-w-xs truncate" title={c.description}>
                  {c.description}
                </td>
                <td className="px-4 py-2.5 text-center font-mono text-xs">{c.support?.toFixed(3) ?? '—'}</td>
                <td className="px-4 py-2.5 text-center font-mono text-xs">{c.confidence?.toFixed(3) ?? '—'}</td>
                <td className="px-4 py-2.5 text-center font-mono text-xs">{c.lift?.toFixed(3) ?? '—'}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{METHOD_LABELS[c.discoveryMethod] || c.discoveryMethod}</td>
                <td className="px-4 py-2.5">
                  {c.isValidated ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Validada</span>
                  ) : c.activeInOptimization === false && c.isValidated === false ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pendiente</span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Pendiente</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    {!c.isValidated && (
                      <>
                        <button
                          onClick={() => handleValidate(c._id, true)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Validar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleValidate(c._id, false)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Rechazar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSelected(c)}
                      className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                      title="Ver detalle"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Página {pagination.page} de {pagination.pages} — {pagination.total} restricciones
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchData(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => fetchData(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <ConstraintDetail
          constraint={selected}
          onClose={() => setSelected(null)}
          onValidate={(isValid) => {
            handleValidate(selected._id, isValid);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
