import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from './Header.jsx';
import Scanner from './Scanner.jsx';
import QuickTemplates from './QuickTemplates.jsx';
import HowItWorks from './HowItWorks.jsx';
import { getBackendHealth, getSystemStatus, scanFile, scanText, scanUrl } from '../lib/api.js';

function isAiDegraded(reasons = []) {
  const joined = (Array.isArray(reasons) ? reasons : []).join(' ').toLowerCase();
  return /timeout|disabled|unavailable|invalid|model not found/i.test(joined);
}

export default function Dashboard() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [backendStatus, setBackendStatus] = useState('checking'); 
  const [aiStatus, setAiStatus] = useState('unknown'); 
  const [threatIntelStatus, setThreatIntelStatus] = useState('checking'); 

  useEffect(() => {
    let active = true;
    async function ping() {
      try {
        const status = await getSystemStatus();
        if (!active) return;
        setBackendStatus('connected');
        const ai = status?.ai;
        if (ai?.enabled === false) setAiStatus('disabled');
        else if (ai?.reachable && ai?.modelAvailable) setAiStatus('active');
        else if (ai?.enabled) setAiStatus('degraded');
        else setAiStatus('unknown');
        const intel = status?.threatIntel;
        const configured = Boolean(intel?.googleSafeBrowsingConfigured || intel?.virusTotalConfigured);
        setThreatIntelStatus(configured ? 'ready' : 'missing');
      } catch {
        try {
          await getBackendHealth();
          if (!active) return;
          setBackendStatus('connected');
          setAiStatus('unknown');
          setThreatIntelStatus('checking');
        } catch {
          if (!active) return;
          setBackendStatus('error');
          setAiStatus('unknown');
          setThreatIntelStatus('error');
        }
      }
    }
    ping();
    const id = setInterval(ping, 6000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const backgroundAccent = 'from-cyan-500/10 via-violet-500/10 to-emerald-500/10';

  async function handleScan({ tab, input: payload, file }) {
    setLoading(true);
    setError('');
    try {
      let data;
      if (tab === 'url') data = await scanUrl(payload);
      else if (tab === 'upload') data = await scanFile(file);
      else data = await scanText(payload);
      
      if (Array.isArray(data?.reasons) && data.reasons.length > 0) {
        setAiStatus(isAiDegraded(data.reasons) ? 'degraded' : 'active');
      }

      const normalizedInput = typeof payload === 'string' ? payload.trim() : '';
      const reportSeed =
        tab === 'upload'
          ? `File: ${file?.name || 'uploaded-file'}\nSummary: ${data?.summary || ''}`
          : normalizedInput;

      navigate('/report', { state: { result: data, reportSeed } });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Scan failed. Check that the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="min-h-dvh bg-slate-950 text-slate-100 selection:bg-cyan-500/30"
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className={`absolute -top-24 left-1/2 h-[40rem] w-[60rem] -translate-x-1/2 rounded-full bg-gradient-to-r ${backgroundAccent} blur-[120px] transition-colors duration-1000`}
        />
        <div className="absolute bottom-0 right-[-10rem] h-96 w-96 rounded-full bg-gradient-to-tr from-slate-700/10 to-violet-500/10 blur-[100px]" />
      </div>

      <Header backendStatus={backendStatus} aiStatus={aiStatus} threatIntelStatus={threatIntelStatus} />

      <main className="relative mx-auto max-w-7xl px-6 pb-20 pt-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-8 pb-10"
          >
            <div className="text-center mb-4">
              <h2 className="text-3xl font-bold tracking-tight text-white mb-3">
                Analyze Any Threat instantly
              </h2>
              <p className="text-slate-400">
                Paste a suspicious message, URL, or upload a document. Our AI will analyze the risk.
              </p>
            </div>
            
            <Scanner onScan={handleScan} loading={loading} error={error} value={input} onChange={setInput} />
            
            {/* Template shortcuts */}
            <div className="mt-4">
              <QuickTemplates onPick={(val) => setInput(val)} />
            </div>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-12 max-w-4xl mx-auto"
        >
          <HowItWorks />
        </motion.div>

        <footer className="mt-16 border-t border-slate-800/50 pt-8 text-center text-xs text-slate-500">
          <div className="flex items-center justify-center gap-4 mb-2">
            <span className="flex items-center gap-1.5 ring-1 ring-slate-800 px-3 py-1 rounded-full"><div className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Node.js Backend Ready</span>
            <span className="flex items-center gap-1.5 ring-1 ring-slate-800 px-3 py-1 rounded-full"><div className="h-1.5 w-1.5 rounded-full bg-violet-400" /> Local LLM Connected</span>
          </div>
          RealityCheck AI &bull; Version 1.0.0 &bull; 2026
        </footer>
      </main>
    </motion.div>
  );
}
