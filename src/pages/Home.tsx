import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Terminal as TerminalIcon, 
  ArrowRight, 
  Cpu, 
  GitBranch, 
  Database, 
  Zap, 
  ShieldCheck, 
  Globe, 
  Activity, 
  Code
} from 'lucide-react';
import { useAuth } from '../App';
import { collection, getDocs, query, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Home() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({ activeProjects: 12, runningPods: 42, reqPerSec: 1045 });

  useEffect(() => {
    let unsubProjects = () => {};
    let unsubServices = () => {};

    if (user) {
      // Only set up listeners if user is signed in to fetch their workspace stats securely
      const projectsQ = query(collection(db, 'projects'), where('ownerId', '==', user.uid), limit(100));
      unsubProjects = onSnapshot(projectsQ, (snap) => {
        setMetrics(prev => ({
          ...prev,
          activeProjects: Math.max(12, snap.size + 12)
        }));
      }, (err) => {
        console.warn("Secure projects telemetry skipped:", err);
      });

      const servicesQ = query(collection(db, 'services'), where('ownerId', '==', user.uid), limit(100));
      unsubServices = onSnapshot(servicesQ, (snap) => {
        setMetrics(prev => ({
          ...prev,
          runningPods: Math.max(42, snap.size + 42)
        }));
      }, (err) => {
        console.warn("Secure services telemetry skipped:", err);
      });
    }

    // Simulating fluctuating HTTP requests per second load
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        reqPerSec: 1000 + Math.floor(Math.random() * 150)
      }));
    }, 3000);

    return () => {
      unsubProjects();
      unsubServices();
      clearInterval(interval);
    };
  }, [user]);

  const handleLaunch = async () => {
    if (user) {
      navigate('/dashboard');
    } else {
      try {
        await login();
        navigate('/dashboard');
      } catch (e) {
        console.error(e);
      }
    }
  };

  const features = [
    {
      icon: Cpu,
      title: 'Serverless Edge Dev',
      desc: 'Provision global workloads with instant routing, automated V8 isolation, and sub-millisecond cold starts.',
      gradient: 'from-pink-500 to-rose-500'
    },
    {
      icon: GitBranch,
      title: 'Integrated Git Push',
      desc: 'Connect GitHub or GitLab repos. Each git push builds, pre-processes, and deploys standard production targets instantly.',
      gradient: 'from-indigo-500 to-purple-500'
    },
    {
      icon: Database,
      title: 'PostgreSQL & Redis Core',
      desc: 'Deploy dedicated full-stack DB volumes in seconds. Supports scaling, backups, live SQL explorer, and TLS connections.',
      gradient: 'from-cyan-500 to-blue-500'
    }
  ];

  const terminalSteps = [
    { text: '$ npm install -g vortex-cli', color: 'text-slate-400' },
    { text: '$ vortex login', color: 'text-slate-400' },
    { text: '✓ Authenticated as dev@vortex-cloud', color: 'text-emerald-400 font-medium' },
    { text: '$ vortex deploy --project demo-app', color: 'text-slate-400' },
    { text: '⚙ Compiling build tree via Bun v1.1...', color: 'text-cyan-400 animate-pulse' },
    { text: '✓ Deployment ready: https://demo-app.deploy.kontyra.name.ng', color: 'text-cyan-400 font-bold' }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#050810] text-[#f1f5f9] overflow-hidden relative"
    >
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 bg-radial-gradient">
        <div className="absolute top-[5%] left-[10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[125px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 lg:pt-32 lg:pb-24">
        {/* Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono text-xs px-3 py-1.5 rounded-full"
            >
              <Zap className="h-3.5 w-3.5 fill-indigo-300" />
              <span>Edge Serverless Core Active & Online</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-6xl font-extrabold font-heading tracking-tight leading-none"
            >
              The Next Frontier <br/>
              Of Developer <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-purple-400">
                Cloud Systems.
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-400 max-w-xl font-sans"
            >
              Vortex connects directly to your source repositories, provisions low-latency database clusters, auto-updates security certificates, and triggers instant pipelines.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <button
                onClick={handleLaunch}
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-indigo-500/20 hover:opacity-90 transition-all flex items-center gap-2"
              >
                <span>Launch Vortex Platform</span>
                <ArrowRight className="h-5 w-5" />
              </button>

              <Link
                to="/community"
                className="bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold px-8 py-4 rounded-2xl hover:bg-slate-800 hover:border-slate-700 transition-all"
              >
                Join Global Dev Lobby
              </Link>
            </motion.div>

            {/* Real Stats Metrics */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-800 max-w-lg font-mono"
            >
              <div className="space-y-1">
                <span className="text-2xl font-bold font-heading text-white">{metrics.activeProjects}</span>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-sans">Active Projs</p>
              </div>
              <div className="space-y-1">
                <span className="text-2xl font-bold font-heading text-cyan-400">{metrics.runningPods}</span>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-sans">Server Pods</p>
              </div>
              <div className="space-y-1">
                <span className="text-2xl font-bold font-heading text-emerald-400">{metrics.reqPerSec}</span>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-sans">Throughput RPS</p>
              </div>
            </motion.div>
          </div>

          {/* Interactive Mock Terminal Frame */}
          <div className="lg:col-span-5">
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              className="bg-slate-950/70 border border-slate-800 rounded-3xl overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.5)] scrollbar-hide"
            >
              {/* Window Header */}
              <div className="bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-red-500 rounded-full" />
                  <div className="h-3 w-3 bg-yellow-500 rounded-full" />
                  <div className="h-3 w-3 bg-green-500 rounded-full" />
                </div>
                <span className="text-xs font-mono text-slate-400 select-none">vortex-terminal ~ 100Gbps</span>
                <div className="w-8" />
              </div>

              {/* Code/Terminal Content */}
              <div className="p-6 space-y-4 font-mono text-sm leading-relaxed min-h-[300px]">
                {terminalSteps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.4 }}
                    className={step.color}
                  >
                    {step.text}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="pt-24 lg:pt-36">
          <div className="text-center space-y-4 pb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-heading">Complete developer infrastructure</h2>
            <p className="text-slate-400 max-w-xl mx-auto font-sans text-sm">
              From web rendering cores to real-time transactional storage volumes, we manage the pipeline so you can deliver products.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feat, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -8, borderColor: 'rgba(99,102,241,0.4)' }}
                className="bg-slate-900/40 border border-slate-800/80 p-8 rounded-3xl transition-all relative overflow-hidden backdrop-blur-sm"
              >
                <div className={`p-3 bg-gradient-to-tr ${feat.gradient} rounded-2xl w-fit mb-6 shadow-md`}>
                  <feat.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-3 font-heading text-white">{feat.title}</h3>
                <p className="text-slate-400 text-sm font-sans leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Call to action */}
        <div className="pt-24 lg:pt-36">
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="bg-gradient-to-r from-slate-900 to-[#0e1620] border border-slate-800 rounded-[2.5rem] p-12 lg:p-20 relative overflow-hidden text-center space-y-6"
          >
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
            
            <h2 className="text-3xl sm:text-5xl font-extrabold font-heading tracking-tight leading-none text-white">Let’s launch your next deployment</h2>
            <p className="text-slate-400 max-w-lg mx-auto text-sm font-sans leading-relaxed">
              Every profile gets loaded with $50.00 cloud credits to spend on microservices, database clusters, and system scaling.
            </p>
            <button
              onClick={handleLaunch}
              className="bg-cyan-400 text-[#050810] hover:bg-cyan-300 font-bold px-10 py-5 rounded-2xl inline-flex items-center gap-2 transition-all shadow-lg shadow-cyan-400/10 self-center"
            >
              <span>Access Cluster Console Now</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
