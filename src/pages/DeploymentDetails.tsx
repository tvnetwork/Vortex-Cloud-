import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Terminal, 
  Database, 
  Globe,
  ExternalLink,
  CheckCircle2,
  RefreshCcw,
  Activity,
  Cpu,
  MoreVertical,
  Check
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
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Deployment, Metric } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DeploymentDetails() {
  const { deploymentId } = useParams<{ deploymentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [metric, setMetric] = useState<Metric | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'logs' | 'shell' | 'domains' | 'metrics'>('logs');

  const [customDomainInput, setCustomDomainInput] = useState('');
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);

  const [shellInput, setShellInput] = useState('');
  const [shellLogs, setShellLogs] = useState<{ cmd: string; result: string; timestamp: string }[]>([
    { cmd: '-- Shell system online --', result: 'Ready.', timestamp: new Date().toLocaleTimeString() }
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const buildIntervalRef = useRef<any>(null);
  const startedAuto = useRef<string | null>(null);

  const startBuildSimulation = (svcId: string, deployId: string) => {
    if (buildIntervalRef.current) return;

    const devRef = doc(db, 'deployments', deployId);
    const svcRef = doc(db, 'deployments', svcId);

    const buildSteps = [
      'Building project...',
      'Installing dependencies...',
      'Creating production build...',
      'Deploying to edge nodes...',
      'Deployment complete.'
    ];

    let currentStepIndex = 0;
    buildIntervalRef.current = setInterval(async () => {
      const freshSnap = await getDoc(devRef);
      if (freshSnap.exists()) {
        const curLogs = freshSnap.data().logs || [];
        const nextStep = `[${new Date().toLocaleTimeString()}] ${buildSteps[currentStepIndex]}`;
        const newLogsList = [...curLogs, nextStep];

        if (currentStepIndex === buildSteps.length - 1) {
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
    }, 1500);
  };

  useEffect(() => {
    if (deployment && deployment && deployment.status === 'deploying' && startedAuto.current !== deployment.id) {
      startedAuto.current = deployment.id;
      startBuildSimulation(deployment.id, deployment.id);
    }
  }, [deployment?.status, deployment?.id]);

  useEffect(() => {
    return () => {
      if (buildIntervalRef.current) clearInterval(buildIntervalRef.current);
    };
  }, []);

  const handleAddCustomDomain = async () => {
    if (!customDomainInput.trim() || !deployment) return;

    if (!customDomainInput.includes('.') || customDomainInput.length < 5) {
      setDomainError('Invalid domain format.');
      return;
    }

    try {
      const svcRef = doc(db, 'deployments', deployment.id);
      await updateDoc(svcRef, {
        customDomain: customDomainInput.toLowerCase().trim(),
        customDomainStatus: 'pending'
      });
      setCustomDomainInput('');
      setDomainError(null);
    } catch (e) {
      setDomainError('Failed to save domain.');
    }
  };

  const handleVerifyCustomDomain = async () => {
    if (!deployment) return;
    setIsVerifyingDomain(true);
    setDomainError(null);

    setTimeout(async () => {
      try {
        const svcRef = doc(db, 'deployments', deployment.id);
        const verifiedDomain = deployment.customDomain || 'custom.deploy.kontyra.name.ng';
        await updateDoc(svcRef, {
          customDomainStatus: 'verified',
          domain: verifiedDomain,
          endpoint: `https://${verifiedDomain}`
        });

        if (deployment) {
          const devRef = doc(db, 'deployments', deployment.id);
          const freshSnap = await getDoc(devRef);
          if (freshSnap.exists()) {
            const curLogs = freshSnap.data().logs || [];
            await updateDoc(devRef, {
              logs: [...curLogs, `[${new Date().toLocaleTimeString()}] Domain verified: ${verifiedDomain}`]
            });
          }
        }

        setIsVerifyingDomain(false);
      } catch (e) {
        setDomainError('Verification failed. DNS records not found.');
        setIsVerifyingDomain(false);
      }
    }, 2000);
  };

  const handleDeleteCustomDomain = async () => {
    if (!deployment) return;
    try {
      const svcRef = doc(db, 'deployments', deployment.id);
      const randId = Math.random().toString(36).substring(2, 7);
      const hostName = `${deployment.name.toLowerCase()}-${randId}.deploy.kontyra.name.ng`;
      
      await updateDoc(svcRef, {
        customDomain: null,
        customDomainStatus: null,
        domain: hostName,
        endpoint: `https://${hostName}`
      });
    } catch (e) {}
  };

  useEffect(() => {
    if (!user || !deploymentId) return;

    const deploymentRef = doc(db, 'deployments', deploymentId);
    const unsubDeployment = onSnapshot(deploymentRef, (snap) => {
      if (snap.exists() && snap.data().ownerId === user.uid) {
        setDeployment({ id: snap.id, ...snap.data() } as Deployment);
      } else {
        navigate('/dashboard');
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `deployments/${deploymentId}`);
    });

    const qMetrics = query(collection(db, 'metrics'), where('deploymentId', '==', deploymentId), where('ownerId', '==', user.uid));
    const unsubMetrics = onSnapshot(qMetrics, (snap) => {
      if (!snap.empty) {
        setMetric({ id: snap.docs[0].id, ...snap.docs[0].data() } as Metric);
      }
    });

    return () => {
      unsubDeployment();
      unsubMetrics();
    };
  }, [user, deploymentId]);

  useEffect(() => {
    if (activeTab === 'logs') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [deployment?.logs, activeTab]);

  const handleRedeploy = async () => {
    if (!deployment || !deployment) return;

    const devRef = doc(db, 'deployments', deployment.id);
    const svcRef = doc(db, 'deployments', deployment.id);

    await updateDoc(svcRef, { status: 'deploying' });
    await updateDoc(devRef, { 
      status: 'deploying',
      logs: [
        `[${new Date().toLocaleTimeString()}] Triggering manual redeployment...`,
      ]
    });

    if (buildIntervalRef.current) clearInterval(buildIntervalRef.current);
    startedAuto.current = deployment.id;
    startBuildSimulation(deployment.id, deployment.id);
  };

  const handleShellCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shellInput.trim() || !deployment) return;

    const cmd = shellInput.trim();
    let result = '';

    if (deployment.type === 'postgres') {
      result = cmd.toLowerCase().includes('select') ? '1 row retrieved.' : 'Command executed.';
    } else if (deployment.type === 'redis') {
      result = cmd.toLowerCase().includes('set') ? 'OK' : 'nil';
    } else {
      result = 'HTTP 200 OK';
    }

    setShellLogs(prev => [...prev, { cmd, result, timestamp: new Date().toLocaleTimeString() }]);
    setShellInput('');
  };

  const handleLoadMetricsTest = async () => {
    if (!metric) return;
    const updatedTimes = [...metric.timestamps, Date.now()].slice(-15);
    const updatedCpu = [...metric.cpu, Math.floor(Math.random() * 60) + 20].slice(-15);
    const updatedRam = [...metric.ram, Math.floor(Math.random() * 200) + 100].slice(-15);
    const updatedBandwidth = [...metric.bandwidth, Math.floor(Math.random() * 1000) + 500].slice(-15);

    await updateDoc(doc(db, 'metrics', metric.id), {
      timestamps: updatedTimes,
      cpu: updatedCpu,
      ram: updatedRam,
      bandwidth: updatedBandwidth,
      updatedAt: serverTimestamp()
    });
  };

  if (loading || !deployment) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-[var(--radius-pill)] h-8 w-8 border-b-2 border-zinc-500" />
      </div>
    );
  }

  const isDatabase = deployment.type === 'postgres' || deployment.type === 'redis';
  const chartData = metric ? metric.timestamps.map((t, i) => ({
    time: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    CPU: metric.cpu[i] || 0,
    RAM: metric.ram[i] || 0
  })) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 min-h-screen">
      <Link 
        to={`/project/${deployment.projectId}`} 
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Project</span>
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-[var(--radius-pill)] border border-border bg-background flex items-center justify-center">
            {isDatabase ? <Database className="h-5 w-5 text-zinc-300" /> : <Terminal className="h-5 w-5 text-zinc-300" />}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{deployment.name}</h1>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-[var(--radius-pill)] capitalize ${
                deployment.status === 'active' ? 'bg-card text-zinc-300 border border-border' :
                deployment.status === 'deploying' ? 'bg-blue-900/30 text-info border border-blue-900/50' :
                'bg-red-900/30 text-red-400 border border-red-900/50'
              }`}>
                {deployment.status}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-text-secondary">
              <a 
                href={deployment.endpoint && deployment.endpoint.startsWith('http') ? deployment.endpoint : `https://${deployment.domain}`}
                target="_blank" 
                rel="noreferrer"
                className="hover:text-text-primary transition-colors flex items-center gap-1"
              >
                {deployment.domain} <ExternalLink className="h-3 w-3" />
              </a>
              {deployment.repository && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>{deployment.repository}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleRedeploy}
          disabled={deployment.status === 'deploying'}
          className="bg-primary text-text-primary hover:bg-secondary hover:bg-zinc-200 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCcw className={`h-4 w-4 ${deployment.status === 'deploying' && 'animate-spin'}`} />
          Redeploy
        </button>
      </div>

      <div className="border-b border-border mb-8">
        <nav className="-mb-px flex gap-6">
          {(['logs', 'metrics', 'shell', ...(!isDatabase ? ['domains'] : [])] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab 
                  ? 'border-white text-text-primary' 
                  : 'border-transparent text-text-secondary hover:text-text-secondary hover:border-text-secondary'
              }`}
            >
              {tab === 'shell' ? (isDatabase ? 'Database Console' : 'Console') : tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-background border border-border rounded-[var(--radius-card)] overflow-hidden min-h-[500px] flex flex-col">
        {activeTab === 'logs' && (
          <div className="flex-1 flex flex-col font-mono text-sm">
            <div className="bg-surface border-b border-border px-4 py-3 text-muted text-xs flex justify-between">
              <span>Build & Runtime Logs</span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-[var(--radius-pill)] bg-success" />
                Live
              </span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-1.5 text-zinc-300">
              {deployment?.logs ? (
                deployment.logs.map((log, i) => (
                  <div key={i} className="whitespace-pre-wrap">{log}</div>
                ))
              ) : (
                <div className="text-zinc-600">Waiting for logs...</div>
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="p-6 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-text-primary">Usage Metrics</h3>
              <button onClick={handleLoadMetricsTest} className="text-xs text-text-secondary hover:text-text-primary border border-border px-3 py-1.5 rounded-md transition-colors">
                Simulate Traffic
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-border rounded-md p-4">
                <h4 className="text-sm font-medium text-text-secondary mb-4">CPU Usage (%)</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <Tooltip contentStyle={{ background: '#000', border: '1px solid #27272a', borderRadius: '6px' }} />
                      <Line type="monotone" dataKey="CPU" stroke="#fff" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="border border-border rounded-md p-4">
                <h4 className="text-sm font-medium text-text-secondary mb-4">Memory Usage (MB)</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <Tooltip contentStyle={{ background: '#000', border: '1px solid #27272a', borderRadius: '6px' }} />
                      <Line type="monotone" dataKey="RAM" stroke="#a1a1aa" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'shell' && (
          <div className="flex-1 flex flex-col font-mono text-sm">
            <div className="bg-surface border-b border-border px-4 py-3 text-muted text-xs">
              Interactive Console
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4 text-zinc-300 max-h-[400px]">
              {shellLogs.map((log, i) => (
                <div key={i} className="space-y-1">
                  {log.cmd && <div className="text-muted">$ {log.cmd}</div>}
                  <div className="text-text-primary">{log.result}</div>
                </div>
              ))}
            </div>
            <form onSubmit={handleShellCommand} className="border-t border-border p-2 flex">
              <span className="text-muted px-3 py-2">$</span>
              <input
                type="text"
                value={shellInput}
                onChange={e => setShellInput(e.target.value)}
                placeholder="Enter command..."
                className="flex-1 bg-transparent text-text-primary outline-none font-mono"
              />
            </form>
          </div>
        )}

        {activeTab === 'domains' && (
          <div className="p-6 flex-1 max-w-3xl">
            <h3 className="text-lg font-medium text-text-primary mb-2">Domains</h3>
            <p className="text-sm text-text-secondary mb-8">Manage custom domains assigned to this deployment.</p>

            <div className="space-y-6">
              {!deployment.customDomain ? (
                <div className="border border-border rounded-md p-6">
                  <h4 className="text-sm font-medium text-text-primary mb-4">Add Custom Domain</h4>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="mywebsite.com"
                      value={customDomainInput}
                      onChange={e => setCustomDomainInput(e.target.value)}
                      className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-zinc-500 transition-colors"
                    />
                    <button
                      onClick={handleAddCustomDomain}
                      className="bg-primary text-text-primary hover:bg-secondary px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-200 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {domainError && <p className="text-sm text-error mt-2">{domainError}</p>}
                </div>
              ) : (
                <div className="border border-border rounded-md overflow-hidden">
                  <div className="p-4 flex justify-between items-center bg-surface border-b border-border">
                    <span className="font-medium text-text-primary">{deployment.customDomain}</span>
                    <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-[var(--radius-pill)] bg-card border border-border">
                      {deployment.customDomainStatus === 'verified' ? (
                        <><Check className="h-3 w-3 text-success" /> Valid Configuration</>
                      ) : (
                        <><AlertCircle className="h-3 w-3 text-warning" /> Invalid Configuration</>
                      )}
                    </span>
                  </div>

                  {deployment.customDomainStatus !== 'verified' && (
                    <div className="p-6 space-y-6">
                      <div className="space-y-2 text-sm">
                        <p className="text-text-primary font-medium">Please configure your DNS records:</p>
                        <div className="bg-background border border-border rounded-md p-3 font-mono text-zinc-300">
                          Type: CNAME <br/>
                          Name: @ <br/>
                          Value: cname.deploy.kontyra.name.ng
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleVerifyCustomDomain}
                          disabled={isVerifyingDomain}
                          className="bg-primary text-text-primary hover:bg-secondary px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
                        >
                          {isVerifyingDomain ? 'Verifying...' : 'Verify'}
                        </button>
                        <button
                          onClick={handleDeleteCustomDomain}
                          className="px-4 py-2 text-error text-sm font-medium hover:bg-red-950/30 rounded-md transition-colors border border-transparent hover:border-red-900"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

                  {deployment.customDomainStatus === 'verified' && (
                    <div className="p-4 border-t border-border bg-background flex justify-end">
                       <button
                          onClick={handleDeleteCustomDomain}
                          className="text-error text-sm font-medium hover:underline"
                        >
                          Remove Domain
                        </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
