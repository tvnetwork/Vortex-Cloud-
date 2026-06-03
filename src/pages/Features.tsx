import React from 'react';
import { motion } from 'motion/react';
import { 
  Globe, 
  Terminal, 
  Zap, 
  Lock, 
  Github, 
  Activity,
  Server
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Features() {
  const features = [
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Custom Domains",
      description: "Assign custom domains to your projects with automatic SSL certificate provisioning and renewal.",
      color: "from-blue-500/20 to-transparent",
      iconColor: "text-blue-400"
    },
    {
      icon: <Github className="h-6 w-6" />,
      title: "GitHub Integration",
      description: "Push to your repository and watch your changes deploy automatically. Every PR gets a preview URL.",
      color: "from-white/10 to-transparent",
      iconColor: "text-white"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Instant Deployments",
      description: "Global edge network ensures your deployments are live in seconds, not minutes.",
      color: "from-yellow-500/20 to-transparent",
      iconColor: "text-yellow-400"
    },
    {
      icon: <Terminal className="h-6 w-6" />,
      title: "Real-time Logs",
      description: "Stream build and runtime logs directly in your dashboard to debug issues instantly.",
      color: "from-green-500/20 to-transparent",
      iconColor: "text-green-400"
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: "Environment Variables",
      description: "Securely manage secrets for production, preview, and development environments.",
      color: "from-purple-500/20 to-transparent",
      iconColor: "text-purple-400"
    },
    {
      icon: <Activity className="h-6 w-6" />,
      title: "Analytics",
      description: "Built-in analytics track visitors, bandwidth, and performance metrics without extra scripts.",
      color: "from-red-500/20 to-transparent",
      iconColor: "text-red-400"
    }
  ];

  return (
    <div className="min-h-screen bg-background text-text-primary pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32 pb-32">
        
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-4xl mx-auto pt-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-6xl md:text-8xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500"
          >
            Built for velocity.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl md:text-2xl text-text-secondary leading-relaxed"
          >
            Deploy by Kontyra provides a complete, polished toolset for modern frontend teams to build, deploy, and scale faster.
          </motion.p>
        </div>

        {/* Deep Dive Section 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="h-12 w-12 rounded-2xl bg-card border border-border flex items-center justify-center shadow-lg">
              <Server className="h-6 w-6 text-text-primary" />
            </div>
            <h2 className="text-4xl font-bold tracking-tight">Serverless Infrastructure.</h2>
            <p className="text-lg text-text-secondary leading-relaxed">
              Stop worrying about servers. Our platform automatically scales your application from zero to millions of requests seamlessly. With edge caching, your content is served globally with sub-millisecond latency.
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-border bg-surface p-8 shadow-2xl relative overflow-hidden h-[400px]"
          >
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-primary)_0%,_transparent_60%)] opacity-20" />
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
             {/* Abstract visual */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-primary/30 rounded-full animate-ping opacity-20" />
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-primary/50 rounded-full animate-pulse opacity-40" />
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 backdrop-blur-xl border border-primary/50 rounded-full shadow-[0_0_50px_rgba(109,40,217,0.5)] flex items-center justify-center">
               <Server className="h-10 w-10 text-white" />
             </div>
          </motion.div>
        </div>

        {/* Feature Grid */}
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">Everything you need</h2>
            <p className="text-text-secondary">Explore the complete feature suite.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative p-8 rounded-3xl border border-border bg-surface overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className={`h-12 w-12 rounded-2xl bg-card border border-border flex items-center justify-center mb-6 shadow-lg ${feature.iconColor}`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="border-t border-border pt-32 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">Stop configuring. Start building.</h2>
          <Link 
            to="/register"
            className="inline-flex h-14 items-center justify-center rounded-md bg-white px-10 text-base font-medium text-black transition-colors hover:bg-zinc-200 shadow-2xl"
          >
            Start Deploying
          </Link>
        </div>

      </div>
    </div>
  );
}
