import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';

function MetricCard({ title, value, subtitle, color = 'primary' }) {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-700 border-primary-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  };

  return (
    <div className={`rounded-xl border p-5 ${colorMap[color] || colorMap.primary}`}>
      <p className="text-sm font-medium opacity-75">{title}</p>
      <p className="mt-1 text-3xl font-bold">{value ?? '—'}</p>
      {subtitle && <p className="mt-1 text-xs opacity-60">{subtitle}</p>}
    </div>
  );
}

function StatusBadge({ connected }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
      connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
      {connected ? 'Conectado' : 'Desconectado'}
    </span>
  );
}

export default function MainDashboard() {
  const { cutoffDate } = useOutletContext();
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [healthRes, statsRes] = await Promise.all([
          axios.get('/api/health').catch(() => null),
          axios.get('/api/data/statistics').catch(() => null),
        ]);
        setHealth(healthRes?.data);
        setStats(statsRes?.data?.data);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const dbConnected = health?.database === 'connected';
  const totals = stats?.totals || {};
  const wlBreakdown = stats?.waitingListBreakdown || {};

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Resumen del sistema — Fecha de corte: {cutoffDate.toLocaleDateString('es-ES')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Backend:</span>
          <StatusBadge connected={!!health} />
          <span className="text-sm text-gray-500">BD:</span>
          <StatusBadge connected={dbConnected} />
        </div>
      </div>

      {/* Metrics grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="text-gray-400 text-sm">Cargando datos...</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              title="Pacientes en LEQ"
              value={totals.waitingList?.toLocaleString('es-ES')}
              subtitle="Lista de espera activa"
              color="primary"
            />
            <MetricCard
              title="Fuera de garantía"
              value={wlBreakdown.outOfGuarantee?.toLocaleString('es-ES')}
              subtitle="Plazo CatSalut excedido"
              color="red"
            />
            <MetricCard
              title="Servicios"
              value={totals.services}
              subtitle="Servicios quirúrgicos"
              color="cyan"
            />
            <MetricCard
              title="Quirófanos"
              value={totals.operatingRooms}
              subtitle="Operativos"
              color="green"
            />
            <MetricCard
              title="Actividad histórica"
              value={totals.historicalActivities?.toLocaleString('es-ES')}
              subtitle="Intervenciones registradas"
              color="purple"
            />
            <MetricCard
              title="Sesiones planificadas"
              value={totals.sessions?.toLocaleString('es-ES')}
              subtitle="Planilla actual"
              color="amber"
            />
          </div>

          {/* Secondary metrics */}
          <div className="grid grid-cols-3 gap-4">
            <MetricCard
              title="Urgencias registradas"
              value={totals.emergencies?.toLocaleString('es-ES')}
              subtitle="Inmediatas y diferidas"
              color="red"
            />
            <MetricCard
              title="Derivaciones"
              value={totals.referrals?.toLocaleString('es-ES')}
              subtitle="A centros externos"
              color="amber"
            />
            <MetricCard
              title="Bajas de LEQ"
              value={totals.dropouts?.toLocaleString('es-ES')}
              subtitle="Renuncias, resoluciones, etc."
              color="purple"
            />
          </div>

          {/* Waiting list breakdown */}
          {wlBreakdown.byPriority?.length > 0 && (
            <div className="p-5 bg-white rounded-xl border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                LEQ por prioridad CatSalut
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {wlBreakdown.byPriority.map((item) => (
                  <div key={item._id} className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 truncate">{item._id}</p>
                    <p className="mt-1 text-xl font-bold text-gray-800">{item.count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {wlBreakdown.byService?.length > 0 && (
            <div className="p-5 bg-white rounded-xl border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                LEQ por servicio quirúrgico
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {wlBreakdown.byService.map((item) => (
                  <div key={item._id} className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">{item.name}</p>
                    <p className="text-xs text-gray-400">{item._id}</p>
                    <p className="mt-1 text-xl font-bold text-gray-800">{item.count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No data notice */}
          {!stats && health && (
            <div className="p-8 text-center bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500">
                No hay datos generados. Ve a <strong>Gestión de Datos</strong> para generar datos sintéticos.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
