import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Github, 
  Terminal, 
  Key, 
  Mail, 
  CheckCircle,
  Plus,
  Trash2,
  RefreshCw,
  GitBranch,
  Laptop
} from 'lucide-react';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';

export default function Profile() {
  const { user, profile, updateGithub } = useAuth();
  const [gitUsername, setGitUsername] = useState(profile?.githubUsername || '');
  const [isUpdatingGit, setIsUpdatingGit] = useState(false);
  const [successGit, setSuccessGit] = useState(false);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [detectedCallbackUrl, setDetectedCallbackUrl] = useState<string>('');
  const [redirectUriMode, setRedirectUriMode] = useState<'auto' | 'dev' | 'pre' | 'omit'>('auto');
  const pollIntervalRef = React.useRef<any>(null);

  React.useEffect(() => {
    // Check configuration status initially
    fetch("/api/auth/github/url")
      .then(res => res.json())
      .then(data => {
        setIsConfigured(!!data.configured);
        if (data.redirectUri) {
          setDetectedCallbackUrl(data.redirectUri);
        }
      })
      .catch((_) => setIsConfigured(false));

    const handleMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      const isSameOrigin = origin === window.location.origin;
      const isSandboxOrigin = origin.endsWith('.run.app') || origin.includes('localhost');
      if (!isSameOrigin && !isSandboxOrigin) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const username = event.data.githubUsername;
        const accessToken = event.data.githubAccessToken;
        if (username) {
          setIsConnectingOAuth(true);
          try {
            if (accessToken) {
              localStorage.setItem('github_access_token', accessToken);
            }
            await updateGithub(username);
            setGitUsername(username);
            setSuccessGit(true);
            setTimeout(() => setSuccessGit(false), 3000);
          } catch (e) {
            console.error(e);
            setOauthError('Failed to save authenticated profile to database');
          } finally {
            setIsConnectingOAuth(false);
          }
        }
      } else if (event.data?.type === 'OAUTH_AUTH_FAILED') {
        setOauthError(event.data.error || 'GitHub connection was aborted.');
        setIsConnectingOAuth(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleConnectOAuth = async () => {
    setIsConnectingOAuth(true);
    setOauthError(null);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    try {
      let ruri = "";
      if (redirectUriMode === "omit") {
        ruri = "omit";
      } else if (redirectUriMode === "dev") {
        ruri = "https://ais-dev-23alz57aos6vikqk5vw7qo-83508965727.europe-west1.run.app/auth/callback";
      } else if (redirectUriMode === "pre") {
        ruri = "https://ais-pre-23alz57aos6vikqk5vw7qo-83508965727.europe-west1.run.app/auth/callback";
      }

      const params = new URLSearchParams();
      if (ruri) params.append("redirect_uri", ruri);
      if (user?.uid) params.append("uid", user.uid);

      const fetchUrl = `/api/auth/github/url?${params.toString()}`;
      const res = await fetch(fetchUrl);
      const data = await res.json();
      if (!data.configured) {
        setIsConfigured(false);
        setIsConnectingOAuth(false);
        return;
      }
      setIsConfigured(true);

      const authWindow = window.open(
        data.url,
        'github_oauth_popup',
        'width=600,height=720,status=no,resizable=yes'
      );

      if (!authWindow) {
        setOauthError('Popup blocker prevented authentication. Please allow popups.');
        setIsConnectingOAuth(false);
        return;
      }

      // Start polling for connection status mapping
      let attempts = 0;
      const maxAttempts = 120; // 3 minutes total
      pollIntervalRef.current = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsConnectingOAuth(false);
          setOauthError('Authentication connection timed out. Please try again.');
          return;
        }

        try {
          const statusRes = await fetch(`/api/auth/github/status?uid=${user.uid}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.connected) {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }

              const username = statusData.githubUsername;
              const accessToken = statusData.githubAccessToken;

              if (accessToken) {
                localStorage.setItem('github_access_token', accessToken);
              }

              await updateGithub(username);
              setGitUsername(username);
              setSuccessGit(true);
              setIsConnectingOAuth(false);

              try {
                if (authWindow && !authWindow.closed) {
                  authWindow.close();
                }
              } catch (_) {}

              setTimeout(() => setSuccessGit(false), 3000);
            }
          }
        } catch (pollErr) {
          console.error("Error polling connection status:", pollErr);
        }
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setOauthError('Failed to fetch authentication endpoint');
      setIsConnectingOAuth(false);
    }
  };

  // SSH keys
  const [sshKeys, setSshKeys] = useState<{ id: string; label: string; keyFingerprint: string }[]>([
    { id: '1', label: 'Local MacBook Pro Key', keyFingerprint: 'SHA256:4t7fW/wX7/yBqQySclT+7dY66vE/8A/a5HhC9d0Z1Fw' }
  ]);
  const [sshLabel, setSshLabel] = useState('');
  const [sshValue, setSshValue] = useState('');

  // API Tokens
  const [apiTokens, setApiTokens] = useState<{ id: string; label: string; token: string }[]>([
    { id: 't1', label: 'GitHub Build hook pipeline token', token: 'vx_live_tkn_81a63c8f8b801a6b0c6aeb21' }
  ]);
  const [tokenLabel, setTokenLabel] = useState('');

  const handleUpdateGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gitUsername.trim()) return;

    setIsUpdatingGit(true);
    try {
      await updateGithub(gitUsername.trim());
      setSuccessGit(true);
      setTimeout(() => setSuccessGit(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingGit(false);
    }
  };

  const handleAddSsh = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sshLabel.trim() || !sshValue.trim()) return;

    const fakeFingerprint = `SHA256:${Array(43).fill(null).map(() => Math.random().toString(36)[2]).join('')}`;
    setSshKeys(prev => [
      ...prev,
      { id: Date.now().toString(), label: sshLabel.trim(), keyFingerprint: fakeFingerprint }
    ]);
    setSshLabel('');
    setSshValue('');
  };

  const handleDeleteSsh = (id: string) => {
    setSshKeys(prev => prev.filter(k => k.id !== id));
  };

  const handleAddToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenLabel.trim()) return;

    const fakeToken = `vx_live_tkn_${Array(24).fill(null).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    setApiTokens(prev => [
      ...prev,
      { id: Date.now().toString(), label: tokenLabel.trim(), token: fakeToken }
    ]);
    setTokenLabel('');
  };

  const handleDeleteToken = (id: string) => {
    setApiTokens(prev => prev.filter(t => t.id !== id));
  };

  if (!user || !profile) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#050810]">
        <div className="flex flex-col items-center gap-4">
          <Terminal className="h-8 w-8 text-cyan-400 animate-spin" />
          <p className="text-xs text-slate-500 font-mono tracking-widest">Constructing diagnostic sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 min-h-screen space-y-12">
      {/* Profile summary banner */}
      <div className="bg-[#0b1222]/50 border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row items-center gap-6 shadow-lg">
        <div className="h-20 w-20 rounded-full bg-slate-800 border border-slate-700/80 overflow-hidden relative ring-4 ring-cyan-400/10">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <Terminal className="h-full w-full p-5 text-cyan-400" />
          )}
        </div>

        <div className="space-y-1 text-center md:text-left flex-grow">
          <h2 className="text-xl font-bold font-heading text-white">{profile.displayName}</h2>
          <p className="text-xs text-slate-400 font-mono flex items-center gap-1 bg-[#050810] px-3 py-1.5 rounded-lg border border-slate-900 w-fit self-center md:self-stretch">
            <Mail className="h-3.5 w-3.5 text-indigo-400 inline" />
            <span>Developer account bound: </span>
            <strong className="text-slate-300">{profile.email}</strong>
          </p>
        </div>

        <div className="flex gap-2 shrink-0 font-mono text-xs text-slate-400">
          <span className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full">
            Tier: Standard Dev
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side settings: GitHub, tokens */}
        <div className="lg:col-span-7 space-y-8">
          {/* GitHub configuration form */}
          <div className="bg-gradient-to-br from-[#0c1328]/80 to-[#070b14]/90 border border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-44 h-44 bg-cyan-500/5 rounded-full blur-[60px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[60px] pointer-events-none" />

            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-sm tracking-wide text-white font-heading flex items-center gap-2">
                  <Github className="h-4 w-4 text-cyan-400" />
                  <span>Real-time GitHub Integration</span>
                </h3>
                <p className="text-slate-400 text-xs">Authenticate your developer account to unlock branch trigger pipelines, file-tree synchronization, and live container deployment matching.</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-mono font-bold tracking-wider ${
                profile.githubUsername 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" 
                  : "bg-slate-800 text-slate-500 border border-slate-700/50"
              }`}>
                {profile.githubUsername ? 'ACTIVE' : 'DISCONNECTED'}
              </span>
            </div>

            {profile.githubUsername && (
              <div className="bg-[#050810] border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-mono">Linked Node Identifier</p>
                    <p className="text-xs text-white font-bold font-mono">@{profile.githubUsername}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setIsConnectingOAuth(true);
                    localStorage.removeItem('github_access_token');
                    await updateGithub('');
                    setGitUsername('');
                    setIsConnectingOAuth(false);
                  }}
                  className="text-slate-400 hover:text-rose-450 font-mono text-xs transition-colors p-1.5 cursor-pointer bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-rose-400/30 rounded-lg py-1 px-3"
                >
                  Disconnect Node
                </button>
              </div>
            )}

            {!profile.githubUsername && (
              <div className="space-y-4 pt-2">
                <button
                  type="button"
                  disabled={isConnectingOAuth}
                  onClick={handleConnectOAuth}
                  className="w-full bg-gradient-to-r from-cyan-500/20 via-indigo-500/15 to-purple-500/20 border border-slate-700/50 hover:border-cyan-400 text-cyan-300 hover:text-white hover:shadow-[0_0_20px_rgba(34,211,238,0.25)] font-bold py-4 px-6 rounded-xl font-heading text-xs uppercase tracking-wide transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  {isConnectingOAuth ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                      <span>Requesting secure connection...</span>
                    </>
                  ) : (
                    <>
                      <Github className="h-5 w-5" />
                      <span>Authenticate with GitHub</span>
                    </>
                  )}
                </button>
                {oauthError && (
                  <p className="text-[11px] text-rose-400 font-mono text-center bg-rose-500/5 border border-rose-500/15 p-3 rounded-xl mt-2 leading-relaxed">
                    ⚠️ {oauthError}
                  </p>
                )}
                {isConfigured === false && (
                  <p className="text-[11px] text-amber-400 font-mono text-center bg-amber-500/5 border border-amber-500/15 p-4 rounded-xl mt-2 leading-relaxed">
                    💡 <strong>GitHub Client Parameters Required</strong>: Please configure your <code>GITHUB_CLIENT_ID</code> and <code>GITHUB_CLIENT_SECRET</code> variables inside your AI Studio APP secrets configuration to connect.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* API Keys and pipeline settings */}
          <div className="bg-[#0b1222]/30 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="space-y-1 pb-4 border-b border-slate-800/60">
              <h3 className="font-bold text-sm tracking-wide text-white font-heading flex items-center gap-2">
                <Key className="h-4 w-4 text-cyan-400" />
                <span>IDE API Deployment Tokens</span>
              </h3>
              <p className="text-slate-400 text-xs">Generate secrets to allow terminal push integrations through Vortex-CLI.</p>
            </div>

            <form onSubmit={handleAddToken} className="flex gap-3">
              <input
                type="text"
                required
                placeholder="Token Label (e.g. Local Web IDE)"
                value={tokenLabel}
                onChange={(e) => setTokenLabel(e.target.value)}
                className="flex-grow bg-[#050810] border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40"
              />
              <button
                type="submit"
                className="bg-cyan-400 hover:bg-cyan-300 text-[#050810] font-bold px-5 py-3 rounded-xl text-xs transition-colors shrink-0"
              >
                + Generate Key
              </button>
            </form>

            <div className="space-y-2 font-mono text-xs">
              {apiTokens.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3.5 bg-slate-950/80 rounded-xl border border-slate-900"
                >
                  <div className="space-y-1 block max-w-[80%]">
                    <p className="font-bold text-slate-300">{t.label}</p>
                    <p className="text-slate-500 select-all font-mono truncate">{t.token}</p>
                  </div>

                  <button
                    onClick={() => handleDeleteToken(t.id)}
                    className="text-slate-500 hover:text-red-400 p-1.5 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: SSH Keys panel */}
        <div className="lg:col-span-5 bg-[#0b1222]/30 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="space-y-1 pb-4 border-b border-slate-800">
            <h3 className="font-bold text-sm tracking-wide text-white font-heading flex items-center gap-2">
              <Laptop className="h-4 w-4 text-indigo-400" />
              <span>Platform SSH Keys</span>
            </h3>
            <p className="text-slate-400 text-xs">Authorize SSH credentials to push directly to Vortex Container Registry.</p>
          </div>

          <form onSubmit={handleAddSsh} className="space-y-3">
            <input
              type="text"
              required
              placeholder="Key label (e.g. MacBook Pro M3)"
              value={sshLabel}
              onChange={(e) => setSshLabel(e.target.value)}
              className="w-full bg-[#050810] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40"
            />
            <textarea
              required
              rows={3}
              placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQD..."
              value={sshValue}
              onChange={(e) => setSshValue(e.target.value)}
              className="w-full bg-[#050810] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 resize-none font-mono"
            />
            <button
              type="submit"
              className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-cyan-400 font-bold py-3 rounded-xl font-mono text-xs transition-colors uppercase tracking-wider"
            >
              Add SSH Public Key
            </button>
          </form>

          <div className="space-y-2 pt-4 border-t border-slate-800/60 font-mono text-xs">
            {sshKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-900 rounded-xl"
              >
                <div className="space-y-1 block max-w-[80%]">
                  <p className="font-bold text-indigo-400">{key.label}</p>
                  <p className="text-slate-500 select-all font-mono truncate">{key.keyFingerprint}</p>
                </div>

                <button
                  onClick={() => handleDeleteSsh(key.id)}
                  className="text-slate-400 hover:text-red-400 p-1.5 transition-colors"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
