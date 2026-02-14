import { Link } from 'react-router-dom';

export default function OptimizationResults({ data }) {
  const { scores, comparison, iterations, improvement, hardConstraintsMet, totalSessions, criteriaUsed } = data;

  return (
    <div className="space-y-5">
      {/* Top summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Puntuación total"
          value={`${scores.totalScore}/100`}
          color={scores.totalScore >= 75 ? 'green' : scores.totalScore >= 50 ? 'amber' : 'red'}
        />
        <SummaryCard
          label="Sesiones óptimas"
          value={totalSessions}
          color="primary"
        />
        <SummaryCard
          label="Iteraciones"
          value={iterations}
          color="purple"
        />
        <SummaryCard
          label="Mejora"
          value={`${improvement > 0 ? '+' : ''}${improvement} pts`}
          color={improvement > 0 ? 'green' : 'amber'}
        />
      </div>

      {/* Hard constraints status */}
      <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
        hardConstraintsMet
          ? 'bg-green-50 border-green-200 text-green-700'
          : 'bg-red-50 border-red-200 text-red-700'
      }`}>
        {hardConstraintsMet ? (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Todos los hard constraints cumplidos
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {scores.violations?.length || 0} hard constraint(s) violado(s)
          </>
        )}
      </div>

      {/* Violations detail */}
      {scores.violations?.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs font-semibold text-red-700 mb-1">Restricciones duras violadas:</p>
          {scores.violations.map((v) => (
            <p key={v.code} className="text-xs text-red-600">
              {v.name}: {v.score}/100 — {v.details}
            </p>
          ))}
        </div>
      )}

      {/* Score bars per criterion */}
      <div className="p-4 bg-white rounded-xl border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Puntuación por criterio</h3>
        <div className="space-y-3">
          {scores.scores?.map((s) => (
            <div key={s.code}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">
                  {s.name}
                  {s.isHardConstraint && <span className="ml-1 text-red-500 font-medium">(HARD)</span>}
                </span>
                <span className="text-xs font-mono text-gray-700">{s.score}/100</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    s.score >= 80 ? 'bg-green-500' : s.score >= 50 ? 'bg-yellow-400' : 'bg-red-500'
                  }`}
                  style={{ width: `${s.score}%` }}
                />
              </div>
              {s.details && <p className="text-xs text-gray-400 mt-0.5">{s.details}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Comparison summary */}
      {comparison && (
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Comparativa vs reparto actual</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 text-sm mb-4">
            <Stat label="Cambios totales" value={comparison.sessionsChanged} sub={`${comparison.sessionsChangedPercent}%`} />
            <Stat label="Añadidas" value={comparison.added} color="green" />
            <Stat label="Eliminadas" value={comparison.removed} color="red" />
            <Stat label="Modificadas" value={comparison.modified} color="amber" />
            <Stat label="Sin cambio" value={comparison.unchanged} color="gray" />
          </div>

          {/* By service table */}
          {comparison.byService?.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 uppercase">
                    <th className="px-3 py-2">Servicio</th>
                    <th className="px-3 py-2 text-right">Actual</th>
                    <th className="px-3 py-2 text-right">Óptimo</th>
                    <th className="px-3 py-2 text-right">Neto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {comparison.byService.map((s) => (
                    <tr key={s.service} className="hover:bg-gray-50">
                      <td className="px-3 py-1.5">
                        <span className="font-medium text-gray-800">{s.service}</span>
                        <span className="ml-1 text-gray-400">{s.name}</span>
                      </td>
                      <td className="px-3 py-1.5 text-right text-gray-600">{s.current}</td>
                      <td className="px-3 py-1.5 text-right text-gray-600">{s.optimal}</td>
                      <td className={`px-3 py-1.5 text-right font-medium ${
                        s.net > 0 ? 'text-green-600' : s.net < 0 ? 'text-red-600' : 'text-gray-400'
                      }`}>
                        {s.net > 0 ? `+${s.net}` : s.net}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Link to planilla */}
      <div className="flex justify-end">
        <Link
          to="/planilla"
          className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
        >
          Ver planilla completa &rarr;
        </Link>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  const colors = {
    primary: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return (
    <div className={`rounded-xl border p-4 text-center ${colors[color]}`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function Stat({ label, value, sub, color }) {
  const textColor = {
    green: 'text-green-700',
    red: 'text-red-700',
    amber: 'text-amber-700',
    gray: 'text-gray-500',
  }[color] || 'text-gray-800';

  return (
    <div className="text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${textColor}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
