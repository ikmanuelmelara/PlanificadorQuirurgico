import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getWaitingList, getStatistics } from '../../../services/api';

const PRIORITY_LABELS = {
  oncologicoPrioritario: 'Onco. Prior.',
  oncologicoEstandar: 'Onco. Estánd.',
  cardiaca: 'Cardíaca',
  garantizado180: 'Garant. 180',
  referenciaP1: 'Ref. P1',
  referenciaP2: 'Ref. P2',
  referenciaP3: 'Ref. P3',
};

const PRIORITY_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#6b7280',
];

const FILTER_OPTIONS = {
  priority: [
    { value: '', label: 'Todas' },
    { value: 'oncologicoPrioritario', label: 'Oncológico Prioritario' },
    { value: 'oncologicoEstandar', label: 'Oncológico Estándar' },
    { value: 'cardiaca', label: 'Cardíaca' },
    { value: 'garantizado180', label: 'Garantizado 180' },
    { value: 'referenciaP1', label: 'Referencia P1' },
    { value: 'referenciaP2', label: 'Referencia P2' },
    { value: 'referenciaP3', label: 'Referencia P3' },
  ],
};

export default function WaitingListViewer() {
  const [entries, setEntries] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ priority: '', service: '' });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.priority) params.priority = filters.priority;
      if (filters.service) params.service = filters.service;

      const [wlRes, statsRes] = await Promise.all([
        getWaitingList(params),
        page === 1 ? getStatistics() : Promise.resolve(null),
      ]);

      setEntries(wlRes.data);
      setPagination(wlRes.pagination);
      if (statsRes) setStats(statsRes.data);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const wlBreakdown = stats?.waitingListBreakdown || {};
  const outOfGuarantee = wlBreakdown.outOfGuarantee || 0;
  const total = stats?.totals?.waitingList || 0;
  const outPct = total > 0 ? ((outOfGuarantee / total) * 100).toFixed(1) : 0;

  const priorityChartData = (wlBreakdown.byPriority || []).map((item) => ({
    name: PRIORITY_LABELS[item._id] || item._id,
    count: item.count,
  }));

  const serviceChartData = (wlBreakdown.byService || []).map((item) => ({
    name: item.name || item._id,
    count: item.count,
  }));

  return (
    <div className="space-y-5">
      {/* Guarantee indicator */}
      <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200">
        <div className="flex-1">
          <p className="text-sm text-gray-500">Total pacientes en LEQ</p>
          <p className="text-2xl font-bold text-gray-900">{total.toLocaleString('es-ES')}</p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-sm text-gray-500">Fuera de garantía</p>
          <p className="text-2xl font-bold text-red-600">{outOfGuarantee.toLocaleString('es-ES')}</p>
        </div>
        <div className="flex-1 text-right">
          <p className="text-sm text-gray-500">% Fuera de garantía</p>
          <p className="text-2xl font-bold text-red-600">{outPct}%</p>
        </div>
      </div>

      {/* Charts */}
      {priorityChartData.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Distribución por prioridad</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={priorityChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Pacientes" radius={[4, 4, 0, 0]}>
                  {priorityChartData.map((_, i) => (
                    <Cell key={i} fill={PRIORITY_COLORS[i % PRIORITY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Distribución por servicio</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={serviceChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Pacientes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={filters.priority}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
        >
          {FILTER_OPTIONS.priority.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filtrar por servicio (ID)..."
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={filters.service}
          onChange={(e) => setFilters((f) => ({ ...f, service: e.target.value }))}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3">Prioridad</th>
              <th className="px-4 py-3">Servicio</th>
              <th className="px-4 py-3">Entrada</th>
              <th className="px-4 py-3">Días espera</th>
              <th className="px-4 py-3">Garantía</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No hay datos en la LEQ</td></tr>
            ) : entries.map((entry) => {
              const isOverdue = entry.daysWaiting > entry.guaranteeDays;
              return (
                <tr key={entry._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {entry.patientName || entry.nhc || entry._id?.slice(-6)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs">{PRIORITY_LABELS[entry.priority] || entry.priority}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {entry.surgicalService?.name || entry.surgicalService?.code || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {entry.entryDate ? new Date(entry.entryDate).toLocaleDateString('es-ES') : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                      {entry.daysWaiting ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{entry.guaranteeDays ?? '—'} d</td>
                  <td className="px-4 py-2.5">
                    {isOverdue ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Fuera
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Página {pagination.page} de {pagination.pages} — {pagination.total} registros
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
    </div>
  );
}
