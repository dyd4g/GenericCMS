import { connection } from '../../lib/config';
import { bearer, failure, noStore, ServiceError } from '../../lib/server';
import { mediaWriteTarget } from '../../lib/media';

// Forward multipart bytes unchanged: same field name, boundary, verb and upstream route as the old CMS.
export default async function handler(req, res) {
  noStore(res);
  let path;
  try { path = mediaWriteTarget(req.query, req.method); } catch (error) { return failure(res, new ServiceError(error.message, 400)); }
  let origin; try { origin = new URL(req.headers.origin).host; } catch {}
  if (!origin || origin !== req.headers.host) return failure(res, new ServiceError('Upload from the CMS app.', 403));
  const token = bearer(req);
  if (!token) return failure(res, new ServiceError('Your session has expired. Sign in again before uploading.', 401));
  const contentType = req.headers['content-type'];
  if (req.method !== 'DELETE' && !contentType?.startsWith('multipart/form-data;')) return failure(res, new ServiceError('Choose a file to upload.', 415));
  try {
    const chunks = []; let length = 0;
    for await (const chunk of req) { length += chunk.length; if (length > 30 * 1024 * 1024) throw new ServiceError('Choose a file smaller than 30 MB.', 413); chunks.push(chunk); }
    const response = await fetch(`${connection.cms}/${path}`, {
      method: req.method, cache: 'no-store', signal: AbortSignal.timeout(120000),
      headers: { 'Client-Id': connection.clientId, Authorization: `Bearer ${token}`, ...(req.method !== 'DELETE' ? { 'Content-Type': contentType } : {}) },
      ...(req.method !== 'DELETE' ? { body: Buffer.concat(chunks) } : {}),
    });
    if (!response.ok) throw new ServiceError(response.status === 403 ? 'Your account does not have permission to change this media.' : response.status === 401 ? 'Your session has expired. Sign in again before uploading.' : 'The upload could not be completed. Check the media library before retrying.', response.status);
    if (response.status === 204) return res.status(204).end();
    const text = await response.text();
    let value; try { value = JSON.parse(text); } catch { value = text; }
    res.status(200).json({ value });
  } catch (error) { failure(res, error); }
}
export const config = { api: { bodyParser: false } };
