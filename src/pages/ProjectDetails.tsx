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

  // Modals / Forms
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceType, setServiceType] = useState<'web_service' | 'postgres' | 'redis' | 'static_site'>('web_service');
  const [gitRepo, setGitRepo] = useState('');
  const [gitBranch, setGitBranch] = useState('main');
  const [isSubmittingService, setIsSubmittingService] = useState(false);

  // GitHub Real integration state
  interface GitRepoItem {
    id: number;
    name: string;
    full_name: string;
    default_branch: string;
    description: string | null;
  }
  const [gitRepos, setGitRepos] = useState<GitRepoItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [reposSearch, setReposSearch] = useState('');
  const [branches, setBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Load repositories dynamically from GitHub App installations (or fallback) when active
  useEffect(() => {
    const token = localStorage.getItem('github_access_token');
    const isGitType = serviceType === 'web_service' || serviceType === 'static_site';

    const fetchGeneralRepos = async (authToken: string): Promise<GitRepoItem[]> => {
      const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Accept": "application/vnd.github.v3+json"
        }
      });
      if (!res.ok) throw new Error("Could not fetch standard repositories");
      return res.json() as Promise<GitRepoItem[]>;
    };

    if (isServiceModalOpen && isGitType && token && profile?.githubUsername) {
      setLoadingRepos(true);
      
      // Look up where the GitHub App is installed for this user
      fetch("https://api.github.com/user/installations", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github.v3+json"
        }
      })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Installations query failed. Trying standard repository list fallback.");
        }
        const data = await res.json() as { installations?: { id: number }[] };
        const installations = data.installations || [];
        
        if (installations.length === 0) {
          throw new Error("No active GitHub App installations detected on your account.");
        }

        // Fetch repositories registered for each of the installations
        const repoPromises = installations.map(inst => 
          fetch(`https://api.github.com/user/installations/${inst.id}/repositories?per_page=100`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Accept": "application/vnd.github.v3+json"
            }
          })
          .then(r => r.ok ? r.json() : { repositories: [] })
          .then((d: { repositories?: GitRepoItem[] }) => d.repositories || [])
        );

        const lists = await Promise.all(repoPromises);
        const combined = lists.flat();
        
        // De-duplicate elements
        const unique = combined.filter((item, index, self) => 
          self.findIndex(t => t.id === item.id) === index
        );
        return unique;
      })
      .then((reposList) => {
        if (reposList.length === 0) {
          return fetchGeneralRepos(token);
        }
        setGitRepos(reposList);
        setLoadingRepos(false);
      })
      .catch((err) => {
        console.warn("GitHub App installation fetch redirected to user repos fallback:", err.message);
        fetchGeneralRepos(token)
          .then((fallbackRepos) => {
            setGitRepos(fallbackRepos);
            setLoadingRepos(false);
          })
          .catch((fallbackErr) => {
            console.error("Repository lookup failed entirely:", fallbackErr);
            setLoadingRepos(false);
          });
      });
    }
  }, [isServiceModalOpen, serviceType, profile?.githubUsername]);

  const fetchBranches = (repoFullName: string) => {
    const token = localStorage.getItem('github_access_token');
    if (!token) return;
    setLoadingBranches(true);
    fetch(`https://api.github.com/repos/${repoFullName}/branches?per_page=100`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json"
      }
    })
    .then(res => {
      if (!res.ok) throw new Error("Could not fetch branches");
      return res.json();
    })
    .then((data: any[]) => {
      setBranches(data.map(b => b.name));
      setLoadingBranches(false);
    })
    .catch(err => {
      console.error("Error loading branches:", err);
      setBranches(['main', 'master']);
      setLoadingBranches(false);
    });
  };

  const handleSelectRepo = (repo: GitRepoItem) => {
    setGitRepo(`github.com/${repo.full_name}`);
    setGitBranch(repo.default_branch);
    fetchBranches(repo.full_name);
  };

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

  // Provision service
  const handleProvisionService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !projectId || !serviceName.trim()) return;

    setIsSubmittingService(true);
    try {
      // Computes endpoints based on random identifiers
      const randId = Math.random().toString(36).substring(2, 7);
      const hostName = `${serviceName.toLowerCase()}-${randId}.vortex.dev`;
      const endpointVal = serviceType === 'postgres' 
        ? `postgresql://vortex_user:${randId}99@${hostName}:5432/vortex_db`
        : serviceType === 'redis'
        ? `redis://:${randId}auth@${hostName}:6379`
        : `https://${hostName}`;

      // 1. Create Service doc
      const serviceRef = await addDoc(collection(db, 'services'), {
        projectId,
        ownerId: user.uid,
        name: serviceName.trim(),
        type: serviceType,
        status: 'deploying',
        repository: serviceType === 'web_service' || serviceType === 'static_site' ? gitRepo.trim() || 'github.com/vortex-apps/service-repo' : '',
        branch: serviceType === 'web_service' || serviceType === 'static_site' ? gitBranch.trim() : '',
        port: serviceType === 'web_service' ? 3000 : 0,
        domain: hostName,
        endpoint: endpointVal,
        createdAt: serverTimestamp()
      });

      // 2. Create initial Deployment logs compilation pipeline
      const randomCommit = Math.random().toString(16).substring(2, 9);
      const isStaticOrWeb = serviceType === 'web_service' || serviceType === 'static_site';

      await addDoc(collection(db, 'deployments'), {
        serviceId: serviceRef.id,
        projectId,
        ownerId: user.uid,
        commitMsg: isStaticOrWeb ? 'Initialize automated build triggered from Git hooks' : 'Provision database volume container cluster',
        commitHash: randomCommit,
        status: 'deploying',
        logs: [
          `[LOGS] Starting Vortex build orchestration pipeline...`,
          `[INFO] Target node initialized. Spec: Serverless container pod`,
          `[INFO] Provisioning virtualization layer...`,
          isStaticOrWeb 
            ? `[INFO] Cloning repository ${gitRepo || 'github.com/vortex-apps/service-repo'} [branch: ${gitBranch}]` 
            : `[INFO] Instantiating isolated DBMS filesystem volume.`,
          `[INFO] Resolving dependencies...`,
          `[INFO] Allocating port configurations...`
        ],
        createdAt: serverTimestamp()
      });

      // 3. Create initial empty Metric document
      await addDoc(collection(db, 'metrics'), {
        serviceId: serviceRef.id,
        ownerId: user.uid,
        timestamps: [Date.now()],
        cpu: [0],
        ram: [0],
        bandwidth: [0],
        updatedAt: serverTimestamp()
      });

      // Reset
      setServiceName('');
      setGitRepo('');
      setIsServiceModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'services');
    } finally {
      setIsSubmittingService(false);
    }
  };

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
              onClick={() => setIsServiceModalOpen(true)}
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
                onClick={() => setIsServiceModalOpen(true)}
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

      {/* Deploy Service Modal Trigger */}
      <AnimatePresence>
        {isServiceModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#090f1d] border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl"
            >
              <h2 className="text-xl font-bold font-heading text-white mb-2">Deploy Cloud Microservice</h2>
              <p className="text-slate-400 text-xs mb-6">Choose an infrastructure type to spin up a fully isolated workload pod.</p>

              <form onSubmit={handleProvisionService} className="space-y-4">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { type: 'web_service', label: 'Web Service', desc: 'Node/React/Go API containers', icon: Sliders },
                    { type: 'postgres', label: 'PostgreSQL DB', desc: 'Relational DB server', icon: Database },
                    { type: 'redis', label: 'Redis Cache', desc: 'Fast key-value cache layer', icon: Cpu },
                    { type: 'static_site', label: 'Static Website', desc: 'Secure Serverless CDN', icon: Globe }
                  ].map((temp) => (
                    <button
                      key={temp.type}
                      type="button"
                      onClick={() => setServiceType(temp.type as any)}
                      className={`flex flex-col items-start p-4 border-2 rounded-2xl hover:bg-slate-900 transition-all text-left ${
                        serviceType === temp.type ? 'border-cyan-400 bg-[#0c1324]/40' : 'border-slate-800'
                      }`}
                    >
                      <temp.icon className={`h-5 w-5 mb-2 ${serviceType === temp.type ? 'text-cyan-400' : 'text-slate-400'}`} />
                      <p className="text-xs font-bold font-heading text-white">{temp.label}</p>
                      <p className="text-[10px] text-slate-500 leading-tight mt-1">{temp.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">Service Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. backend-redis-instance"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ''))}
                    className="w-full bg-[#050810] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                {/* Git Integrations Details */}
                {(serviceType === 'web_service' || serviceType === 'static_site') && (
                  <div className="space-y-4 border border-slate-800/60 bg-[#050810]/50 rounded-2xl p-4">
                    <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
                      <p className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Github className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Git Deploy Source</span>
                      </p>
                      {profile?.githubUsername && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded font-mono uppercase">
                          @{profile.githubUsername}
                        </span>
                      )}
                    </div>

                    {!profile?.githubUsername ? (
                      <div className="space-y-3 font-mono">
                        <div className="bg-[#0b1222]/50 border border-slate-800/80 p-3 rounded-xl text-[11px] leading-relaxed text-slate-400 text-center">
                          <p className="mb-2 text-slate-300">🔌 Connect your developer account to load and deploy remote branch repositories.</p>
                          <Link
                            to="/profile"
                            className="bg-slate-900 border border-slate-800 hover:border-cyan-400/30 hover:bg-slate-800 text-cyan-400 font-bold px-4 py-2 rounded-lg text-[10px] inline-flex items-center gap-1 transition-all"
                          >
                            <Github className="h-3 w-3" />
                            <span>Connect GitHub</span>
                          </Link>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 uppercase tracking-wider">Manual Repository Mapping</label>
                          <input
                            type="text"
                            required
                            placeholder="github.com/vortex-apps/auth-api"
                            value={gitRepo}
                            onChange={(e) => setGitRepo(e.target.value)}
                            className="w-full bg-[#050810] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:border-cyan-500/50"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 uppercase tracking-wider">Branch</label>
                          <input
                            type="text"
                            value={gitBranch}
                            onChange={(e) => setGitBranch(e.target.value)}
                            className="w-full bg-[#050810] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:border-cyan-500/50"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 font-mono text-sm">
                        {/* Connected search/select list */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] text-slate-400 uppercase tracking-wider">Select Live Repository</label>
                          
                          {/* Search bar */}
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                              <Search className="h-3.5 w-3.5" />
                            </span>
                            <input
                              type="text"
                              placeholder="Search repos (e.g. react-app)..."
                              value={reposSearch}
                              onChange={(e) => setReposSearch(e.target.value)}
                              className="w-full bg-[#050810] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-cyan-500/40"
                            />
                          </div>

                          {/* List or Loader */}
                          {loadingRepos ? (
                            <div className="bg-[#050810]/40 border border-slate-800 p-6 rounded-xl flex items-center justify-center gap-2">
                              <RefreshCw className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
                              <span className="text-[11px] text-slate-500 uppercase tracking-wider">Querying linked repos...</span>
                            </div>
                          ) : (
                            <div className="bg-[#050810] border border-slate-800 rounded-xl max-h-32 overflow-y-auto divide-y divide-slate-800/10 custom-scrollbar">
                              {gitRepos.filter(r => r.name.toLowerCase().includes(reposSearch.toLowerCase())).length === 0 ? (
                                <p className="text-[11px] text-slate-500 p-4 text-center">No matching repositories found on your profile.</p>
                              ) : (
                                gitRepos
                                  .filter(r => r.name.toLowerCase().includes(reposSearch.toLowerCase()))
                                  .map((repo) => {
                                    const isSelected = gitRepo === `github.com/${repo.full_name}`;
                                    return (
                                      <button
                                        type="button"
                                        key={repo.id}
                                        onClick={() => handleSelectRepo(repo)}
                                        className={`w-full text-left p-2.5 transition-colors flex items-center justify-between group ${
                                          isSelected ? 'bg-cyan-500/5' : 'hover:bg-slate-900/40'
                                        }`}
                                      >
                                        <div className="max-w-[75%]">
                                          <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-cyan-400' : 'text-slate-200 group-hover:text-white'}`}>
                                            {repo.name}
                                          </p>
                                          {repo.description && (
                                            <p className="text-[10px] text-slate-550 truncate mt-0.5">{repo.description}</p>
                                          )}
                                        </div>
                                        <span className="text-[9px] bg-slate-900 border border-slate-800/60 text-slate-400 px-1.5 py-0.5 rounded">
                                          {repo.default_branch}
                                        </span>
                                      </button>
                                    );
                                  })
                              )}
                            </div>
                          )}
                        </div>

                        {/* Display Currently Chosen Repo */}
                        {gitRepo && (
                          <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-3 space-y-3 font-mono text-xs">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-[9px] text-slate-500 uppercase tracking-wider">Chosen Source Namespace</p>
                                <p className="text-xs text-white font-bold">{gitRepo}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setGitRepo('');
                                  setBranches([]);
                                }}
                                className="text-[10px] text-red-450 hover:underline hover:text-red-400"
                              >
                                Clear Selection
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 items-center">
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 uppercase tracking-wider">Target Branch</label>
                                {loadingBranches ? (
                                  <div className="flex items-center gap-1.5 bg-[#050810] border border-slate-800 rounded-lg px-2 py-2">
                                    <RefreshCw className="h-3 w-3 text-cyan-400 animate-spin" />
                                    <span className="text-[10px] text-slate-550">Branches...</span>
                                  </div>
                                ) : branches.length > 0 ? (
                                  <select
                                    value={gitBranch}
                                    onChange={(e) => setGitBranch(e.target.value)}
                                    className="w-full bg-[#050810] border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/30"
                                  >
                                    {branches.map(brName => (
                                      <option key={brName} value={brName}>{brName}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={gitBranch}
                                    onChange={(e) => setGitBranch(e.target.value)}
                                    placeholder="main"
                                    className="w-full bg-[#050810] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/30"
                                  />
                                )}
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 uppercase tracking-wider">Manual Override</label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const customUrl = window.prompt("Enter complete git repository reference (e.g. github.com/user/repo):", gitRepo);
                                    if (customUrl) {
                                      setGitRepo(customUrl);
                                      setBranches([]); // clear fetched branches
                                    }
                                  }}
                                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 px-2.5 py-1.5 text-[10px] text-slate-355 font-bold rounded-lg transition-colors text-center"
                                >
                                  Edit URL manually
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsServiceModalOpen(false)}
                    className="w-1/2 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50 py-3 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingService}
                    className="w-1/2 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-[#050810] py-3 rounded-xl text-sm font-bold transition-all shadow-md shadow-cyan-400/10 flex items-center justify-center gap-2"
                  >
                    {isSubmittingService ? (
                      <Terminal className="h-4 w-4 animate-spin" />
                    ) : (
                      <span>Deploy Container</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
