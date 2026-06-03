import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Terminal, 
  Database, 
  RefreshCw, 
  Cpu, 
  Layers, 
  Play, 
  Send,
  Zap,
  Clock,
  Code2,
  Lock,
  Globe,
  HardDrive,
  GitBranch,
  ExternalLink,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../App';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp, 
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Service, Deployment, Metric } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ServiceConsole() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [service, setService] = useState<Service | null>(null);
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [metric, setMetric] = useState<Metric | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'logs' | 'shell' | 'domains' | 'scaling'>('logs');

  // Custom Domain management states
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);

  // DB Shell / API client state
  const [shellInput, setShellInput] = useState('');
  const [shellLogs, setShellLogs] = useState<{ cmd: string; result: string; timestamp: string }[]>([
    { cmd: '-- Shell system online --', result: 'Ready to receive directives.', timestamp: new Date().toLocaleTimeString() }
  ]);

  // Terminal scroll helper
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const buildSteps = [
    '✓ Production server compilation completed. Size: 1.2 MB',
    '⚙ Injecting platform environment shared keys...',
    '✓ Environment verified. Zero errors.',
    '⚙ Deploying workload to Edge CDN edge nodes: FRA1, NRT1, SFO2',
    '✓ SSL registration success. Domain verified: TLS 1.3',
    '✓ Deployment cycle executed successfully! Container cluster online.'
  ];

  const buildIntervalRef = useRef<any>(null);
  const startedAuto = useRef<string | null>(null);

  const startBuildSimulation = (svcId: string, deployId: string) => {
    if (buildIntervalRef.current) return;

    const devRef = doc(db, 'deployments', deployId);
    const svcRef = doc(db, 'services', svcId);

    let currentStepIndex = 0;
    buildIntervalRef.current = setInterval(async () => {
      const freshSnap = await getDoc(devRef);
      if (freshSnap.exists()) {
        const curLogs = freshSnap.data().logs || [];
        const nextStep = `[${new Date().toLocaleTimeString()}] ${buildSteps[currentStepIndex]}`;
        const newLogsList = [...curLogs, nextStep];

        if (currentStepIndex === buildSteps.length - 1) {
          // Finish build
          await updateDoc(devRef, { status: 'active', logs: newLogsList });
          await updateDoc(svcRef, { status: 'active' });
          if (buildIntervalRef.current) {
            clearInterval(buildIntervalRef.current);
            buildIntervalRef.current = null;
          }
        } else {
          await updateDoc(devRef, { logs: newLogsList });
          currentStepIndex++;
        }
      } else {
        if (buildIntervalRef.current) {
          clearInterval(buildIntervalRef.current);
          buildIntervalRef.current = null;
        }
      }
    }, 1200);
  };

  // Automatic build stream trigger for newly deployed services
  useEffect(() => {
    if (service && deployment && service.status === 'deploying' && startedAuto.current !== service.id) {
      startedAuto.current = service.id;
      startBuildSimulation(service.id, deployment.id);
    }
  }, [service?.status, deployment?.id]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (buildIntervalRef.current) {
        clearInterval(buildIntervalRef.current);
      }
    };
  }, []);

  const handleAddCustomDomain = async () => {
    if (!customDomainInput.trim() || !service) return;

    if (!customDomainInput.includes('.') || customDomainInput.length < 5) {
      setDomainError('Please enter a valid developer domain reference (e.g., example.com).');
      return;
    }

    try {
      const svcRef = doc(db, 'services', service.id);
      await updateDoc(svcRef, {
        customDomain: customDomainInput.toLowerCase().trim(),
        customDomainStatus: 'pending'
      });
      setCustomDomainInput('');
      setDomainError(null);
    } catch (e) {
      console.error(e);
      setDomainError('Could not sync custom domain with Firestore backend.');
    }
  };

  const handleVerifyCustomDomain = async () => {
    if (!service) return;
    setIsVerifyingDomain(true);
    setDomainError(null);

    setTimeout(async () => {
      try {
        const svcRef = doc(db, 'services', service.id);
        const verifiedDomain = service.customDomain || 'custom.vortex.dev';
        await updateDoc(svcRef, {
          customDomainStatus: 'verified',
          domain: verifiedDomain,
          endpoint: `https://${verifiedDomain}`
        });

        // Append routing success to deployment logs to make it feel rich and integrated
        if (deployment) {
          const devRef = doc(db, 'deployments', deployment.id);
          const freshSnap = await getDoc(devRef);
          if (freshSnap.exists()) {
            const curLogs = freshSnap.data().logs || [];
            const nextStep = `[${new Date().toLocaleTimeString()}] ✓ Custom Domain DNS Bind success: https://${verifiedDomain}`;
            await updateDoc(devRef, {
              logs: [...curLogs, nextStep]
            });
          }
        }

        setIsVerifyingDomain(false);
      } catch (e) {
        console.error(e);
        setDomainError('Verification failed. TXT verification code did not resolve.');
        setIsVerifyingDomain(false);
      }
    }, 2000);
  };

  const handleDeleteCustomDomain = async () => {
    if (!service) return;
    if (!window.confirm('Are you sure you want to delete this custom domain mapping? The preview URL will revert to standard vortex host.')) return;

    try {
      const svcRef = doc(db, 'services', service.id);
      const randId = Math.random().toString(36).substring(2, 7);
      const hostName = `${service.name.toLowerCase()}-${randId}.vortex.dev`;
      const originalEndpoint = `https://${hostName}`;

      await updateDoc(svcRef, {
        customDomain: null,
        customDomainStatus: null,
        domain: hostName,
        endpoint: originalEndpoint
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!user || !serviceId) return;

    // Fetch deep service details
    const serviceRef = doc(db, 'services', serviceId);
    const unsubService = onSnapshot(serviceRef, (snap) => {
      if (snap.exists() && snap.data().ownerId === user.uid) {
        setService({ id: snap.id, ...snap.data() } as Service);
      } else {
        navigate('/dashboard');
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `services/${serviceId}`);
    });

    // Real-time listen to deployment for logs
    const qDeployments = query(collection(db, 'deployments'), where('serviceId', '==', serviceId), where('ownerId', '==', user.uid));
    const unsubDeployments = onSnapshot(qDeployments, (snap) => {
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        setDeployment({ id: docSnap.id, ...docSnap.data() } as Deployment);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'deployments');
    });

    // Real-time listen to metric
    const qMetrics = query(collection(db, 'metrics'), where('serviceId', '==', serviceId), where('ownerId', '==', user.uid));
    const unsubMetrics = onSnapshot(qMetrics, (snap) => {
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        setMetric({ id: docSnap.id, ...docSnap.data() } as Metric);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'metrics');
    });

    return () => {
      unsubService();
      unsubDeployments();
      unsubMetrics();
    };
  }, [user, serviceId]);

  // Scroll to bottom of build logs on update
  useEffect(() => {
    if (activeTab === 'logs') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [deployment?.logs, activeTab]);

  // Handle redeployment log simulation in the cloud
  const handleRedeploy = async () => {
    if (!service || !deployment) return;

    const devRef = doc(db, 'deployments', deployment.id);
    const svcRef = doc(db, 'services', service.id);

    // Update status to deploying
    await updateDoc(svcRef, { status: 'deploying' });
    await updateDoc(devRef, { 
      status: 'deploying',
      logs: [
        `[${new Date().toLocaleTimeString()}] CRON EXEC: Requesting standard environment spinup...`,
        `[VORTEX BUILD] Sourcing bundle tree...`,
        `[VORTEX BUILD] Executing: npm run build`,
        `[VORTEX BUILD] Compiling source components with TypeScript stripping...`
      ]
    });

    if (buildIntervalRef.current) {
      clearInterval(buildIntervalRef.current);
      buildIntervalRef.current = null;
    }
    startedAuto.current = service.id;
    startBuildSimulation(service.id, deployment.id);
  };

  // SQL Query / cache operations parsing
  const handleShellCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shellInput.trim() || !service) return;

    const cmd = shellInput.trim();
    let result = '';

    if (service.type === 'postgres') {
      if (cmd.toLowerCase().startsWith('select')) {
        const table = cmd.toLowerCase().includes('from users') ? 'users' : 'logs';
        result = JSON.stringify([
          { id: 1, name: 'Vortex API', status: 'Online', verified: true },
          { id: 2, name: 'Database Connector', status: 'Active', verified: false }
        ], null, 2);
      } else if (cmd.toLowerCase().startsWith('insert')) {
        result = 'INSERT 0 1 - Row successfully appended to workspace filesystem.';
      } else {
        result = `ERROR: Table or command reference does not exist in cluster DBMS schema. Try "SELECT * FROM users"`;
      }
    } else if (service.type === 'redis') {
      if (cmd.toLowerCase().startsWith('set')) {
        result = 'OK - Core Cache-Key compiled.';
      } else if (cmd.toLowerCase().startsWith('get')) {
        result = '"' + Math.random().toString(36).substring(7) + '"';
      } else {
        result = 'ERROR: Redis command invalid. Try: "SET mykey 100" or "GET mykey"';
      }
    } else {
      // API client
      if (cmd.toLowerCase().startsWith('get')) {
        result = `HTTP 200 OK\nHost: ${service.domain}\nPayload:\n{\n  "service": "${service.name}",\n  "uptime_sec": ${Math.floor(Math.random() * 50000)},\n  "nodes": ["FRA1", "SFO2"]\n}`;
      } else {
        result = `HTTP 400 BAD REQUEST - Supported method parameter: "GET /health" or "GET /users"`;
      }
    }

    setShellLogs(prev => [
      ...prev,
      { cmd, result, timestamp: new Date().toLocaleTimeString() }
    ]);
    setShellInput('');
  };

  // Trigger metrics benchmark test
  const handleLoadMetricsTest = async () => {
    if (!metric) return;

    const updatedTimes = [...metric.timestamps];
    const updatedCpu = [...metric.cpu];
    const updatedRam = [...metric.ram];
    const updatedBandwidth = [...metric.bandwidth];

    // Push new simulated traffic surge points
    updatedTimes.push(Date.now());
    updatedCpu.push(40 + Math.floor(Math.random() * 50)); // Surge of up to 90% CPU load
    updatedRam.push(120 + Math.floor(Math.random() * 80)); // Ram surge
    updatedBandwidth.push(800 + Math.floor(Math.random() * 1200));

    // Keep length bounded to 15 entries
    if (updatedTimes.length > 15) {
      updatedTimes.shift();
      updatedCpu.shift();
      updatedRam.shift();
      updatedBandwidth.shift();
    }

    await updateDoc(doc(db, 'metrics', metric.id), {
      timestamps: updatedTimes,
      cpu: updatedCpu,
      ram: updatedRam,
      bandwidth: updatedBandwidth,
      updatedAt: serverTimestamp()
    });
  };

  // Convert array datasets into chart format
  const getChartData = () => {
    if (!metric) return [];
    return metric.timestamps.map((t, idx) => ({
      time: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      CPU: metric.cpu[idx] || 0,
      RAM: metric.ram[idx] || 0,
      Bandwidth: metric.bandwidth[idx] || 0
    }));
  };

  const chartData = getChartData();

  if (loading || !service) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#050810]">
        <div className="flex flex-col items-center gap-4">
          <Terminal className="h-8 w-8 text-cyan-400 animate-spin" />
          <p className="text-xs text-slate-500 font-mono tracking-widest">Entering Performance Console...</p>
        </div>
      </div>
    );
  }

  const isDatabase = service.type === 'postgres' || service.type === 'redis';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 min-h-screen">
      {/* Back to Project Workspace */}
      <Link 
        to={`/project/${service.projectId}`} 
        className="inline-flex items-center gap-2 text-xs font-mono font-bold text-slate-400 hover:text-cyan-400 transition-colors mb-6 uppercase tracking-wider"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Workspace Config</span>
      </Link>

      {/* Service Header card */}
      <div className="bg-[#0b1222]/80 border border-slate-800 p-6 rounded-3xl shadow-lg relative overflow-hidden mb-10">
        <div className="absolute top-0 right-0 w-60 h-60 bg-gradient-to-tr from-cyan-500/10 to-indigo-500/10 rounded-full blur-[80px]" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 z-10 relative">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-cyan-400 inline-block">
                {isDatabase ? <Database className="h-5 w-5" /> : <Terminal className="h-5 w-5" />}
              </span>
              <h1 className="text-2xl font-extrabold font-heading text-white">{service.name}</h1>
              <span className={`text-xs font-mono px-3 py-1 rounded-full border ${
                service.status === 'active' 
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
                  : service.status === 'deploying'
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 animate-pulse'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {service.status === 'active' ? '● Online & Healthy' : '⚙ Rebuilding Node'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-slate-400">
              <p className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-slate-500" />
                <span>Endpoint: </span>
                {!isDatabase ? (
                  <a
                    href={service.endpoint && service.endpoint.startsWith('http') ? service.endpoint : `https://${service.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 select-all hover:underline flex items-center gap-1"
                  >
                    <span>{service.domain}</span>
                    <ExternalLink className="h-3 w-3 inline" />
                  </a>
                ) : (
                  <span className="text-cyan-400 select-all">{service.endpoint || service.domain}</span>
                )}
              </p>
              {service.repository && (
                <p className="flex items-center gap-1">
                  <GitBranch className="h-3.5 w-3.5 text-slate-500" />
                  <span>Git repo: </span>
                  <span className="text-indigo-400 select-all">{service.repository}</span>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleRedeploy}
            disabled={service.status === 'deploying'}
            className="w-full md:w-auto bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-bold px-6 py-3 rounded-xl shadow-md space-x-2 flex items-center justify-center gap-1 text-sm disabled:opacity-50 transition-all hover:opacity-95"
          >
            <RefreshCw className={`h-4 w-4 ${service.status === 'deploying' && 'animate-spin'}`} />
            <span>EXIGENT REDEPLOY</span>
          </button>
        </div>
      </div>

      {/* Main performance metrics grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left pane: dynamic Recharts monitoring */}
        <div className="lg:col-span-7 space-y-8">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
            <h2 className="text-lg font-bold font-heading text-white flex items-center gap-2">
              <Cpu className="h-5 w-5 text-indigo-400" />
              <span>Diagnostic Monitoring</span>
            </h2>

            <button
              onClick={handleLoadMetricsTest}
              className="text-cyan-400 border border-cyan-400/20 hover:border-cyan-400 hover:bg-cyan-400/5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all"
            >
              Simulate Core Load
            </button>
          </div>

          {chartData.length === 0 ? (
            <div className="bg-[#0b1222]/30 border border-slate-800 p-8 rounded-2xl text-center">
              <Clock className="h-6 w-6 text-slate-500 mx-auto mb-2 animate-pulse" />
              <p className="text-slate-500 font-mono text-xs">Waiting for metric collection interval to populate...</p>
            </div>
          ) : (
            <div className="space-y-6 font-mono text-xs">
              {/* CPU load chart */}
              <div className="bg-[#0b1222]/30 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-sm">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-bold">V8 CONTAINER LOAD (CPU)</span>
                  <span className="text-cyan-400 font-bold">{metric?.cpu[metric.cpu.length - 1] || 0}% CPU</span>
                </div>
                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="time" hide />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip contentStyle={{ background: '#090f1d', border: '1px solid #1e293b' }} />
                      <Line type="monotone" dataKey="CPU" stroke="#22d3ee" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Memory Usage */}
              <div className="bg-[#0b1222]/30 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-sm">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-bold">ALLOCATED MEMORY RAM</span>
                  <span className="text-indigo-400 font-bold">{metric?.ram[metric.ram.length - 1] || 0} MB</span>
                </div>
                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="time" hide />
                      <YAxis domain={[0, 512]} hide />
                      <Tooltip contentStyle={{ background: '#090f1d', border: '1px solid #1e293b' }} />
                      <Line type="monotone" dataKey="RAM" stroke="#6366f1" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right pane: Build terminal / Database shell client */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          {/* Navigation tabs */}
          <div className="flex bg-[#0b1222] border border-slate-800 p-1 rounded-xl self-start mb-2 font-mono text-xs">
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'logs' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Deploy Logs
            </button>
            <button
              onClick={() => setActiveTab('shell')}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'shell' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isDatabase ? 'DBMS Shell' : 'Response Playground'}
            </button>
            {!isDatabase && (
              <button
                onClick={() => setActiveTab('domains')}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  activeTab === 'domains' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Custom Domain
              </button>
            )}
          </div>

          <div className="flex-grow flex flex-col h-[380px] max-h-[380px]">
            {activeTab === 'logs' ? (
              /* Build compilation stdout stream terminal window */
              <div className="bg-slate-950 font-mono text-xs border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex-grow flex flex-col">
                <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between text-slate-500 select-none">
                  <span>vortex-compiler.stdout</span>
                  <span className="text-[#a855f7] animate-pulse">● stream active</span>
                </div>

                <div className="p-4 overflow-y-auto space-y-2 flex-grow scrollbar-hide text-slate-300 leading-relaxed selection:bg-cyan-500/35">
                  {deployment?.logs ? (
                    deployment.logs.map((logLine, idx) => (
                      <div key={idx} className="break-all">
                        {logLine}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-600">Initializing cluster log telemetry stream...</div>
                  )}
                  <div ref={terminalEndRef} />
                </div>
              </div>
            ) : activeTab === 'shell' ? (
              /* Interactive Sandbox Command shell terminal client */
              <div className="bg-slate-950 font-mono text-xs border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex-grow flex flex-col">
                <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between text-slate-500 select-none">
                  <span>{isDatabase ? `${service.type}.shell` : 'web-service_api_tester'}</span>
                  <span className="text-cyan-400">● core sandbox bound</span>
                </div>

                {/* Log Outputs scrolling list */}
                <div className="p-4 overflow-y-auto space-y-4 flex-grow text-slate-300 leading-relaxed selection:bg-cyan-400/35 max-h-[290px]">
                  {shellLogs.map((log, index) => (
                    <div key={index} className="space-y-1 block">
                      <div className="text-[10px] text-slate-500 font-mono tracking-widest">{log.timestamp}</div>
                      {log.cmd && <div className="text-indigo-400 font-semibold">{'>'} {log.cmd}</div>}
                      <pre className="text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-900 overflow-x-auto">
                        {log.result}
                      </pre>
                    </div>
                  ))}
                </div>

                {/* Form command input line */}
                <form onSubmit={handleShellCommand} className="flex border-t border-slate-800/80">
                  <span className="text-slate-550 bg-slate-900 py-3.5 pl-4 pr-1 font-bold">{'>'}</span>
                  <input
                    type="text"
                    value={shellInput}
                    onChange={(e) => setShellInput(e.target.value)}
                    placeholder={
                      service.type === 'postgres' 
                        ? 'SELECT * FROM users;' 
                        : service.type === 'redis'
                        ? 'SET value_one 420'
                        : 'GET /users'
                    }
                    className="flex-grow bg-transparent text-slate-200 outline-none px-2 py-3 placeholder-slate-600 font-mono"
                  />
                  <button type="submit" className="bg-slate-900 hover:bg-slate-800 transition-colors pr-4 pl-3 py-3 text-cyan-400">
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ) : (
              /* Custom Domain view panel */
              <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-5 flex-grow flex flex-col justify-between overflow-y-auto h-full text-slate-300">
                <div className="space-y-4">
                  <div className="border-b border-indigo-950 pb-2.5">
                    <p className="text-xs font-bold font-heading text-white">Custom Domain Management</p>
                    <p className="text-[10px] text-slate-500 font-sans mt-0.5">Route your professional apex domain or subdomains to point to this container port.</p>
                  </div>

                  {!service.customDomain ? (
                    <div className="space-y-3 pt-1">
                      <div className="space-y-1 font-mono">
                        <label className="text-[10px] text-slate-405 uppercase tracking-widest block font-bold">Add Custom Domain Reference</label>
                        <input
                          type="text"
                          placeholder="e.g. portfolio.com or app.mybrand.com"
                          value={customDomainInput}
                          onChange={(e) => {
                            setCustomDomainInput(e.target.value.toLowerCase().trim().replace(/[^a-z0-9\.\-]/g, ''));
                            setDomainError(null);
                          }}
                          className="w-full bg-[#050810] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40"
                        />
                      </div>
                      {domainError && (
                        <p className="text-[10px] text-rose-400 font-mono">⚠️ {domainError}</p>
                      )}
                      <button
                        type="button"
                        onClick={handleAddCustomDomain}
                        className="w-full bg-cyan-400 hover:bg-cyan-300 transition-colors text-[#050810] font-bold py-2.5 rounded-xl text-[11px] uppercase tracking-wider font-mono cursor-pointer"
                      >
                        + Bind Custom Domain
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Domain current status block */}
                      <div className="p-3.5 bg-slate-950/80 border border-slate-900 rounded-xl space-y-2">
                        <div className="flex justify-between items-center bg-[#070b14]/50 border border-slate-900/40 p-2.5 rounded-lg">
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Configured Domain</p>
                            <p className="text-xs font-bold text-white selection:bg-cyan-500/30 font-mono">{service.customDomain}</p>
                          </div>
                          <span className={`text-[9.5px] font-mono px-2 py-0.5 rounded border ${
                            service.customDomainStatus === 'verified'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                              : 'bg-amber-505/10 text-amber-300 border-amber-500/20 animate-pulse'
                          }`}>
                            {service.customDomainStatus === 'verified' ? '✓ Verified & Live' : '● DNS Probe Pending'}
                          </span>
                        </div>

                        {service.customDomainStatus !== 'verified' ? (
                          <div className="space-y-3 pt-1 text-[11px]">
                            {/* Verification guidelines */}
                            <div className="space-y-2 font-mono bg-slate-900/40 border border-slate-900 rounded-lg p-3 text-[10px] leading-relaxed text-slate-400">
                              <p className="text-slate-300 font-bold mb-1">🔌 Route DNS Settings</p>
                              <p className="text-[9px] text-slate-500 leading-normal">Configure the following settings in your domain registrar's DNS panel (e.g., Namecheap, Cloudflare, GoDaddy):</p>
                              
                              <div className="space-y-1 bg-slate-950 p-2 rounded border border-slate-900 select-all">
                                <p><span className="text-cyan-400">Type:</span> CNAME</p>
                                <p><span className="text-cyan-400">Host/Name:</span> {service.customDomain.includes('.') && !service.customDomain.endsWith('.com') ? service.customDomain.split('.')[0] : '@'}</p>
                                <p><span className="text-cyan-400">Value:</span> cname.vortex.dev</p>
                              </div>
                              <div className="space-y-1 bg-slate-950 p-2 rounded border border-slate-900 select-all">
                                <p><span className="text-indigo-400">Type:</span> TXT</p>
                                <p><span className="text-indigo-400">Host:</span> _vortex-challenge</p>
                                <p><span className="text-indigo-400">Value:</span> vx-challenge-{service.id.substring(0, 8)}</p>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={isVerifyingDomain}
                              onClick={handleVerifyCustomDomain}
                              className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-805 hover:border-slate-700 font-bold font-mono py-2.5 rounded-xl text-[10px] text-cyan-400 tracking-wider transition-colors flex items-center justify-center gap-2 uppercase cursor-pointer"
                            >
                              {isVerifyingDomain ? (
                                <>
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  <span>Probing DNS Servers...</span>
                                </>
                              ) : (
                                <span>Verify DNS Config</span>
                              )}
                            </button>
                            {domainError && <p className="text-[10px] text-center text-rose-400 font-mono mt-1">{domainError}</p>}
                          </div>
                        ) : (
                          <div className="bg-emerald-500/5 border border-emerald-500/15 p-3 rounded-lg flex items-start gap-2 text-[10px] leading-relaxed text-emerald-300/90 font-mono">
                            <span className="text-emerald-400 font-bold shrink-0">✓</span>
                            <span>Edge SSL handshakes validated. Edge Router nodes have fully cached your domain. Click on preview URL to view live.</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleDeleteCustomDomain}
                        className="text-red-400 hover:text-red-300 font-mono text-[10px] hover:underline font-bold"
                      >
                        Delete Custom Domain Mapping
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
