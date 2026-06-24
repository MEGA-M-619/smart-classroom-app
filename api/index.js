import app from '../server/index.js';

export default function handler(req, res) {
  const incoming = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
  const forwardedPath = incoming.searchParams.get('path');

  if (forwardedPath) {
    incoming.searchParams.delete('path');
    const query = incoming.searchParams.toString();
    const suffix = query ? `?${query}` : '';
    req.url = forwardedPath.startsWith('uploads/')
      ? `/${forwardedPath}${suffix}`
      : `/api/${forwardedPath}${suffix}`;
  } else if (!req.url?.startsWith('/api')) {
    req.url = `/api${req.url === '/' ? '/health' : req.url}`;
  }

  return app(req, res);
}
