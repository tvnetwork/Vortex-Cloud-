import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Database, 
  Search, 
  Github, 
  Globe, 
  Server,
  AlertCircle,
  Loader2,
  Box
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

export default function CreateDeployment() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);

  const [deploymentName, setServiceName] = useState('');
  const [deploymentType, setServiceType] = useState<'web_deployment' | 'postgres' | 'redis' | 'static_site'>('web_deployment');
  const [gitRepo, setGitRepo] = useState('');
  const [gitBranch, setGitBranch] = useState('main');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [gitRepos, setGitRepos] = useState<GitRepoItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [reposSearch, setReposSearch] = useState('');
  const [branches, setBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const [realCommitMsg, setRealCommitMsg] = useState<string>('');
  const [realCommitHash, setRealCommitHash] = useState<string>('');

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

  useEffect(() => {
    const token = localStorage.getItem('github_access_token');
    const isGitType = deploymentType === 'web_deployment' || deploymentType === 'static_site';

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
        fetchGeneralRepos(token)
          .then((fallbackRepos) => {
            setGitRepos(fallbackRepos);
            setLoadingRepos(false);
          })
          .catch(() => {
            setLoadingRepos(false);
          });
      });
    }
  }, [deploymentType, profile?.githubUsername]);

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
    .then(res => res.ok ? res.json() : [])
    .then((data: any[]) => {
      if(data.length > 0) {
        setBranches(data.map(b => b.name));
      } else {
        setBranches(['main']);
      }
      setLoadingBranches(false);
    })
    .catch(() => {
      setBranches(['main']);
      setLoadingBranches(false);
    });

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
    }).catch(() => {});
  };

  const handleSelectRepo = (repo: GitRepoItem) => {
    setGitRepo(`github.com/${repo.full_name}`);
    setGitBranch(repo.default_branch);
    fetchBranches(repo.full_name);
  };

  const handleCreateDeployment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!user || !projectId || !deploymentName.trim()) {
      setErrorMessage("Please complete all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const randId = Math.random().toString(36).substring(2, 7);
      const hostName = `${deploymentName.toLowerCase()}-${randId}.deploy.kontyra.name.ng`;
      const endpointVal = deploymentType === 'postgres' 
        ? `postgresql://vortex_user:${randId}99@${hostName}:5432/vortex_db`
        : deploymentType === 'redis'
        ? `redis://:${randId}auth@${hostName}:6379`
        : `https://${hostName}`;

      const finalRepo = deploymentType === 'web_deployment' || deploymentType === 'static_site' 
        ? gitRepo.trim() || 'github.com/vortex-apps/deployment-repo' 
        : '';
      const finalBranch = deploymentType === 'web_deployment' || deploymentType === 'static_site' 
        ? gitBranch.trim() 
        : '';

      let backendPort = deploymentType === 'web_deployment' ? 3000 : 0;
      let deployStatus = 'deploying';
      
      if (deploymentType === 'web_deployment' || deploymentType === 'static_site') {
        try {
          const repoUrl = finalRepo.startsWith('http') ? finalRepo : `https://${finalRepo}`;
          const res = await fetch('/api/deploy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoUrl, subdomain: hostName.split('.')[0] })
          });
          if (res.ok) {
            const data = await res.json();
            backendPort = data.port || backendPort;
          } else {
             deployStatus = 'failed';
          }
        } catch (backendErr) {
          deployStatus = 'failed';
        }
      }

      const deploymentRef = await addDoc(collection(db, 'deployments'), {
        projectId,
        ownerId: user.uid,
        name: deploymentName.trim(),
        type: deploymentType,
        status: deployStatus,
        repository: finalRepo,
        branch: finalBranch,
        port: backendPort,
        domain: hostName,
        endpoint: endpointVal,
        createdAt: serverTimestamp()
      });

      const finalCommitMsg = realCommitMsg || 'Initial deployment from platform';
      const finalCommitHash = realCommitHash || Math.random().toString(16).substring(2, 9);
      const isStaticOrWeb = deploymentType === 'web_deployment' || deploymentType === 'static_site';

      await addDoc(collection(db, 'deployments'), {
        deploymentId: deploymentRef.id,
        projectId,
        ownerId: user.uid,
        commitMsg: finalCommitMsg,
        commitHash: finalCommitHash,
        status: 'deploying',
        logs: [
          `Running build in ${deploymentType} environment...`,
          `Provisioning deployment container...`,
          isStaticOrWeb 
            ? `Cloning repository ${finalRepo} (branch: ${finalBranch})` 
            : `Initializing persistent volume storage...`,
          `Installing dependencies...`,
          `Starting deployment instance...`
        ],
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'metrics'), {
        deploymentId: deploymentRef.id,
        ownerId: user.uid,
        timestamps: [Date.now()],
        cpu: [0],
        ram: [0],
        bandwidth: [0],
        updatedAt: serverTimestamp()
      });

      navigate(`/deployment/${deploymentRef.id}`);
    } catch (err: any) {
      setErrorMessage("Failed to deploy. Please verify your configuration.");
      handleFirestoreError(err, OperationType.WRITE, 'deployments');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingProject || !project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-[var(--radius-pill)] h-8 w-8 border-b-2 border-zinc-500" />
      </div>
    );
  }

  const stackTypes = [
    { type: 'web_deployment', label: 'Web Deployment', icon: Server },
    { type: 'static_site', label: 'Static Site', icon: Globe },
    { type: 'postgres', label: 'Postgres DB', icon: Database },
    { type: 'redis', label: 'Redis Cache', icon: Box },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 min-h-screen">
      <Link 
        to={`/project/${projectId}`} 
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Project</span>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary mb-2">Deploy a new Deployment</h1>
        <p className="text-text-secondary text-sm">Configure your deployment details and source code to deploy.</p>
      </div>

      <form onSubmit={handleCreateDeployment} className="space-y-8">
        {errorMessage && (
          <div className="bg-red-950/50 border border-red-900 p-4 rounded-md flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-error shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{errorMessage}</p>
          </div>
        )}

        <div className="bg-background border border-border rounded-[var(--radius-card)] p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-text-primary block">Deployment Type</label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {stackTypes.map((stack) => (
                <button
                  key={stack.type}
                  type="button"
                  onClick={() => {
                    setServiceType(stack.type as any);
                    if (stack.type === 'postgres' || stack.type === 'redis') {
                      setGitRepo('');
                    }
                  }}
                  className={`flex flex-col items-center justify-center p-4 border rounded-md transition-colors ${
                    deploymentType === stack.type 
                      ? 'border-white bg-card text-text-primary' 
                      : 'border-border hover:border-zinc-600 bg-background text-text-secondary'
                  }`}
                >
                  <stack.icon className="h-6 w-6 mb-2" />
                  <span className="text-sm font-medium">{stack.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="deploymentName" className="text-sm font-medium text-text-primary block">Deployment Name</label>
            <input
              id="deploymentName"
              type="text"
              required
              placeholder="my-deployment"
              value={deploymentName}
              onChange={(e) => setServiceName(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ''))}
              className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm text-text-primary placeholder-zinc-600 focus:outline-none focus:border-zinc-500 font-mono transition-colors"
            />
          </div>

          {(deploymentType === 'web_deployment' || deploymentType === 'static_site') && (
            <div className="pt-6 border-t border-border space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-text-primary">Source Code</h3>
                {profile?.githubUsername && (
                  <span className="text-xs bg-card text-zinc-300 border border-border px-2 py-0.5 rounded-md flex items-center gap-1.5">
                    <Github className="h-3 w-3" />
                    {profile.githubUsername}
                  </span>
                )}
              </div>

              {!profile?.githubUsername ? (
                <div className="border border-border rounded-md p-6 text-center space-y-4">
                  <Github className="h-8 w-8 text-muted mx-auto" />
                  <p className="text-sm text-text-secondary">Connect your GitHub account to easily import repositories.</p>
                  <Link
                    to="/profile"
                    className="inline-flex items-center gap-2 bg-primary text-text-primary hover:bg-secondary hover:bg-zinc-200 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Connect GitHub
                  </Link>

                  <div className="mt-6 pt-6 border-t border-border space-y-4 text-left">
                    <p className="text-xs text-muted font-medium uppercase">Or enter manually</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-text-secondary">Repository URL</label>
                        <input
                          type="text"
                          required
                          placeholder="github.com/user/repo"
                          value={gitRepo}
                          onChange={(e) => setGitRepo(e.target.value)}
                          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-text-primary font-mono placeholder-zinc-700 focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-text-secondary">Branch</label>
                        <input
                          type="text"
                          required
                          value={gitBranch}
                          onChange={(e) => setGitBranch(e.target.value)}
                          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-text-primary font-mono placeholder-zinc-700 focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {!gitRepo ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                        <input
                          type="text"
                          placeholder="Search repositories..."
                          value={reposSearch}
                          onChange={(e) => setReposSearch(e.target.value)}
                          className="w-full bg-background border border-border rounded-md pl-9 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-zinc-500"
                        />
                      </div>

                      <div className="border border-border rounded-md overflow-hidden bg-background max-h-60 overflow-y-auto">
                        {loadingRepos ? (
                          <div className="p-8 flex justify-center">
                            <Loader2 className="h-5 w-5 text-muted animate-spin" />
                          </div>
                        ) : gitRepos.length === 0 ? (
                          <div className="p-8 text-center text-sm text-muted">
                            No repositories found.
                          </div>
                        ) : (
                          <div className="divide-y divide-zinc-800">
                            {gitRepos
                              .filter(r => r.name.toLowerCase().includes(reposSearch.toLowerCase()))
                              .map((repo) => (
                                <button
                                  type="button"
                                  key={repo.id}
                                  onClick={() => handleSelectRepo(repo)}
                                  className="w-full flex items-center justify-between p-3 hover:bg-card transition-colors text-left"
                                >
                                  <div className="flex items-center gap-3">
                                    <Github className="h-5 w-5 text-text-secondary" />
                                    <div>
                                      <p className="text-sm font-medium text-text-primary">{repo.name}</p>
                                      <p className="text-xs text-muted mt-0.5 max-w-sm truncate">{repo.description}</p>
                                    </div>
                                  </div>
                                  <span className="bg-primary text-text-primary hover:bg-secondary text-xs font-medium px-3 py-1 rounded-[var(--radius-pill)]">
                                    Import
                                  </span>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="border border-border rounded-md p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Github className="h-5 w-5 text-text-secondary" />
                          <span className="text-sm font-medium text-text-primary font-mono">{gitRepo}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setGitRepo('');
                            setBranches([]);
                          }}
                          className="text-xs text-text-secondary hover:text-text-primary"
                        >
                          Change
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-text-secondary">Branch</label>
                          <select
                            value={gitBranch}
                            onChange={(e) => setGitBranch(e.target.value)}
                            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-zinc-500 font-mono"
                          >
                            {branches.map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(`/project/${projectId}`)}
            className="px-4 py-2 border border-border hover:bg-card text-zinc-300 rounded-md text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !deploymentName.trim() || ((deploymentType === 'web_deployment' || deploymentType === 'static_site') && !gitRepo)}
            className="bg-primary text-text-primary hover:bg-secondary hover:bg-zinc-200 px-6 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Deploy'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
