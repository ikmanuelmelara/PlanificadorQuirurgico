import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#f97316', '#22c55e', '#8b5cf6', '#eab308', '#06b6d4', '#ec4899', '#6b7280', '#14b8a6'];

const REASON_LABELS = {
  fallecimiento: 'Fallecimiento',
  renuncia: 'Renuncia',
  contraindicacion: 'Contraindicación',
  resolucion_espontanea: 'Resolución espontánea',
  otro: 'Otro',
  guarantee_exceeded: 'Garantía excedida',
  capacity: 'Capacidad',
  specialization: 'Especialización',
  patient_request: 'Petición paciente',
  other: 'Otro',
};

function ConfidenceBadge({ value }) {
  let color, label;
  if (value >= 0.75) { color = 'bg-green-100 text-green-700'; label = 'Alta'; }
  else if (value >= 0.55) { color = 'bg-yellow-100 text-yellow-700'; label = 'Media'; }
  else { color = 'bg-red-100 text-red-700'; label = 'Baja'; }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label} ({Math.round(value * 100)}%)
    </span>
  );
}

function SummaryCard({ title, value, subtitle, confidence, color = 'primary' }) {
  const colorMap = {
    primary: 'bg-blue-50 text-blue-700 border-blue-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    green: 'bg-green-50 text-green-700 border-green-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.primary}`}>
      <p className="text-xs font-medium opacity-75">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value ?? '—'}</p>
      {subtitle && <p className="text-xs opacity-60 mt-0.5">{subtitle}</p>}
      {confidence != null && <div className="mt-2"><ConfidenceBadge value={confidence} /></div>}
    </div>
  );
}

export default function PredictionResults({ data }) {
  const r = data.results || data;
  const { demand, emergencies, referrals, dropouts } = r;

  // Build per-service table data
  const serviceMap = {};
  function merge(arr, key) {
    if (!arr) return;
    for (const item of arr) {
      const code = item.serviceCode;
      if (!serviceMap[code]) {
        serviceMap[code] = { code, name: item.serviceName, demand: 0, emergDef: 0, emergImm: 0, referrals: 0, dropouts: 0 };
      }
      serviceMap[code][key] = item.predictedEntries ?? item.predicted ?? 0;
    }
  }
  merge(demand?.byService, 'demand');
  merge(emergencies?.deferred?.byService, 'emergDef');
  merge(emergencies?.immediate?.byService, 'emergImm');
  merge(referrals?.byService, 'referrals');
  merge(dropouts?.byService, 'dropouts');

  const serviceRows = Object.values(serviceMap).sort((a, b) => (b.demand + b.emergDef + b.emergImm) - (a.demand + a.emergDef + a.emergImm));

  // Chart data for grouped bars
  const chartData = serviceRows.map((s) => ({
    name: s.code,
    Demanda: s.demand,
    'Urg. Diferidas': s.emergDef,
    'Urg. Inmediatas': s.emergImm,
    Derivaciones: s.referrals,
    Bajas: s.dropouts,
  }));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {demand && (
          <SummaryCard
            title="Nuevas entradas LEQ"
            value={demand.total}
            subtitle={`${demand.periodDays} días — ${demand.method}`}
            confidence={demand.byService?.[0]?.confidence}
            color="primary"
          />
        )}
        {emergencies && (
          <>
            <SummaryCard
              title="Urgencias diferidas"
              value={emergencies.deferred.total}
              subtitle={`${emergencies.periodDays} días`}
              confidence={emergencies.confidence}
              color="amber"
            />
            <SummaryCard
              title="Urgencias inmediatas"
              value={emergencies.immediate.total}
              subtitle={`${emergencies.periodDays} días`}
              confidence={emergencies.confidence}
              color="red"
            />
          </>
        )}
        {referrals && (
          <SummaryCard
            title="Derivaciones"
            value={referrals.total}
            subtitle={`${referrals.periodDays} días`}
            confidence={referrals.confidence}
            color="purple"
          />
        )}
        {dropouts && (
          <SummaryCard
            title="Bajas de LEQ"
            value={dropouts.total}
            subtitle={`${dropouts.periodDays} días`}
            confidence={dropouts.confidence}
            color="green"
          />
        )}
      </div>

      {/* Grouped bar chart */}
      {chartData.length > 0 && (
        <div className="p-5 bg-white rounded-xl border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Predicciones por servicio</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {demand && <Bar dataKey="Demanda" fill="#3b82f6" radius={[3, 3, 0, 0]} />}
              {emergencies && <Bar dataKey="Urg. Diferidas" fill="#f97316" radius={[3, 3, 0, 0]} />}
              {emergencies && <Bar dataKey="Urg. Inmediatas" fill="#ef4444" radius={[3, 3, 0, 0]} />}
              {referrals && <Bar dataKey="Derivaciones" fill="#8b5cf6" radius={[3, 3, 0, 0]} />}
              {dropouts && <Bar dataKey="Bajas" fill="#22c55e" radius={[3, 3, 0, 0]} />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pie charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {dropouts?.byReason?.length > 0 && (
          <div className="p-5 bg-white rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Bajas por motivo</h3>
            <PieChartComponent data={dropouts.byReason.map((r) => ({ name: REASON_LABELS[r.reason] || r.reason, value: r.count }))} />
          </div>
        )}
        {referrals?.byReason?.length > 0 && (
          <div className="p-5 bg-white rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Derivaciones por motivo</h3>
            <PieChartComponent data={referrals.byReason.map((r) => ({ name: REASON_LABELS[r.reason] || r.reason, value: r.count }))} />
          </div>
        )}
      </div>

      {/* Detailed service table */}
      {serviceRows.length > 0 && (
        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Servicio</th>
                {demand && <th className="px-4 py-3 text-right">Demanda</th>}
                {emergencies && <th className="px-4 py-3 text-right">Urg. Diferidas</th>}
                {emergencies && <th className="px-4 py-3 text-right">Urg. Inmediatas</th>}
                {referrals && <th className="px-4 py-3 text-right">Derivaciones</th>}
                {dropouts && <th className="px-4 py-3 text-right">Bajas</th>}
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {serviceRows.map((s) => {
                const total = s.demand + s.emergDef + s.emergImm + s.referrals + s.dropouts;
                return (
                  <tr key={s.code} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-gray-900">{s.code}</span>
                      <span className="ml-2 text-gray-500">{s.name}</span>
                    </td>
                    {demand && <td className="px-4 py-2.5 text-right text-blue-700 font-medium">{s.demand}</td>}
                    {emergencies && <td className="px-4 py-2.5 text-right text-orange-600 font-medium">{s.emergDef}</td>}
                    {emergencies && <td className="px-4 py-2.5 text-right text-red-600 font-medium">{s.emergImm}</td>}
                    {referrals && <td className="px-4 py-2.5 text-right text-purple-600 font-medium">{s.referrals}</td>}
                    {dropouts && <td className="px-4 py-2.5 text-right text-green-600 font-medium">{s.dropouts}</td>}
                    <td className="px-4 py-2.5 text-right font-bold text-gray-900">{total}</td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr className="bg-gray-50 font-bold">
                <td className="px-4 py-2.5 text-gray-700">TOTAL</td>
                {demand && <td className="px-4 py-2.5 text-right text-blue-700">{demand.total}</td>}
                {emergencies && <td className="px-4 py-2.5 text-right text-orange-600">{emergencies.deferred.total}</td>}
                {emergencies && <td className="px-4 py-2.5 text-right text-red-600">{emergencies.immediate.total}</td>}
                {referrals && <td className="px-4 py-2.5 text-right text-purple-600">{referrals.total}</td>}
                {dropouts && <td className="px-4 py-2.5 text-right text-green-600">{dropouts.total}</td>}
                <td className="px-4 py-2.5 text-right text-gray-900">
                  {(demand?.total || 0) + (emergencies?.deferred?.total || 0) + (emergencies?.immediate?.total || 0) + (referrals?.total || 0) + (dropouts?.total || 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PieChartComponent({ data }) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) return <p className="text-sm text-gray-400 text-center py-8">Sin datos</p>;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {filtered.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
