import "dotenv/config";
import express from "express";
import cors from "cors";
import ogs from "open-graph-scraper-lite";
import httpProxy from "http-proxy";
import portfinder from "portfinder";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";

const app = express();

// --- Routing Maps ---
// Maps deploymentId -> localhost port
const deploymentPorts = new Map<string, number>();

// Maps absolute domain (e.g., myapp-1.apps.kontyra.name.ng, shop.com) -> deploymentId
const domainToDeployment = new Map<string, string>();

// Create proxy server
const proxy = httpProxy.createProxyServer({
  ws: true,
  xfwd: true
});

proxy.on("error", (err, req, res) => {
  console.error("Proxy error:", err);
  if (res && (res as any).writeHead) {
    (res as any).writeHead(502, { "Content-Type": "text/plain" });
    (res as any).end("Bad Gateway - Service is down or starting");
  }
});

// Intercept middleware for reverse proxying
app.use((req, res, next) => {
  const host = req.headers.host;
  if (!host) return next();

  // Let API and dashboard requests pass through to Express
  if (
    host.startsWith("deploy.kontyra.name.ng") || 
    host.startsWith("localhost:") || 
    host.startsWith("127.0.0.1:") ||
    host.includes(".run.app")
  ) {
    // If it's an API route or auth route, pass it
    if (req.path.startsWith("/api") || req.path.startsWith("/auth")) {
      return next();
    }
  }

  // 1. Exact domain match
  let deploymentId = domainToDeployment.get(host);

  // 2. Fallback prefix matching for default platform URLs (*.apps.kontyra.name.ng, *.deploy.kontyra.name.ng)
  if (!deploymentId && (host.includes(".apps.kontyra.name.ng") || host.includes(".deploy.kontyra.name.ng") || host.includes(".vortex.dev"))) {
    const prefix = host.split(".")[0];
    // check if prefix is literally a deploymentId
    if (deploymentPorts.has(prefix)) {
      deploymentId = prefix;
    }
  }

  if (deploymentId) {
    const port = deploymentPorts.get(deploymentId);
    if (port) {
      return proxy.web(req, res, { target: `http://127.0.0.1:${port}` });
    }
  }

  // If it's a platform domain and not found, block it
  if (host.includes(".apps.kontyra.name.ng") || host.includes(".deploy.kontyra.name.ng")) {
    res.status(404).send("DEPLOYMENT_NOT_FOUND");
    return;
  }

  next();
});

// Store for pending OAuth connections mapped by Firebase UID
const pendingOAuthConnections = new Map<string, { username: string; token: string; timestamp: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [uid, conn] of pendingOAuthConnections.entries()) {
    if (now - conn.timestamp > 10 * 60 * 1000) {
      pendingOAuthConnections.delete(uid);
    }
  }
}, 5 * 60 * 1000);

app.use(cors());
app.use(express.json());

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/deploy", async (req, res) => {
  // subdomain is deprecated, using deploymentId instead
  const { repoUrl, subdomain, deploymentId } = req.body;
  
  const targetId = deploymentId || subdomain;
  if (!repoUrl || !targetId) {
    return res.status(400).json({ error: "repoUrl and deploymentId are required" });
  }

  try {
    const port = await portfinder.getPortPromise();
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `vortex-${targetId}-`));
    
    // Auto-map the default deploy URL
    domainToDeployment.set(`${targetId}.apps.kontyra.name.ng`, targetId);
    // Backwards compatibility
    domainToDeployment.set(`${targetId}.deploy.kontyra.name.ng`, targetId);

    // Respond immediately
    res.json({ 
      message: "Deployment started", 
      deploymentId: targetId, 
      port, 
      workDir,
      url: `${targetId}.apps.kontyra.name.ng`
    });

    console.log(`[Deploy] Cloning ${repoUrl} to ${workDir}`);
    const cloneProcess = spawn("git", ["clone", repoUrl, "."], { cwd: workDir });
    
    cloneProcess.on("close", (code) => {
      if (code !== 0) return console.error(`Git clone failed for ${targetId}`);
      
      console.log(`[Deploy] Running npm install for ${targetId}`);
      const installProcess = spawn(/^win/.test(process.platform) ? "npm.cmd" : "npm", ["install"], { cwd: workDir });
      
      installProcess.on("close", (code) => {
        if (code !== 0) return console.error(`NPM install failed for ${targetId}`);
        
        console.log(`[Deploy] Starting app for ${targetId} on port ${port}`);
        const startProcess = spawn(/^win/.test(process.platform) ? "npm.cmd" : "npm", ["start"], { 
          cwd: workDir,
          env: { ...process.env, PORT: port.toString() } 
        });

        startProcess.stdout.on("data", (data) => console.log(`[${targetId}] ${data}`));
        startProcess.stderr.on("data", (data) => console.error(`[${targetId}] ${data}`));

        // Register the service port
        deploymentPorts.set(targetId, port);
        console.log(`[Deploy] ${targetId} is live on port ${port}`);
      });
    });

  } catch (error) {
    console.error("Deploy error:", error);
    res.status(500).json({ error: "Failed to initiate deployment" });
  }
});

app.post("/api/domains/map", (req, res) => {
  const { domain, deploymentId } = req.body;
  if (!domain || !deploymentId) {
    return res.status(400).json({ error: "domain and deploymentId are required" });
  }

  // Update proxy map in real-time
  domainToDeployment.set(domain, deploymentId);
  res.json({ success: true, message: `Mapped ${domain} -> ${deploymentId}` });
});

// OAuth code remains unchanged...
app.get("/api/auth/github/status", (req, res) => {
  const uid = req.query.uid as string;
  if (!uid) return res.status(400).json({ error: "uid required" });

  const connection = pendingOAuthConnections.get(uid);
  if (connection) {
    pendingOAuthConnections.delete(uid);
    return res.json({ connected: true, githubUsername: connection.username, githubAccessToken: connection.token });
  }
  res.json({ connected: false });
});

app.get("/api/auth/github/url", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.json({ configured: false });

  const customRedirectUri = req.query.redirect_uri as string;
  const uid = req.query.uid as string;

  let appUrl = process.env.APP_URL && process.env.APP_URL !== "MY_APP_URL" ? process.env.APP_URL.replace(/\/$/, "") : "";
  if (!appUrl) {
    const host = req.get("host") || "localhost:3000";
    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
    appUrl = `${isHttps ? "https" : "http"}://${host}`;
  }
  const defaultRedirectUri = process.env.VERCEL ? `${appUrl}/api/github/callback` : `${appUrl}/auth/callback`;

  let redirectUri: string | undefined = defaultRedirectUri;
  if (customRedirectUri === "omit") redirectUri = undefined;
  else if (customRedirectUri) redirectUri = customRedirectUri;

  const stateObj = { rand: Math.random().toString(36).substring(2, 15), ruri: redirectUri || "omit", uid: uid || "" };
  const stateStr = Buffer.from(JSON.stringify(stateObj)).toString("base64");

  const params = new URLSearchParams({ client_id: clientId, scope: "read:user,repo", state: stateStr });
  if (redirectUri) params.append("redirect_uri", redirectUri);

  res.json({ configured: true, url: `https://github.com/login/oauth/authorize?${params.toString()}`, redirectUri: redirectUri || "GitHub App Default" });
});

app.get(["/auth/callback", "/api/github/callback", "/api/auth/github/callback", "/api/auth/callback"], async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.send(`<html><body><h2>Auth Code Missing</h2></body></html>`);

  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    
    let redirectUri: string | undefined = undefined;
    let uidFromState: string | undefined = undefined;

    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state as string, "base64").toString("utf-8"));
        if (decoded.ruri && decoded.ruri !== "omit") redirectUri = decoded.ruri;
        if (decoded.uid) uidFromState = decoded.uid;
      } catch (e) {}
    }

    if (!redirectUri && !state) {
      let appUrl = process.env.APP_URL && process.env.APP_URL !== "MY_APP_URL" ? process.env.APP_URL.replace(/\/$/, "") : "";
      if (!appUrl) {
        const host = req.get("host") || "localhost:3000";
        appUrl = `${req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http"}://${host}`;
      }
      redirectUri = `${appUrl}${req.path}`;
    }

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, ...(redirectUri ? { redirect_uri: redirectUri } : {}) })
    });
    const tokenData = await tokenResponse.json() as any;
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);
    
    const accessToken = tokenData.access_token;
    const userResponse = await fetch("https://api.github.com/user", {
      headers: { "Authorization": `Bearer ${accessToken}`, "User-Agent": "Vortex-Application" }
    });
    const githubUser = await userResponse.json() as any;

    if (uidFromState) pendingOAuthConnections.set(uidFromState, { username: githubUser.login, token: accessToken, timestamp: Date.now() });

    res.send(`
      <html><body><h2>GitHub Connected</h2>
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', githubUsername: '${githubUser.login}', githubAccessToken: '${accessToken}' }, '*');
          setTimeout(() => window.close(), 1000);
        } else { window.location.href = '/settings'; }
      </script></body></html>
    `);
  } catch (err: any) {
    res.send(`<html><body><h2>Connection Failed</h2><p>${err.message}</p></body></html>`);
  }
});

app.post("/api/og", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });
  try {
    // @ts-ignore
    const { result } = await ogs({ url });
    res.json({
      title: (result as any).ogTitle || (result as any).twitterTitle || "",
      description: (result as any).ogDescription || (result as any).twitterDescription || "",
      image: (result as any).ogImage?.[0]?.url || (result as any).ogImage?.url || (result as any).twitterImage?.[0]?.url || "",
      logo: (result as any).ogLogo?.[0]?.url || (result as any).ogLogo?.url || ""
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch metadata" });
  }
});

export default app;
