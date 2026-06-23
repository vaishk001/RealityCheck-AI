import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';

function SignalRow({ label, count, signals = [] }) {
  const avgConfidence = useMemo(() => {
    if (signals.length === 0) return 0;
    return Math.round((signals.reduce((sum) => sum + 0.75, 0) / signals.length) * 100);
  }, [signals]);

  const intensity = Math.min(100, count * 25);
  const heatColor =
    intensity <= 33
      ? 'from-blue-600 via-cyan-500 to-emerald-400'
      : intensity <= 66
        ? 'from-amber-500 via-orange-500 to-red-400'
        : 'from-rose-600 via-red-500 to-pink-400';

  return (
    <div className="group rounded-xl bg-slate-800/40 p-3 ring-1 ring-slate-700/30 transition hover:ring-slate-600/50">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-slate-300">{label}</div>
          <div className="mt-1.5 h-2 w-full rounded-full bg-slate-900/80 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${heatColor} transition-all duration-700`}
              style={{ width: `${intensity}%` }}
            />
          </div>
        </div>
        <div className="ml-3 flex flex-col items-end gap-1">
          <span className="text-2xl font-black text-slate-100">{count}</span>
          <span className="text-xs text-slate-400">signals</span>
        </div>
      </div>

      {signals.length > 0 && (
        <div className="mt-2.5 space-y-1">
          {signals.slice(0, 2).map((signal, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="truncate text-slate-400">{signal}</span>
              <span className="ml-2 inline-block rounded-full bg-slate-700/50 px-2 py-0.5 text-slate-200 font-semibold">
                {avgConfidence}%
              </span>
            </div>
          ))}
          {signals.length > 2 && (
            <div className="text-xs text-slate-500">+{signals.length - 2} more</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HeatmapThreats({ categories = {} }) {
  const behavioral = categories?.behavioral || [];
  const technical = categories?.technical || [];
  const threatIntel = categories?.threatIntel || [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-slate-300">Threat Heatmap</div>
          <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
        </div>
        <div className="text-xs text-slate-500">
          {behavioral.length + technical.length + threatIntel.length} signals
        </div>
      </div>

      <SignalRow label="Behavioral" count={behavioral.length} signals={behavioral} />
      <SignalRow label="Technical" count={technical.length} signals={technical} />
      <SignalRow label="Threat Intel" count={threatIntel.length} signals={threatIntel} />
    </div>
  );
}
