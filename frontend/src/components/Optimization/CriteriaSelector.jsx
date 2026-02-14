const CATEGORY_COLORS = {
  priority: 'border-l-red-400',
  stability: 'border-l-blue-400',
  efficiency: 'border-l-green-400',
  fairness: 'border-l-purple-400',
  safety: 'border-l-orange-400',
  accuracy: 'border-l-cyan-400',
};

export default function CriteriaSelector({ criteria, onChange }) {
  function toggle(code) {
    onChange(criteria.map((c) =>
      c.code === code ? { ...c, isSelected: !c.isSelected } : c
    ));
  }

  function toggleHard(code) {
    onChange(criteria.map((c) =>
      c.code === code ? { ...c, isHardConstraint: !c.isHardConstraint } : c
    ));
  }

  function setWeight(code, weight) {
    onChange(criteria.map((c) =>
      c.code === code ? { ...c, weight: Math.max(1, Math.min(10, Number(weight))) } : c
    ));
  }

  const anySelected = criteria.some((c) => c.isSelected);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Criterios de optimización</h3>
        {!anySelected && (
          <span className="text-xs text-red-500">Selecciona al menos un criterio</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {criteria.map((c) => (
          <div
            key={c.code}
            className={`p-3 bg-white rounded-lg border border-gray-200 border-l-4 ${CATEGORY_COLORS[c.category] || 'border-l-gray-400'} ${
              c.isSelected ? 'ring-1 ring-primary-200' : 'opacity-60'
            }`}
          >
            {/* Header: checkbox + name */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                checked={c.isSelected}
                onChange={() => toggle(c.code)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{c.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
              </div>
            </label>

            {/* Controls: hard/soft + weight */}
            {c.isSelected && (
              <div className="flex items-center gap-4 mt-2 pl-6">
                {c.canBeHard && (
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-red-500 focus:ring-red-400"
                      checked={c.isHardConstraint}
                      onChange={() => toggleHard(c.code)}
                    />
                    <span className={c.isHardConstraint ? 'text-red-600 font-medium' : 'text-gray-500'}>
                      Hard constraint
                    </span>
                  </label>
                )}
                {!c.isHardConstraint && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Peso:</span>
                    <input
                      type="range"
                      className="w-20 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                      min={1} max={10} step={1}
                      value={c.weight}
                      onChange={(e) => setWeight(c.code, e.target.value)}
                    />
                    <span className="text-xs font-mono text-gray-700 w-4 text-center">{c.weight}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
