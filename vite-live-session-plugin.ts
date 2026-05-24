import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

const SESSIONS_DIR = path.resolve(process.cwd(), '.live-sessions');

function ensureDir() {
  if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

function sessionPath(labId: string) {
  const safe = labId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(SESSIONS_DIR, `${safe}.json`);
}

function readBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export function liveSessionPlugin(): Plugin {
  return {
    name: 'simulab-live-session',
    configureServer(server) {
      ensureDir();
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/live-session/')) return next();

        const match = url.match(/^\/api\/live-session\/([^?]+)/);
        if (!match) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }

        const labId = decodeURIComponent(match[1]);
        const file = sessionPath(labId);

        if (req.method === 'GET') {
          ensureDir();
          if (!fs.existsSync(file)) {
            const pin = new URL(url, 'http://x').searchParams.get('pin') ?? '';
            const empty = {
              labId,
              pin,
              level3Status: 'idle',
              updatedAt: new Date().toISOString(),
              players: {},
            };
            fs.writeFileSync(file, JSON.stringify(empty, null, 2));
          }
          const body = fs.readFileSync(file, 'utf-8');
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(body);
          return;
        }

        if (req.method === 'PUT' || req.method === 'POST') {
          try {
            const raw = await readBody(req);
            const parsed = JSON.parse(raw);
            parsed.updatedAt = new Date().toISOString();
            ensureDir();
            fs.writeFileSync(file, JSON.stringify(parsed, null, 2));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(parsed));
          } catch {
            res.statusCode = 400;
            res.end('Invalid JSON');
          }
          return;
        }

        res.statusCode = 405;
        res.end('Method not allowed');
      });
    },
  };
}
