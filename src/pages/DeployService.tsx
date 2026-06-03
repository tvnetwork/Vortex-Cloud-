import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Terminal, 
  Database, 
  Search, 
  Github, 
  RefreshCw, 
  Check, 
  Cpu, 
  Globe, 
  Sliders, 
  FolderLock, 
  Pocket, 
  Send,
  Workflow,
  Sparkles,
  GitBranch,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../App';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Project } from '../types';

interface GitRepoItem {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
  description: string | null;
}

export default function DeployService() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);

  // Form selections and parameters
  const [serviceName, setServiceName] = useState('');
  const [serviceType, setServiceType] = useState<'web_service' | 'postgres' | 'redis' | 'static_site'>('web_service');
  const [gitRepo, setGitRepo] = useState('');
  const [gitBranch, setGitBranch] = useState('main');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // GitHub account sync and repo loading
  const [gitRepos, setGitRepos] = useState<GitRepoItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [reposSearch, setReposSearch] = useState('');
  const [branches, setBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Selected Repository Full Details (such as latest commit metadata)
  const [realCommitMsg, setRealCommitMsg] = useState<string>('');
  const [realCommitHash, setRealCommitHash] = useState<string>('');

  // Settle Project Context on mount
  useEffect(() => {
    if (!user || !projectId) return;

    const projRef = doc(db, 'projects', projectId);
    getDoc(projRef)
      .then((snap) => {
        if (snap.exists() && snap.data().ownerId === user.uid) {
          setProject({ id: snap.id, ...snap.data() } as Project);
        } else {
          navigate('/dashboard');
        }
        setLoadingProject(false);
      })
      .catch((err) => {
        setLoadingProject(false);
        handleFirestoreError(err, OperationType.GET, `projects/${projectId}`);
      });
  }, [user, projectId]);

  // Settle GitHub Repo syncing if GitHub is connected
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

    if (isGitType && token && profile?.githubUsername) {
      setLoadingRepos(true);
      
      // Look up installations
      fetch("https://api.github.com/user/installations", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github.v3+json"
        }
      })
      .then(async (res) => {
        if (!res.ok) throw new Error("Installations query failed");
        const data = await res.json() as { installations?: { id: number }[] };
        const installations = data.installations || [];
        
        if (installations.length === 0) {
          throw new Error("No installations");
        }

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
        return lists.flat().filter((item, index, self) => 
          self.findIndex(t => t.id === item.id) === index
        );
      })
      .then((reposList) => {
        if (reposList.length === 0) return fetchGeneralRepos(token);
        setGitRepos(reposList);
        setLoadingRepos(false);
      })
      .catch((err) => {
        console.warn("Falling back to standard repos fetch:", err);
        fetchGeneralRepos(token)
          .then((fallbackRepos) => {
            setGitRepos(fallbackRepos);
            setLoadingRepos(false);
          })
          .catch((fallbackErr) => {
            console.error("No repositories reachable:", fallbackErr);
            setLoadingRepos(false);
          });
      });
    }
  }, [serviceType, profile?.githubUsername]);

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
      if (!res.ok) throw new Error("Could not load branches");
      return res.json();
    })
    .then((data: any[]) => {
      setBranches(data.map(b => b.name));
      setLoadingBranches(false);
    })
    .catch(err => {
      console.error(err);
      setBranches(['main', 'master']);
      setLoadingBranches(false);
    });

    // Fetch the latest commit message and hash to make deployment fully REAL
    fetch(`https://api.github.com/repos/${repoFullName}/commits?per_page=1`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json"
      }
    })
    .then(r => r.ok ? r.json() : [])
    .then((commits: any[]) => {
      if (commits && commits.length > 0) {
        const commit = commits[0];
        setRealCommitMsg(commit.commit?.message || '');
        setRealCommitHash(commit.sha?.substring(0, 7) || '');
      }
    })
    .catch((commitErr) => console.warn("Failed to fetch live commit:", commitErr));
  };

  const handleSelectRepo = (repo: GitRepoItem) => {
    setGitRepo(`github.com/${repo.full_name}`);
    setGitBranch(repo.default_branch);
    fetchBranches(repo.full_name);
  };

  const handleDeployService = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!user || !projectId || !serviceName.trim()) {
      setErrorMessage("Please complete all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Computes endpoints based on random identifiers
      const randId = Math.random().toString(36).substring(2, 7);
      const hostName = `${serviceName.toLowerCase()}-${randId}.vortex.dev`;
      const endpointVal = serviceType === 'postgres' 
        ? `postgresql://vortex_user:${randId}99@${hostName}:5432/vortex_db`
        : serviceType === 'redis'
        ? `redis://:${randId}auth@${hostName}:6379`
        : `https://${hostName}`;

      const finalRepo = serviceType === 'web_service' || serviceType === 'static_site' 
        ? gitRepo.trim() || 'github.com/vortex-apps/service-repo' 
        : '';
      const finalBranch = serviceType === 'web_service' || serviceType === 'static_site' 
        ? gitBranch.trim() 
        : '';

      // 1. Create Service document
      const serviceRef = await addDoc(collection(db, 'services'), {
        projectId,
        ownerId: user.uid,
        name: serviceName.trim(),
        type: serviceType,
        status: 'deploying',
        repository: finalRepo,
        branch: finalBranch,
        port: serviceType === 'web_service' ? 3000 : 0,
        domain: hostName,
        endpoint: endpointVal,
        createdAt: serverTimestamp()
      });

      // 2. Fetch or compute the commit information
      const finalCommitMsg = realCommitMsg || (
        serviceType === 'web_service' || serviceType === 'static_site'
          ? 'Initialize automated build triggered from Git hooks'
          : 'Provision database volume container cluster'
      );
      const finalCommitHash = realCommitHash || Math.random().toString(16).substring(2, 9);
      const isStaticOrWeb = serviceType === 'web_service' || serviceType === 'static_site';

      // 3. Create initial Deployment logs
      await addDoc(collection(db, 'deployments'), {
        serviceId: serviceRef.id,
        projectId,
        ownerId: user.uid,
        commitMsg: finalCommitMsg,
        commitHash: finalCommitHash,
        status: 'deploying',
        logs: [
          `[LOGS] Sourcing Vortex environment orchestration engine...`,
          `[INFO] Target worker initialized. Resource quota: 512MB RAM`,
          `[INFO] Provisioning virtual namespace networking routing layer...`,
          isStaticOrWeb 
            ? `[INFO] Securely cloned repository ${finalRepo} [selected branch: ${finalBranch}]` 
            : `[INFO] Initialized enterprise DBMS transaction engine filesystem.`,
          isStaticOrWeb && realCommitHash 
            ? `[INFO] Checked out commit ${finalCommitHash} - "${finalCommitMsg}"`
            : `[INFO] Checked out virtual workspace build snapshot.`,
          `[INFO] Sourcing packages & preparing build compiler...`,
          `[INFO] Bounding virtual network ingress interfaces to Port: ${serviceType === 'web_service' ? '3000' : 'Host Interconnect'}...`
        ],
        createdAt: serverTimestamp()
      });

      // 4. Create initial metrics document
      await addDoc(collection(db, 'metrics'), {
        serviceId: serviceRef.id,
        ownerId: user.uid,
        timestamps: [Date.now()],
        cpu: [0],
        ram: [0],
        bandwidth: [0],
        updatedAt: serverTimestamp()
      });

      // Redirect directly to the Service Console to witness the live build stream
      navigate(`/service/${serviceRef.id}`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Could not register workloads on the cluster nodes. Please verify your project state.");
      handleFirestoreError(err, OperationType.WRITE, 'services');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingProject || !project) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#050810]">
        <div className="flex flex-col items-center gap-4">
          <Terminal className="h-8 w-8 text-cyan-400 animate-spin" />
          <p className="text-xs text-slate-500 font-mono tracking-widest">Gathering Workspace Context...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 min-h-screen">
      {/* Return to Project workspace */}
      <Link 
        to={`/project/${projectId}`} 
        className="inline-flex items-center gap-2 text-xs font-mono font-bold text-slate-400 hover:text-cyan-400 transition-colors mb-8 uppercase tracking-wider"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Workspace Config</span>
      </Link>

      <div className="flex flex-col lg:flex-row justify-between items-start gap-10">
        {/* Left Side: Service Details Configuration */}
        <div className="flex-1 w-full space-y-8">
          <div className="space-y-2">
            <span className="text-[10px] font-mono border border-indigo-400/30 text-indigo-400 bg-indigo-400/5 px-2.5 py-0.5 rounded-full inline-block">
              Standalone Project Partition: {project.name}
            </span>
            <h1 className="text-3xl font-extrabold font-heading text-white">Deploy Cluster Workloads</h1>
            <p className="text-slate-400 text-sm">Choose an infrastructure stack, name your virtual container, and configure the target deploy hooks.</p>
          </div>

          <form onSubmit={handleDeployService} className="space-y-6">
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-xs font-mono">
                {errorMessage}
              </div>
            )}

            {/* Service Type / Target Stack Select Cards */}
            <div className="space-y-3">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-widest block">Choose Target Stack</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { type: 'web_service', label: 'Web Service', desc: 'Node/React serverless pods', icon: Sliders },
                  { type: 'postgres', label: 'Postgres DB', desc: 'Relational data cluster', icon: Database },
                  { type: 'redis', label: 'Redis Cache', desc: 'Ultra cached key-values', icon: Cpu },
                  { type: 'static_site', label: 'Static Site', desc: 'Serverless Edge CDN', icon: Globe }
                ].map((stack) => (
                  <button
                    key={stack.type}
                    type="button"
                    onClick={() => {
                      setServiceType(stack.type as any);
                      // Clear git parameters if switching to db
                      if (stack.type === 'postgres' || stack.type === 'redis') {
                        setGitRepo('');
                      }
                    }}
                    className={`flex flex-col items-start p-5 border-2 rounded-2xl hover:bg-slate-900 transition-all text-left relative overflow-hidden ${
                      serviceType === stack.type 
                        ? 'border-cyan-500 bg-[#0c1324]/40 text-cyan-300 shadow-md shadow-cyan-500/5' 
                        : 'border-slate-800 bg-[#0b1222]/40 text-slate-300'
                    }`}
                  >
                    <stack.icon className={`h-6 w-6 mb-3 ${serviceType === stack.type ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <p className="text-xs font-bold font-heading text-white">{stack.label}</p>
                    <p className="text-[10px] text-slate-500 leading-tight mt-1 leading-relaxed">{stack.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Service name */}
            <div className="space-y-1.5">
              <label htmlFor="serviceName" className="text-xs font-mono text-slate-400 uppercase tracking-widest block">Workload Name</label>
              <input
                id="serviceName"
                type="text"
                required
                placeholder="e.g. users-microservices-layer"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ''))}
                className="w-full bg-[#050810]/80 border border-slate-800 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-100 placeholder-slate-650 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
              />
              <p className="text-[10px] text-slate-500">Must be alphanumeric and hyphens only. Becomes the internal virtual domain route.</p>
            </div>

            {/* Git Integration Details Panel (Shown for Static Sites or Web Services) */}
            {(serviceType === 'web_service' || serviceType === 'static_site') && (
              <div className="border border-slate-800 bg-[#0b1222]/55 p-6 rounded-3xl space-y-5 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                    <Github className="h-4 w-4" />
                    <span>Real-time deploy repository source</span>
                  </h3>
                  {profile?.githubUsername && (
                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      @{profile.githubUsername} Active
                    </span>
                  )}
                </div>

                {!profile?.githubUsername ? (
                  <div className="space-y-5">
                    <div className="bg-indigo-500/5 border border-indigo-500/10 p-5 rounded-2xl text-center space-y-3 font-mono">
                      <p className="text-xs leading-relaxed text-slate-300">🔌 Connect your remote workspace securely to automatically list projects, fetch real commits, and stream deployments.</p>
                      <Link
                        to="/profile"
                        className="bg-slate-900 border border-slate-800 hover:border-cyan-400/30 hover:bg-slate-850 text-cyan-400 font-bold px-5 py-2.5 rounded-xl text-xs inline-flex items-center gap-1.5 transition-all"
                      >
                        <Github className="h-3.5 w-3.5" />
                        <span>Link Developer Account</span>
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">Manual Repository URL</label>
                        <input
                          type="text"
                          required
                          placeholder="github.com/developer/users-api"
                          value={gitRepo}
                          onChange={(e) => setGitRepo(e.target.value)}
                          className="w-full bg-[#050810]/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono placeholder-slate-700 focus:outline-none focus:border-cyan-500/40"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">Deploy Branch</label>
                        <input
                          type="text"
                          required
                          value={gitBranch}
                          onChange={(e) => setGitBranch(e.target.value)}
                          className="w-full bg-[#050810]/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono placeholder-slate-700 focus:outline-none focus:border-cyan-500/40"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Repository Selector and Search filter */}
                    <div className="space-y-2 font-mono">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                          <Search className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          placeholder="Search repositories in your space..."
                          value={reposSearch}
                          onChange={(e) => setReposSearch(e.target.value)}
                          className="w-full bg-[#050810] border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40"
                        />
                      </div>

                      {loadingRepos ? (
                        <div className="p-8 border border-slate-900 bg-slate-950 rounded-2xl flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 text-cyan-400 animate-spin" />
                          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">Querying GitHub App Installations...</span>
                        </div>
                      ) : (
                        <div className="bg-[#050810] border border-slate-850 rounded-2xl max-h-48 overflow-y-auto divide-y divide-slate-900 custom-scrollbar">
                          {gitRepos.filter(r => r.name.toLowerCase().includes(reposSearch.toLowerCase())).length === 0 ? (
                            <p className="p-5 text-center text-xs text-slate-500 text-slate-400">No synchronized repositories found. Double check your application limits.</p>
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
                                    className={`w-full text-left p-3 flex items-center justify-between transition-all ${
                                      isSelected ? 'bg-cyan-500/10' : 'hover:bg-slate-900/50'
                                    }`}
                                  >
                                    <div className="max-w-[70%]">
                                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-cyan-400 font-mono' : 'text-slate-200'}`}>
                                        {repo.name}
                                      </p>
                                      {repo.description && (
                                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{repo.description}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] bg-slate-950 border border-slate-800 text-slate-500 px-2 py-0.5 rounded font-mono">
                                        branch: {repo.default_branch}
                                      </span>
                                      {isSelected && <Check className="h-4 w-4 text-cyan-400 shrink-0" />}
                                    </div>
                                  </button>
                                );
                              })
                          )}
                        </div>
                      )}
                    </div>

                    {/* Selected Repository commit/branch config */}
                    {gitRepo && (
                      <div className="bg-[#050810] border border-slate-850 p-4 rounded-2xl relative space-y-4 font-mono text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Selected deployment pipeline</p>
                            <p className="text-xs font-bold text-slate-200 mt-0.5">{gitRepo}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setGitRepo('');
                              setBranches([]);
                              setRealCommitHash('');
                              setRealCommitMsg('');
                            }}
                            className="text-[10px] text-red-400 hover:underline hover:text-red-300 font-bold"
                          >
                            Deselect
                          </button>
                        </div>

                        {/* Real commit loaded info */}
                        {realCommitHash && (
                          <div className="bg-slate-950/80 border border-slate-900 p-3 rounded-xl flex items-start gap-2.5">
                            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Latest Live Git Commit Resolved</p>
                              <div className="text-slate-300 leading-relaxed font-mono flex flex-wrap items-center gap-1.5">
                                <span className="bg-slate-900 border border-slate-800 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold select-all">
                                  {realCommitHash}
                                </span>
                                <span className="truncate max-w-[280px]">"{realCommitMsg}"</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Select target branch</label>
                            {loadingBranches ? (
                              <div className="bg-slate-950 border border-slate-900 p-2.5 rounded-xl flex items-center justify-center gap-1.5">
                                <RefreshCw className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
                                <span className="text-[10px] text-slate-500">Querying remote branches...</span>
                              </div>
                            ) : branches.length > 0 ? (
                              <select
                                value={gitBranch}
                                onChange={(e) => setGitBranch(e.target.value)}
                                className="w-full bg-[#050810] border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 focus:outline-none focus:border-cyan-500/40"
                              >
                                {branches.map((bName) => (
                                  <option key={bName} value={bName}>{bName}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={gitBranch}
                                placeholder="main"
                                onChange={(e) => setGitBranch(e.target.value)}
                                className="w-full bg-[#050810] border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 focus:outline-none focus:border-cyan-500/40"
                              />
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Override repo endpoint</label>
                            <button
                              type="button"
                              onClick={() => {
                                const customUrl = window.prompt("Enter complete custom repository reference:", gitRepo);
                                if (customUrl) {
                                  setGitRepo(customUrl);
                                  setBranches([]);
                                  setRealCommitHash('');
                                  setRealCommitMsg('');
                                }
                              }}
                              className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 py-2 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white text-center transition-colors"
                            >
                              Manual Namespace string
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Deploy Trigger Button */}
            <div className="flex gap-4 pt-6 border-t border-slate-800/40">
              <button
                type="button"
                onClick={() => navigate(`/project/${projectId}`)}
                className="w-1/2 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/30 py-3.5 rounded-xl text-sm font-semibold transition-colors font-mono"
              >
                Cancel Deploy
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !serviceName.trim() || ((serviceType === 'web_service' || serviceType === 'static_site') && !gitRepo)}
                className="w-1/2 bg-gradient-to-r from-cyan-400 to-indigo-500 text-[#050810] hover:opacity-95 disabled:opacity-40 py-3.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-400/10 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <Terminal className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Workflow className="h-4 w-4" />
                    <span>Launch Workload Pod</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Specs and billing quota overview */}
        <div className="w-full lg:w-[320px] shrink-0 space-y-6 lg:mt-2">
          <div className="bg-[#0b1222]/40 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h3 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>Real-time deploy benefits</span>
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed font-sans">
              Deployment partitions are managed natively inside isolated microserviced virtual nodes. Once launched, you gain immediate logs streaming telemetry.
            </p>

            <div className="space-y-3 font-mono text-[11px] text-slate-400 border-t border-slate-900 pt-3">
              <div className="space-y-1">
                <span className="text-slate-200 font-bold block">📦 Serverless Orchestrations</span>
                <span className="text-slate-500 leading-relaxed block">Micro-VM containers wake on request with zero cold starts, reducing billing allocations by 84%.</span>
              </div>
              <div className="space-y-1 pt-2 border-t border-slate-900/40">
                <span className="text-slate-200 font-bold block">🔒 Isolated FS Sandboxes</span>
                <span className="text-slate-500 leading-relaxed block">All PostgreSQL volumes & environment variables are encrypted with custom customer AES-256 keys.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
