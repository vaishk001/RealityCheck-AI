import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { reportThreat } from '../lib/api.js';
import ResultDashboard from './ResultDashboard.jsx';

const ALLOWED_THREAT_TYPES = new Set([
  'Phishing',
  'Malware',
  'Social Engineering',
  'Fake Payment',
  'Job Scam',
  'Crypto Scam'
]);

function inferThreatType(result) {
  if (ALLOWED_THREAT_TYPES.has(result?.threatType)) return result.threatType;

  const corpus = [result?.summary, ...(Array.isArray(result?.reasons) ? result.reasons : [])]
    .join(' ')
    .toLowerCase();

  if (/job|interview|hiring|recruiter/.test(corpus)) return 'Job Scam';
  if (/payment|invoice|transfer|refund|bank|upi|card/.test(corpus)) return 'Fake Payment';
  if (/wallet|bitcoin|usdt|crypto/.test(corpus)) return 'Crypto Scam';
  if (/malware|trojan|payload|ransom/.test(corpus)) return 'Malware';
  if (/phish|credential|login|verify account/.test(corpus)) return 'Phishing';
  return 'Social Engineering';
}

export default function ReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;
  const reportSeed = location.state?.reportSeed;
  const [reporting, setReporting] = useState(false);
  const [reportState, setReportState] = useState({ type: '', message: '' });

  if (!result) {
    // If accessed directly without a scan, push them back
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center font-medium">
          No scan data found. Redirecting...
          {setTimeout(() => navigate('/app', { replace: true }), 1500) && ''}
        </div>
      </div>
    );
  }

  const backgroundAccent = (() => {
    const score = result.score ?? 0;
    if (score >= 71) return 'from-rose-500/20 via-fuchsia-500/20 to-violet-500/20';
    if (score >= 31) return 'from-amber-500/20 via-orange-500/20 to-rose-500/20';
    return 'from-cyan-500/10 via-violet-500/10 to-emerald-500/10';
  })();

  const reportPayload = useMemo(() => {
    const threatType = inferThreatType(result);
    const contentCandidate = String(reportSeed || '').trim();
    const fallbackContent = [result?.summary, ...(Array.isArray(result?.reasons) ? result.reasons.slice(0, 3) : [])]
      .filter(Boolean)
      .join(' | ')
      .trim();

    return {
      content: contentCandidate || fallbackContent || 'Suspicious content reported from scan result',
      threatType,
      score: Number.isFinite(Number(result?.score)) ? Number(result.score) : 50
    };
  }, [reportSeed, result]);

  async function handleReportScam() {
    setReporting(true);
    setReportState({ type: '', message: '' });
    try {
      const response = await reportThreat(reportPayload);
      const merged = response?.created === false;
      setReportState({
        type: 'success',
        message: merged ? 'Threat was already known. Vote and confidence were strengthened.' : 'Threat reported to community intelligence feed.'
      });
    } catch (e) {
      setReportState({
        type: 'error',
        message: e?.response?.data?.message || e?.message || 'Failed to report threat.'
      });
    } finally {
      setReporting(false);
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500/30 overflow-x-hidden"
    >
      <div className="pointer-events-none fixed inset-0">
        <div
          className={`absolute -top-24 left-1/2 h-[40rem] w-[80%] max-w-6xl -translate-x-1/2 rounded-full bg-gradient-to-r ${backgroundAccent} blur-[120px] transition-colors duration-1000`}
        />
        <div className="absolute bottom-0 right-[-10rem] h-96 w-96 rounded-full bg-gradient-to-tr from-slate-700/10 to-violet-500/10 blur-[100px]" />
      </div>

      <header className="fixed top-0 z-50 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/app')}
              className="flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              New Scan
            </button>
            <div className="h-4 w-[1px] bg-slate-800" />
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-glow" />
              <span className="text-sm font-bold text-slate-200">RealityCheck AI</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pb-24 pt-32">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900/50 p-4 ring-1 ring-slate-700/40">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Community Threat Intelligence</div>
            <div className="mt-1 text-sm text-slate-300">Help the network by submitting this scam for crowd verification.</div>
          </div>

          <button
            onClick={handleReportScam}
            disabled={reporting || reportState.type === 'success'}
            className={
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition ' +
              (reporting || reportState.type === 'success'
                ? 'bg-slate-800/60 text-slate-500 ring-slate-700/50'
                : 'bg-gradient-to-r from-rose-400/80 via-fuchsia-400/80 to-violet-400/80 text-slate-950 ring-white/10 shadow-glow hover:scale-[1.02]')
            }
          >
            {reporting ? <Loader2 className="h-4 w-4 animate-spin" /> : reportState.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {reporting ? 'Reporting...' : reportState.type === 'success' ? 'Reported' : 'Report as Scam'}
          </button>
        </div>

        {reportState.message ? (
          <div
            className={
              'mb-6 rounded-xl px-4 py-3 text-sm ring-1 ' +
              (reportState.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-200 ring-emerald-500/30'
                : 'bg-rose-500/10 text-rose-200 ring-rose-500/30')
            }
          >
            {reportState.message}
          </div>
        ) : null}

        <ResultDashboard result={result} loading={false} />
      </main>
    </motion.div>
  );
}
