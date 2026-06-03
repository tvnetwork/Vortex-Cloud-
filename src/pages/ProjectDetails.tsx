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
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Project, Service, EnvVar } from '../types';

export default function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [project, setProject] = useState<Project | null>(null);
  const [services, setServices] = useState<Service[]>([]);
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

    return () => {
      unsubServices();
    };
  }, [user, projectId]);

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-500" />
      </div>
    );
  }

  const mainService = services.find(s => s.type === 'web_service' || s.type === 'static_site') || services[0];
  const displayDomain = mainService ? `${mainService.name}.deploy.kontyra.name.ng` : `${project.name}.kontyra.name.ng`;

  const tabs = [
    { name: 'Overview', path: `/projects/${projectId}`, exact: true },
    { name: 'Deployments', path: `/projects/${projectId}/deployments` },
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
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Projects</span>
        </Link>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xl font-bold uppercase">
              {project.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">{project.name}</h1>
              <a 
                href={`https://${displayDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 mt-0.5"
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
              className="bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Visit
            </a>
            <button
              onClick={() => navigate(`/projects/${projectId}/deploy`)}
              className="bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Deploy
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-zinc-800 mb-8 overflow-x-auto no-scrollbar">
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
                  ? 'border-white text-white' 
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>

      {/* Content */}
      <Routes>
        <Route path="/" element={<OverviewTab project={project} services={services} />} />
        <Route path="/deployments" element={<DeploymentsTab services={services} />} />
        <Route path="/domains" element={<DomainsTab />} />
        <Route path="/environment" element={<EnvironmentTab projectId={projectId} />} />
        <Route path="/logs" element={<LogsTab services={services} />} />
        <Route path="/analytics" element={<AnalyticsTab />} />
        <Route path="/settings" element={<SettingsTab project={project} />} />
      </Routes>
    </div>
  );
}

// --- Tab Components ---

function OverviewTab({ project, services }: { project: Project, services: Service[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <Server className="h-4 w-4 text-zinc-400" />
              Latest Deployments
            </h2>
          </div>
          
          {services.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              No deployments yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {services.slice(0, 3).map((service) => (
                <div key={service.id} className="p-6 flex items-center justify-between">
                  <div>
                    <Link to={`/service/${service.id}`} className="font-medium text-white hover:underline">
                      {service.name}
                    </Link>
                    <p className="text-sm text-zinc-400 mt-1">{service.domain}</p>
                  </div>
                  <span className={`text-xs uppercase font-medium px-2 py-0.5 rounded-full ${
                    service.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {service.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="space-y-6">
        <div className="bg-black border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-medium text-white mb-4">Project Info</h2>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Framework</span>
              <span className="text-white">Next.js (Detected)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Region</span>
              <span className="text-white">fra1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Created</span>
              <span className="text-white">
                {project.createdAt ? new Date(project.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeploymentsTab({ services }: { services: Service[] }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-white">Deployment History</h2>
      </div>
      <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden">
        {services.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">No deployments found.</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {services.map((service) => (
              <div key={service.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-zinc-900/50 transition-colors">
                <div>
                  <Link to={`/service/${service.id}`} className="font-medium text-white hover:underline">
                    {service.name}
                  </Link>
                  <p className="text-sm text-zinc-400 mt-0.5">{service.domain}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs uppercase font-medium px-2 py-0.5 rounded-full ${
                    service.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {service.status}
                  </span>
                  <button className="text-sm text-zinc-400 hover:text-white transition-colors">
                    Rollback
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

function DomainsTab() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-black border border-zinc-800 rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-2">Domains</h2>
        <p className="text-sm text-zinc-400 mb-6">Manage custom domains and SSL certificates.</p>
        
        <form className="flex gap-3 mb-8">
          <input 
            type="text" 
            placeholder="example.com" 
            className="flex-1 bg-black border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
          />
          <button type="button" className="bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-md text-sm font-medium transition-colors">
            Add
          </button>
        </form>

        <div className="border border-zinc-800 rounded-md p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-white">*.apps.kontyra.name.ng</p>
            <p className="text-xs text-zinc-500 mt-1">Default branch • Automatic SSL</p>
          </div>
          <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded-md">Valid Configuration</span>
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
      <div className="bg-black border border-zinc-800 rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-2">Environment Variables</h2>
        <p className="text-sm text-zinc-400 mb-6">Manage secrets and environment-specific configuration.</p>
        
        <form onSubmit={handleAddEnv} className="space-y-4 mb-8">
          <div className="flex gap-3">
            <input
              type="text" required placeholder="KEY" value={envKey}
              onChange={(e) => setEnvKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
              className="w-1/3 bg-black border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 font-mono"
            />
            <input
              type="text" required placeholder="VALUE" value={envVal}
              onChange={(e) => setEnvVal(e.target.value)}
              className="flex-1 bg-black border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 font-mono"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={isAddingEnv || !envKey || !envVal} className="bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50">
              {isAddingEnv ? 'Adding...' : 'Save'}
            </button>
          </div>
        </form>

        <div className="space-y-3">
          {envVars.map((env) => (
            <div key={env.id} className="flex items-center justify-between border border-zinc-800 rounded-md p-3">
              <div className="flex-1">
                <p className="text-white text-sm font-mono truncate">{env.key}</p>
                <div className="flex items-center gap-2 mt-1 text-zinc-500 text-xs font-mono">
                  <span>{!visibleKeys[env.id] ? '••••••••••••••••' : env.value}</span>
                  <button type="button" onClick={() => setVisibleKeys(p => ({ ...p, [env.id]: !p[env.id] }))}>
                    {visibleKeys[env.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              <button onClick={() => handleDeleteEnv(env.id)} className="text-zinc-600 hover:text-red-500 p-1.5 ml-4">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LogsTab({ services }: { services: Service[] }) {
  return (
    <div className="space-y-6">
      <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden h-[500px] flex flex-col">
        <div className="bg-zinc-950 border-b border-zinc-800 px-4 py-3 flex items-center gap-2">
          <TerminalSquare className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-mono text-zinc-400">Runtime Logs</span>
        </div>
        <div className="p-4 overflow-y-auto flex-1 font-mono text-xs text-zinc-300 space-y-2">
          {services.length === 0 ? (
            <p className="text-zinc-500">No active deployments to stream logs from.</p>
          ) : (
            <>
              <p>[INFO] Application initialized.</p>
              <p>[INFO] Listening on port 3000</p>
              <p className="text-zinc-500 animate-pulse">Waiting for traffic...</p>
            </>
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
        <div className="bg-black border border-zinc-800 p-6 rounded-lg">
          <p className="text-sm font-medium text-zinc-400 mb-2">Total Requests</p>
          <p className="text-3xl font-semibold text-white">0</p>
        </div>
        <div className="bg-black border border-zinc-800 p-6 rounded-lg">
          <p className="text-sm font-medium text-zinc-400 mb-2">Bandwidth</p>
          <p className="text-3xl font-semibold text-white">0 MB</p>
        </div>
        <div className="bg-black border border-zinc-800 p-6 rounded-lg">
          <p className="text-sm font-medium text-zinc-400 mb-2">Errors</p>
          <p className="text-3xl font-semibold text-white">0</p>
        </div>
      </div>
      <div className="bg-black border border-zinc-800 rounded-lg p-6 h-[300px] flex items-center justify-center">
        <div className="text-center text-zinc-500">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Not enough data to display graphs.</p>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ project }: { project: Project }) {
  const navigate = useNavigate();

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
      <div className="border border-red-900/50 bg-red-950/10 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-red-900/50">
          <h3 className="text-lg font-medium text-red-500">Danger Zone</h3>
        </div>
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-medium text-white mb-1">Delete Project</h4>
            <p className="text-sm text-zinc-400">Permanently remove your project and all its deployments.</p>
          </div>
          <button
            onClick={handleDeleteProject}
            className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
          >
            Delete Project
          </button>
        </div>
      </div>
    </div>
  );
}
