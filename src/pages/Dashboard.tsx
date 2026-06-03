import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search,
  FolderOpen,
  LayoutGrid,
  List as ListIcon,
  Activity,
  Globe,
  Settings,
  MoreVertical,
  Github
} from 'lucide-react';
import { useAuth } from '../App';
import { 
  collection, 
  query, 
  where, 
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Project, Deployment } from '../types';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allServices, setAllServices] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'projects' | 'activity' | 'domains' | 'settings'>('projects');

  useEffect(() => {
    if (!user) return;

    const qProjects = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
    const unsubProjects = onSnapshot(qProjects, (snap) => {
      const projs: Project[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        projs.push({
          id: docSnap.id,
          name: data.name,
          description: data.description || '',
          ownerId: data.ownerId,
          createdAt: data.createdAt
        });
      });
      setProjects(projs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    const qServices = query(collection(db, 'deployments'), where('ownerId', '==', user.uid));
    const unsubServices = onSnapshot(qServices, (snap) => {
      const servs: Deployment[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        servs.push({
          id: docSnap.id,
          projectId: data.projectId,
          ownerId: data.ownerId,
          name: data.name,
          type: data.type,
          status: data.status,
          createdAt: data.createdAt
        });
      });
      setAllServices(servs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'deployments');
    });

    return () => {
      unsubProjects();
      unsubServices();
    };
  }, [user]);

  const filteredProjects = projects.filter(proj => 
    proj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    proj.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 min-h-screen space-y-8">
      
      {/* Header and User Context */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full border border-border bg-card flex items-center justify-center overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg font-medium">{user?.email?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              {user?.displayName || user?.email?.split('@')[0] || 'User'}'s Dashboard
            </h1>
            <p className="text-sm text-text-secondary">Manage your projects and team infrastructure.</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/projects/new')}
          className="bg-primary text-text-primary hover:bg-secondary hover:bg-zinc-200 font-medium px-4 py-2 rounded-md flex items-center gap-2 transition-colors text-sm whitespace-nowrap shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add New...
        </button>
      </div>

      {/* Main Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'projects', label: 'Projects', icon: <FolderOpen className="h-4 w-4" /> },
            { id: 'activity', label: 'Activity', icon: <Activity className="h-4 w-4" /> },
            { id: 'domains', label: 'Domains', icon: <Globe className="h-4 w-4" /> },
            { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-text-primary text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-zinc-300 hover:border-zinc-600'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative flex-1 w-full sm:max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-border rounded-md pl-9 pr-4 py-2 text-sm text-text-primary placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
            
            <div className="flex items-center bg-card border border-border rounded-md p-1 w-full sm:w-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded text-sm transition-colors flex-1 flex justify-center ${viewMode === 'grid' ? 'bg-background shadow text-text-primary border border-border' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded text-sm transition-colors flex-1 flex justify-center ${viewMode === 'list' ? 'bg-background shadow text-text-primary border border-border' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Projects List / Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-500" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="border border-border bg-card/50 border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center">
              <FolderOpen className="h-10 w-10 text-zinc-600 mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">No projects found</h3>
              <p className="text-sm text-text-secondary mb-6 max-w-sm">
                You don't have any projects matching that criteria, or you haven't created one yet.
              </p>
              <Link 
                to="/projects/new"
                className="bg-white text-black hover:bg-zinc-200 font-medium px-4 py-2 rounded-md transition-colors flex items-center gap-2 text-sm w-fit mx-auto shadow-sm"
              >
                Create your first project
              </Link>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => {
                const projectServices = allServices.filter(s => s.projectId === project.id);
                const webServices = projectServices.filter(s => s.type === 'web_deployment' || s.type === 'static_site');
                const mainService = webServices[0] || projectServices[0];
                const displayDomain = mainService ? `${mainService.name}.apps.kontyra.name.ng` : `${project.name}.apps.kontyra.name.ng`;

                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="bg-background border border-border hover:border-zinc-600 rounded-[var(--radius-card)] p-5 transition-colors group flex flex-col justify-between min-h-[160px] hover:shadow-lg hover:shadow-black/20"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-card border border-border flex items-center justify-center">
                            <span className="text-sm font-semibold uppercase">{project.name.charAt(0)}</span>
                          </div>
                          <h3 className="text-base font-medium text-text-primary group-hover:text-text-primary transition-colors">
                            {project.name}
                          </h3>
                        </div>
                      </div>
                      <p className="text-sm text-muted line-clamp-1 mb-4 flex items-center gap-1.5 mt-2">
                        <Globe className="h-3.5 w-3.5" /> {displayDomain}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-4 border-t border-border pt-4">
                      <div className="flex items-center gap-2">
                        {projectServices.length > 0 ? (
                          <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            Production
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-muted">
                            <span className="w-2 h-2 rounded-full bg-zinc-600" />
                            No Deployments
                          </span>
                        )}
                      </div>
                      
                      {mainService?.createdAt && (
                        <span className="text-xs text-muted flex items-center gap-1.5">
                          <Github className="h-3 w-3" />
                          {new Date((mainService.createdAt as any)?.toMillis() || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-background border border-border rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-card">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Project</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider hidden sm:table-cell">Domain</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {filteredProjects.map((project) => {
                    const projectServices = allServices.filter(s => s.projectId === project.id);
                    const webServices = projectServices.filter(s => s.type === 'web_deployment' || s.type === 'static_site');
                    const mainService = webServices[0] || projectServices[0];
                    const displayDomain = mainService ? `${mainService.name}.apps.kontyra.name.ng` : `${project.name}.apps.kontyra.name.ng`;

                    return (
                      <tr key={project.id} className="hover:bg-card/50 transition-colors group cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-card border border-border flex items-center justify-center shrink-0">
                              <span className="text-sm font-semibold uppercase">{project.name.charAt(0)}</span>
                            </div>
                            <span className="text-sm font-medium text-text-primary group-hover:underline">
                              {project.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                          <div className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
                            <Globe className="h-3.5 w-3.5" />
                            {displayDomain}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {projectServices.length > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-success" />
                              Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                              Draft
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-text-secondary">
                          {mainService?.createdAt 
                            ? new Date((mainService.createdAt as any)?.toMillis() || Date.now()).toLocaleDateString()
                            : '—'
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="border border-border bg-card/50 border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center">
          <Activity className="h-10 w-10 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">Activity Feed</h3>
          <p className="text-sm text-text-secondary max-w-sm">
            Activity and deployment logs for your team will appear here.
          </p>
        </div>
      )}

      {activeTab === 'domains' && (
        <div className="border border-border bg-card/50 border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center">
          <Globe className="h-10 w-10 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">Global Domains</h3>
          <p className="text-sm text-text-secondary max-w-sm">
            Manage custom domains and SSL certificates across all your projects.
          </p>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="border border-border bg-card/50 border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center">
          <Settings className="h-10 w-10 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">Team Settings</h3>
          <p className="text-sm text-text-secondary max-w-sm">
            Configure billing, team members, and integration settings.
          </p>
        </div>
      )}

    </div>
  );
}
