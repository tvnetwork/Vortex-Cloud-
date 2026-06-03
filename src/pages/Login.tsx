import React, { useState } from 'react';
import { Triangle, Github, Loader2, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { motion } from 'motion/react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGithubLogin = async () => {
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
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Left Panel: Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 md:p-12 lg:p-24 relative z-10">
        <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 group">
          <Triangle className="h-6 w-6 text-text-primary fill-white" />
          <span className="font-semibold tracking-tight">Deploy by Kontyra</span>
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-text-secondary text-sm">Log in to your account to continue.</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleGithubLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 font-medium py-3 rounded-md transition-colors"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Github className="h-5 w-5" />}
              Continue with GitHub
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted">Or continue with</span>
              </div>
            </div>

            <button
              disabled
              className="w-full flex items-center justify-center gap-3 bg-card border border-border text-text-primary hover:bg-zinc-800 disabled:opacity-50 font-medium py-3 rounded-md transition-colors cursor-not-allowed"
            >
              Email address
            </button>
          </div>

          <p className="text-sm text-text-secondary">
            Don't have an account?{' '}
            <Link to="/register" className="text-text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Panel: Showcase */}
      <div className="hidden md:flex flex-1 bg-surface border-l border-border relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--color-primary)_0%,_transparent_40%)] opacity-20" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative z-10 max-w-lg space-y-8"
        >
          <div className="bg-background/50 backdrop-blur-xl border border-border p-8 rounded-2xl shadow-2xl">
            <div className="flex gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
            </div>
            <div className="space-y-4 font-mono text-sm text-text-secondary">
              <p><span className="text-primary">deploy</span> <span className="text-text-primary">--prod</span></p>
              <div className="space-y-2 pl-4 border-l border-border">
                <p>Building project...</p>
                <p>Resolving dependencies...</p>
                <p>Uploading build outputs...</p>
                <p className="text-success pt-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  Deployment complete (1.2s)
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <blockquote className="text-xl font-medium leading-relaxed mb-4">
              "Deploy by Kontyra has completely transformed our workflow. We're shipping features 10x faster with zero infrastructure headaches."
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-sm">
                S
              </div>
              <div>
                <p className="text-sm font-medium">Sarah Jenkins</p>
                <p className="text-xs text-text-secondary">CTO at TechFlow</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
