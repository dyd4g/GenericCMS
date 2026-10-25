import { connection } from '../../lib/config';
import { bearer, failure, noStore, ServiceError } from '../../lib/server';
import { pagePermissionRequest } from '../../lib/page-permissions';

// Existing permissions endpoints: POST an integer user ID, DELETE with the user ID in the path.
export default async function handler(req, res) {
  noStore(res);
  if (!['POST', 'DELETE'].includes(req.method)) { res.setHeader('Allow', 'POST, DELETE'); return res.status(405).json({ message: 'Method not allowed.' }); }
  let origin; try { origin = new URL(req.headers.origin).host; } catch {}
  if (!origin || origin !== req.headers.host) return failure(res, new ServiceError('Manage page access from the CMS app.', 403));
  const token = bearer(req); if (!token) return failure(res, new ServiceError('Your session has expired. Sign in again.', 401));
  if (req.method === 'POST' && !req.headers['content-type']?.startsWith('application/json')) return failure(res, new ServiceError('Unsupported request.', 415));
  try {
    let request; try { request = pagePermissionRequest(req.query, req.method, req.body); } catch (error) { throw new ServiceError(error.message, 400); }
    const response = await fetch(`${connection.cms}/${request.path}`, { method: req.method, cache: 'no-store', signal: AbortSignal.timeout(30000), headers: { 'Client-Id': connection.clientId, Authorization: `Bearer ${token}`, ...(req.method === 'POST' ? { 'Content-Type': 'application/json' } : {}) }, ...(req.method === 'POST' ? { body: JSON.stringify(request.body) } : {}) });
    if (!response.ok) {
      let detail = '';
      if (response.status === 400) { const text = await response.text(); try { const body = JSON.parse(text); detail = typeof body === 'string' ? body : ''; } catch { detail = text; } }
      throw new ServiceError(response.status === 403 ? 'Only site administrators can add or remove page managers.' : response.status === 401 ? 'Your session has expired. Sign in again.' : detail.slice(0, 600) || 'The access change could not be confirmed. Refresh the manager list before retrying.', response.status);
    }
    res.status(204).end();
  } catch (error) { failure(res, error); }
}
export const config = { api: { bodyParser: { sizeLimit: '1kb' } } };
