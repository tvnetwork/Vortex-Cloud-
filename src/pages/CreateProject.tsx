import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Terminal, FolderPlus, HelpCircle, Code2, ShieldAlert, Cpu, HardDrive } from 'lucide-react';
import { useAuth } from '../App';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export default function CreateProject() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [clusterRegion, setClusterRegion] = useState('us-east-1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Region configurations for dynamic setup
  const regions = [
    { id: 'us-east-1', name: 'N. Virginia (us-east-1)', ping: '12ms', speed: 'High' },
    { id: 'eu-west-1', name: 'Frankfurt (eu-west-1)', ping: '38ms', speed: 'Ultra' },
    { id: 'ap-northeast-1', name: 'Tokyo (ap-northeast-1)', ping: '74ms', speed: 'Standard' },
    { id: 'us-west-2', name: 'Oregon (us-west-2)', ping: '22ms', speed: 'High' }
  ];

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!user) {
      setErrorMessage("Authentication required. Please sign in.");
      return;
    }

    if (!projectName.trim()) {
      setErrorMessage("Please specify a project name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        name: projectName.trim(),
        description: projectDesc.trim(),
        region: clusterRegion,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });

      // Redirect immediately to the newly created project's workspace page
      navigate(`/project/${docRef.id}`);
    } catch (error: any) {
      console.error("Failed to create project:", error);
      setErrorMessage("An unexpected filesystem permission restriction occurred. Please try again.");
      handleFirestoreError(error, OperationType.WRITE, 'projects');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 min-h-screen">
      {/* Back to Console Hub */}
      <Link 
        to="/dashboard" 
        className="inline-flex items-center gap-2 text-xs font-mono font-bold text-slate-400 hover:text-cyan-400 transition-colors mb-8 uppercase tracking-wider"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Cluster Control</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side - Interactive Creation Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold font-heading text-white bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Provision New Core Cluster
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              logical isolation partitions allow you to host clusters of web services, SQL databases, and redis layers in high-speed microsecond containers.
            </p>
          </div>

          <form onSubmit={handleCreateProject} className="space-y-6 bg-[#0b1222]/80 border border-slate-800/80 p-6 sm:p-8 rounded-3xl shadow-xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-tr from-cyan-500/5 to-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/35 p-4 rounded-2xl flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-red-200 font-mono uppercase tracking-wider">Host Provision Refused</p>
                  <p className="text-xs text-red-300/90 leading-relaxed font-sans">{errorMessage}</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="projectName" className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <span>Cluster Domain Name (Required)</span>
                <span className="text-cyan-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 text-xs font-mono">
                  deploy.kontyra.name.ng/
                </span>
                <input
                  id="projectName"
                  type="text"
                  required
                  placeholder="e.g. backend-authorization-node"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ''))}
                  maxLength={64}
                  className="w-full bg-[#050810]/90 border border-slate-800 rounded-xl pl-[172px] pr-4 py-3 text-sm font-semibold text-slate-100 placeholder-slate-650 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-500">Lowercases, numbers, and hyphens only. Unique cluster host prefix.</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="projectDesc" className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                Deployment Description
              </label>
              <textarea
                id="projectDesc"
                placeholder="Microservices cluster for JWT management and secure transactions, with PostgreSQL database replication..."
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                maxLength={250}
                rows={3}
                className="w-full bg-[#050810]/90 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 resize-none leading-relaxed transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-widest block">
                Target Cloud Region
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {regions.map((reg) => (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => setClusterRegion(reg.id)}
                    className={`flex flex-col items-start p-3 border-2 rounded-2xl text-left transition-all ${
                      clusterRegion === reg.id
                        ? 'border-cyan-500 bg-cyan-500/5 text-cyan-300'
                        : 'border-slate-800 hover:border-slate-700 bg-transparent text-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold font-heading">{reg.name}</span>
                    <span className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                      <span>Gateway Latency: <strong>{reg.ping}</strong></span>
                      <span>•</span>
                      <span>Nodes: <strong>{reg.speed}</strong></span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-800/40">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-1/2 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800/30 py-3.5 rounded-xl text-sm font-semibold transition-all font-mono"
              >
                Teardown Flow
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !projectName.trim()}
                className="w-1/2 bg-gradient-to-r from-cyan-400 to-indigo-500 hover:opacity-95 text-[#050810] py-3.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-400/10 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {isSubmitting ? (
                  <Terminal className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <FolderPlus className="h-4 w-4" />
                    <span>Spin Up Cluster</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side - System Overview & Guidelines (Purely static informative bento) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0b1222]/40 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold font-heading text-white flex items-center gap-2">
              <Cpu className="h-4 w-4 text-cyan-400" />
              <span>Container Pod Allocer Specs</span>
            </h3>
            <ul className="space-y-3 font-mono text-xs text-slate-400">
              <li className="flex justify-between py-1 border-b border-slate-900">
                <span>VCPU Cores:</span>
                <span className="text-slate-200">Shared 1x Container Unit</span>
              </li>
              <li className="flex justify-between py-1 border-b border-slate-900">
                <span>Maximum RAM:</span>
                <span className="text-slate-200">512 MB Dynamic Swap</span>
              </li>
              <li className="flex justify-between py-1 border-b border-slate-900">
                <span>SSL Encryption:</span>
                <span className="text-slate-200">Automated ACME TLS 1.3</span>
              </li>
              <li className="flex justify-between py-1 border-b border-slate-900">
                <span>Daily Backup:</span>
                <span className="text-slate-200">Snapshot Replication</span>
              </li>
              <li className="flex justify-between py-1">
                <span>Network Limit:</span>
                <span className="text-slate-200">10 GB/mo High speed egress</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 border border-indigo-500/20 p-6 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />
            <div className="space-y-3">
              <Code2 className="h-6 w-6 text-indigo-400" />
              <h4 className="text-xs font-bold font-mono text-indigo-300 uppercase tracking-wider">Zero-latency Edge Gateway</h4>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Deploying a cluster sets up serverless forwarding routers instantly. When code pushes stream from your repository, changes migrate globally in 2.3 seconds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
