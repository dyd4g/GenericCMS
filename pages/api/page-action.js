import { bearer, failure, noStore, ServiceError } from '../../lib/server';
import { connection } from '../../lib/config';
import { pageActionPath } from '../../lib/page-organize';

export default async function handler(req, res) {
  noStore(res);
  if (!['PUT', 'DELETE'].includes(req.method)) { res.setHeader('Allow', 'PUT, DELETE'); return res.status(405).json({ message: 'Method not allowed.' }); }
  let origin; try { origin = new URL(req.headers.origin).host; } catch {}
  if (!origin || origin !== req.headers.host) return failure(res, new ServiceError('Manage pages from the CMS app.', 403));
  const token = bearer(req); if (!token) return failure(res, new ServiceError('Your session has expired. Sign in again.', 401));
  try {
    let path; try { path = pageActionPath(req.query, req.method, req.body); } catch (error) { throw new ServiceError(error.message, 400); }
    const response = await fetch(`${connection.cms}/${path}`, { method: req.method, cache: 'no-store', signal: AbortSignal.timeout(30000), headers: { 'Client-Id': connection.clientId, Authorization: `Bearer ${token}`, ...(req.method === 'PUT' ? { 'Content-Type': 'application/json' } : {}) }, ...(req.method === 'PUT' ? { body: JSON.stringify(req.body) } : {}) });
    if (!response.ok) throw new ServiceError(response.status === 403 ? 'Your account does not have permission for this action. Deleting pages requires site administrator access.' : response.status === 401 ? 'Your session has expired. Sign in again.' : 'The action could not be confirmed. Reload the page before retrying.', response.status);
    res.status(204).end();
  } catch (error) { failure(res, error); }
}
export const config = { api: { bodyParser: { sizeLimit: '1kb' } } };
