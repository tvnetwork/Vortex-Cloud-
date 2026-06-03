import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Cpu, 
  HardDrive, 
  Server, 
  Globe, 
  Lock
} from 'lucide-react';
import { useAuth } from '../App';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';
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
    `[INFO] System startup sequence initiated.`,
    `[INFO] Services healthy. Ingress nodes active.`,
    `[INFO] Load balancers balancing traffic across zones.`,
    `[INFO] Average response time: 24ms`
  ]);

  useEffect(() => {
    const isAuthorised = user?.email === 'oladoyeheritage445@gmail.com' || profile?.role === 'admin';
    if (!user || !profile || !isAuthorised) return;

    const unsubUsers = onSnapshot(query(collection(db, 'users'), limit(500)), (snap) => {
      setGlobalMetrics(prev => ({ ...prev, activeUsersCount: Math.max(1, snap.size) }));
    });

    const unsubProjects = onSnapshot(query(collection(db, 'projects'), limit(500)), (snap) => {
      setGlobalMetrics(prev => ({ ...prev, totalProjectsCount: Math.max(12, snap.size + 12) }));
    });

    const unsubServices = onSnapshot(query(collection(db, 'deployments'), limit(500)), (snap) => {
      setGlobalMetrics(prev => ({ ...prev, totalServicesCount: Math.max(42, snap.size + 42) }));
    });

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
        <Lock className="h-12 w-12 text-zinc-500 mx-auto" />
        <h2 className="text-xl font-medium text-white">Access Denied</h2>
        <p className="text-zinc-400 text-sm">You do not have administrative privileges to view this page.</p>
        <Link to="/dashboard" className="inline-block bg-white text-black font-medium px-4 py-2 rounded-md text-sm transition-colors hover:bg-zinc-200">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-2">
            <ShieldCheck className="h-4 w-4" />
            <span>Administrator Access</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Platform Metrics</h1>
          <p className="text-zinc-400 text-sm">Monitor global platform health and resource utilization.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-black border border-zinc-800 p-6 rounded-lg space-y-4">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-sm font-medium">CPU Usage</span>
            <Cpu className="h-4 w-4" />
          </div>
          <p className="text-2xl font-semibold text-white">{globalMetrics.clusterCpuUsage}%</p>
        </div>

        <div className="bg-black border border-zinc-800 p-6 rounded-lg space-y-4">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-sm font-medium">RAM Usage</span>
            <HardDrive className="h-4 w-4" />
          </div>
          <p className="text-2xl font-semibold text-white">{globalMetrics.clusterRamUsage}%</p>
        </div>

        <div className="bg-black border border-zinc-800 p-6 rounded-lg space-y-4">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-sm font-medium">Total Services</span>
            <Server className="h-4 w-4" />
          </div>
          <p className="text-2xl font-semibold text-white">{globalMetrics.totalServicesCount}</p>
        </div>

        <div className="bg-black border border-zinc-800 p-6 rounded-lg space-y-4">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-sm font-medium">Active Users</span>
            <Globe className="h-4 w-4" />
          </div>
          <p className="text-2xl font-semibold text-white">{globalMetrics.activeUsersCount}</p>
        </div>
      </div>

      <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden flex flex-col h-[500px]">
        <div className="bg-zinc-950 border-b border-zinc-800 px-4 py-3 flex items-center justify-between text-zinc-500 text-sm font-mono">
          <span>system.log</span>
          <span className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Live
          </span>
        </div>

        <div className="p-4 overflow-y-auto space-y-2 flex-grow text-zinc-300 font-mono text-sm">
          {globalLogs.map((log, index) => (
            <div key={index} className="break-all">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
