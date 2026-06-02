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
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectOAuth = async () => {
    setIsConnectingOAuth(true);
    setOauthError(null);
    try {
      let ruri = "";
      if (redirectUriMode === "omit") {
        ruri = "omit";
      } else if (redirectUriMode === "dev") {
        ruri = "https://ais-dev-23alz57aos6vikqk5vw7qo-83508965727.europe-west1.run.app/auth/callback";
      } else if (redirectUriMode === "pre") {
        ruri = "https://ais-pre-23alz57aos6vikqk5vw7qo-83508965727.europe-west1.run.app/auth/callback";
      }

      const fetchUrl = ruri ? `/api/auth/github/url?redirect_uri=${encodeURIComponent(ruri)}` : "/api/auth/github/url";
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
      }
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

            {!profile.githubUsername && isConfigured === true && (
              <div className="space-y-4">
                {/* Callback Mode Select with Premium Gradient styling */}
                <div className="bg-[#0b1222]/60 border border-slate-800/80 rounded-2xl p-4 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-[11px] text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <GitBranch className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Configure Callback Redirection</span>
                    </p>
                    <span className="text-[9px] bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      GitHub App Setup
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Select which callback URL parameter is sent to your GitHub App authorize link. If you configured exactly one endpoint in your developer settings (like the Shared Preview URL), click **Omit Parameter** to let GitHub fallback automatically:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                    {[
                      {
                        id: 'auto',
                        title: 'Auto-detect Route',
                        desc: 'Detects and matches your current page origin dynamically',
                      },
                      {
                        id: 'omit',
                        title: 'Omit Parameter',
                        desc: 'Recommends default App registration URL (Bypasses errors)',
                        highlight: true
                      },
                      {
                        id: 'dev',
                        title: 'Force Sandbox URL',
                        desc: 'Force strict developer sandbox environment callback',
                      },
                      {
                        id: 'pre',
                        title: 'Force Preview URL',
                        desc: 'Force strict public shared preview environment callback',
                      },
                    ].map((opt) => {
                      const isSelected = redirectUriMode === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setRedirectUriMode(opt.id as any)}
                          className={`relative text-left p-3 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden group ${
                            isSelected
                              ? 'bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                              : 'bg-slate-950/40 border-slate-900/80 hover:bg-[#0c1328]/55 hover:border-slate-800'
                          }`}
                        >
                          {opt.highlight && (
                            <span className="absolute top-0 right-0 text-[8px] bg-cyan-400 text-slate-950 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-bl font-sans">
                              BEST
                            </span>
                          )}
                          <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-cyan-400' : 'text-slate-200 group-hover:text-white'}`}>
                            {opt.title}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-snug group-hover:text-slate-400">{opt.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isConnectingOAuth}
                  onClick={handleConnectOAuth}
                  className="w-full bg-gradient-to-r from-cyan-950/30 to-indigo-950/30 border border-slate-800 hover:border-cyan-400/30 hover:bg-slate-800 text-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.1)] font-bold py-3.5 px-4 rounded-xl font-mono text-xs transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isConnectingOAuth ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Authenticating Secure Pop-up...</span>
                    </>
                  ) : (
                    <>
                      <Github className="h-4 w-4" />
                      <span>Authenticate with GitHub</span>
                    </>
                  )}
                </button>
                {oauthError && (
                  <p className="text-[11px] text-rose-450 font-mono text-center">{oauthError}</p>
                )}

                <div className="bg-[#050810]/65 border border-slate-800/80 rounded-xl p-4 space-y-3 font-mono text-xs text-slate-400 font-sans">
                  <p className="font-bold text-slate-355 flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-amber-400 font-mono">
                    <Laptop className="h-3.5 w-3.5" />
                    <span>Active App Callback URL configuration</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-450">Current expected route matching selection:</p>
                  <div className="bg-slate-900 px-3 py-2.5 rounded border border-slate-800 text-cyan-400 font-mono text-[10px] select-all break-all whitespace-pre-wrap leading-normal font-mono">
                    {redirectUriMode === 'omit' ? 'Omit parameter (fall back to GitHub App configuration)' : 
                     redirectUriMode === 'dev' ? 'https://ais-dev-23alz57aos6vikqk5vw7qo-83508965727.europe-west1.run.app/auth/callback' :
                     redirectUriMode === 'pre' ? 'https://ais-pre-23alz57aos6vikqk5vw7qo-83508965727.europe-west1.run.app/auth/callback' :
                     detectedCallbackUrl || (
                       !window.location.hostname.endsWith('.run.app') && window.location.hostname !== 'localhost'
                         ? `${window.location.origin}/api/github/callback`
                         : `${window.location.origin}/auth/callback`
                     )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    💡 **Setup Hint**: You can define multiple callback URLs by putting them on new lines in your GitHub App settings (e.g. for both Dev and Shared Previews).
                  </p>
                </div>
              </div>
            )}

            {isConfigured === false && !profile.githubUsername && (
              <div className="space-y-4 pt-2">
                <div className="bg-[#050810]/80 border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs text-slate-400">
                  <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-2">
                    <Laptop className="h-3.5 w-3.5" />
                    <span>GitHub App Parameters Required</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">Configure your custom GitHub App credentials inside AI Studio's settings to securely access and trigger deployment sources.</p>
                  <div className="space-y-1.5 text-[10px] bg-slate-950/50 p-3 rounded-lg border border-slate-900 leading-relaxed overflow-y-auto">
                    <p className="font-bold text-slate-305">📋 GitHub App Setup Instructions:</p>
                    <p>1. Go to <a href="https://github.com/settings/apps" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">GitHub Apps Developer Settings</a> & click **New GitHub App** or edit your existing one.</p>
                    <p>2. Set the **Callback URL** field (under the "Identifying and authorizing users" section) to the routes below. **Note**: Enter **both** URLs on separate lines in the field so both your Dev sandbox and Shared previews are allowed, avoiding the `redirect_uri` mismatch warning:</p>
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-slate-300 select-all font-mono whitespace-pre-wrap break-all my-1.5 text-[9px] leading-normal font-mono">
{`https://ais-dev-23alz57aos6vikqk5vw7qo-83508965727.europe-west1.run.app/auth/callback
https://ais-pre-23alz57aos6vikqk5vw7qo-83508965727.europe-west1.run.app/auth/callback${
  !window.location.hostname.endsWith('.run.app') && window.location.hostname !== 'localhost'
    ? `\n${window.location.origin}/api/github/callback`
    : ''
}`}
                    </div>
                    <p>3. Under **Permissions**, grant **Repository permissions** (e.g. Metadata: Read-only, Contents: Read-only) so user pipelines can read branch sources.</p>
                    <p>4. Save changes and copy **Client ID** and generate a new **Client Secret**.</p>
                    <p>5. Enter them in your AI Studio app secrets settings:</p>
                    <p className="text-cyan-400">GITHUB_CLIENT_ID</p>
                    <p className="text-cyan-400">GITHUB_CLIENT_SECRET</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <p className="text-[10px] text-slate-500 font-mono mb-2 uppercase tracking-wide">Developer Sandbox Manual Mapping</p>
                  <form onSubmit={handleUpdateGithub} className="flex gap-3">
                    <div className="relative flex-grow">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 font-mono text-xs font-bold">@</span>
                      <input
                        type="text"
                        required
                        placeholder="github-username"
                        value={gitUsername}
                        onChange={(e) => setGitUsername(e.target.value.replace(/[^a-zA-Z0-9\-]/g, ''))}
                        className="w-full bg-[#050810] border border-slate-800 rounded-xl pl-7 pr-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isUpdatingGit || !gitUsername.trim()}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-cyan-400 font-bold px-5 py-3 rounded-xl font-mono text-xs transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {isUpdatingGit ? <RefreshCw className="h-4 w-4 animate-spin" /> : successGit ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : 'Connect'}
                    </button>
                  </form>
                </div>
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
