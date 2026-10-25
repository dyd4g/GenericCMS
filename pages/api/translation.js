import { bearer, cmsReadPath, failure, noStore, readCms, ServiceError } from '../../lib/server';
import { connection, languages } from '../../lib/config';
import { translationPayload } from '../../lib/translations';

// New language versions use the original CreatePage POST contract.
export default async function handler(req, res) {
  noStore(res);
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ message: 'Method not allowed.' }); }
  let origin; try { origin = new URL(req.headers.origin).host; } catch {}
  if (!origin || origin !== req.headers.host) return failure(res, new ServiceError('Create translations from the CMS app.', 403));
  if (!req.headers['content-type']?.startsWith('application/json')) return failure(res, new ServiceError('Unsupported request.', 415));
  const token = bearer(req); if (!token) return failure(res, new ServiceError('Sign in to continue.', 401));
  try {
    const { siteId, pageId, language } = req.body || {};
    if (!languages.some(([code]) => code === language)) throw new ServiceError('Choose a supported language.', 400);
    const path = cmsReadPath({ resource: 'page', siteId, pageId });
    const source = await readCms(path, token);
    let payload; try { payload = translationPayload(source, language); } catch (error) { throw new ServiceError(error.message, 409); }
    const response = await fetch(`${connection.cms}/${cmsReadPath({ resource: 'site', siteId })}/pages`, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(30000),
      headers: { 'Client-Id': connection.clientId, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (!response.ok) throw new ServiceError(response.status === 403 ? 'Creating a translation requires site administrator permission.' : response.status === 401 ? 'Your session has expired. Sign in again.' : response.status === 400 ? 'Unable to create this translation. Refresh the language list to check whether it already exists.' : 'Creation could not be confirmed. Refresh the language list before retrying.', response.status);
    const id = await response.json();
    if (!Number.isSafeInteger(id) || id <= 0) throw new ServiceError('Creation could not be confirmed. Refresh the language list before retrying.');
    res.status(200).json({ id });
  } catch (error) { failure(res, error); }
}
export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };
