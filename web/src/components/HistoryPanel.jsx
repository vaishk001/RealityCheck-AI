import { useEffect, useState } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { getHistory } from '../lib/api';

function statusTone(status) {
  if (status === 'Dangerous') return 'text-rose-300 bg-rose-500/10 ring-rose-500/20';
  if (status === 'Suspicious') return 'text-amber-300 bg-amber-500/10 ring-amber-500/20';
  return 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/20';
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return String(iso || '');
  }
}

export default function HistoryPanel({ refreshKey = 0, onPick }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const data = await getHistory(5);
      setItems(Array.isArray(data) ? data : data?.value || []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load scan history');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  return (
    <div className="rounded-2xl bg-slate-900/40 ring-1 ring-slate-700/40 shadow-glow backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-800/70 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Scan History</h3>
          <div className="mt-0.5 text-xs text-slate-500">Last 5 scans (latest first)</div>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950/40 px-3 py-2 text-xs font-semibold text-slate-200 ring-1 ring-slate-700/40 transition hover:ring-slate-600/60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="px-5 py-4">
        {error ? (
          <div className="mb-3 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/25">
            {error}
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className="text-sm text-slate-400">No scan history yet.</div>
        ) : (
          <div className="space-y-2">
            {items.map((row, idx) => (
              <button
                key={`${row.createdAt}-${idx}`}
                onClick={() => onPick(row.input)}
                className="w-full rounded-xl bg-slate-950/40 px-3 py-3 text-left ring-1 ring-slate-700/40 transition hover:ring-slate-600/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-200">{row.input}</div>
                    <div className="mt-1 inline-flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(row.createdAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusTone(row.status)}`}>
                      {row.status}
                    </span>
                    <span className="rounded-full bg-slate-800/60 px-3 py-1 text-xs font-semibold text-slate-100 ring-1 ring-slate-700/40">
                      {Math.round(Number(row.score || 0))}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 text-xs text-slate-500">Click an item to load it into the scanner.</div>
      </div>
    </div>
  );
}
