// Set DISABLE_HMR to true to suppress Vite HMR WebSocket connection attempts in the preview iframe
process.env.DISABLE_HMR = 'true';

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Enable CORS for all incoming requests (including preview iframe origins)
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (_req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  const HIVE_NODES = [
    'https://api.hive.blog',
    'https://api.openhive.network',
    'https://anyx.io',
    'https://rpc.mahdiyari.info',
    'https://api.deathwing.me',
  ];

  // Server-side proxy for Hive JSON-RPC
  // This bypasses browser CORS and CSP connect-src restrictions in iframes
  app.post('/api/hive-rpc', async (req, res) => {
    let lastError: any = null;

    const sanitizedBody = {
      jsonrpc: req.body.jsonrpc || '2.0',
      method: req.body.method,
      params: req.body.params,
      id: typeof req.body.id === 'number' && req.body.id > 0 && req.body.id < 2147483647
        ? req.body.id
        : 1,
    };

    for (const node of HIVE_NODES) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const resp = await fetch(node, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sanitizedBody),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!resp.ok) continue;

        const data = await resp.json();
        return res.json(data);
      } catch (err: any) {
        lastError = err;
      }
    }

    return res.status(502).json({
      error: { message: lastError?.message || 'Hive RPC nodes failed to respond' },
    });
  });

  app.get('/favicon.ico', (_req, res) => {
    res.type('image/svg+xml');
    res.send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#E31337"><path d="M6.076 1.637a.1.1 0 0 0-.09.05L.014 11.95a.1.1 0 0 0 0 .104l6.039 10.26c.04.068.14.068.18 0l5.972-10.262a.1.1 0 0 0-.002-.104L6.166 1.687a.1.1 0 0 0-.09-.05m2.863 0a.103.103 0 0 0-.09.154l5.186 8.967a.1.1 0 0 0 .09.053h3.117c.08 0 .13-.088.09-.157l-5.186-8.966a.1.1 0 0 0-.09-.051zm5.891 0a.102.102 0 0 0-.088.154L20.656 12l-5.914 10.209a.102.102 0 0 0 .088.154h3.123a.1.1 0 0 0 .088-.05l5.945-10.262a.1.1 0 0 0 0-.102L18.041 1.688a.1.1 0 0 0-.088-.051zm-.79 11.7a.1.1 0 0 0-.089.052l-5.101 8.82c-.04.069.01.154.09.154h3.117a.1.1 0 0 0 .09-.05l5.1-8.82a.103.103 0 0 0-.09-.155z"/></svg>`);
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hive Witness Cards server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
