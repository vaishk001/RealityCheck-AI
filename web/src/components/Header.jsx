import { Activity, BrainCircuit, ShieldCheck } from 'lucide-react';

function Pill({ tone = 'slate', icon: Icon, label }) {
  const tones = {
    green: 'bg-emerald-500/10 text-emerald-200 ring-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-200 ring-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-200 ring-rose-500/20',
    slate: 'bg-slate-500/10 text-slate-200 ring-slate-500/20'
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ring-1 ${tones[tone]}`}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      <span className="font-medium">{label}</span>
    </div>
  );
}

export default function Header({ backendStatus, aiStatus, threatIntelStatus }) {
  const backendTone = backendStatus === 'connected' ? 'green' : backendStatus === 'error' ? 'rose' : 'slate';
  const aiTone = aiStatus === 'active' ? 'green' : aiStatus === 'degraded' ? 'amber' : aiStatus === 'disabled' ? 'rose' : 'slate';
  const intelTone =
    threatIntelStatus === 'ready'
      ? 'green'
      : threatIntelStatus === 'missing'
        ? 'amber'
        : threatIntelStatus === 'error'
          ? 'rose'
          : 'slate';

  return (
    <header className="relative mx-auto max-w-6xl px-5 pt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/50 px-3 py-1 text-xs text-slate-300 ring-1 ring-slate-700/40 backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-300" />
            Digital Risk Intelligence
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">
            RealityCheck AI
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Explainable scam detection for links, messages, and social engineering.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill
            tone={backendTone}
            icon={Activity}
            label={
              backendStatus === 'connected'
                ? 'Backend Connected'
                : backendStatus === 'error'
                  ? 'Backend Offline'
                  : 'Backend Checking'
            }
          />
          <Pill
            tone={aiTone}
            icon={BrainCircuit}
            label={
              aiStatus === 'active'
                ? 'AI Active'
                : aiStatus === 'degraded'
                  ? 'AI Degraded'
                  : aiStatus === 'disabled'
                    ? 'AI Disabled'
                    : 'AI Unknown'
            }
          />
          <Pill
            tone={intelTone}
            icon={ShieldCheck}
            label={
              threatIntelStatus === 'ready'
                ? 'Threat Intel Ready'
                : threatIntelStatus === 'missing'
                  ? 'Threat Intel Not Configured'
                  : threatIntelStatus === 'error'
                    ? 'Threat Intel Offline'
                    : 'Threat Intel Checking'
            }
          />
        </div>
      </div>
    </header>
  );
}
