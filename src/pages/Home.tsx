import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Triangle, ArrowRight, Github, Globe, Zap, Code, Terminal, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'develop' | 'preview' | 'ship'>('develop');

  const tabContent = {
    develop: {
      title: "Develop",
      description: "Build with the framework of your choice. Push to GitHub and we'll handle the rest.",
      code: `$ git commit -m "feat: amazing new ui"
$ git push origin main
> Deploying to Kontyra...
> Build finished in 1.2s`
    },
    preview: {
      title: "Preview",
      description: "Every pull request gets its own preview URL automatically. Share with your team.",
      code: `✓ Preview URL generated:
https://feat-ui-app.apps.kontyra.name.ng

Comment on PR: "Deployment ready! 🚀"`
    },
    ship: {
      title: "Ship",
      description: "Merge to main to deploy to production across our global edge network instantly.",
      code: `✓ Promoted to production
https://myapp.kontyra.app

> Edge Network updated (35 regions)
> SSL certificate provisioned`
    }
  };

  return (
    <div className="bg-background text-text-primary min-h-screen font-sans selection:bg-zinc-800 selection:text-text-primary overflow-hidden">
      
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center">
        <div className="absolute top-[-20%] w-[150%] h-[50%] bg-[radial-gradient(ellipse_at_top,_var(--color-primary)_0%,_transparent_60%)] opacity-20 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] mix-blend-overlay" />
      </div>

      <div className="relative z-10">
        {/* Hero */}
        <section className="pt-32 md:pt-48 pb-20 px-4">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-[var(--radius-pill)] bg-card border border-border text-sm text-text-secondary mb-4 shadow-xl"
            >
              <span className="w-2 h-2 rounded-[var(--radius-pill)] bg-success animate-pulse"></span>
              Deploy by Kontyra is now in Beta
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-6xl md:text-8xl font-bold tracking-tighter leading-[1.1] bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-zinc-500"
            >
              Your frontend cloud.
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl md:text-2xl text-text-secondary max-w-2xl mx-auto leading-relaxed"
            >
              Build, deploy, and scale the best web experiences with zero configuration.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
            >
              <Link 
                to="/register" 
                className="w-full sm:w-auto px-8 py-3.5 bg-white text-black hover:bg-zinc-200 font-medium rounded-md transition-colors flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(255,255,255,0.2)]"
              >
                Start Deploying <ArrowRight className="h-4 w-4" />
              </Link>
              <Link 
                to="/docs" 
                className="w-full sm:w-auto px-8 py-3.5 bg-card text-text-primary font-medium rounded-md hover:bg-zinc-800 border border-border transition-colors"
              >
                Read Documentation
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Develop, Preview, Ship Tabs */}
        <section className="px-4 pb-32 pt-12">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row border border-border rounded-2xl overflow-hidden bg-surface/50 backdrop-blur-sm shadow-2xl">
              
              {/* Tabs Sidebar */}
              <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-border p-6 flex flex-col gap-2 bg-card/30">
                {(['develop', 'preview', 'ship'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`text-left px-6 py-4 rounded-xl transition-all ${
                      activeTab === tab 
                        ? 'bg-primary/10 border border-primary/20 text-text-primary shadow-[inset_0_0_20px_rgba(109,40,217,0.1)]' 
                        : 'text-text-secondary hover:bg-white/5 hover:text-text-primary border border-transparent'
                    }`}
                  >
                    <h3 className="font-semibold text-lg capitalize mb-1">{tabContent[tab].title}</h3>
                    <p className="text-sm opacity-80 leading-relaxed hidden md:block">{tabContent[tab].description}</p>
                  </button>
                ))}
              </div>

              {/* Tab Content (Terminal) */}
              <div className="w-full md:w-2/3 p-8 flex flex-col justify-center bg-[#0a0a0a]">
                <div className="border border-border rounded-xl overflow-hidden bg-black shadow-2xl h-64 flex flex-col">
                  <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                    </div>
                    <div className="mx-auto text-xs font-mono text-zinc-500 capitalize">~/{activeTab}</div>
                  </div>
                  <div className="p-6 font-mono text-sm text-zinc-300 flex-1 overflow-y-auto">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="whitespace-pre-wrap leading-relaxed"
                      >
                        {tabContent[activeTab].code}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Bento Box Features */}
        <section className="py-32 px-4 relative">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Everything you need to ship.</h2>
              <p className="text-text-secondary text-lg max-w-2xl mx-auto">A complete platform built for modern frontend teams.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
              
              {/* Large Bento Box 1 */}
              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="md:col-span-2 rounded-3xl border border-border bg-surface p-8 flex flex-col justify-between relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 space-y-4 max-w-md">
                  <div className="h-12 w-12 rounded-2xl bg-card border border-border flex items-center justify-center shadow-lg">
                    <Github className="h-6 w-6 text-text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">Push to deploy</h3>
                  <p className="text-text-secondary leading-relaxed">
                    Connect your GitHub repository and we'll automatically deploy your code on every push. Zero configuration required.
                  </p>
                </div>
                <div className="absolute right-0 bottom-0 translate-y-12 translate-x-12 opacity-50 group-hover:opacity-100 transition-all duration-500">
                  <Terminal className="w-64 h-64 text-border" strokeWidth={0.5} />
                </div>
              </motion.div>

              {/* Small Bento Box 1 */}
              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="rounded-3xl border border-border bg-surface p-8 flex flex-col justify-between relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-card border border-border flex items-center justify-center shadow-lg">
                    <Globe className="h-6 w-6 text-text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Global Edge</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    Your site is instantly distributed across 35+ regions worldwide.
                  </p>
                </div>
              </motion.div>

              {/* Small Bento Box 2 */}
              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="rounded-3xl border border-border bg-surface p-8 flex flex-col justify-between relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-tl from-success/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-card border border-border flex items-center justify-center shadow-lg">
                    <Zap className="h-6 w-6 text-text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Instant Rollbacks</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    Revert to any previous deployment instantly if something goes wrong.
                  </p>
                </div>
              </motion.div>

              {/* Large Bento Box 2 */}
              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="md:col-span-2 rounded-3xl border border-border bg-surface p-8 flex flex-col justify-between relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-bl from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 space-y-4 max-w-md">
                  <div className="h-12 w-12 rounded-2xl bg-card border border-border flex items-center justify-center shadow-lg">
                    <Layers className="h-6 w-6 text-text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">Previews for every PR</h3>
                  <p className="text-text-secondary leading-relaxed">
                    Collaborate flawlessly. Every pull request automatically gets a unique preview URL to share with your team.
                  </p>
                </div>
                <div className="absolute right-0 bottom-0 translate-y-8 translate-x-8 opacity-50 group-hover:opacity-100 transition-all duration-500">
                  <Code className="w-64 h-64 text-border" strokeWidth={0.5} />
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-32 px-4 border-t border-border bg-black relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-primary)_0%,_transparent_50%)] opacity-10" />
          <div className="max-w-3xl mx-auto text-center space-y-8 relative z-10">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight">Ready to ship?</h2>
            <p className="text-xl text-text-secondary mb-8">Deploy your first project in under 2 minutes.</p>
            <Link 
              to="/register" 
              className="inline-flex h-14 items-center justify-center rounded-md bg-white px-10 text-base font-medium text-black transition-colors hover:bg-zinc-200 shadow-2xl"
            >
              Start Deploying for Free
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
