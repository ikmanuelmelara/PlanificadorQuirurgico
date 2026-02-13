import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const METHOD_LABELS = {
  association_rules: 'Reglas asociación',
  clustering: 'Clustering',
  decision_tree: 'Árbol decisión',
  anomaly_detection: 'Anomalías',
  manual: 'Manual',
};

const CATEGORY_LABELS = {
  room: 'Quirófano',
  session: 'Sesión',
  sequence: 'Secuencia',
  combination: 'Combinación',
  temporal: 'Temporal',
  unknown: 'Otro',
};

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4'];
const BAR_COLOR = '#3b82f6';

export default function DiscoveryMethodsChart({ byMethod, byCategory }) {
  const methodData = (byMethod || [])
    .map((m) => ({ name: METHOD_LABELS[m._id] || m._id, value: m.count }))
    .filter((d) => d.value > 0);

  const categoryData = (byCategory || [])
    .map((c) => ({ name: CATEGORY_LABELS[c._id] || c._id, count: c.count }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Pie: by method */}
      {methodData.length > 0 && (
        <div className="p-5 bg-white rounded-xl border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Por método de descubrimiento</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={methodData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={75}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {methodData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bar: by category */}
      {categoryData.length > 0 && (
        <div className="p-5 bg-white rounded-xl border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Por categoría</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Restricciones" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
