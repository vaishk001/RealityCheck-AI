import { BrainCircuit, Radar, ShieldAlert, Target } from 'lucide-react';

const steps = [
  {
    title: 'Rule Engine Analysis',
    icon: Radar,
    description: 'Fast heuristic checks for scam patterns, suspicious domains, urgency language, and sensitive requests.'
  },
  {
    title: 'Threat Intelligence Check',
    icon: ShieldAlert,
    description: 'Reputation lookups (when configured) to catch known malicious URLs and infrastructure.'
  },
  {
    title: 'AI Behavior Detection',
    icon: BrainCircuit,
    description: 'LLM-based analysis for social engineering tactics, coercion, and intent signals in the message.'
  },
  {
    title: 'Risk Scoring',
    icon: Target,
    description: 'All signals are combined into a single, explainable score with categorized reasons and actions.'
  }
];

function StepCard({ step, index }) {
  const Icon = step.icon;

  return (
    <div className="rounded-2xl bg-slate-950/40 px-4 py-4 ring-1 ring-slate-700/40 transition hover:ring-slate-600/60">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400/15 via-violet-400/15 to-fuchsia-400/15 ring-1 ring-slate-700/40">
          <Icon className="h-5 w-5 text-cyan-200" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold text-slate-400">Step {index + 1}</div>
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-100">{step.title}</div>
          <div className="mt-1 text-xs leading-relaxed text-slate-400">{step.description}</div>
        </div>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section className="rounded-2xl bg-slate-900/40 ring-1 ring-slate-700/40 shadow-glow backdrop-blur">
      <div className="flex flex-col gap-2 border-b border-slate-800/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">How It Works</h3>
          <div className="mt-0.5 text-xs text-slate-500">A transparent pipeline from signals to decision.</div>
        </div>
        <div className="text-xs text-slate-500">Rule engine • Intel • AI • Explainability</div>
      </div>

      <div className="grid gap-4 px-5 py-4 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, idx) => (
          <StepCard key={s.title} step={s} index={idx} />
        ))}
      </div>
    </section>
  );
}
