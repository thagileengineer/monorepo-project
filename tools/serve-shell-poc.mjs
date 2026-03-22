/**
 * Serves the POC shell build from dist/deploy/shell/<semver>/ (same tree as uploaded to MinIO).
 * Run after: npm run publish:poc
 *
 * Uses SPA fallback: unknown paths (e.g. /mfe06) return index.html so deep links and reload work.
 */
import { readFileSync, existsSync, statSync, createReadStream } from 'fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'url';
import { dirname, join, extname, resolve, sep } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const versions = JSON.parse(readFileSync(join(root, 'mfe-versions.json'), 'utf8'));
const v = versions.shell;
const dir = resolve(join(root, 'dist', 'deploy', 'shell', v));

if (!existsSync(dir)) {
  console.error(`Missing ${dir}. Run npm run publish:poc first.`);
  process.exit(1);
}

const port = parseInt(process.env.SHELL_POC_PORT || '4200', 10);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
}

function safePath(baseDir, urlPath) {
  const pathname = new URL(urlPath || '/', 'http://localhost').pathname;
  const decoded = decodeURIComponent(pathname);
  if (decoded.includes('\0')) {
    return null;
  }
  const rel = decoded.replace(/^\/+/, '') || '.';
  if (rel.split('/').includes('..')) {
    return null;
  }
  const rootResolved = resolve(baseDir);
  const abs = resolve(rootResolved, rel);
  const boundary = rootResolved.endsWith(sep) ? rootResolved : rootResolved + sep;
  if (abs !== rootResolved && !abs.startsWith(boundary)) {
    return null;
  }
  return abs;
}

const indexPath = join(dir, 'index.html');

createServer((req, res) => {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    res.end();
    return;
  }

  const target = safePath(dir, req.url || '/');
  if (!target) {
    res.writeHead(403);
    res.end();
    return;
  }

  const sendFile = (path, status = 200) => {
    const type = MIME[extname(path)] || 'application/octet-stream';
    res.writeHead(status, { 'Content-Type': type });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(path).pipe(res);
  };

  if (existsSync(target) && statSync(target).isFile()) {
    sendFile(target);
    return;
  }

  if (existsSync(target) && statSync(target).isDirectory()) {
    const idx = join(target, 'index.html');
    if (existsSync(idx)) {
      sendFile(idx);
      return;
    }
  }

  if (existsSync(indexPath)) {
    sendFile(indexPath);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
}).listen(port, () => {
  console.log(`Shell POC: ${dir}`);
  console.log(`http://localhost:${port} (SPA fallback enabled)`);
});
