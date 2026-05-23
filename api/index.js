import app from '../server/index.js';

export default function handler(req, res) {
  const incoming = new URL(req.url, 'https://smartclass.local');
  const forwardedPath = incoming.searchParams.get('path');

  if (forwardedPath) {
    incoming.searchParams.delete('path');
    const query = incoming.searchParams.toString();
    req.url = `/api/${forwardedPath}${query ? `?${query}` : ''}`;
  }

  return app(req, res);
}
