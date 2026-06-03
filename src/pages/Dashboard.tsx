import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search,
  FolderOpen,
  ArrowRight,
  Globe,
  Database,
  Cpu,
  MoreVertical
} from 'lucide-react';
import { useAuth } from '../App';
import { 
  collection, 
  query, 
  where, 
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Project, Service } from '../types';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

    const qServices = query(collection(db, 'services'), where('ownerId', '==', user.uid));
    const unsubServices = onSnapshot(qServices, (snap) => {
      const servs: Service[] = [];
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
      handleFirestoreError(error, OperationType.LIST, 'services');
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">Projects</h1>
          <p className="text-sm text-zinc-400">View and manage your deployments.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-md pl-9 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>
          <button
            onClick={() => navigate('/project/new')}
            className="bg-white text-black hover:bg-zinc-200 font-medium px-4 py-2 rounded-md flex items-center gap-2 transition-colors text-sm whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Add New...
          </button>
        </div>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-500" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="border border-zinc-800 bg-black rounded-lg p-12 text-center flex flex-col items-center justify-center">
          <FolderOpen className="h-10 w-10 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No projects found</h3>
          <p className="text-sm text-zinc-400 mb-6 max-w-sm">
            You don't have any projects matching that criteria, or you haven't created one yet.
          </p>
          <Link 
            to="/projects/new"
            className="bg-white text-black hover:bg-zinc-200 font-medium px-4 py-2 rounded-md transition-colors flex items-center gap-2 text-sm w-fit mx-auto"
          >
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const projectServices = allServices.filter(s => s.projectId === project.id);
            const webServices = projectServices.filter(s => s.type === 'web_service' || s.type === 'static_site');
            
            // Assume the main service is the first web service, or just the first service
            const mainService = webServices[0] || projectServices[0];
            
            // Generate a random-looking domain for Vercel-like aesthetic if none exists
            const displayDomain = mainService ? `${mainService.name}.deploy.kontyra.name.ng` : `${project.name}.kontyra.name.ng`;

            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="bg-black border border-zinc-800 hover:border-zinc-600 rounded-lg p-5 transition-colors group flex flex-col justify-between min-h-[160px]"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                        <span className="text-sm font-semibold uppercase">{project.name.charAt(0)}</span>
                      </div>
                      <h3 className="text-base font-medium text-zinc-100 group-hover:text-white transition-colors">
                        {project.name}
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-500 line-clamp-1 mb-4">
                    {displayDomain}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    {projectServices.length > 0 ? (
                      <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <span className="w-2 h-2 rounded-full bg-zinc-600" />
                        No Deployments
                      </span>
                    )}
                  </div>
                  
                  {mainService?.createdAt && (
                    <span className="text-xs text-zinc-500">
                      {new Date((mainService.createdAt as any)?.toMillis() || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
