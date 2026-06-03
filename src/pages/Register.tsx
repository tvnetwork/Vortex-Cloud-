import React, { useState } from 'react';
import { Triangle, Github, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { motion } from 'motion/react';

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
    <div className="min-h-screen bg-background flex flex-col md:flex-row-reverse">
      {/* Right Panel: Auth Form (reversed for Register to feel different from login) */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 md:p-12 lg:p-24 relative z-10">
        <Link to="/" className="absolute top-8 right-8 flex items-center gap-2 group">
          <span className="font-semibold tracking-tight">Deploy by Kontyra</span>
          <Triangle className="h-6 w-6 text-text-primary fill-white" />
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-3xl font-semibold tracking-tight">Create your account</h2>
            <p className="text-text-secondary text-sm">Start deploying for free today.</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleGithubRegister}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 font-medium py-3 rounded-md transition-colors"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Github className="h-5 w-5" />}
              Sign up with GitHub
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

          <p className="text-center md:text-left text-xs text-muted leading-relaxed">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>

          <p className="text-center md:text-left text-sm text-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="text-text-primary hover:underline font-medium">
              Log in
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Left Panel: Showcase */}
      <div className="hidden md:flex flex-1 bg-surface border-r border-border relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--color-primary)_0%,_transparent_50%)] opacity-20" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative z-10 max-w-lg space-y-8"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background/50 backdrop-blur-xl border border-border p-6 rounded-2xl shadow-xl flex flex-col items-center text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xl">⚡️</span>
              </div>
              <div>
                <h3 className="font-semibold text-sm">Global Edge</h3>
                <p className="text-xs text-text-secondary mt-1">Deploy instantly to 35+ regions worldwide.</p>
              </div>
            </div>
            <div className="bg-background/50 backdrop-blur-xl border border-border p-6 rounded-2xl shadow-xl flex flex-col items-center text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-xl">🔄</span>
              </div>
              <div>
                <h3 className="font-semibold text-sm">CI/CD Built-in</h3>
                <p className="text-xs text-text-secondary mt-1">Push to GitHub. We handle the rest.</p>
              </div>
            </div>
          </div>
          
          <div>
            <blockquote className="text-xl font-medium leading-relaxed mb-4">
              "The developer experience is unmatched. Setting up a new project takes seconds, and the previews make team collaboration effortless."
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-sm">
                M
              </div>
              <div>
                <p className="text-sm font-medium">Michael Chen</p>
                <p className="text-xs text-text-secondary">Lead Engineer at Vertex</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
