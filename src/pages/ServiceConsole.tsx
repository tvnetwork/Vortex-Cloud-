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
  GitBranch
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

  const [activeTab, setActiveTab] = useState<'logs' | 'shell' | 'scaling'>('logs');

  // DB Shell / API client state
  const [shellInput, setShellInput] = useState('');
  const [shellLogs, setShellLogs] = useState<{ cmd: string; result: string; timestamp: string }[]>([
    { cmd: '-- Shell system online --', result: 'Ready to receive directives.', timestamp: new Date().toLocaleTimeString() }
  ]);

  // Terminal scroll helper
  const terminalEndRef = useRef<HTMLDivElement>(null);

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

    // Simulated step compiler
    const buildSteps = [
      '✓ Production server compilation completed. Size: 1.2 MB',
      '⚙ Injecting platform environment shared keys...',
      '✓ Environment verified. Zero errors.',
      '⚙ Deploying workload to Edge CDN edge nodes: FRA1, NRT1, SFO2',
      '✓ SSL registration success. Domain verified: TLS 1.3',
      '✓ Deployment cycle executed successfully! Container cluster online.'
    ];

    let currentStepIndex = 0;
    const interval = setInterval(async () => {
      const freshSnap = await getDoc(devRef);
      if (freshSnap.exists()) {
        const curLogs = freshSnap.data().logs || [];
        const nextStep = `[${new Date().toLocaleTimeString()}] ${buildSteps[currentStepIndex]}`;
        const newLogsList = [...curLogs, nextStep];

        if (currentStepIndex === buildSteps.length - 1) {
          // Finish build
          await updateDoc(devRef, { status: 'active', logs: newLogsList });
          await updateDoc(svcRef, { status: 'active' });
          clearInterval(interval);
        } else {
          await updateDoc(devRef, { logs: newLogsList });
          currentStepIndex++;
        }
      }
    }, 1500);
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
              <p className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-slate-500" />
                <span>Endpoint: </span>
                <span className="text-cyan-400 select-all">{service.domain}</span>
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
            ) : (
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
                  <span className="text-slate-500 bg-slate-900 py-3.5 pl-4 pr-1 font-bold">{'>'}</span>
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
                    className="flex-grow bg-transparent text-slate-200 outline-none px-2 py-3 placeholder-slate-600"
                  />
                  <button type="submit" className="bg-slate-900 hover:bg-slate-800 transition-colors pr-4 pl-3 py-3 text-cyan-400">
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
