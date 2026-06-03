import React from 'react';
import { Book, Terminal, Globe, Lock, Code, Zap } from 'lucide-react';

export default function Docs() {
  const sections = [
    {
      title: "Getting Started",
      icon: <Zap className="h-5 w-5" />,
      items: ["Introduction", "Quickstart", "Frameworks", "Deploying Code"]
    },
    {
      title: "Deployments",
      icon: <Terminal className="h-5 w-5" />,
      items: ["Build Process", "Deployment History", "Rollbacks", "Ignored Files"]
    },
    {
      title: "Domains",
      icon: <Globe className="h-5 w-5" />,
      items: ["Custom Domains", "DNS Records", "SSL Certificates", "Redirects"]
    },
    {
      title: "Environment Variables",
      icon: <Lock className="h-5 w-5" />,
      items: ["System Variables", "Custom Secrets", "Environments"]
    },
    {
      title: "Kontyra CLI",
      icon: <Code className="h-5 w-5" />,
      items: ["Installation", "Commands", "Authentication"]
    }
  ];

  return (
    <div className="min-h-screen bg-background text-text-primary pt-14 border-t border-border">
      <div className="max-w-7xl mx-auto flex">
        
        {/* Sidebar */}
        <aside className="w-64 border-r border-border hidden lg:block h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto p-6">
          <div className="space-y-8">
            {sections.map((section, idx) => (
              <div key={idx} className="space-y-3">
                <h4 className="font-medium text-sm text-text-primary flex items-center gap-2">
                  {section.icon}
                  {section.title}
                </h4>
                <ul className="space-y-2 border-l border-border ml-2.5 pl-4">
                  {section.items.map((item, iIdx) => (
                    <li key={iIdx}>
                      <a href="#" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
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
        <main className="flex-1 p-8 lg:p-12">
          <div className="max-w-3xl space-y-8">
            <h1 className="text-4xl font-bold tracking-tight">Documentation</h1>
            <p className="text-lg text-text-secondary">
              Learn how to deploy your applications with Deploy by Kontyra.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
              {sections.map((section, idx) => (
                <div key={idx} className="border border-border rounded-[var(--radius-modal)] p-6 bg-surface/50 hover:bg-card transition-colors cursor-pointer">
                  <div className="h-10 w-10 rounded-[var(--radius-card)] bg-card border border-border flex items-center justify-center mb-4 text-text-primary">
                    {section.icon}
                  </div>
                  <h3 className="text-lg font-medium text-text-primary mb-2">{section.title}</h3>
                  <p className="text-sm text-text-secondary">Explore guides and references for {section.title.toLowerCase()}.</p>
                </div>
              ))}
            </div>
          </div>
        </main>

      </div>
    </div>
  );
}
