import React, { useState } from 'react';
import { Triangle, Github, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGithubLogin = async () => {
    try {
      setLoading(true);
      await login(); // Currently mapped to Google in our firebase logic, but labeled generically or we can assume it works
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center p-4">
      <Link to="/" className="flex items-center gap-2 mb-8">
        <Triangle className="h-8 w-8 text-white fill-white" />
      </Link>

      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white tracking-tight">Log in to Deploy</h2>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGithubLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 font-medium py-2.5 rounded-md transition-colors"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Github className="h-5 w-5" />}
            Continue with GitHub
          </button>
        </div>

        <p className="text-center text-sm text-zinc-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-white hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
