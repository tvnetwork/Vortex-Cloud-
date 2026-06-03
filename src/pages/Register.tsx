import React, { useState } from 'react';
import { Triangle, Github, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGithubRegister = async () => {
    try {
      setLoading(true);
      await login();
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <Link to="/" className="flex items-center gap-2 mb-8">
        <Triangle className="h-8 w-8 text-text-primary fill-white" />
      </Link>

      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-text-primary tracking-tight">Create your account</h2>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGithubRegister}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-text-primary hover:bg-secondary hover:bg-zinc-200 disabled:opacity-50 font-medium py-2.5 rounded-md transition-colors"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Github className="h-5 w-5" />}
            Sign up with GitHub
          </button>
        </div>

        <p className="text-center text-sm text-muted">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>

        <p className="text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
