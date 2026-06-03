import React from 'react';
import { Link } from 'react-router-dom';
import { Triangle, ArrowRight, Github, Globe, Zap, Check } from 'lucide-react';

export default function Home() {
  return (
    <div className="bg-black text-white min-h-screen font-sans selection:bg-zinc-800 selection:text-white">
      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-400 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Deploy by Kontyra is now in Beta
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
            Develop. Preview. Ship.
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Deploy by Kontyra is the frontend cloud. Build and deploy the best web experiences with the framework of your choice.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link 
              to="/register" 
              className="w-full sm:w-auto px-8 py-3 bg-white text-black font-medium rounded-md hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
            >
              Start Deploying <ArrowRight className="h-4 w-4" />
            </Link>
            <Link 
              to="/docs" 
              className="w-full sm:w-auto px-8 py-3 bg-zinc-900 text-white font-medium rounded-md hover:bg-zinc-800 border border-zinc-800 transition-colors"
            >
              Read Documentation
            </Link>
          </div>
        </div>
      </section>

      {/* Code Demo / Terminal visual */}
      <section className="px-4 pb-32">
        <div className="max-w-4xl mx-auto border border-zinc-800 rounded-xl overflow-hidden bg-black shadow-2xl">
          <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
              <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
              <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
            </div>
            <div className="mx-auto text-xs font-mono text-zinc-400">~/deploy-by-kontyra</div>
          </div>
          <div className="p-6 font-mono text-sm space-y-4">
            <p className="text-zinc-300"><span className="text-zinc-500">$</span> git push origin main</p>
            <div className="text-zinc-500 space-y-1">
              <p>Counting objects: 3, done.</p>
              <p>Delta compression using up to 10 threads.</p>
              <p>Compressing objects: 100% (3/3), done.</p>
              <p>Writing objects: 100% (3/3), 324 bytes | 324.00 KiB/s, done.</p>
              <p>Total 3 (delta 2), reused 0 (delta 0)</p>
            </div>
            <p className="text-zinc-300"><span className="text-blue-400">Kontyra Deploy</span> Starting build...</p>
            <p className="text-green-400">✓ Build completed in 1.2s</p>
            <p className="text-white">Deployed to https://project.apps.kontyra.name.ng</p>
          </div>
        </div>
      </section>

      {/* Features Outline */}
      <section className="py-24 border-t border-zinc-900 bg-zinc-950 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">The ultimate deployment pipeline</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">Everything you need to build, deploy, and scale modern web applications.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-lg bg-black border border-zinc-800 flex items-center justify-center">
                <Github className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold">Git Integration</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">Connect your repository. Push code to deploy instantly. Every PR generates a live preview.</p>
            </div>
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-lg bg-black border border-zinc-800 flex items-center justify-center">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold">Edge Network</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">Your content is served from the global edge, ensuring the lowest latency for your users everywhere.</p>
            </div>
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-lg bg-black border border-zinc-800 flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold">Zero Config</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">We automatically detect your framework and configure the optimal build settings. Just push code.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-4 border-t border-zinc-900">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Scale your application, not your infrastructure.</h2>
          <Link 
            to="/register" 
            className="inline-flex h-12 items-center justify-center rounded-md bg-white px-8 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
          >
            Start Deploying for Free
          </Link>
        </div>
      </section>
    </div>
  );
}
