import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldCheck, BrainCircuit, Globe, ArrowRight, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import ThreatsPanel from './ThreatsPanel.jsx';

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    viewport={{ once: true }}
    className="relative group rounded-2xl bg-slate-900/40 p-8 ring-1 ring-slate-700/40 backdrop-blur-xl transition hover:bg-slate-800/60 hover:ring-slate-600/60"
  >
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-400/20 ring-1 ring-white/10 group-hover:from-cyan-400/30 group-hover:to-violet-400/30">
      <Icon className="h-6 w-6 text-cyan-300" />
    </div>
    <h3 className="mt-6 text-xl font-bold text-slate-100">{title}</h3>
    <p className="mt-4 text-slate-400 leading-relaxed">{description}</p>
  </motion.div>
);

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/50 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 shadow-glow">
              <ShieldCheck className="h-5 w-5 text-slate-950" />
            </div>
            <span className="text-xl font-black tracking-tight text-white group cursor-pointer hover:text-cyan-400 transition">
              RealityCheck AI
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/app" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition">
              Log In
            </Link>
            <Link 
              to="/app" 
              className="rounded-xl bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-glow transition hover:opacity-90 active:scale-95"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 lg:pt-52 lg:pb-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-20%,#0e749020,transparent_50%)]" />
        <div className="mx-auto max-w-7xl px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-cyan-300">
              <Sparkles className="h-4 w-4" />
              Next-Gen Cyber Security
            </span>
            <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-black tracking-tight sm:text-7xl">
              Detect Scams{' '}
              <span className="bg-gradient-to-r from-cyan-300 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Before They Detect You
              </span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
              RealityCheck AI uses state-of-the-art Large Language Models and global threat intelligence 
              to analyze messages, URLs, and emails for social engineering attempts in real-time.
            </p>
            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/app"
                className="group inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-lg font-bold text-slate-900 transition hover:bg-slate-100 active:scale-95"
              >
                Scan Now
                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </Link>
              <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/40 px-8 py-4 text-lg font-bold text-slate-100 backdrop-blur transition hover:bg-slate-800 hover:ring-2 hover:ring-slate-500/20 active:scale-95">
                Try Demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black sm:text-5xl">Engineered for Reliability</h2>
            <p className="mt-4 text-slate-400">Powered by multiple layers of forensic analysis.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={ShieldAlert}
              title="Scam Detection"
              description="Identifies psychometric triggers like urgency, pressure, and reward manipulate tactics."
              delay={0.1}
            />
            <FeatureCard
              icon={BrainCircuit}
              title="AI Analysis"
              description="Deep contextual analysis using local llama-3.1-8b LLM for nuanced social engineering detection."
              delay={0.2}
            />
            <FeatureCard
              icon={Globe}
              title="Threat Intelligence"
              description="Real-time lookup against Google Safe Browsing and VirusTotal global reputation databases."
              delay={0.3}
            />
            <FeatureCard
              icon={CheckCircle2}
              title="Explainable Results"
              description="No black boxes. Get a detailed breakdown of WHY a message was flagged with risk categories."
              delay={0.4}
            />
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute right-0 top-0 -z-10 h-96 w-96 bg-violet-600/10 blur-[130px]" />
        <div className="mx-auto max-w-4xl px-6">
          <motion.div 
            whileInView={{ opacity: 1, scale: 1 }}
            initial={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-slate-900 ring-1 ring-slate-800 p-8 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="h-3 w-3 rounded-full bg-rose-500" />
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="ml-2 text-sm text-slate-500 font-mono">demo-terminal.app</span>
            </div>
            <div className="space-y-6">
              <div className="rounded-xl bg-slate-950 p-6 border border-slate-800">
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-widest font-bold">Input Message</p>
                <p className="text-slate-200 italic">"G-482937 is your verification code. If you didn't request this, CALL +1-800-SCAN-NOW immediately to protect your account."</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 rounded-xl bg-rose-500/10 p-6 border border-rose-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    <span className="text-sm font-bold text-rose-400 uppercase tracking-widest">Risk: High</span>
                  </div>
                  <p className="text-sm text-slate-300">Flagged for 'Identity Pressure' and 'Tech Support Fraud' patterns.</p>
                </div>
                <div className="flex-1 flex items-center justify-center p-6 border border-dashed border-slate-700 rounded-xl">
                   <Link to="/app" className="text-sm font-bold text-cyan-400 hover:underline">See Full Dashboard &rarr;</Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Community Threat Intelligence */}
      <section className="py-20 border-t border-slate-800/40">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-black sm:text-4xl">
              Community Threat <span className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-transparent">Intelligence</span>
            </h2>
            <p className="mt-3 text-slate-400">Explore trending scam reports and contribute new threats in real time.</p>
          </div>

          <ThreatsPanel />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-12">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-sm text-slate-500">&copy; 2026 RealityCheck AI. Privacy First. Zero-Knowledge Analysis.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

const Sparkles = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/><path d="M3 5h4"/><path d="M21 17v4"/><path d="M19 19h4"/>
  </svg>
);
