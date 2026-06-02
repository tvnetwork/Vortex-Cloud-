import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Terminal, 
  HardDrive, 
  Cpu, 
  Database, 
  Settings2, 
  DollarSign, 
  ArrowRight,
  Sparkles,
  Search,
  Activity,
  FolderOpen
} from 'lucide-react';
import { useAuth } from '../App';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Project, Service } from '../types';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // New Project Form Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;

    // Real-time listener for user projects
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

    // Real-time listener for user services (to display badges on the project cards)
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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !projectName.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'projects'), {
        name: projectName.trim(),
        description: projectDesc.trim(),
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });
      setProjectName('');
      setProjectDesc('');
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'projects');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProjects = projects.filter(proj => 
    proj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    proj.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 min-h-screen">
      {/* Header and Quick Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-8 border-b border-slate-800/80">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold font-heading text-white">Console Cluster Control</h1>
          <p className="text-slate-400 text-sm">Deploy serverless modules and review live metrics across edge locations.</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-cyan-500/15 hover:opacity-90 transition-all flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Project</span>
        </motion.button>
      </div>

      {/* Cluster Overview Metrics Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 font-mono text-sm">
        <div className="bg-[#0b1222]/80 border border-slate-800 p-6 rounded-2xl flex items-center gap-4 shadow-md">
          <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
            <Cpu className="h-6 w-6" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-sans font-semibold">Active Services</p>
            <p className="text-xl font-bold font-heading text-white">{allServices.length}</p>
          </div>
        </div>

        <div className="bg-[#0b1222]/80 border border-slate-800 p-6 rounded-2xl flex items-center gap-4 shadow-md">
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
            <HardDrive className="h-6 w-6" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-sans font-semibold">Project Clusters</p>
            <p className="text-xl font-bold font-heading text-white">{projects.length}</p>
          </div>
        </div>

        <div className="bg-[#0b1222]/80 border border-slate-800 p-6 rounded-2xl flex items-center gap-4 shadow-md">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Activity className="h-6 w-6" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-sans font-semibold">Gateway Status</p>
            <p className="text-md font-bold font-heading text-emerald-400 uppercase tracking-wider">OK • Online</p>
          </div>
        </div>

        <div className="bg-[#0b1222]/80 border border-slate-800 p-6 rounded-2xl flex items-center gap-4 shadow-md">
          <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-400">
            <DollarSign className="h-6 w-6" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-sans font-semibold">Platform Credits</p>
            <p className="text-xl font-bold font-heading text-white">${profile?.balance?.toFixed(2) || '50.00'}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <Terminal className="h-8 w-8 text-cyan-400 animate-spin" />
          <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">Quering Active Workspaces...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Projects List Container */}
          <div className="flex items-center justify-between border-b border-slate-800/50 pb-4">
            <h2 className="text-lg font-bold font-heading text-slate-200">Developer Projects</h2>
            <div className="relative max-w-xs w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Find project workspace..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
              />
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="bg-[#0b1222]/40 border border-dashed border-slate-800 p-12 rounded-3xl text-center flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
                <FolderOpen className="h-8 w-8" />
              </div>
              <p className="text-slate-400 text-sm">No project workspaces match your criteria.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-cyan-400 font-bold px-6 py-2.5 rounded-xl font-mono text-xs transition-all"
              >
                + Create First Workspace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => {
                const projectServices = allServices.filter(s => s.projectId === project.id);
                const hasPostgres = projectServices.some(s => s.type === 'postgres');
                const hasRedis = projectServices.some(s => s.type === 'redis');
                const hasWebServices = projectServices.some(s => s.type === 'web_service' || s.type === 'static_site');

                return (
                  <motion.div
                    key={project.id}
                    whileHover={{ y: -4, borderColor: 'rgba(34,211,238,0.3)' }}
                    className="bg-[#0b1222]/60 border border-slate-800/80 rounded-2xl p-6 transition-all shadow-md group flex flex-col justify-between"
                  >
                    <div>
                      {/* Project Header */}
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold font-heading text-white leading-tight group-hover:text-cyan-400 transition-colors">
                          {project.name}
                        </h3>
                        <Terminal className="h-4 w-4 text-slate-500" />
                      </div>

                      {/* Description */}
                      <p className="text-slate-400 text-xs font-sans line-clamp-2 h-10 mb-6 leading-relaxed">
                        {project.description || 'Custom computing services core.'}
                      </p>
                    </div>

                    {/* Footer Services Badges and Link */}
                    <div className="pt-4 border-t border-slate-800/50 flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {projectServices.length === 0 ? (
                          <span className="text-[10px] font-mono bg-slate-900 text-slate-500 px-2.5 py-1 rounded-md border border-slate-800">
                            Empty
                          </span>
                        ) : (
                          <>
                            {hasWebServices && (
                              <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20" title="Web instances running">
                                Service
                              </span>
                            )}
                            {hasPostgres && (
                              <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/20" title="Postgres DB provisioned">
                                SQL
                              </span>
                            )}
                            {hasRedis && (
                              <span className="text-[10px] font-mono bg-pink-500/10 text-pink-300 px-2 py-0.5 rounded border border-pink-500/20" title="Redis cache provisioned">
                                Cache
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      <Link
                        to={`/project/${project.id}`}
                        className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                      >
                        <span>Workspace</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* New Project Dialog Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#090f1d] border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative"
            >
              <h2 className="text-xl font-bold font-heading text-white mb-2">Create Deployment Workspace</h2>
              <p className="text-slate-400 text-xs mb-6">Create a logical partition to host databases, edge workers, and web services.</p>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">Project Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. core-auth-microservice"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    maxLength={100}
                    className="w-full bg-[#050810] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">Description (Optional)</label>
                  <textarea
                    placeholder="Describe what services are hosted in this node."
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className="w-full bg-[#050810] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-1/2 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50 py-3 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-1/2 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-[#050810] py-3 rounded-xl text-sm font-bold transition-all shadow-md shadow-cyan-400/10 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Terminal className="h-4 w-4 animate-spin" />
                    ) : (
                      <span>Initialize Node</span>
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
