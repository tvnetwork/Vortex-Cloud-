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
import crypto from "crypto";
import admin from "firebase-admin";

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT");
  } else {
    admin.initializeApp();
    console.log("Firebase Admin initialized via Default Credentials");
  }
} catch (err) {
  console.warn("Failed to initialize Firebase Admin:", err);
}

const db = admin.firestore();

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

async function startDeployment(repoUrl: string, targetId: string, deploymentRef?: FirebaseFirestore.DocumentReference) {
  try {
    const port = await portfinder.getPortPromise();
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `vortex-${targetId}-`));
    
    domainToDeployment.set(`${targetId}.apps.kontyra.name.ng`, targetId);
    domainToDeployment.set(`${targetId}.deploy.kontyra.name.ng`, targetId);

    const log = async (msg: string) => {
      console.log(`[${targetId}] ${msg}`);
      if (deploymentRef) {
        await deploymentRef.update({
          logs: admin.firestore.FieldValue.arrayUnion(msg)
        }).catch(() => {});
      }
    };

    await log(`Cloning ${repoUrl} to ${workDir}`);
    const cloneProcess = spawn("git", ["clone", repoUrl, "."], { cwd: workDir });
    
    cloneProcess.on("close", async (code) => {
      if (code !== 0) {
        await log(`Git clone failed for ${targetId}`);
        if (deploymentRef) await deploymentRef.update({ status: 'failed' });
        return;
      }
      
      await log(`Running npm install for ${targetId}`);
      const installProcess = spawn(/^win/.test(process.platform) ? "npm.cmd" : "npm", ["install"], { cwd: workDir });
      
      installProcess.on("close", async (code) => {
        if (code !== 0) {
          await log(`NPM install failed for ${targetId}`);
          if (deploymentRef) await deploymentRef.update({ status: 'failed' });
          return;
        }
        
        await log(`Starting app for ${targetId} on port ${port}`);
        const startProcess = spawn(/^win/.test(process.platform) ? "npm.cmd" : "npm", ["start"], { 
          cwd: workDir,
          env: { ...process.env, PORT: port.toString() } 
        });

        startProcess.stdout.on("data", async (data) => await log(data.toString().trim()));
        startProcess.stderr.on("data", async (data) => await log(`ERROR: ${data.toString().trim()}`));

        deploymentPorts.set(targetId, port);
        await log(`${targetId} is live on port ${port}`);
        
        if (deploymentRef) {
          await deploymentRef.update({ 
            status: 'active',
            port,
            domain: `${targetId}.apps.kontyra.name.ng`
          });
        }
      });
    });

    return { port, workDir, url: `${targetId}.apps.kontyra.name.ng` };
  } catch (error) {
    console.error(`Deploy error for ${targetId}:`, error);
    if (deploymentRef) await deploymentRef.update({ status: 'failed', logs: admin.firestore.FieldValue.arrayUnion(`Internal error: ${error}`) });
    throw error;
  }
}

app.post("/api/deploy", async (req, res) => {
  const { repoUrl, subdomain, deploymentId } = req.body;
  
  const targetId = deploymentId || subdomain;
  if (!repoUrl || !targetId) {
    return res.status(400).json({ error: "repoUrl and deploymentId are required" });
  }

  try {
    const deploymentRef = db.collection("deployments").doc(targetId);
    
    // Fire and forget background start
    startDeployment(repoUrl, targetId, deploymentRef).catch(console.error);

    res.json({ 
      message: "Deployment started", 
      deploymentId: targetId, 
      url: `${targetId}.apps.kontyra.name.ng`
    });
  } catch (error) {
    console.error("Deploy endpoint error:", error);
    res.status(500).json({ error: "Failed to initiate deployment" });
  }
});

app.post("/api/github/webhook", async (req, res) => {
  const signature = req.headers["x-hub-signature-256"] as string;
  const event = req.headers["x-github-event"] as string;
  
  if (event !== "push") {
    return res.status(200).send("Ignored non-push event");
  }

  const payload = req.body;
  const githubRepo = payload.repository?.full_name;
  if (!githubRepo) return res.status(400).send("No repository in payload");

  try {
    const projectsSnapshot = await db.collection("projects").where("githubRepo", "==", githubRepo).get();
    if (projectsSnapshot.empty) {
      return res.status(404).send("No project linked to this repository");
    }

    const projectDoc = projectsSnapshot.docs[0];
    const project = projectDoc.data();
    const projectId = projectDoc.id;

    if (project.webhookSecret && signature) {
      const hmac = crypto.createHmac("sha256", project.webhookSecret);
      const digest = "sha256=" + hmac.update(JSON.stringify(payload)).digest("hex");
      if (signature !== digest) {
        return res.status(401).send("Invalid signature");
      }
    }

    const branch = payload.ref ? payload.ref.replace("refs/heads/", "") : "main";
    const commitHash = payload.after;
    const commitMessage = payload.head_commit?.message || "Manual push";
    const repoUrl = payload.repository.clone_url;

    const deploymentRef = db.collection("deployments").doc();
    const targetId = deploymentRef.id;

    await deploymentRef.set({
      projectId,
      ownerId: project.ownerId,
      name: `${project.name} Deployment`,
      type: 'web_service',
      status: 'deploying',
      repository: githubRepo,
      branch,
      commitHash,
      commitMsg: commitMessage,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      logs: ["Deployment triggered via GitHub Webhook..."]
    });

    startDeployment(repoUrl, targetId, deploymentRef).catch(console.error);

    res.status(202).json({ message: "Deployment started", deploymentId: targetId });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).send("Internal Server Error");
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
