import React from 'react';
import { motion } from 'motion/react';
import { 
  Globe, 
  Terminal, 
  Zap, 
  Lock, 
  Github, 
  Activity,
  Layers,
  Server
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Features() {
  const features = [
    {
      icon: <Globe className="h-6 w-6 text-text-secondary" />,
      title: "Custom Domains",
      description: "Assign custom domains to your projects with automatic SSL certificate provisioning and renewal."
    },
    {
      icon: <Github className="h-6 w-6 text-text-secondary" />,
      title: "GitHub Integration",
      description: "Push to your repository and watch your changes deploy automatically. Every PR gets a preview URL."
    },
    {
      icon: <Zap className="h-6 w-6 text-text-secondary" />,
      title: "Instant Deployments",
      description: "Global edge network ensures your deployments are live in seconds, not minutes."
    },
    {
      icon: <Terminal className="h-6 w-6 text-text-secondary" />,
      title: "Real-time Logs",
      description: "Stream build and runtime logs directly in your dashboard to debug issues instantly."
    },
    {
      icon: <Lock className="h-6 w-6 text-text-secondary" />,
      title: "Environment Variables",
      description: "Securely manage secrets for production, preview, and development environments."
    },
    {
      icon: <Activity className="h-6 w-6 text-text-secondary" />,
      title: "Analytics",
      description: "Built-in analytics track visitors, bandwidth, and performance metrics without extra scripts."
    }
  ];

  const frameworks = [
    { name: "React", icon: "⚛️" },
    { name: "Next.js", icon: "▲" },
    { name: "Vue", icon: "🟢" },
    { name: "Node.js", icon: "🟩" },
    { name: "Static HTML", icon: "📄" },
  ];

  return (
    <div className="min-h-screen bg-background text-text-primary pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
        
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Everything you need to ship.
          </h1>
          <p className="text-xl text-text-secondary">
            Deploy by Kontyra provides a complete toolset for modern frontend teams to build, deploy, and scale faster.
          </p>
        </div>

        {/* Frameworks */}
        <div className="border border-border rounded-2xl p-8 bg-surface text-center">
          <h2 className="text-sm font-medium text-muted uppercase tracking-widest mb-8">Supported Frameworks</h2>
          <div className="flex flex-wrap justify-center gap-8">
            {frameworks.map((fw, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className="h-16 w-16 rounded-[var(--radius-pill)] bg-card border border-border flex items-center justify-center text-2xl">
                  {fw.icon}
                </div>
                <span className="text-sm font-medium text-zinc-300">{fw.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
          {features.map((feature, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-6 rounded-2xl border border-border bg-surface/50 hover:bg-card/50 transition-colors"
            >
              <div className="h-12 w-12 rounded-[var(--radius-card)] bg-card border border-border flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="border-t border-border py-24 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to deploy?</h2>
          <Link 
            to="/register"
            className="inline-flex h-12 items-center justify-center rounded-md bg-white px-8 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
          >
            Start Deploying
          </Link>
        </div>

      </div>
    </div>
  );
}
