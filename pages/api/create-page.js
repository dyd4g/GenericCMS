import { bearer, cmsReadPath, failure, noStore, ServiceError } from '../../lib/server';
import { connection, languages } from '../../lib/config';
import { pagePayload, validatePage } from '../../lib/page-edit';

export default async function handler(req, res) {
  noStore(res);
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ message: 'Method not allowed.' }); }
  let origin; try { origin = new URL(req.headers.origin).host; } catch {}
  if (!origin || origin !== req.headers.host) return failure(res, new ServiceError('Create pages from the CMS app.', 403));
  if (!req.headers['content-type']?.startsWith('application/json')) return failure(res, new ServiceError('Unsupported request.', 415));
  const token = bearer(req); if (!token) return failure(res, new ServiceError('Sign in to continue.', 401));
  try {
    const path = cmsReadPath({ resource: 'site', siteId: req.query.siteId });
    const payload = pagePayload(req.body || {});
    payload.status = 'Inactive'; payload.publishDate = null; payload.order = Number(payload.order);
    const error = validatePage(payload); if (error) throw new ServiceError(error, 400);
    if (!languages.some(([code]) => code === payload.language)) throw new ServiceError('Choose a supported language.', 400);
    const response = await fetch(`${connection.cms}/${path}/pages`, { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(30000), headers: { 'Client-Id': connection.clientId, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) {
      let detail = '';
      if (response.status === 400) { const text = await response.text(); try { const data = JSON.parse(text); detail = typeof data === 'string' ? data : Object.values(data.errors || {}).flat().join(' ') || data.title || ''; } catch { detail = text; } }
      throw new ServiceError(response.status === 403 ? 'Creating pages requires site administrator permission.' : response.status === 401 ? 'Your session has expired. Sign in again.' : detail.slice(0, 600) || 'Creation could not be confirmed. Check the page list before retrying.', response.status);
    }
    const id = await response.json(); if (!Number.isSafeInteger(id) || id <= 0) throw new ServiceError('Creation could not be confirmed. Check the page list before retrying.');
    res.status(200).json({ id });
  } catch (error) { failure(res, error); }
}
export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };
