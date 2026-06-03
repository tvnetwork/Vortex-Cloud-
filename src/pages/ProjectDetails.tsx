import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  Trash2, 
  ExternalLink, 
  Eye, 
  EyeOff,
  Server,
  Key,
  Globe,
  Activity,
  Settings as SettingsIcon,
  TerminalSquare
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
import { Project, Deployment, EnvVar } from '../types';
import { Github } from 'lucide-react';

export default function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [project, setProject] = useState<Project | null>(null);
  const [deployments, setServices] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !projectId) return;

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

    const qServices = query(collection(db, 'deployments'), where('projectId', '==', projectId), where('ownerId', '==', user.uid));
    const unsubServices = onSnapshot(qServices, (snap) => {
      const servs: Deployment[] = [];
      snap.forEach((docSnap) => {
        servs.push({ id: docSnap.id, ...docSnap.data() } as Deployment);
      });
      setServices(servs);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'deployments');
    });

    return () => {
      unsubServices();
    };
  }, [user, projectId]);

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-[var(--radius-pill)] h-8 w-8 border-b-2 border-zinc-500" />
      </div>
    );
  }

  const mainService = deployments.find(s => s.type === 'web_deployment' || s.type === 'static_site') || deployments[0];
  const displayDomain = mainService ? `${mainService.name}.deploy.kontyra.name.ng` : `${project.name}.kontyra.name.ng`;

  const tabs = [
    { name: 'Overview', path: `/projects/${projectId}`, exact: true },
    { name: 'Deployments', path: `/projects/${projectId}/deployments` },
    { name: 'Previews', path: `/projects/${projectId}/previews` },
    { name: 'Domains', path: `/projects/${projectId}/domains` },
    { name: 'Environment', path: `/projects/${projectId}/environment` },
    { name: 'Logs', path: `/projects/${projectId}/logs` },
    { name: 'Analytics', path: `/projects/${projectId}/analytics` },
    { name: 'Settings', path: `/projects/${projectId}/settings` },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 min-h-screen">
      <div className="flex flex-col gap-6 mb-8">
        <Link 
          to="/dashboard" 
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Projects</span>
        </Link>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-[var(--radius-pill)] bg-card border border-border flex items-center justify-center text-xl font-bold uppercase">
              {project.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{project.name}</h1>
              <a 
                href={`https://${displayDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 mt-0.5"
              >
                {displayDomain}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <div className="flex gap-3">
            <a
              href={`https://${displayDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary text-text-primary hover:bg-secondary hover:bg-zinc-200 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Visit
            </a>
            <button
              onClick={() => navigate(`/projects/${projectId}/deploy`)}
              className="bg-card border border-border text-text-primary hover:bg-zinc-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Deploy
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border mb-8 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = tab.exact 
            ? location.pathname === tab.path
            : location.pathname.startsWith(tab.path);
            
          return (
            <Link
              key={tab.name}
              to={tab.path}
              className={`pb-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive 
                  ? 'border-white text-text-primary' 
                  : 'border-transparent text-text-secondary hover:text-zinc-200'
              }`}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>

      {/* Content */}
      <Routes>
        <Route path="/" element={<OverviewTab project={project} deployments={deployments} />} />
        <Route path="/deployments" element={<DeploymentsTab project={project} deployments={deployments} />} />
        <Route path="/previews" element={<PreviewsTab deployments={deployments} />} />
        <Route path="/domains" element={<DomainsTab project={project} deployments={deployments} />} />
        <Route path="/environment" element={<EnvironmentTab projectId={projectId} />} />
        <Route path="/logs" element={<LogsTab deployments={deployments} />} />
        <Route path="/analytics" element={<AnalyticsTab />} />
        <Route path="/settings" element={<SettingsTab project={project} />} />
      </Routes>
    </div>
  );
}

// --- Tab Components ---

function OverviewTab({ project, deployments }: { project: Project, deployments: Deployment[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-background border border-border rounded-[var(--radius-card)] overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-surface flex items-center justify-between">
            <h2 className="text-lg font-medium text-text-primary flex items-center gap-2">
              <Server className="h-4 w-4 text-text-secondary" />
              Latest Deployments
            </h2>
          </div>
          
          {deployments.length === 0 ? (
            <div className="p-12 text-center text-muted">
              No deployments yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {deployments.slice(0, 3).map((deployment) => (
                <div key={deployment.id} className="p-6 flex items-center justify-between">
                  <div>
                    <Link to={`/deployment/${deployment.id}`} className="font-medium text-text-primary hover:underline">
                      {deployment.name}
                    </Link>
                    <p className="text-sm text-text-secondary mt-1">{deployment.domain}</p>
                  </div>
                  <span className={`text-xs uppercase font-medium px-2 py-0.5 rounded-[var(--radius-pill)] ${
                    deployment.status === 'active' ? 'bg-success/10 text-success' : 'bg-zinc-800 text-text-secondary'
                  }`}>
                    {deployment.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="space-y-6">
        <div className="bg-background border border-border rounded-[var(--radius-card)] p-6">
          <h2 className="text-lg font-medium text-text-primary mb-4">Project Info</h2>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Framework</span>
              <span className="text-text-primary">Next.js (Detected)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Region</span>
              <span className="text-text-primary">fra1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Created</span>
              <span className="text-text-primary">
                {project.createdAt ? new Date(project.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeploymentsTab({ project, deployments }: { project: Project, deployments: Deployment[] }) {
  const { user } = useAuth();
  
  const handlePromote = async (deployment: Deployment) => {
    if (!user) return;
    try {
      const prodDomain = `${project.name}.kontyra.app`; // Simplified production alias
      await fetch('/api/domains/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: prodDomain, deploymentId: deployment.id })
      });
      alert(`Promoted ${deployment.name} to production (${prodDomain})!`);
    } catch (e) {
      console.error(e);
      alert("Failed to promote to production.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-text-primary">Deployment History</h2>
      </div>
      <div className="bg-background border border-border rounded-[var(--radius-card)] overflow-hidden">
        {deployments.length === 0 ? (
          <div className="p-12 text-center text-muted">No deployments found.</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {deployments.map((deployment) => (
              <div key={deployment.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-card/50 transition-colors">
                <div>
                  <Link to={`/deployment/${deployment.id}`} className="font-medium text-text-primary hover:underline">
                    {deployment.name}
                  </Link>
                  <p className="text-sm text-text-secondary mt-0.5">{deployment.domain || `${deployment.id}.apps.kontyra.name.ng`}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs uppercase font-medium px-2 py-0.5 rounded-[var(--radius-pill)] ${
                    deployment.status === 'active' ? 'bg-success/10 text-success' : 'bg-zinc-800 text-text-secondary'
                  }`}>
                    {deployment.status}
                  </span>
                  <button onClick={() => handlePromote(deployment)} className="text-sm text-text-secondary hover:text-text-primary transition-colors bg-card px-3 py-1.5 rounded-md border border-border">
                    Promote to Prod
                  </button>
                  <button onClick={() => handlePromote(deployment)} className="text-sm text-red-400 hover:text-red-300 transition-colors">
                    Rollback Here
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewsTab({ deployments }: { deployments: Deployment[] }) {
  // Previews are usually branch deployments
  const previews = deployments.filter(s => s.branch && s.branch !== 'main');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-text-primary">Preview Deployments</h2>
        <button className="bg-primary text-text-primary hover:bg-secondary text-sm font-medium px-4 py-2 rounded-md hover:bg-zinc-200">
          Create Preview
        </button>
      </div>
      <div className="bg-background border border-border rounded-[var(--radius-card)] overflow-hidden">
        {previews.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <p className="mb-2">No preview deployments.</p>
            <p className="text-sm">Open a Pull Request to automatically generate a preview URL.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {previews.map((deployment) => (
              <div key={deployment.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-card/50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm bg-info/10 text-info px-2 py-0.5 rounded-md border border-blue-500/20">
                      {deployment.branch}
                    </span>
                    <Link to={`/deployment/${deployment.id}`} className="font-medium text-text-primary hover:underline text-sm">
                      {deployment.name}
                    </Link>
                  </div>
                  <a href={`https://${deployment.id}.apps.kontyra.name.ng`} target="_blank" rel="noopener noreferrer" className="text-sm text-text-secondary mt-1 block hover:text-text-primary transition-colors flex items-center gap-1">
                    {deployment.id}.apps.kontyra.name.ng
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs uppercase font-medium px-2 py-0.5 rounded-[var(--radius-pill)] ${
                    deployment.status === 'active' ? 'bg-success/10 text-success' : 'bg-zinc-800 text-text-secondary'
                  }`}>
                    {deployment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DomainsTab({ project, deployments }: { project: Project, deployments: Deployment[] }) {
  const { user } = useAuth();
  const [domainName, setDomainName] = useState('');
  const [adding, setAdding] = useState(false);

  // In a real app we'd fetch this from the `domains` collection
  const defaultDomain = `${project.name}.kontyra.app`;
  const [customDomains, setCustomDomains] = useState<string[]>([]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName || deployments.length === 0) return;
    setAdding(true);
    
    try {
      // Map to the most recent deployment
      const activeDeployment = deployments[0];
      
      await fetch('/api/domains/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainName, deploymentId: activeDeployment.id })
      });
      
      setCustomDomains(prev => [...prev, domainName]);
      setDomainName('');
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-background border border-border rounded-[var(--radius-card)] p-6">
        <h2 className="text-lg font-medium text-text-primary mb-2">Production Domains</h2>
        <p className="text-sm text-text-secondary mb-6">Manage custom domains and SSL certificates.</p>
        
        <form onSubmit={handleAddDomain} className="flex gap-3 mb-8">
          <input 
            type="text" 
            placeholder="shop.example.com" 
            value={domainName}
            onChange={(e) => setDomainName(e.target.value)}
            className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-zinc-500"
          />
          <button type="submit" disabled={adding || !domainName} className="bg-primary text-text-primary hover:bg-secondary hover:bg-zinc-200 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50">
            {adding ? 'Adding...' : 'Add'}
          </button>
        </form>

        <div className="space-y-4">
          <div className="border border-border rounded-md p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-text-primary">{defaultDomain}</p>
              <p className="text-xs text-muted mt-1">Platform Alias • Automatic SSL</p>
            </div>
            <span className="text-xs text-success bg-success/10 px-2 py-1 rounded-md">Valid Configuration</span>
          </div>

          <div className="border border-border rounded-md p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-text-primary">*.apps.kontyra.name.ng</p>
              <p className="text-xs text-muted mt-1">Preview Wildcard • Automatic SSL</p>
            </div>
            <span className="text-xs text-success bg-success/10 px-2 py-1 rounded-md">Valid Configuration</span>
          </div>

          {customDomains.map((domain, idx) => (
            <div key={idx} className="border border-border rounded-md p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-text-primary">{domain}</p>
                <div className="text-xs text-muted mt-1 flex items-center gap-2">
                  <span>Custom Domain</span>
                  <span className="text-zinc-700">•</span>
                  <span className="font-mono text-[10px] bg-card px-1 rounded">CNAME deploy.kontyra.name.ng</span>
                </div>
              </div>
              <span className="text-xs text-success bg-success/10 px-2 py-1 rounded-md">Active</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EnvironmentTab({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [envKey, setEnvKey] = useState('');
  const [envVal, setEnvVal] = useState('');
  const [isAddingEnv, setIsAddingEnv] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user || !projectId) return;
    const qEnv = query(collection(db, 'envvars'), where('projectId', '==', projectId), where('ownerId', '==', user.uid));
    const unsubEnv = onSnapshot(qEnv, (snap) => {
      const envs: EnvVar[] = [];
      snap.forEach((docSnap) => {
        envs.push({ id: docSnap.id, ...docSnap.data() } as EnvVar);
      });
      setEnvVars(envs);
    });
    return () => unsubEnv();
  }, [user, projectId]);

  const handleAddEnv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !projectId || !envKey.trim() || !envVal.trim()) return;
    setIsAddingEnv(true);
    try {
      await addDoc(collection(db, 'envvars'), {
        projectId, ownerId: user.uid, key: envKey.trim(), value: envVal.trim(), isSecret: true, createdAt: serverTimestamp()
      });
      setEnvKey(''); setEnvVal('');
    } finally { setIsAddingEnv(false); }
  };

  const handleDeleteEnv = async (id: string) => {
    await deleteDoc(doc(db, 'envvars', id));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-background border border-border rounded-[var(--radius-card)] p-6">
        <h2 className="text-lg font-medium text-text-primary mb-2">Environment Variables</h2>
        <p className="text-sm text-text-secondary mb-6">Manage secrets and environment-specific configuration.</p>
        
        <form onSubmit={handleAddEnv} className="space-y-4 mb-8">
          <div className="flex gap-3">
            <input
              type="text" required placeholder="KEY" value={envKey}
              onChange={(e) => setEnvKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
              className="w-1/3 bg-background border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-zinc-500 font-mono"
            />
            <input
              type="text" required placeholder="VALUE" value={envVal}
              onChange={(e) => setEnvVal(e.target.value)}
              className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-zinc-500 font-mono"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={isAddingEnv || !envKey || !envVal} className="bg-primary text-text-primary hover:bg-secondary hover:bg-zinc-200 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50">
              {isAddingEnv ? 'Adding...' : 'Save'}
            </button>
          </div>
        </form>

        <div className="space-y-3">
          {envVars.map((env) => (
            <div key={env.id} className="flex items-center justify-between border border-border rounded-md p-3">
              <div className="flex-1">
                <p className="text-text-primary text-sm font-mono truncate">{env.key}</p>
                <div className="flex items-center gap-2 mt-1 text-muted text-xs font-mono">
                  <span>{!visibleKeys[env.id] ? '••••••••••••••••' : env.value}</span>
                  <button type="button" onClick={() => setVisibleKeys(p => ({ ...p, [env.id]: !p[env.id] }))}>
                    {visibleKeys[env.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              <button onClick={() => handleDeleteEnv(env.id)} className="text-zinc-600 hover:text-error p-1.5 ml-4">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LogsTab({ deployments }: { deployments: Deployment[] }) {
  return (
    <div className="space-y-6">
      <div className="bg-background border border-border rounded-[var(--radius-card)] overflow-hidden h-[500px] flex flex-col">
        <div className="bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TerminalSquare className="h-4 w-4 text-text-secondary" />
            <span className="text-sm font-mono text-text-secondary">Runtime Logs</span>
          </div>
          {deployments.length > 0 && (
            <span className="text-xs text-muted flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse"></span> Live
            </span>
          )}
        </div>
        <div className="p-4 overflow-y-auto flex-1 font-mono text-xs text-zinc-300 space-y-1">
          {deployments.length === 0 ? (
            <p className="text-muted">No active deployments to stream logs from.</p>
          ) : (
            deployments[0].logs && deployments[0].logs.length > 0 ? (
              deployments[0].logs.map((log, i) => (
                <div key={i} className={log.startsWith('ERROR') ? 'text-error' : ''}>
                  {log}
                </div>
              ))
            ) : (
              <>
                <p>[INFO] Application initialized.</p>
                <p>[INFO] Listening on port 3000</p>
                <p className="text-muted animate-pulse">Waiting for traffic...</p>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-background border border-border p-6 rounded-[var(--radius-card)]">
          <p className="text-sm font-medium text-text-secondary mb-2">Total Requests</p>
          <p className="text-3xl font-semibold text-text-primary">0</p>
        </div>
        <div className="bg-background border border-border p-6 rounded-[var(--radius-card)]">
          <p className="text-sm font-medium text-text-secondary mb-2">Bandwidth</p>
          <p className="text-3xl font-semibold text-text-primary">0 MB</p>
        </div>
        <div className="bg-background border border-border p-6 rounded-[var(--radius-card)]">
          <p className="text-sm font-medium text-text-secondary mb-2">Errors</p>
          <p className="text-3xl font-semibold text-text-primary">0</p>
        </div>
      </div>
      <div className="bg-background border border-border rounded-[var(--radius-card)] p-6 h-[300px] flex items-center justify-center">
        <div className="text-center text-muted">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Not enough data to display graphs.</p>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ project }: { project: Project }) {
  const navigate = useNavigate();
  const [repo, setRepo] = useState(project.githubRepo || '');
  const [saving, setSaving] = useState(false);

  const handleSaveGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const webhookSecret = project.webhookSecret || Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      await updateDoc(doc(db, 'projects', project.id), {
        githubRepo: repo,
        webhookSecret
      });
      alert('GitHub Integration updated!');
    } catch (err) {
      console.error(err);
      alert('Failed to update integration');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(`Are you sure you want to delete ${project.name}?`)) return;
    try {
      await deleteDoc(doc(db, 'projects', project.id));
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-background border border-border rounded-[var(--radius-card)] overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Github className="h-5 w-5 text-text-primary" />
          <h3 className="text-lg font-medium text-text-primary">GitHub CI/CD Integration</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-text-secondary mb-4">
            Connect a GitHub repository to automatically deploy when you push to <code className="font-mono bg-surface px-1 py-0.5 rounded text-text-primary">main</code>.
          </p>
          
          <form onSubmit={handleSaveGithub} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Repository Name</label>
              <input 
                type="text" 
                placeholder="e.g., owner/repo" 
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-zinc-500 font-mono"
              />
            </div>
            <button type="submit" disabled={saving} className="bg-primary text-text-primary hover:bg-secondary hover:bg-zinc-200 px-4 py-2 rounded-md text-sm font-medium transition-colors">
              {saving ? 'Saving...' : 'Save Integration'}
            </button>
          </form>

          {project.webhookSecret && (
            <div className="space-y-4 border-t border-border pt-4">
              <p className="text-sm text-text-primary font-medium">Webhook Configuration</p>
              <p className="text-xs text-text-secondary mb-2">Configure this inside your GitHub Repository Settings -&gt; Webhooks</p>
              
              <div>
                <label className="block text-xs text-text-secondary mb-1">Payload URL</label>
                <div className="bg-surface border border-border rounded-md px-3 py-2 text-xs font-mono text-muted select-all">
                  https://deploy.kontyra.name.ng/api/github/webhook
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-text-secondary mb-1">Content type</label>
                <div className="bg-surface border border-border rounded-md px-3 py-2 text-xs font-mono text-muted">
                  application/json
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-text-secondary mb-1">Secret</label>
                <div className="bg-surface border border-border rounded-md px-3 py-2 text-xs font-mono text-muted select-all">
                  {project.webhookSecret}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border border-red-900/50 bg-red-950/10 rounded-[var(--radius-card)] overflow-hidden">
        <div className="px-6 py-4 border-b border-red-900/50">
          <h3 className="text-lg font-medium text-error">Danger Zone</h3>
        </div>
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-medium text-text-primary mb-1">Delete Project</h4>
            <p className="text-sm text-text-secondary">Permanently remove your project and all its deployments.</p>
          </div>
          <button
            onClick={handleDeleteProject}
            className="bg-error/10 text-error hover:bg-error hover:text-text-primary border border-error/20 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
          >
            Delete Project
          </button>
        </div>
      </div>
    </div>
  );
}
