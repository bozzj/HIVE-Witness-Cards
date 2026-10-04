/**
 * Vercel Serverless Function: Hive Blockchain RPC Proxy
 * Proxies JSON-RPC requests to reliable Hive nodes with automatic failover.
 */
export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const HIVE_NODES = [
    'https://api.hive.blog',
    'https://api.openhive.network',
    'https://anyx.io',
    'https://rpc.mahdiyari.info',
    'https://api.deathwing.me',
  ];

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

  const sanitizedBody = {
    jsonrpc: body.jsonrpc || '2.0',
    method: body.method,
    params: body.params,
    id: typeof body.id === 'number' && body.id > 0 && body.id < 2147483647
      ? body.id
      : 1,
  };

  let lastError: any = null;

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
      return res.status(200).json(data);
    } catch (err: any) {
      lastError = err;
    }
  }

  return res.status(502).json({
    error: { message: lastError?.message || 'Hive RPC nodes failed to respond' },
  });
}
