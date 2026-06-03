import React, { useState } from 'react';
import { Book, Terminal, Globe, Lock, Code, Zap, Search, ChevronRight, FileText, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Docs() {
  const [searchQuery, setSearchQuery] = useState('');

  const sections = [
    {
      title: "Getting Started",
      icon: <Zap className="h-4 w-4" />,
      items: ["Introduction", "Quickstart", "Supported Frameworks", "Deploying Code"]
    },
    {
      title: "Deployments",
      icon: <Terminal className="h-4 w-4" />,
      items: ["Build Process", "Deployment History", "Rollbacks", "Ignored Files"]
    },
    {
      title: "Domains",
      icon: <Globe className="h-4 w-4" />,
      items: ["Custom Domains", "DNS Records", "SSL Certificates", "Redirects"]
    },
    {
      title: "Environment Variables",
      icon: <Lock className="h-4 w-4" />,
      items: ["System Variables", "Custom Secrets", "Environments"]
    },
    {
      title: "Kontyra CLI",
      icon: <Code className="h-4 w-4" />,
      items: ["Installation", "Commands", "Authentication"]
    }
  ];

  const popularDocs = [
    { title: "How to deploy a React App", desc: "A step-by-step guide to deploying Vite or Create React App." },
    { title: "Custom Domains Setup", desc: "Configure your DNS records and provision an SSL certificate." },
    { title: "Environment Variables", desc: "Manage your production and preview secrets securely." },
    { title: "GitHub Integration", desc: "Automate your deployments on every git push." }
  ];

  return (
    <div className="min-h-screen bg-background text-text-primary pt-14 flex flex-col md:flex-row">
      
      {/* Sidebar Desktop */}
      <aside className="w-72 border-r border-border hidden md:flex flex-col h-[calc(100vh-3.5rem)] sticky top-14 bg-background/50 backdrop-blur-xl z-20">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border rounded-md pl-9 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-8">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-3">
              <h4 className="font-semibold text-sm text-text-primary flex items-center gap-2">
                <span className="text-muted">{section.icon}</span>
                {section.title}
              </h4>
              <ul className="space-y-1 border-l border-border ml-2 pl-3">
                {section.items.map((item, iIdx) => (
                  <li key={iIdx}>
                    <a href="#" className="block py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-3.5rem)] scroll-smooth">
        <div className="max-w-4xl mx-auto px-6 py-12 md:py-20 lg:px-12 space-y-16">
          
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Documentation</h1>
              <p className="text-lg text-text-secondary leading-relaxed max-w-2xl">
                Everything you need to know about deploying and scaling your web applications on the Deploy by Kontyra edge network.
              </p>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {popularDocs.map((doc, idx) => (
              <a key={idx} href="#" className="group p-6 rounded-2xl border border-border bg-surface hover:border-zinc-500 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-text-primary flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted" />
                      {doc.title}
                    </h3>
                    <p className="text-sm text-text-secondary">{doc.desc}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted group-hover:text-text-primary transition-colors translate-x-0 group-hover:translate-x-1" />
                </div>
              </a>
            ))}
          </motion.div>

          <hr className="border-border" />

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="space-y-8"
          >
            <h2 className="text-2xl font-bold tracking-tight">Explore the Platform</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sections.map((section, idx) => (
                <div key={idx} className="p-6 rounded-2xl border border-border bg-background relative overflow-hidden group">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-bl-full translate-x-16 -translate-y-16 group-hover:bg-primary/10 transition-colors" />
                  <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center mb-6 text-text-primary shadow-sm">
                    {section.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{section.title}</h3>
                  <p className="text-sm text-text-secondary mb-6">
                    Learn everything about configuring and optimizing your {section.title.toLowerCase()}.
                  </p>
                  <a href="#" className="inline-flex items-center text-sm font-medium text-text-primary hover:text-primary transition-colors">
                    Read more <ArrowRight className="h-4 w-4 ml-1" />
                  </a>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-1">Need help?</h3>
              <p className="text-sm text-text-secondary">Can't find what you're looking for? Reach out to our community.</p>
            </div>
            <Link to="/community" className="px-6 py-2.5 bg-primary text-text-primary rounded-md font-medium text-sm hover:bg-secondary transition-colors whitespace-nowrap">
              Visit Community
            </Link>
          </div>

        </div>
      </main>

    </div>
  );
}
