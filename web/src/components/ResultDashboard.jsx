import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clipboard,
  ClipboardCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Sparkles
} from 'lucide-react';
import LiveScanSteps from './LiveScanSteps.jsx';
import AdvancedRiskGauge from './AdvancedRiskGauge.jsx';
import SignalRadar from './SignalRadar.jsx';
import HeatmapThreats from './HeatmapThreats.jsx';
import RiskTimeline from './RiskTimeline.jsx';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function statusTone(status) {
  if (status === 'Dangerous') return 'rose';
  if (status === 'Suspicious') return 'amber';
  return 'emerald';
}

function toneClasses(tone) {
  const map = {
    emerald: 'bg-emerald-500/12 text-emerald-200 ring-emerald-500/25',
    amber: 'bg-amber-500/12 text-amber-200 ring-amber-500/25',
    rose: 'bg-rose-500/12 text-rose-200 ring-rose-500/25',
    slate: 'bg-slate-500/12 text-slate-200 ring-slate-500/25'
  };
  return map[tone] || map.slate;
}

function accentGradient(score) {
  const s = clamp(Number(score || 0), 0, 100);
  if (s >= 71) return 'from-rose-400 via-fuchsia-400 to-violet-400';
  if (s >= 31) return 'from-amber-300 via-orange-400 to-rose-400';
  return 'from-emerald-300 via-cyan-300 to-violet-300';
}

function solidAccent(score) {
  const s = clamp(Number(score || 0), 0, 100);
  if (s >= 71) return 'rgb(244,63,94)'; // rose-500
  if (s >= 31) return 'rgb(245,158,11)'; // amber-500
  return 'rgb(16,185,129)'; // emerald-500
}

function ScoreRing({ score }) {
  const normalized = clamp(Number(score || 0), 0, 100);
  const stroke = 10;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const dash = (normalized / 100) * circumference;
  const strokeColor = solidAccent(normalized);

  return (
    <div className="relative h-28 w-28 score-pulse">
      <svg viewBox="0 0 120 120" className="h-full w-full">
        <defs>
          <linearGradient id="scoreGradient2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(34,211,238)" />
            <stop offset="50%" stopColor="rgb(167,139,250)" />
            <stop offset="100%" stopColor="rgb(244,63,94)" />
          </linearGradient>
        </defs>
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(148,163,184,0.18)"
          strokeWidth={stroke}
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-3xl font-semibold tracking-tight">{Math.round(normalized)}</div>
          <div className="text-xs text-slate-400">Risk Score</div>
        </div>
      </div>
    </div>
  );
}

function MiniCard({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl bg-slate-950/40 px-4 py-3 ring-1 ring-slate-700/40 transition hover:ring-slate-600/60">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-300">{title}</div>
        {Icon ? <Icon className="h-4 w-4 text-slate-400" /> : null}
      </div>
      <div className="mt-2 text-sm text-slate-100">{children}</div>
    </div>
  );
}

function List({ items, accent }) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return <div className="text-sm font-medium text-slate-400">No signals detected.</div>;

  return (
    <ul className="space-y-3">
      {list.map((reason, idx) => (
        <li key={`${reason}-${idx}`} className="flex gap-4 group cursor-default rounded-2xl p-3 sm:p-4 transition hover:bg-slate-700/30 ring-1 ring-transparent hover:ring-slate-600/50 items-start">
          <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full bg-gradient-to-r ${accent} ring-2 ring-slate-800 shadow-[0_0_8px_rgba(255,255,255,0.2)] group-hover:scale-110 transition-transform`} />
          <span className="text-sm font-medium text-slate-200 leading-relaxed">{reason}</span>
        </li>
      ))}
    </ul>
  );
}

function BreakdownRow({ label, value = 0, max = 100, accent }) {
  const safeMax = Math.max(1, Number(max || 1));
  const safeValue = clamp(Number(value || 0), 0, safeMax);
  const pct = Math.round((safeValue / safeMax) * 100);

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <div className="font-semibold text-slate-300">{label}</div>
        <div className="text-slate-400">
          {Math.round(safeValue)} / {Math.round(safeMax)}
        </div>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-slate-800/70">
        <div
          className={`h-2 rounded-full bg-gradient-to-r ${accent} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AccordionSection({ title, count, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl bg-slate-950/40 ring-1 ring-slate-700/40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 border-b border-slate-800/70 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-slate-300">{title}</div>
          <span className="rounded-full bg-slate-800/60 px-2.5 py-0.5 text-xs font-semibold text-slate-100 ring-1 ring-slate-700/40">
            {count}
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {open ? <div className="px-4 py-4 text-sm">{children}</div> : null}
    </div>
  );
}

function recommendedActions({ status, categories }) {
  const actions = [];
  const tech = categories?.technical?.length || 0;
  const beh = categories?.behavioral?.length || 0;
  const intel = categories?.threatIntel?.length || 0;

  if (status === 'Dangerous') {
    actions.push('Do not click links or download attachments.');
    actions.push('Verify the sender using an independent channel (official site/phone).');
    actions.push('If credentials were entered, reset passwords and enable MFA immediately.');
    actions.push('Report as phishing to your email/security team.');
  } else if (status === 'Suspicious') {
    actions.push('Treat this as untrusted until verified.');
    actions.push('Inspect the domain carefully and avoid logging in from the link.');
    actions.push('Ask for context: who sent it, why now, what account is affected?');
  } else {
    actions.push('No strong scam indicators detected, but stay cautious.');
    actions.push('If anything feels off, verify sender identity before acting.');
  }

  if (intel > 0) actions.push('Threat intel signals present: avoid interaction and quarantine content.');
  if (tech > 0) actions.push('Technical indicators present: check URL spelling, HTTPS, and domain legitimacy.');
  if (beh > 0) actions.push('Behavioral indicators present: urgency/reward pressure is a common scam tactic.');

  // Dedupe.
  return [...new Set(actions)].slice(0, 6);
}

function buildRiskStory({ threatType, summary, attackExplanation }) {
  const parts = [
    threatType ? `Threat type: ${threatType}.` : '',
    attackExplanation ? attackExplanation : '',
    summary ? `Why it matters: ${summary}` : ''
  ].filter(Boolean);

  if (parts.length === 0) {
    return 'No additional narrative is available yet. Run a scan to generate a full risk story.';
  }

  return parts.join(' ');
}

function buildOutcomeScenario(status) {
  if (status === 'Dangerous') {
    return [
      'Credentials could be harvested and reused for account takeover.',
      'Financial loss may occur through unauthorized transfers or purchases.',
      'Attackers may deploy malware or persistence tooling after engagement.'
    ];
  }
  if (status === 'Suspicious') {
    return [
      'User might be redirected to a fake login or payment portal.',
      'Scammers can escalate pressure if the user responds.',
      'Sensitive information could be extracted over multiple messages.'
    ];
  }
  return [
    'Low immediate impact expected, but remain alert to follow-up attempts.',
    'Verify the sender if any requests feel unusual or time sensitive.',
    'Continue monitoring for similar messages or links.'
  ];
}

export default function ResultDashboard({ result, loading = false }) {
  const [copied, setCopied] = useState(false);
  const score = result?.score ?? 0;
  const status = result?.status || 'Safe';
  const tone = statusTone(status);
  const accent = accentGradient(score);

  const aiConfidencePct = useMemo(() => {
    const raw = Number(result?.aiConfidence);
    if (Number.isFinite(raw)) return clamp(Math.round(raw * 100), 0, 100);
    return clamp(Math.round(Number(score || 0)), 0, 100);
  }, [result?.aiConfidence, score]);

  const StatusIcon = status === 'Dangerous' ? ShieldX : status === 'Suspicious' ? ShieldAlert : ShieldCheck;

  if (loading && !result) {
    return (
      <div className="rounded-2xl bg-slate-900/40 ring-1 ring-slate-700/40 shadow-glow backdrop-blur animate-fade-up">
        <div className="flex items-center justify-between border-b border-slate-800/70 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-200">Result Dashboard</h3>
          <div className="text-xs text-slate-500">Scanning…</div>
        </div>

        <div className="px-5 py-4">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-slate-700/40">
              <div className="flex items-start justify-between gap-4">
                <ScoreRing score={0} />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-slate-300">Risk Overview</div>
                  <div className="mt-2 grid gap-3">
                    <MiniCard title="AI Confidence" icon={Sparkles}>
                      <span className="font-semibold text-slate-100">—</span>
                      <span className="ml-2 text-xs text-slate-400">waiting for model output</span>
                    </MiniCard>
                    <MiniCard title="Summary" icon={AlertTriangle}>
                      <span className="text-slate-400">Running detection pipeline…</span>
                    </MiniCard>
                  </div>
                </div>
              </div>
              <div className="mt-4 h-1.5 w-full rounded-full bg-slate-800/70">
                <div className={`h-1.5 w-2/3 rounded-full bg-gradient-to-r ${accent} scan-shimmer`} />
              </div>
            </div>

            <div className="space-y-4">
              <LiveScanSteps active />
              <div className="rounded-2xl bg-slate-950/40 px-4 py-4 ring-1 ring-slate-700/40">
                <div className="text-xs font-semibold text-slate-300">Loading Insights</div>
                <div className="mt-2 text-sm text-slate-400">
                  Threat breakdown, explanations, and actions will appear here.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-2xl bg-slate-900/40 ring-1 ring-slate-700/40 shadow-glow backdrop-blur">
        <div className="flex items-center justify-between border-b border-slate-800/70 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-200">Result Dashboard</h3>
          <div className="text-xs text-slate-500">Run a scan to populate insights</div>
        </div>
        <div className="grid place-items-center px-5 py-10 text-center">
          <div className="max-w-sm">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950/40 ring-1 ring-slate-700/40">
              <Info className="h-5 w-5 text-slate-300" />
            </div>
            <div className="mt-3 text-sm text-slate-300">No scan results yet.</div>
            <div className="mt-1 text-xs text-slate-500">
              Paste a suspicious message or URL and click Scan.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const actions = recommendedActions({ status, categories: result.categories });
  const attackFlow = Array.isArray(result.attackFlow) ? result.attackFlow : [];
  const attackStory = buildRiskStory({
    threatType: result.threatType,
    summary: result.summary,
    attackExplanation: result.attackExplanation
  });
  const outcomeScenario = buildOutcomeScenario(status);

  const breakdown = result.breakdown || {};
  const ruleScore = Number(breakdown.ruleScore || 0);
  const threatIntelScore = Number(breakdown.threatIntelScore || 0);
  const aiScore = Number(breakdown.aiScore || 0);

  const reportText = JSON.stringify(
    {
      score: result.score,
      status: result.status,
      summary: result.summary,
      aiConfidence: Number.isFinite(Number(result.aiConfidence)) ? result.aiConfidence : null,
      breakdown: result.breakdown || null,
      categories: result.categories || null,
      reasons: result.reasons || []
    },
    null,
    2
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Best-effort fallback for environments without clipboard permissions.
      try {
        const el = document.createElement('textarea');
        el.value = reportText;
        el.setAttribute('readonly', '');
        el.style.position = 'fixed';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      } catch {
        setCopied(false);
      }
    }
  }

  return (
    <div className="rounded-[28px] bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-fuchsia-500/20 p-[1px] shadow-premium">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-900/70 to-slate-950/80 ring-1 ring-slate-700/40 backdrop-blur-xl animate-fade-up">
        {/* Header with Premium Styling */}
        <div className="flex items-center justify-between border-b border-slate-700/30 bg-gradient-to-r from-slate-800/40 to-transparent px-6 py-5">
        <div>
          <h3 className="text-lg font-bold text-slate-100">Risk Analysis Report</h3>
          <p className="mt-0.5 text-xs text-slate-400">Real-time threat assessment</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-200 ring-1 ring-slate-700/50 transition hover:bg-slate-800/60 hover:ring-slate-500/60 active:scale-95"
          >
            {copied ? <ClipboardCheck className="h-4 w-4 text-emerald-300" /> : <Clipboard className="h-4 w-4" />}
            {copied ? 'Copied' : 'Export'}
          </button>

          <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold ring-2 ${toneClasses(tone)}`}>
            <StatusIcon className="h-4 w-4" />
            {status}
          </span>
        </div>
      </div>

      <div className="px-6 py-6 space-y-7">
        {/* Advanced Risk Gauge with AI Confidence */}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* Risk Gauge Card */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-900/60 p-8 ring-1 ring-slate-700/40 backdrop-blur shadow-lg flex flex-col items-center justify-center transition-all hover:shadow-cyan-500/15 hover:ring-slate-600/60">
            <AdvancedRiskGauge score={score} />
            <div className="mt-8 text-center bg-slate-900/50 w-full py-4 rounded-2xl ring-1 ring-white/5">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Overall Risk Level</div>
              <div className="text-sm font-medium text-slate-200">Detection confidence is strong</div>
            </div>
          </div>

          {/* AI Confidence & Summary Card */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-800/60 via-slate-800/40 to-slate-900/70 p-8 ring-1 ring-slate-700/40 backdrop-blur shadow-lg space-y-8 flex flex-col justify-between transition-all hover:shadow-violet-500/15 hover:ring-slate-600/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Model Confidence</div>
                <div className="text-4xl font-black tracking-tight text-white drop-shadow-md">{aiConfidencePct}%</div>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-950/80 shadow-inner overflow-hidden ring-1 ring-white/10">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${accent} transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(255,255,255,0.3)]`}
                  style={{ width: `${aiConfidencePct}%` }}
                />
              </div>
              <p className="mt-4 text-xs font-medium text-slate-500">AI certainty in this assessment</p>
            </div>

            <div className="relative z-10 p-5 rounded-2xl bg-slate-950/40 ring-1 ring-slate-800/60 mt-auto">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                <Info className="h-3 w-3" />
                Assessment
              </div>
              <p className="text-sm leading-relaxed text-slate-200 font-medium">
                {result.summary}
              </p>
            </div>

            <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none translate-x-1/4 translate-y-1/4">
              <SignalRadar active={true} />
            </div>
          </div>
        </div>

        {/* Threat Signals & Timeline */}
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-900/60 p-6 sm:p-8 ring-1 ring-slate-700/40 backdrop-blur shadow-lg transition-all hover:shadow-cyan-500/15 hover:ring-slate-600/60">
            <HeatmapThreats categories={result.categories} />
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-900/60 p-6 sm:p-8 ring-1 ring-slate-700/40 backdrop-blur shadow-lg transition-all hover:shadow-violet-500/15 hover:ring-slate-600/60 flex flex-col">
            <RiskTimeline breakdown={result.breakdown} />
          </div>
        </div>

        {/* Attack Visualization & Risk Story */}
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-900/60 p-6 sm:p-8 ring-1 ring-slate-700/40 backdrop-blur shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[11px] font-black text-slate-200 uppercase tracking-[0.15em]">Attack Visualization</div>
                <p className="mt-1 text-sm text-slate-400">How this scam typically unfolds.</p>
              </div>
              <div className="rounded-full bg-slate-900/70 px-3 py-1 text-xs font-semibold text-slate-300 ring-1 ring-slate-700/50">
                {result.threatType || 'Threat Flow'}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {(attackFlow.length > 0 ? attackFlow : ['Initial contact', 'Trust building', 'Credential or payment request', 'Impact']).map(
                (step, idx) => (
                  <div key={`${step}-${idx}`} className="flex items-center gap-3">
                    <div className="rounded-2xl bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-200 ring-1 ring-slate-700/50">
                      {step}
                    </div>
                    {idx < (attackFlow.length > 0 ? attackFlow.length : 4) - 1 ? (
                      <div className="h-px w-6 bg-gradient-to-r from-cyan-400/60 to-violet-400/60" />
                    ) : null}
                  </div>
                )
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-900/70 p-6 sm:p-8 ring-1 ring-slate-700/40 backdrop-blur shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[11px] font-black text-slate-200 uppercase tracking-[0.15em]">Risk Story</div>
                <p className="mt-1 text-sm text-slate-400">Narrative explanation of the attack.</p>
              </div>
              <div className="rounded-full bg-slate-900/70 px-3 py-1 text-xs font-semibold text-slate-300 ring-1 ring-slate-700/50">
                {result.userRisk || 'Medium'} Risk
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-200">{attackStory}</p>
          </div>
        </div>

        {/* Simulated Outcome & AI Reasoning */}
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-900/60 p-6 sm:p-8 ring-1 ring-slate-700/40 backdrop-blur shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[11px] font-black text-slate-200 uppercase tracking-[0.15em]">Simulated Outcome</div>
                <p className="mt-1 text-sm text-slate-400">If the user interacts, likely next steps.</p>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${toneClasses(tone)}`}>
                {status}
              </div>
            </div>
            <ul className="space-y-3">
              {outcomeScenario.map((item) => (
                <li key={item} className="rounded-2xl bg-slate-950/40 px-4 py-3 text-sm text-slate-200 ring-1 ring-slate-800/60">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <AccordionSection title="AI Reasoning" count={attackFlow.length || 3} defaultOpen={true}>
              <div className="space-y-3 text-sm text-slate-200">
                <div className="rounded-xl bg-slate-950/50 px-3 py-2 ring-1 ring-slate-800/60">
                  <span className="text-xs uppercase tracking-widest text-slate-500">Threat Type</span>
                  <div className="mt-1 font-semibold text-slate-100">{result.threatType || 'Social Engineering'}</div>
                </div>
                <div className="rounded-xl bg-slate-950/50 px-3 py-2 ring-1 ring-slate-800/60">
                  <span className="text-xs uppercase tracking-widest text-slate-500">AI Confidence</span>
                  <div className="mt-1 font-semibold text-slate-100">{aiConfidencePct}%</div>
                </div>
                <div className="rounded-xl bg-slate-950/50 px-3 py-2 ring-1 ring-slate-800/60">
                  <span className="text-xs uppercase tracking-widest text-slate-500">Attack Logic</span>
                  <div className="mt-1 text-slate-200">
                    {result.attackExplanation || 'AI-derived rationale unavailable. Review rule signals for more context.'}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-950/50 px-3 py-2 ring-1 ring-slate-800/60">
                  <span className="text-xs uppercase tracking-widest text-slate-500">Attack Flow</span>
                  <ul className="mt-2 space-y-1 text-slate-200">
                    {(attackFlow.length > 0 ? attackFlow : ['Initial engagement', 'Trust build-up', 'Request for sensitive action']).map(
                      (step, idx) => (
                        <li key={`${step}-${idx}`}>• {step}</li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            </AccordionSection>
          </div>
        </div>

        {/* Detailed Analysis & Actions */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Analysis Reasons */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-900/70 p-6 sm:p-8 ring-1 ring-slate-700/40 backdrop-blur shadow-lg transition-all hover:shadow-rose-500/15 hover:ring-slate-600/60">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700/50">
              <div>
                <div className="text-[11px] font-black text-slate-200 uppercase tracking-[0.15em]">Detection Reasons</div>
                <p className="mt-1 text-[13px] font-medium text-slate-400">Why this was flagged</p>
              </div>
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
                <Sparkles className="h-5 w-5 text-violet-400" />
              </div>
            </div>
            <div className="space-y-4">
              <List items={result.reasons} accent={accent} />
            </div>
          </div>

          {/* Recommended Actions */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-900/70 p-6 sm:p-8 ring-1 ring-slate-700/40 backdrop-blur shadow-lg transition-all hover:shadow-amber-500/15 hover:ring-slate-600/60">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700/50">
              <div>
                <div className="text-[11px] font-black text-slate-200 uppercase tracking-[0.15em]">Recommended Actions</div>
                <p className="mt-1 text-[13px] font-medium text-slate-400">Steps to take now</p>
              </div>
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 shadow-glow">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
            </div>
            <ul className="space-y-3">
              {actions.map((a, idx) => (
                <li key={`${a}-${idx}`} className="flex gap-4 group cursor-default rounded-2xl p-3 sm:p-4 transition hover:bg-slate-700/30 ring-1 ring-transparent hover:ring-slate-600/50 items-start">
                  <span
                    className={`mt-1.5 h-3 w-3 shrink-0 rounded-full bg-gradient-to-r ${accent} ring-2 ring-slate-800 shadow-[0_0_8px_rgba(255,255,255,0.2)] group-hover:scale-110 transition-transform`}
                  />
                  <span className="text-sm font-medium text-slate-200 leading-relaxed">{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
