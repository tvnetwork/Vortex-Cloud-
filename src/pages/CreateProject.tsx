import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../App';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export default function CreateProject() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [clusterRegion, setClusterRegion] = useState('us-east-1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const regions = [
    { id: 'us-east-1', name: 'Washington, D.C., USA' },
    { id: 'eu-west-1', name: 'Frankfurt, Germany' },
    { id: 'ap-northeast-1', name: 'Tokyo, Japan' },
    { id: 'us-west-2', name: 'Oregon, USA' }
  ];

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!user) {
      setErrorMessage("Authentication required. Please sign in.");
      return;
    }

    if (!projectName.trim()) {
      setErrorMessage("Please specify a project name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        name: projectName.trim(),
        description: projectDesc.trim(),
        region: clusterRegion,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });

      navigate(`/projects/${docRef.id}`);
    } catch (error: any) {
      console.error("Failed to create project:", error);
      setErrorMessage("An error occurred while creating the project. Please try again.");
      handleFirestoreError(error, OperationType.WRITE, 'projects');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 min-h-screen">
      <Link 
        to="/dashboard" 
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Projects</span>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">
          Create a new Project
        </h1>
        <p className="text-zinc-400 text-sm">
          Projects allow you to organize your deployments and services.
        </p>
      </div>

      <form onSubmit={handleCreateProject} className="space-y-8">
        {errorMessage && (
          <div className="bg-red-950/50 border border-red-900 p-4 rounded-md flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{errorMessage}</p>
          </div>
        )}

        <div className="bg-black border border-zinc-800 rounded-lg p-6 space-y-6">
          <div className="space-y-2">
            <label htmlFor="projectName" className="text-sm font-medium text-white block">
              Project Name
            </label>
            <div className="flex rounded-md overflow-hidden border border-zinc-800 focus-within:border-zinc-500 transition-colors">
              <span className="flex items-center px-3 bg-zinc-900 text-zinc-500 text-sm border-r border-zinc-800">
                kontyra.name.ng/
              </span>
              <input
                id="projectName"
                type="text"
                required
                placeholder="my-project"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ''))}
                maxLength={64}
                className="flex-1 bg-black px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none"
              />
            </div>
            <p className="text-xs text-zinc-500">
              Only lowercase letters, numbers, and hyphens are allowed.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="projectDesc" className="text-sm font-medium text-white block">
              Description <span className="text-zinc-500 font-normal">(Optional)</span>
            </label>
            <textarea
              id="projectDesc"
              placeholder="A brief description of this project"
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
              maxLength={250}
              rows={3}
              className="w-full bg-black border border-zinc-800 rounded-md px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none transition-colors"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-white block">
              Region
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {regions.map((reg) => (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() => setClusterRegion(reg.id)}
                  className={`flex flex-col items-start p-3 border rounded-md text-left transition-colors ${
                    clusterRegion === reg.id
                      ? 'border-white bg-zinc-900 text-white'
                      : 'border-zinc-800 hover:border-zinc-600 bg-black text-zinc-400'
                  }`}
                >
                  <span className="text-sm font-medium">{reg.name}</span>
                  <span className="text-xs mt-1 text-zinc-500">{reg.id}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500 pt-1">
              Select the region closest to your users for best performance.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 rounded-md text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !projectName.trim()}
            className="bg-white text-black hover:bg-zinc-200 px-6 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Create'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
