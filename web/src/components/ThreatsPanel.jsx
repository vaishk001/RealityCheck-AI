import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowUp, Flame, Loader2, Plus, RefreshCcw, Send, ShieldAlert } from 'lucide-react';
import { getThreats, reportThreat, voteThreat } from '../lib/api.js';

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Phishing', value: 'Phishing' },
  { label: 'Job Scam', value: 'Job Scam' },
  { label: 'Payment Scam', value: 'Fake Payment' }
];

const THREAT_TYPE_OPTIONS = ['Phishing', 'Malware', 'Social Engineering', 'Fake Payment', 'Job Scam', 'Crypto Scam'];

function shorten(text, max = 120) {
  const raw = String(text || '').trim();
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 1).trim()}…`;
}

function toneForThreat(threatType) {
  const t = String(threatType || '').toLowerCase();
  if (t.includes('phishing')) return 'text-rose-300 ring-rose-500/30 bg-rose-500/10';
  if (t.includes('payment')) return 'text-amber-300 ring-amber-500/30 bg-amber-500/10';
  if (t.includes('job')) return 'text-violet-300 ring-violet-500/30 bg-violet-500/10';
  return 'text-cyan-300 ring-cyan-500/30 bg-cyan-500/10';
}

function timeAgo(input) {
  const ts = new Date(input || 0).getTime();
  if (!Number.isFinite(ts)) return 'unknown';
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ThreatsPanel() {
  const [filter, setFilter] = useState('');
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [votingId, setVotingId] = useState('');
  const [showReportForm, setShowReportForm] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportMessage, setReportMessage] = useState({ type: '', text: '' });
  const [draft, setDraft] = useState({ content: '', threatType: 'Phishing', score: 75 });

  async function fetchThreats(activeFilter = filter) {
    setLoading(true);
    setError('');
    try {
      const rows = await getThreats({ limit: 20, threatType: activeFilter || undefined });
      setThreats(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load community threats.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchThreats(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const topThreatId = useMemo(() => (threats[0]?._id ? String(threats[0]._id) : ''), [threats]);
  const recentStats = useMemo(() => {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const recent = threats.filter((item) => new Date(item.createdAt || 0).getTime() >= tenMinutesAgo);
    const latest = threats[0]?.createdAt ? timeAgo(threats[0].createdAt) : 'unknown';
    return { recentCount: recent.length, latest };
  }, [threats]);

  async function handleVote(id) {
    setVotingId(id);
    setError('');
    try {
      const updated = await voteThreat(id);
      setThreats((prev) =>
        prev
          .map((item) => (String(item._id) === String(id) ? { ...item, votes: updated?.votes ?? item.votes } : item))
          .sort((a, b) => Number(b.votes || 0) - Number(a.votes || 0))
      );
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Vote failed.');
    } finally {
      setVotingId('');
    }
  }

  async function handleReportSubmit(e) {
    e.preventDefault();

    const content = String(draft.content || '').trim();
    if (content.length < 8) {
      setReportMessage({ type: 'error', text: 'Please provide at least 8 characters.' });
      return;
    }

    setReporting(true);
    setReportMessage({ type: '', text: '' });
    try {
      const response = await reportThreat({
        content,
        threatType: draft.threatType,
        score: Number(draft.score)
      });

      const merged = response?.created === false;
      setReportMessage({
        type: 'success',
        text: merged
          ? 'Similar threat already existed. Your report strengthened its confidence.'
          : 'Threat submitted to community feed.'
      });

      setDraft({ content: '', threatType: 'Phishing', score: 75 });
      await fetchThreats(filter);
    } catch (e2) {
      setReportMessage({
        type: 'error',
        text: e2?.response?.data?.message || e2?.message || 'Failed to submit threat report.'
      });
    } finally {
      setReporting(false);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-3xl bg-gradient-to-br from-slate-900/70 to-slate-950/80 p-6 ring-1 ring-slate-700/40 shadow-2xl"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">
            <Flame className="h-3.5 w-3.5" />
            Trending Threats
          </div>
          <p className="mt-1 text-sm text-slate-400">Live community-reported scam intelligence feed.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReportForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-cyan-200 ring-1 ring-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/15"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Threat
          </button>
          <button
            onClick={() => fetchThreats(filter)}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 ring-1 ring-slate-700/50 hover:bg-slate-800/40"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {showReportForm ? (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleReportSubmit}
          className="mb-5 rounded-2xl bg-slate-900/60 p-4 ring-1 ring-slate-700/50"
        >
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
            <textarea
              value={draft.content}
              onChange={(e) => setDraft((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="Paste suspicious content to report to community intelligence..."
              className="min-h-24 rounded-xl bg-slate-950/60 px-3 py-2 text-sm text-slate-100 ring-1 ring-slate-700/50 placeholder:text-slate-500 focus:outline-none focus:ring-cyan-500/40"
            />

            <select
              value={draft.threatType}
              onChange={(e) => setDraft((prev) => ({ ...prev, threatType: e.target.value }))}
              className="h-11 rounded-xl bg-slate-950/60 px-3 text-sm text-slate-100 ring-1 ring-slate-700/50 focus:outline-none focus:ring-cyan-500/40"
            >
              {THREAT_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={0}
              max={100}
              value={draft.score}
              onChange={(e) => setDraft((prev) => ({ ...prev, score: e.target.value }))}
              className="h-11 w-24 rounded-xl bg-slate-950/60 px-3 text-sm text-slate-100 ring-1 ring-slate-700/50 focus:outline-none focus:ring-cyan-500/40"
              aria-label="Score"
            />

            <button
              type="submit"
              disabled={reporting}
              className={
                'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold ring-1 transition ' +
                (reporting
                  ? 'bg-slate-800/60 text-slate-500 ring-slate-700/50'
                  : 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30 hover:bg-emerald-500/20')
              }
            >
              {reporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Report
            </button>
          </div>

          {reportMessage.text ? (
            <div
              className={
                'mt-3 rounded-xl px-3 py-2 text-xs ring-1 ' +
                (reportMessage.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-200 ring-emerald-500/25'
                  : 'bg-rose-500/10 text-rose-200 ring-rose-500/25')
              }
            >
              {reportMessage.text}
            </div>
          ) : null}
        </motion.form>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-950/40 px-4 py-3 ring-1 ring-slate-800/60">
        <div className="text-xs text-slate-400">
          <span className="font-semibold text-slate-200">Recent activity:</span> {recentStats.recentCount} report(s) in the last 10 minutes
        </div>
        <div className="text-xs text-slate-500">Last update {recentStats.latest}</div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={
              'rounded-xl px-3 py-1.5 text-xs font-semibold ring-1 transition ' +
              (filter === f.value
                ? 'bg-cyan-500/10 text-cyan-300 ring-cyan-500/30'
                : 'bg-slate-900/50 text-slate-300 ring-slate-700/50 hover:bg-slate-800/50')
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid place-items-center rounded-2xl bg-slate-900/40 px-4 py-12 ring-1 ring-slate-800/60">
          <div className="inline-flex items-center gap-2 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading intelligence feed...
          </div>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/25">
          <div className="inline-flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        </div>
      ) : null}

      {!loading && !error && threats.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/40 px-4 py-8 text-center ring-1 ring-slate-800/60">
          <ShieldAlert className="mx-auto h-6 w-6 text-slate-400" />
          <p className="mt-2 text-sm text-slate-300">No threats reported yet for this filter.</p>
        </div>
      ) : null}

      {!loading && !error && threats.length > 0 ? (
        <div className="space-y-3">
          {threats.map((item, idx) => {
            const id = String(item._id || idx);
            const isTop = id === topThreatId;
            const isFresh = Date.now() - new Date(item.createdAt || 0).getTime() < 10 * 60 * 1000;

            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={
                  'rounded-2xl p-4 ring-1 transition ' +
                  (isTop
                    ? 'bg-gradient-to-r from-cyan-500/10 to-violet-500/10 ring-cyan-500/30'
                    : 'bg-slate-900/50 ring-slate-700/50 hover:ring-slate-600/60')
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-relaxed text-slate-200">{shorten(item.content, 140)}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${toneForThreat(item.threatType)}`}>
                        {item.threatType}
                      </span>
                      {isTop ? (
                        <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 ring-1 ring-cyan-500/30">
                          Trending
                        </span>
                      ) : null}
                      {isFresh ? (
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                          Just reported
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <div className="hidden text-xs text-slate-500 sm:block">{timeAgo(item.createdAt)}</div>
                    <div className="rounded-xl bg-slate-800/60 px-2.5 py-1.5 text-xs font-bold text-slate-200 ring-1 ring-slate-700/50">
                      {Number(item.votes || 0)} votes
                    </div>
                    <button
                      onClick={() => handleVote(id)}
                      disabled={votingId === id}
                      className={
                        'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold ring-1 transition ' +
                        (votingId === id
                          ? 'bg-slate-800/60 text-slate-500 ring-slate-700/50'
                          : 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30 hover:bg-emerald-500/20')
                      }
                    >
                      {votingId === id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5" />}
                      Upvote
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : null}
    </motion.section>
  );
}
