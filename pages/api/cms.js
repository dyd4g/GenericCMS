import { bearer, cmsReadPath, failure, noStore, readCms } from '../../lib/server';

// Read-only proxy to the CMS API. The browser sends its own bearer token; nothing is stored on the server.
export default async function handler(req, res) {
  noStore(res);
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ message: 'This version of the CMS is read-only.' }); }
  const token = bearer(req);
  if (!token) return res.status(401).json({ message: 'Sign in to continue.' });
  try { res.json(await readCms(cmsReadPath(req.query), token)); } catch (error) { failure(res, error); }
}
