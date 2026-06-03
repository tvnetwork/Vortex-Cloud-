import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  ArrowRight,
  Terminal, 
  Trash2, 
  Plus, 
  Database, 
  GitBranch, 
  ExternalLink, 
  Sliders, 
  Globe, 
  Key, 
  Cpu, 
  Check, 
  Eye, 
  EyeOff,
  Server,
  Github,
  RefreshCw,
  Search
} from 'lucide-react';
import { useAuth } from '../App';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Project, Service, EnvVar } from '../types';

export default function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);

  // Env Var form
  const [envKey, setEnvKey] = useState('');
  const [envVal, setEnvVal] = useState('');
  const [isSecret, setIsSecret] = useState(true);
  const [isAddingEnv, setIsAddingEnv] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user || !projectId) return;

    // Fetch Project metadata
    const projRef = doc(db, 'projects', projectId);
    getDoc(projRef).then((snap) => {
      if (snap.exists() && snap.data().ownerId === user.uid) {
        setProject({ id: snap.id, ...snap.data() } as Project);
      } else {
        navigate('/dashboard');
      }
    }).catch((err) => {
      handleFirestoreError(err, OperationType.GET, `projects/${projectId}`);
    });

    // Real-time listen to services under this project
    const qServices = query(collection(db, 'services'), where('projectId', '==', projectId), where('ownerId', '==', user.uid));
    const unsubServices = onSnapshot(qServices, (snap) => {
      const servs: Service[] = [];
      snap.forEach((docSnap) => {
        servs.push({ id: docSnap.id, ...docSnap.data() } as Service);
      });
      setServices(servs);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'services');
    });

    // Real-time listen to envvars under this project
    const qEnv = query(collection(db, 'envvars'), where('projectId', '==', projectId), where('ownerId', '==', user.uid));
    const unsubEnv = onSnapshot(qEnv, (snap) => {
      const envs: EnvVar[] = [];
      snap.forEach((docSnap) => {
        envs.push({ id: docSnap.id, ...docSnap.data() } as EnvVar);
      });
      setEnvVars(envs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'envvars');
    });

    return () => {
      unsubServices();
      unsubEnv();
    };
  }, [user, projectId]);

  // Environment variables creation
  const handleAddEnv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !projectId || !envKey.trim() || !envVal.trim()) return;

    setIsAddingEnv(true);
    try {
      await addDoc(collection(db, 'envvars'), {
        projectId,
        ownerId: user.uid,
        key: envKey.trim(),
        value: envVal.trim(),
        isSecret,
        createdAt: serverTimestamp()
      });
      setEnvKey('');
      setEnvVal('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'envvars');
    } finally {
      setIsAddingEnv(false);
    }
  };

  const handleDeleteEnv = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'envvars', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `envvars/${id}`);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this project and all hosted container resources?")) return;
    if (!projectId) return;

    try {
      // Direct delete project document
      await deleteDoc(doc(db, 'projects', projectId));
      navigate('/dashboard');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `projects/${projectId}`);
    }
  };

  const toggleSecretView = (key: string) => {
    setVisibleKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading || !project) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#050810]">
        <div className="flex flex-col items-center gap-4">
          <Terminal className="h-8 w-8 text-cyan-400 animate-spin" />
          <p className="text-xs text-slate-500 font-mono tracking-widest">Querying System Cluster metadata...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 min-h-screen">
      {/* Back button */}
      <Link 
        to="/dashboard" 
        className="inline-flex items-center gap-2 text-xs font-mono font-bold text-slate-400 hover:text-cyan-400 transition-colors mb-6 uppercase tracking-wider"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Clusters</span>
      </Link>

      {/* Project Dashboard Title Row */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-10 pb-8 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold font-heading text-white">{project.name}</h1>
            <span className="text-[10px] font-mono border border-cyan-400/30 text-cyan-400 bg-cyan-400/5 px-2.5 py-0.5 rounded-full inline-block">
              Standalone Cluster active
            </span>
          </div>
          <p className="text-slate-400 font-sans text-sm mt-1">{project.description || 'Secure Node container'}</p>
        </div>

        <button
          onClick={handleDeleteProject}
          className="text-[#ef4444] hover:text-white border border-red-500/20 hover:border-red-500 hover:bg-[#ef4444]/15 px-4 py-2.5 rounded-xl font-mono text-xs transition-all tracking-wider flex items-center gap-1.5 align-middle"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>TEARDOWN WORKSPACE</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Services lists */}
        <div className="lg:col-span-7 space-y-8">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
            <h2 className="text-lg font-bold font-heading text-white flex items-center gap-2">
              <Server className="h-5 w-5 text-indigo-400" />
              <span>Cluster Services</span>
            </h2>

            <button
              onClick={() => navigate(`/project/${projectId}/deploy`)}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-cyan-400 font-bold px-4 py-2 rounded-xl font-mono text-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Add Service</span>
            </button>
          </div>

          {services.length === 0 ? (
            <div className="bg-[#0b1222]/30 border border-dashed border-slate-800/80 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-4">
              <Database className="h-8 w-8 text-slate-500 animate-pulse" />
              <div className="space-y-1">
                <p className="text-slate-300 font-semibold mb-1">No services deployed here yet</p>
                <p className="text-slate-500 text-xs max-w-sm mx-auto">Vortex connects git push cycles or launches SQL databases. Create a module to see metric logs stream live.</p>
              </div>
              <button
                onClick={() => navigate(`/project/${projectId}/deploy`)}
                className="bg-cyan-400 hover:bg-cyan-300 text-[#050810] font-bold px-6 py-2.5 rounded-xl text-xs transition-colors"
              >
                + Deploy Service
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {services.map((service) => (
                <Link
                  key={service.id}
                  to={`/service/${service.id}`}
                  className="bg-[#0b1222]/50 border border-slate-800/80 rounded-2xl p-6 transition-all hover:border-indigo-500/30 shadow-md flex items-center justify-between relative group overflow-hidden"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {service.type === 'postgres' || service.type === 'redis' ? (
                        <Database className="h-4 w-4 text-cyan-400 animate-pulse" />
                      ) : (
                        <Terminal className="h-4 w-4 text-indigo-400" />
                      )}
                      <span className="font-bold font-heading text-slate-100 group-hover:text-cyan-400 transition-colors">
                        {service.name}
                      </span>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                        service.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
                          : service.status === 'deploying'
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20 animate-pulse'
                          : 'bg-red-500/10 text-red-300 border-red-500/20'
                      }`}>
                        {service.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 font-mono tracking-wide truncate max-w-[280px] sm:max-w-[400px]">
                      {service.domain}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold group-hover:translate-x-1 transition-all">
                    <span>Shell Console</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Environment Keys panel */}
        <div className="lg:col-span-5 space-y-8">
          <div className="pb-3 border-b border-slate-800/60">
            <h2 className="text-lg font-bold font-heading text-white flex items-center gap-2">
              <Key className="h-5 w-5 text-cyan-400" />
              <span>Project Shared Variables</span>
            </h2>
          </div>

          <div className="bg-[#0b1222]/30 border border-slate-800/80 p-6 rounded-2xl space-y-6">
            <form onSubmit={handleAddEnv} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="KEY (e.g. MONGO_URI)"
                  value={envKey}
                  onChange={(e) => setEnvKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                  className="bg-[#050810] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/40 font-mono"
                />
                <input
                  type="text"
                  required
                  placeholder="VALUE"
                  value={envVal}
                  onChange={(e) => setEnvVal(e.target.value)}
                  className="bg-[#050810] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/40 font-mono"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs text-slate-400 font-mono cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isSecret}
                    onChange={(e) => setIsSecret(e.target.checked)}
                    className="accent-cyan-400 h-3 w-3"
                  />
                  <span>Encrypt Variable Value</span>
                </label>

                <button
                  type="submit"
                  disabled={isAddingEnv}
                  className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-[10px] font-mono uppercase tracking-wider flex items-center gap-1"
                >
                  {isAddingEnv ? <Terminal className="h-3 w-3 animate-spin" /> : 'Set Environment Key'}
                </button>
              </div>
            </form>

            {/* List Envvars */}
            <div className="space-y-3 pt-4 border-t border-slate-800/60">
              <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest">Active credentials ({envVars.length})</h3>

              {envVars.length === 0 ? (
                <p className="text-slate-600 font-mono text-xs">No configuration credentials specified.</p>
              ) : (
                <div className="space-y-2">
                  {envVars.map((env) => (
                    <div
                      key={env.id}
                      className="flex items-center justify-between bg-slate-950/80 p-3 rounded-xl border border-slate-900 font-mono text-xs"
                    >
                      <div className="space-y-1 max-w-[80%]">
                        <p className="text-indigo-400 font-bold truncate">{env.key}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-slate-400 truncate">
                            {env.isSecret && !visibleKeys[env.id] ? '••••••••' : env.value}
                          </p>
                          {env.isSecret && (
                            <button
                              onClick={() => toggleSecretView(env.id)}
                              className="text-slate-500 hover:text-slate-200 transition-colors"
                            >
                              {visibleKeys[env.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteEnv(env.id)}
                        className="text-slate-500 hover:text-red-400 p-1.5 transition-colors"
                        title="Delete key"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
