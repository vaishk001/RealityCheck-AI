export default function RiskTimeline({ breakdown = {} }) {
  const ruleScore = Number(breakdown.ruleScore || 0);
  const threatIntelScore = Number(breakdown.threatIntelScore || 0);
  const aiScore = Number(breakdown.aiScore || 0);

  const layers = [
    {
      id: 'rules',
      label: 'Rule Engine',
      value: ruleScore,
      max: 45,
      color: 'from-cyan-400 to-blue-500',
      depth: 0
    },
    {
      id: 'intel',
      label: 'Threat Intelligence',
      value: threatIntelScore,
      max: 35,
      color: 'from-violet-400 to-fuchsia-500',
      depth: 1
    },
    {
      id: 'ai',
      label: 'AI Analysis',
      value: aiScore,
      max: 20,
      color: 'from-amber-400 to-orange-500',
      depth: 2
    }
  ];

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-slate-300">Detection Layers</div>

      <div className="relative space-y-3">
        {/* Connecting line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/40 via-violet-500/40 to-amber-500/40" />

        {layers.map((layer, idx) => (
          <div
            key={layer.id}
            className="relative pl-12 transition-all duration-500 hover:pl-14"
            style={{ zIndex: 10 - idx }}
          >
            {/* Timeline dot */}
            <div
              className={`absolute left-0 top-2 h-8 w-8 rounded-full ring-2 ring-slate-900 flex items-center justify-center bg-gradient-to-br ${layer.color} shadow-lg`}
            >
              <div className="h-3 w-3 rounded-full bg-slate-900" />
            </div>

            {/* Card with depth effect */}
            <div
              className={`rounded-xl bg-slate-800/50 p-3 ring-1 ring-slate-700/40 backdrop-blur transition-all duration-300 hover:ring-slate-600/60 hover:shadow-lg`}
              style={{
                transform: `translateY(${idx * 2}px) perspective(1000px) rotateX(${idx * -1}deg)`,
                boxShadow: `0 ${4 + idx * 2}px ${8 + idx * 4}px rgba(0, 0, 0, ${0.3 + idx * 0.1})`
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-slate-300">{layer.label}</div>
                <span className="text-xs font-bold text-slate-100">
                  {layer.value} / {layer.max}
                </span>
              </div>

              <div className="h-2 rounded-full bg-slate-900/80 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${layer.color} transition-all duration-700`}
                  style={{ width: `${Math.round((layer.value / layer.max) * 100)}%` }}
                />
              </div>

              {/* Contribution % */}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-slate-500">Contribution</span>
                <span className="text-sm font-bold text-slate-200">
                  {Math.round((layer.value / (45 + 35 + 20)) * 100)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
