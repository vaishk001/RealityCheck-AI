import { useMemo, useState } from 'react';
import { FileUp, Link2, Mail, MessageSquareText, Radar, Sparkles } from 'lucide-react';
import LiveScanSteps from './LiveScanSteps.jsx';

function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={
        'inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ring-1 transition ' +
        (active
          ? 'bg-gradient-to-r from-cyan-300 to-violet-300 text-slate-950 ring-white/20 shadow-glow'
          : 'bg-slate-950/40 text-slate-300 ring-slate-700/40 hover:bg-slate-900/60')
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default function Scanner({ onScan, loading, error, value, onChange }) {
  const [tab, setTab] = useState('text'); // text | url | email | upload
  const [selectedFile, setSelectedFile] = useState(null);

  const placeholder = useMemo(() => {
    if (tab === 'url') return 'Paste a suspicious URL (e.g., https://login.secure-bank.example.xyz)';
    if (tab === 'email') return 'Paste an email (UI only for now)';
    if (tab === 'upload') return 'Upload a document or image for scanning';
    return 'Paste a suspicious message (job offer, OTP request, urgent account notice, etc.)';
  }, [tab]);

  async function handleScan() {
    if (tab === 'upload') {
      if (!selectedFile) return;
      await onScan({ tab, input: '', file: selectedFile });
      return;
    }

    if (!value.trim()) return;
    await onScan({ tab, input: value.trim(), file: null });
  }

  const canScan = tab === 'upload' ? Boolean(selectedFile) : value.trim().length > 0;

  return (
    <div className="rounded-3xl bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-fuchsia-500/20 p-[1px] shadow-premium">
      <div className="rounded-3xl bg-slate-900/60 ring-1 ring-white/5 backdrop-blur-xl">
        <div className="flex flex-col gap-3 border-b border-slate-800/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Scanner</h3>
            <div className="mt-0.5 text-xs text-slate-500">Choose an input type and run an explainable scan.</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <TabButton active={tab === 'text'} icon={MessageSquareText} label="Text" onClick={() => setTab('text')} />
            <TabButton active={tab === 'url'} icon={Link2} label="URL" onClick={() => setTab('url')} />
            <TabButton active={tab === 'email'} icon={Mail} label="Email" onClick={() => setTab('email')} />
            <TabButton active={tab === 'upload'} icon={FileUp} label="Upload" onClick={() => setTab('upload')} />
          </div>
        </div>

        <div className="px-5 py-4">
        {tab === 'upload' ? (
          <div className="rounded-2xl bg-slate-950/40 ring-1 ring-slate-700/40 p-4">
            <label className="block text-xs font-semibold text-slate-300">Select document or image</label>
            <input
              type="file"
              accept=".txt,.md,.csv,.json,.eml,.pdf,.docx,.png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff,image/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="mt-2 block w-full cursor-pointer rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-100 hover:border-slate-600/60"
            />
            <div className="mt-3 text-xs text-slate-400">
              Supports: txt, pdf, docx, png, jpg, jpeg, webp, bmp, tif, tiff (max 10MB)
            </div>
            {selectedFile ? (
              <div className="mt-2 rounded-lg bg-slate-900/40 px-3 py-2 text-xs text-slate-300 ring-1 ring-slate-700/40">
                Selected: <span className="font-semibold text-slate-100">{selectedFile.name}</span> ·{' '}
                {(selectedFile.size / 1024).toFixed(1)} KB
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-950/40 ring-1 ring-slate-700/40 transition focus-within:ring-cyan-500/30">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="min-h-36 w-full resize-none bg-transparent px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        )}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="h-4 w-4 text-violet-300" />
              Rule engine + threat intel + AI analyzer
            </div>

            <button
              onClick={handleScan}
              disabled={loading || !canScan}
              className={
                'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold ring-1 transition ' +
                (loading || !canScan
                  ? 'bg-slate-800/50 text-slate-500 ring-slate-700/40'
                  : 'bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 text-slate-950 ring-white/10 shadow-glow hover:scale-[1.02]')
              }
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />
                  Scanning…
                </span>
              ) : (
                <>
                  <Radar className="h-4 w-4" />
                  Scan
                </>
              )}
            </button>
          </div>

        {tab === 'email' ? (
          <div className="mt-3 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-200 ring-1 ring-amber-500/20">
            Email scanning is UI-only for now. Paste an email here, then switch to Text to scan.
          </div>
        ) : null}

        {loading ? (
          <div className="mt-4">
            <LiveScanSteps active />
          </div>
        ) : null}

          {error ? (
            <div className="mt-3 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/25">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
