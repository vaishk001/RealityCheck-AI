import { useEffect, useMemo, useState } from 'react';
import { BrainCircuit, Radar, ShieldAlert } from 'lucide-react';

const STEPS = [
  { id: 'rules', label: 'Rule Engine', icon: Radar },
  { id: 'intel', label: 'Threat Intel', icon: ShieldAlert },
  { id: 'ai', label: 'AI Analysis', icon: BrainCircuit }
];

const STATUS_MESSAGES = [
  'Normalizing payload and extracting entities…',
  'Matching known scam patterns and triggers…',
  'Correlating with threat intelligence sources…',
  'Evaluating intent, urgency, and manipulation cues…',
  'Synthesizing AI judgment and confidence score…'
];

function StepRow({ step, state }) {
  const Icon = step.icon;

  const tone =
    state === 'done'
      ? 'text-emerald-200'
      : state === 'active'
        ? 'text-cyan-200'
        : 'text-slate-400';

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <div
          className={
            'grid h-8 w-8 place-items-center rounded-xl ring-1 transition ' +
            (state === 'done'
              ? 'bg-emerald-500/10 ring-emerald-500/25'
              : state === 'active'
                ? 'bg-cyan-500/10 ring-cyan-500/25'
                : 'bg-slate-900/30 ring-slate-700/40')
          }
        >
          <Icon className={`h-4 w-4 ${tone}`} />
        </div>
        <div className="min-w-0">
          <div className={`truncate text-sm font-semibold ${tone}`}>{step.label}</div>
          <div className="mt-0.5 text-xs text-slate-500">
            {state === 'done' ? 'Completed' : state === 'active' ? 'Running…' : 'Queued'}
          </div>
        </div>
      </div>

      <div className="w-24">
        <div className="h-1.5 w-full rounded-full bg-slate-800/70">
          <div
            className={
              'h-1.5 rounded-full transition-all duration-500 ' +
              (state === 'done'
                ? 'w-full bg-gradient-to-r from-emerald-300 to-cyan-300'
                : state === 'active'
                  ? 'w-2/3 bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 scan-shimmer'
                  : 'w-1/6 bg-slate-700/50')
            }
          />
        </div>
      </div>
    </div>
  );
}

export default function LiveScanSteps({ active = false }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;

    const id = setInterval(() => setTick((t) => t + 1), 800);
    return () => clearInterval(id);
  }, [active]);

  const activeIndex = useMemo(() => {
    if (!active) return -1;
    return tick % STEPS.length;
  }, [active, tick]);

  const statusText = useMemo(() => {
    if (!active) return '';
    return STATUS_MESSAGES[tick % STATUS_MESSAGES.length];
  }, [active, tick]);

  if (!active) return null;

  return (
    <div className="rounded-2xl bg-slate-950/40 px-4 py-4 ring-1 ring-slate-700/40">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-300">Live Scan</div>
          <div className="mt-1 text-sm text-slate-200">Running detection pipeline…</div>
          <div className="mt-2 text-xs text-slate-500 animate-fade-up">{statusText}</div>
        </div>
        <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-300" />
      </div>

      <div className="mt-4 space-y-3">
        {STEPS.map((step, idx) => {
          const state = idx < activeIndex ? 'done' : idx === activeIndex ? 'active' : 'queued';
          return <StepRow key={step.id} step={step} state={state} />;
        })}
      </div>
    </div>
  );
}
