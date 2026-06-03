import React, { useState } from 'react';
import { 
  Github, 
  Terminal, 
  Key, 
  Mail, 
  CheckCircle,
  Trash2,
  RefreshCw,
  Laptop
} from 'lucide-react';
import { useAuth } from '../App';

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
      if (!isSameOrigin && !isSandboxOrigin) return;

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const username = event.data.githubUsername;
        const accessToken = event.data.githubAccessToken;
        if (username) {
          setIsConnectingOAuth(true);
          try {
            if (accessToken) localStorage.setItem('github_access_token', accessToken);
            await updateGithub(username);
            setGitUsername(username);
            setSuccessGit(true);
            setTimeout(() => setSuccessGit(false), 3000);
          } catch (e) {
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
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleConnectOAuth = async () => {
    setIsConnectingOAuth(true);
    setOauthError(null);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
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

      let attempts = 0;
      const maxAttempts = 120;
      pollIntervalRef.current = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setIsConnectingOAuth(false);
          setOauthError('Authentication connection timed out. Please try again.');
          return;
        }

        try {
          const statusRes = await fetch(`/api/auth/github/status?uid=${user.uid}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.connected) {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

              const username = statusData.githubUsername;
              const accessToken = statusData.githubAccessToken;

              if (accessToken) localStorage.setItem('github_access_token', accessToken);

              await updateGithub(username);
              setGitUsername(username);
              setSuccessGit(true);
              setIsConnectingOAuth(false);

              try {
                if (authWindow && !authWindow.closed) authWindow.close();
              } catch (_) {}

              setTimeout(() => setSuccessGit(false), 3000);
            }
          }
        } catch (pollErr) {}
      }, 1500);

    } catch (err: any) {
      setOauthError('Failed to fetch authentication endpoint');
      setIsConnectingOAuth(false);
    }
  };

  const [sshKeys, setSshKeys] = useState<{ id: string; label: string; keyFingerprint: string }[]>([
    { id: '1', label: 'Local MacBook Pro Key', keyFingerprint: 'SHA256:4t7fW/wX7/yBqQySclT+7dY66vE/8A/a5HhC9d0Z1Fw' }
  ]);
  const [sshLabel, setSshLabel] = useState('');
  const [sshValue, setSshValue] = useState('');

  const [apiTokens, setApiTokens] = useState<{ id: string; label: string; token: string }[]>([
    { id: 't1', label: 'CLI Deployment Token', token: 'vk_live_81a63c8f8b801a6b0c6aeb21' }
  ]);
  const [tokenLabel, setTokenLabel] = useState('');

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

  const handleDeleteSsh = (id: string) => setSshKeys(prev => prev.filter(k => k.id !== id));

  const handleAddToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenLabel.trim()) return;
    const fakeToken = `vk_live_${Array(24).fill(null).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    setApiTokens(prev => [
      ...prev,
      { id: Date.now().toString(), label: tokenLabel.trim(), token: fakeToken }
    ]);
    setTokenLabel('');
  };

  const handleDeleteToken = (id: string) => setApiTokens(prev => prev.filter(t => t.id !== id));

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen space-y-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="text-sm text-zinc-400">Manage your personal account settings and integrations.</p>
      </div>

      <div className="space-y-8">
        <div className="border border-zinc-800 rounded-lg overflow-hidden bg-black">
          <div className="p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Terminal className="h-full w-full p-4 text-zinc-500" />
              )}
            </div>
            <div className="space-y-1 text-center md:text-left">
              <h2 className="text-xl font-medium text-white">{profile.displayName}</h2>
              <div className="flex items-center gap-2 text-sm text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-md border border-zinc-800 w-fit mx-auto md:mx-0">
                <Mail className="h-4 w-4" />
                <span>{profile.email}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border border-zinc-800 rounded-lg bg-black overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Github className="h-5 w-5" />
              GitHub Integration
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <p className="text-sm text-zinc-400">
              Link your GitHub account to enable automated deployments and repository synchronization.
            </p>
            
            {profile.githubUsername ? (
              <div className="flex items-center justify-between p-4 border border-zinc-800 rounded-md bg-zinc-900">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-white">@{profile.githubUsername}</p>
                    <p className="text-xs text-zinc-500">Connected</p>
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
                  className="text-sm text-red-500 hover:text-red-400 font-medium"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  type="button"
                  disabled={isConnectingOAuth}
                  onClick={handleConnectOAuth}
                  className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 font-medium py-2.5 px-4 rounded-md text-sm transition-colors flex items-center gap-2"
                >
                  {isConnectingOAuth ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" /> Connecting...</>
                  ) : (
                    <><Github className="h-4 w-4" /> Connect with GitHub</>
                  )}
                </button>
                {oauthError && <p className="text-sm text-red-500">{oauthError}</p>}
                {isConfigured === false && (
                  <p className="text-sm text-yellow-500">
                    GitHub OAuth App credentials are not configured.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border border-zinc-800 rounded-lg bg-black overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Tokens
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <p className="text-sm text-zinc-400">
              Personal API tokens to interact with the Vortex platform programmatically.
            </p>
            <form onSubmit={handleAddToken} className="flex gap-3">
              <input
                type="text"
                required
                placeholder="Token Name (e.g. CLI)"
                value={tokenLabel}
                onChange={(e) => setTokenLabel(e.target.value)}
                className="flex-1 bg-black border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
              />
              <button type="submit" className="bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                Create Token
              </button>
            </form>
            <div className="space-y-3">
              {apiTokens.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 border border-zinc-800 rounded-md">
                  <div className="truncate pr-4">
                    <p className="text-sm font-medium text-white">{t.label}</p>
                    <p className="text-xs text-zinc-500 font-mono truncate select-all">{t.token}</p>
                  </div>
                  <button onClick={() => handleDeleteToken(t.id)} className="text-zinc-500 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border border-zinc-800 rounded-lg bg-black overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Laptop className="h-5 w-5" />
              SSH Keys
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <p className="text-sm text-zinc-400">
              Add SSH keys to securely connect to your project environments.
            </p>
            <form onSubmit={handleAddSsh} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Key Name"
                value={sshLabel}
                onChange={(e) => setSshLabel(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
              />
              <textarea
                required
                rows={3}
                placeholder="ssh-ed25519 AAAAC3N..."
                value={sshValue}
                onChange={(e) => setSshValue(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-zinc-500 resize-none"
              />
              <div className="flex justify-end">
                <button type="submit" className="bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                  Add SSH Key
                </button>
              </div>
            </form>
            <div className="space-y-3 pt-4 border-t border-zinc-800">
              {sshKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-3 border border-zinc-800 rounded-md">
                  <div className="truncate pr-4">
                    <p className="text-sm font-medium text-white">{key.label}</p>
                    <p className="text-xs text-zinc-500 font-mono truncate">{key.keyFingerprint}</p>
                  </div>
                  <button onClick={() => handleDeleteSsh(key.id)} className="text-zinc-500 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
