import { useMemo } from 'react';

export default function AdvancedRiskGauge({ score = 0 }) {
  const normalized = Math.max(0, Math.min(100, Number(score || 0)));

  // Dynamic color based on score with smooth transitions
  const getColorStop = (position) => {
    if (normalized <= 33) return `hsl(${120 + (normalized / 33) * 60}, 100%, 50%)`;
    if (normalized <= 66) return `hsl(${180 - (normalized - 33) / 33 * 90}, 100%, 50%)`;
    return `hsl(${90 - (normalized - 66) / 34 * 90}, 100%, 50%)`;
  };

  const arcPath = useMemo(() => {
    const centerX = 100;
    const centerY = 100;
    const radius = 80;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + ((Math.PI * 2 * normalized) / 100);

    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);

    const largeArc = normalized > 50 ? 1 : 0;

    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  }, [normalized]);

  const riskLevel = normalized <= 33 ? 'Safe' : normalized <= 66 ? 'Suspicious' : 'Dangerous';
  const riskColor =
    normalized <= 33 ? 'emerald' : normalized <= 66 ? 'amber' : 'rose';

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-64 w-64">
        <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-lg">
          {/* Background rings */}
          <defs>
            <radialGradient id="riskGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={`hsl(${normalized <= 33 ? 142 : normalized <= 66 ? 45 : 0}, 100%, 20%)`} />
              <stop offset="100%" stopColor={`hsl(${normalized <= 33 ? 142 : normalized <= 66 ? 45 : 0}, 100%, 8%)`} />
            </radialGradient>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={getColorStop(0)} />
              <stop offset="100%" stopColor={getColorStop(normalized)} />
            </linearGradient>
          </defs>

          {/* Outer ring (background) */}
          <circle cx="100" cy="100" r="85" fill="url(#riskGradient)" opacity="0.3" />

          {/* Grid rings (depth effect) */}
          {[60, 75, 90].map((r) => (
            <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="0.5" />
          ))}

          {/* Background arc */}
          <path
            d={`M 100 20 A 80 80 0 1 1 99.9 20`}
            fill="none"
            stroke="rgba(148,163,184,0.2)"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Progress arc (animated) */}
          <path
            d={arcPath}
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            pathLength="100"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))',
              transition: 'all 800ms cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          />

          {/* Center circle */}
          <circle cx="100" cy="100" r="50" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(148,163,184,0.3)" strokeWidth="1" />

          {/* Score text */}
          <text x="100" y="95" textAnchor="middle" className="text-4xl font-bold fill-slate-100" dy="0.3em">
            {Math.round(normalized)}
          </text>
          <text x="100" y="115" textAnchor="middle" className="text-xs fill-slate-400" dy="0.3em">
            RISK SCORE
          </text>
        </svg>

        {/* Risk label badge */}
        <div
          className={`absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-bold ring-2 transition-all duration-700 ${
            riskColor === 'emerald'
              ? 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30'
              : riskColor === 'amber'
                ? 'bg-amber-500/20 text-amber-300 ring-amber-500/30'
                : 'bg-rose-500/20 text-rose-300 ring-rose-500/30'
          }`}
        >
          {riskLevel}
        </div>
      </div>
    </div>
  );
}
