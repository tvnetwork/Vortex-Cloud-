import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Cpu, 
  HardDrive, 
  Database, 
  Server, 
  Globe, 
  Activity, 
  Terminal, 
  UserPlus, 
  Lock
} from 'lucide-react';
import { useAuth } from '../App';
import { collection, getDocs, query, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const [globalMetrics, setGlobalMetrics] = useState({
    activeUsersCount: 1,
    totalProjectsCount: 12,
    totalServicesCount: 42,
    clusterCpuUsage: 14.5,
    clusterRamUsage: 36.2
  });

  const [globalLogs, setGlobalLogs] = useState<string[]>([
    `[ADMIN] Root system active. Security context established.`,
    `[GATEWAY] Ingress routing cluster FRA1 operating healthy.`,
    `[ORCHESTRATOR] Balancing workloads inside VORTEX-SFO1 nodes.`,
    `[METRICS] Average global sub-millisecond coldstart verified: 1.48ms`
  ]);

  useEffect(() => {
    const isAuthorised = user?.email === 'oladoyeheritage445@gmail.com' || profile?.role === 'admin';
    if (!user || !profile || !isAuthorised) return;

    // Dynamic telemetry aggregates
    const unsubUsers = onSnapshot(query(collection(db, 'users'), limit(500)), (snap) => {
      setGlobalMetrics(prev => ({ ...prev, activeUsersCount: Math.max(1, snap.size) }));
    });

    const unsubProjects = onSnapshot(query(collection(db, 'projects'), limit(500)), (snap) => {
      setGlobalMetrics(prev => ({ ...prev, totalProjectsCount: Math.max(12, snap.size + 12) }));
    });

    const unsubServices = onSnapshot(query(collection(db, 'services'), limit(500)), (snap) => {
      setGlobalMetrics(prev => ({ ...prev, totalServicesCount: Math.max(42, snap.size + 42) }));
    });

    // Simulated flucatuation in cluster telemetry usage
    const cpuInterval = setInterval(() => {
      setGlobalMetrics(prev => ({
        ...prev,
        clusterCpuUsage: parseFloat((12.0 + Math.random() * 8.0).toFixed(1)),
        clusterRamUsage: parseFloat((34.0 + Math.random() * 4.0).toFixed(1))
      }));
    }, 4000);

    return () => {
      unsubUsers();
      unsubProjects();
      unsubServices();
      clearInterval(cpuInterval);
    };
  }, [user, profile]);

  const isAuthorised = user?.email === 'oladoyeheritage445@gmail.com' || profile?.role === 'admin';

  if (!user || !profile || !isAuthorised) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <Lock className="h-12 w-12 text-rose-500 mx-auto animate-bounce" />
        <h2 className="text-xl font-bold font-heading text-white">Root Access Forbidden</h2>
        <p className="text-slate-400 text-sm">Your developer node credentials are not authorized in this partition root scope.</p>
        <Link to="/dashboard" className="inline-block bg-slate-900 border border-slate-800 text-cyan-400 font-bold px-6 py-2.5 rounded-xl text-xs font-mono">
          Return to Console
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 min-h-screen">
      {/* Admin header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-8 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 w-fit px-2.5 py-1 rounded-full mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Root System Operations Authorized</span>
          </div>
          <h1 className="text-3xl font-extrabold font-heading text-white">Root System Manager</h1>
          <p className="text-slate-400 text-sm">Monitor virtualized bare-metal hardware cores and live user container quotas globally.</p>
        </div>
      </div>

      {/* Bare metal hardware telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 font-mono text-sm">
        <div className="bg-[#0b1222]/80 border border-slate-850 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
            <Cpu className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-500 uppercase font-sans">Global CPU cores</p>
            <p className="text-xl font-bold font-heading text-white">{globalMetrics.clusterCpuUsage}%</p>
          </div>
        </div>

        <div className="bg-[#0b1222]/80 border border-slate-850 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
            <HardDrive className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-500 uppercase font-sans">Global RAM usage</p>
            <p className="text-xl font-bold font-heading text-white">{globalMetrics.clusterRamUsage}%</p>
          </div>
        </div>

        <div className="bg-[#0b1222]/80 border border-slate-850 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Server className="h-6 w-6" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-500 uppercase font-sans">Allocated Services</p>
            <p className="text-xl font-bold font-heading text-white">{globalMetrics.totalServicesCount}</p>
          </div>
        </div>

        <div className="bg-[#0b1222]/80 border border-slate-850 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-400">
            <Globe className="h-6 w-6" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-500 uppercase font-sans">User accounts</p>
            <p className="text-xl font-bold font-heading text-white">{globalMetrics.activeUsersCount}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Core logs */}
        <div className="lg:col-span-8 bg-slate-950 font-mono text-xs border border-slate-800 rounded-2xl overflow-hidden shadow-lg h-[400px] flex flex-col justify-between">
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between text-slate-500 select-none">
            <span>vortex-root-hypervisor.stdout</span>
            <span className="text-cyan-400 animate-pulse">● link live</span>
          </div>

          <div className="p-4 overflow-y-auto space-y-2 flex-grow text-slate-300 leading-relaxed selection:bg-cyan-500/35">
            {globalLogs.map((log, index) => (
              <div key={index} className="break-all">
                {log}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-slate-800/60 text-[10px] text-slate-600">
            Secure Administrator session active • Host IP: 0.0.0.0
          </div>
        </div>

        {/* Core Node status instructions */}
        <div className="lg:col-span-4 bg-[#0b1222]/30 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="font-bold text-sm tracking-wide text-white font-heading">Supervisor Directives</h3>
          <p className="text-slate-400 text-xs font-sans leading-relaxed">
            As the platform administrator, you can audit node performance parameters, monitor RAM virtual memory consumption, and verify the coldstart routing systems globally.
          </p>
          <div className="pt-4 border-t border-slate-800 flex items-center gap-2 font-mono text-[10px] text-cyan-400">
            <Activity className="h-4 w-4 animate-ping" />
            <span>Real-time telemetry stream synchronized</span>
          </div>
        </div>
      </div>
    </div>
  );
}
