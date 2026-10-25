import { bearer, failure, noStore, ServiceError, updateCmsPage } from '../../lib/server';

// Frontend adapter for the same PUT used by the original CMS; no backend contract changes.
export default async function handler(req, res) {
  noStore(res);
  if (req.method !== 'PUT') { res.setHeader('Allow', 'PUT'); return res.status(405).json({ message: 'Method not allowed.' }); }
  let origin; try { origin = new URL(req.headers.origin).host; } catch {}
  if (!origin || origin !== req.headers.host) return failure(res, new ServiceError('Save changes from the CMS app.', 403));
  if (!req.headers['content-type']?.startsWith('application/json')) return failure(res, new ServiceError('Unsupported request.', 415));
  const token = bearer(req);
  if (!token) return res.status(401).json({ message: 'Sign in to continue.' });
  try { await updateCmsPage(req.query, req.body, token); res.status(204).end(); } catch (error) { failure(res, error); }
}
export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };
