import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Github, 
  Loader2, 
  Search, 
  Lock, 
  Globe, 
  FolderGit2,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  updated_at: string;
  language: string | null;
}

export default function CreateProject() {
  const { user, profile, updateGithub } = useAuth();
  const navigate = useNavigate();
  
  // Step State
  const [step, setStep] = useState<'import' | 'configure'>('import');
  
  // GitHub Integration State
  const [githubInput, setGithubInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Project Config State
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [clusterRegion, setClusterRegion] = useState('us-east-1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch repos if githubUsername exists
  useEffect(() => {
    if (profile?.githubUsername) {
      fetchRepos(profile.githubUsername);
    }
  }, [profile?.githubUsername]);

  const fetchRepos = async (username: string) => {
    setLoadingRepos(true);
    try {
      const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`);
      if (response.ok) {
        const data = await response.json();
        setRepos(data);
      } else {
        setRepos([]);
      }
    } catch (error) {
      console.error("Error fetching repos:", error);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleLinkGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubInput.trim()) return;
    setIsLinking(true);
    await updateGithub(githubInput.trim());
    await fetchRepos(githubInput.trim());
    setIsLinking(false);
  };

  const handleSelectRepo = (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setProjectName(repo.name.toLowerCase().replace(/[^a-z0-9\-]/g, ''));
    setStep('configure');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        name: projectName.trim(),
        description: projectDesc.trim(),
        region: clusterRegion,
        ownerId: user.uid,
        githubRepo: selectedRepo?.full_name || null,
        createdAt: serverTimestamp()
      });
      navigate(`/projects/${docRef.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project.');
      setIsSubmitting(false);
    }
  };

  const filteredRepos = repos.filter(repo => 
    repo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 min-h-screen">
      
      {/* Back Button */}
      <button 
        onClick={() => step === 'configure' ? setStep('import') : navigate('/dashboard')} 
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        {step === 'configure' ? 'Back to Import' : 'Back to Dashboard'}
      </button>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary mb-3">
          Let's build something new.
        </h1>
        <p className="text-text-secondary text-base">
          To deploy a new Project, import an existing Git Repository or start from a template.
        </p>
      </div>

      <AnimatePresence mode="wait">
        
        {/* STEP 1: IMPORT REPOSITORY */}
        {step === 'import' && (
          <motion.div
            key="import"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* Left: Import Git Repository */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-background border border-border rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                
                <div className="p-6 border-b border-border bg-card/30">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Github className="h-5 w-5" /> Import Git Repository
                  </h2>
                </div>

                {!profile?.githubUsername ? (
                  <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-card border border-border rounded-full flex items-center justify-center mb-6 shadow-lg">
                      <Github className="h-8 w-8 text-text-primary" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">Connect your GitHub Account</h3>
                    <p className="text-text-secondary text-sm max-w-sm mb-8">
                      We need your GitHub username to fetch your public repositories. We only request read access.
                    </p>
                    <form onSubmit={handleLinkGithub} className="w-full max-w-sm space-y-4">
                      <input
                        type="text"
                        placeholder="e.g. octocat"
                        value={githubInput}
                        onChange={(e) => setGithubInput(e.target.value)}
                        className="w-full bg-surface border border-border rounded-md px-4 py-3 text-sm text-text-primary placeholder-zinc-500 focus:outline-none focus:border-primary transition-colors text-center"
                        required
                      />
                      <button
                        type="submit"
                        disabled={isLinking || !githubInput.trim()}
                        className="w-full bg-white text-black hover:bg-zinc-200 disabled:opacity-50 font-medium py-3 rounded-md transition-colors flex items-center justify-center gap-2"
                      >
                        {isLinking ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Connect Account'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <div className="p-4 border-b border-border bg-background flex items-center gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                        <input
                          type="text"
                          placeholder="Search repositories..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-surface border border-border rounded-md pl-9 pr-4 py-2 text-sm text-text-primary placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                        />
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md bg-surface text-sm text-text-secondary">
                        <Github className="h-4 w-4" />
                        {profile.githubUsername}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-background p-4 space-y-3">
                      {loadingRepos ? (
                        <div className="flex items-center justify-center h-48">
                          <Loader2 className="h-6 w-6 text-muted animate-spin" />
                        </div>
                      ) : repos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-center">
                          <FolderGit2 className="h-8 w-8 text-muted mb-3" />
                          <p className="text-text-primary font-medium">No repositories found</p>
                          <p className="text-text-secondary text-sm">We couldn't find any public repositories.</p>
                        </div>
                      ) : filteredRepos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-center text-text-secondary text-sm">
                          No repositories match your search.
                        </div>
                      ) : (
                        filteredRepos.map(repo => (
                          <div key={repo.id} className="group flex items-center justify-between p-4 border border-border rounded-lg bg-surface hover:border-zinc-500 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center shrink-0">
                                {repo.private ? <Lock className="h-4 w-4 text-muted" /> : <Globe className="h-4 w-4 text-muted" />}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-medium text-text-primary truncate">{repo.name}</h4>
                                <p className="text-xs text-text-secondary truncate mt-0.5 flex items-center gap-2">
                                  {repo.language && <span>{repo.language}</span>}
                                  {repo.language && <span className="w-1 h-1 rounded-full bg-zinc-600" />}
                                  <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleSelectRepo(repo)}
                              className="ml-4 px-4 py-1.5 bg-card border border-border hover:bg-zinc-800 text-text-primary rounded-md text-sm font-medium transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 flex-shrink-0"
                            >
                              Import
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Clone Template */}
            <div className="space-y-6">
              <div className="bg-background border border-border rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-2">Clone Template</h2>
                <p className="text-sm text-text-secondary mb-6">
                  Alternatively, you can start with a pre-configured template.
                </p>
                <div className="space-y-3">
                  {['Next.js', 'React', 'Vue', 'Nuxt'].map(framework => (
                    <button key={framework} disabled className="w-full flex items-center justify-between p-3 border border-border rounded-lg bg-surface opacity-50 cursor-not-allowed">
                      <span className="font-medium text-sm">{framework}</span>
                      <ArrowRight className="h-4 w-4 text-muted" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: CONFIGURE PROJECT */}
        {step === 'configure' && selectedRepo && (
          <motion.div
            key="configure"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl"
          >
            <div className="bg-background border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border bg-card/30 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-surface border border-border flex items-center justify-center">
                  <Github className="h-4 w-4 text-text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Configure Project</h2>
                  <p className="text-sm text-text-secondary flex items-center gap-1.5">
                    Importing <span className="font-medium text-text-primary">{selectedRepo.full_name}</span>
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreate} className="p-8 space-y-8">
                <div className="space-y-2">
                  <label htmlFor="projectName" className="block text-sm font-medium text-text-primary">
                    Project Name
                  </label>
                  <input
                    id="projectName"
                    type="text"
                    required
                    placeholder="my-project"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ''))}
                    maxLength={64}
                    className="w-full bg-surface px-4 py-2.5 text-sm text-text-primary placeholder-zinc-600 border border-border rounded-md focus:outline-none focus:border-zinc-500 transition-colors"
                  />
                  <p className="text-xs text-text-secondary mt-1">This will be used as the default domain prefix.</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="projectDesc" className="block text-sm font-medium text-text-primary">
                    Framework Preset
                  </label>
                  <div className="w-full bg-surface px-4 py-2.5 text-sm text-text-primary border border-border rounded-md flex items-center justify-between opacity-80 cursor-not-allowed">
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-zinc-700" />
                      Auto-detect ({selectedRepo.language || 'Other'})
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-text-primary">
                    Root Directory
                  </label>
                  <div className="w-full bg-surface px-4 py-2.5 text-sm text-text-secondary border border-border rounded-md">
                    ./
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-text-primary">
                    Cluster Region
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { id: 'us-east-1', name: 'US East', icon: '🇺🇸' },
                      { id: 'eu-west-1', name: 'EU West', icon: '🇪🇺' },
                      { id: 'ap-south-1', name: 'Asia', icon: '🇸🇬' },
                    ].map(reg => (
                      <button
                        key={reg.id}
                        type="button"
                        onClick={() => setClusterRegion(reg.id)}
                        className={`flex flex-col items-start p-3 border rounded-md text-left transition-colors ${
                          clusterRegion === reg.id
                            ? 'border-primary bg-primary/10 text-primary shadow-[inset_0_0_15px_rgba(109,40,217,0.1)]'
                            : 'border-border hover:border-zinc-600 bg-surface text-text-secondary'
                        }`}
                      >
                        <span className="text-lg mb-1">{reg.icon}</span>
                        <span className="text-xs font-medium">{reg.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-border flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('import')}
                    className="px-6 py-2.5 bg-surface border border-border hover:bg-zinc-800 text-text-primary rounded-md text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !projectName}
                    className="px-6 py-2.5 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 rounded-md text-sm font-medium transition-all shadow-sm flex items-center justify-center min-w-[120px]"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Deploy'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
