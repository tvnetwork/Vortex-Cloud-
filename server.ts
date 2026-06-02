import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import ogs from "open-graph-scraper-lite";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

  // GitHub OAuth authorization URL endpoint
  app.get("/api/auth/github/url", (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.json({ configured: false });
    }

    const customRedirectUri = req.query.redirect_uri as string;

    let appUrl = process.env.APP_URL && process.env.APP_URL !== "MY_APP_URL" ? process.env.APP_URL.replace(/\/$/, "") : "";
    if (!appUrl) {
      const host = req.get("host") || "localhost:3000";
      const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
      const protocol = isHttps ? "https" : "http";
      appUrl = `${protocol}://${host}`;
    }
    const defaultRedirectUri = process.env.VERCEL 
      ? `${appUrl}/api/github/callback` 
      : `${appUrl}/auth/callback`;

    // Determine what redirectUri to use
    let redirectUri: string | undefined = defaultRedirectUri;
    if (customRedirectUri === "omit") {
      redirectUri = undefined;
    } else if (customRedirectUri) {
      redirectUri = customRedirectUri;
    }

    // Securely package the state parameter
    const stateObj = {
      rand: Math.random().toString(36).substring(2, 15),
      ruri: redirectUri || "omit"
    };
    const stateStr = Buffer.from(JSON.stringify(stateObj)).toString("base64");

    const params = new URLSearchParams({
      client_id: clientId,
      scope: "read:user,repo",
      state: stateStr
    });

    if (redirectUri) {
      params.append("redirect_uri", redirectUri);
    }

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    res.json({ configured: true, url: authUrl, redirectUri: redirectUri || "GitHub App Default (Omitted)" });
  });

  // GitHub OAuth callback endpoint
  app.get(["/auth/callback", "/auth/callback/", "/api/github/callback", "/api/auth/github/callback", "/api/auth/callback"], async (req, res) => {
    const { code, state } = req.query;

    if (!code) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>GitHub Authorization Failed</title>
            <style>
              body { background-color: #050810; color: #f8fafc; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
              .card { background-color: #0b1222; border: 1px solid #1e293b; padding: 2rem; border-radius: 1.5rem; }
              .error { color: #f43f5e; font-size: 2.5rem; margin-bottom: 0.5rem; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="error">✕</div>
              <h2>Authorization Code Missing</h2>
              <p style="color: #94a3b8;">Did not receive a valid authorization code from GitHub.</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_FAILED', error: 'No authorization code received' }, '*');
              }
            </script>
          </body>
        </html>
      `);
    }

    try {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;
      
      let redirectUri: string | undefined = undefined;
      let stateDecoded = false;

      if (state) {
        try {
          const decoded = JSON.parse(Buffer.from(state as string, "base64").toString("utf-8"));
          stateDecoded = true;
          if (decoded && decoded.ruri && decoded.ruri !== "omit") {
            redirectUri = decoded.ruri;
          }
        } catch (e) {
          console.warn("Could not decode state, falling back to request-based redirect uri", e);
        }
      }

      // If state didn't contain ruri or was omitted, but we aren't explicitly omitting, let's build the fallback redirectUri for standard OAuth.
      if (!redirectUri && !stateDecoded) {
        let appUrl = process.env.APP_URL && process.env.APP_URL !== "MY_APP_URL" ? process.env.APP_URL.replace(/\/$/, "") : "";
        if (!appUrl) {
          const host = req.get("host") || "localhost:3000";
          const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
          const protocol = isHttps ? "https" : "http";
          appUrl = `${protocol}://${host}`;
        }
        redirectUri = `${appUrl}${req.path}`;
      }

      // Exchange code for access token
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          ...(redirectUri ? { redirect_uri: redirectUri } : {})
        })
      });

      const tokenData = await tokenResponse.json() as { error?: string; error_description?: string; access_token?: string };

      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }

      const accessToken = tokenData.access_token;
      if (!accessToken) {
        throw new Error("Failed to retrieve valid access token.");
      }

      // Fetch user profile from GitHub API
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "User-Agent": "Vortex-Application"
        }
      });

      if (!userResponse.ok) {
        throw new Error(`GitHub API returned status ${userResponse.status}`);
      }

      const githubUser = await userResponse.json() as { login: string; id: number; name?: string; avatar_url?: string };
      const githubUsername = githubUser.login;

      // Render successful callback HTML to sync token and close popup
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>GitHub Connected</title>
            <style>
              body { background-color: #050810; color: #f8fafc; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
              .card { background-color: #0b1222; border: 1px solid #1e293b; padding: 2.5rem; border-radius: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
              .spinner { border: 3px solid rgba(255,255,255,0.1); width: 40px; height: 40px; border-radius: 50%; border-left-color: #22d3ee; animation: spin 1s linear infinite; margin: 1.5rem auto; }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="spinner"></div>
              <h2 style="margin: 0; font-size: 1.5rem;">GitHub Connected</h2>
              <p style="color: #94a3b8; font-size: 0.875rem; margin-top: 0.5rem;">Tunnelling secure account data back. Node linked to @${githubUsername}</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  githubUsername: ${JSON.stringify(githubUsername)},
                  githubAccessToken: ${JSON.stringify(accessToken)}
                }, '*');
                setTimeout(() => {
                  window.close();
                }, 1000);
              } else {
                window.location.href = '/profile';
              }
            </script>
          </body>
        </html>
      `);

    } catch (err: any) {
      console.error("GitHub Auth Error:", err);
      const errorMsg = err.message || "An unknown error occurred during authentication.";
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>GitHub Connection Failed</title>
            <style>
              body { background-color: #050810; color: #f8fafc; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
              .card { background-color: #0b1222; border: 1px solid #1e293b; padding: 2rem; border-radius: 1.5rem; max-width: 400px; }
              .error-icon { color: #f43f5e; font-size: 3rem; margin-bottom: 0.5rem; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="error-icon">✕</div>
              <h2>Connection Failed</h2>
              <p style="color: #94a3b8; font-size: 0.875rem;">${errorMsg}</p>
              <button onclick="window.close()" style="background-color: #1e293b; border: none; color: white; padding: 0.5rem 1.5rem; border-radius: 0.5rem; cursor: pointer; margin-top: 1rem;">Close Window</button>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_FAILED', 
                  error: ${JSON.stringify(errorMsg)}
                }, '*');
              }
            </script>
          </body>
        </html>
      `);
    }
  });

  app.post("/api/og", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
      // @ts-ignore - ogs types can be tricky
      const { result } = await ogs({ url });
      
      res.json({
        title: (result as any).ogTitle || (result as any).twitterTitle || "",
        description: (result as any).ogDescription || (result as any).twitterDescription || "",
        image: (result as any).ogImage?.[0]?.url || (result as any).ogImage?.url || (result as any).twitterImage?.[0]?.url || "",
        logo: (result as any).ogLogo?.[0]?.url || (result as any).ogLogo?.url || ""
      });
    } catch (error) {
      console.error("OG Fetch Error:", error);
      res.status(500).json({ error: "Failed to fetch metadata" });
    }
  });

  // Vite middleware for development
  async function setupVite() {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    if (!process.env.VERCEL) {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  }

  if (!process.env.VERCEL) {
    setupVite();
  }

export default app;
