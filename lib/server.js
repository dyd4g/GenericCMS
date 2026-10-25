import { connection, languages } from './config';
import { pagePayload, validatePage } from './page-edit';

// CMS access using the existing service contracts.
export class ServiceError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

const positiveId = value => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ServiceError('Unknown item.', 400);
  return id;
};
const one = value => (Array.isArray(value) ? value[0] : value);

// Maps a request from the app to the CMS API path. Query values are validated, never passed through as-is.
export function cmsReadPath(query) {
  switch (one(query.resource)) {
    case 'sites': return 'sites';
    case 'site': return `sites/${positiveId(one(query.siteId))}`;
    case 'page': return `sites/${positiveId(one(query.siteId))}/pages/${positiveId(one(query.pageId))}`;
    case 'pageAttributes': return `sites/${positiveId(one(query.siteId))}/pages/attributes`;
    case 'asset': return `sites/${positiveId(one(query.siteId))}/assets/${positiveId(one(query.assetId))}`;
    case 'assets': {
      const page = Number(one(query.page) || 0);
      if (!Number.isSafeInteger(page) || page < 0) throw new ServiceError('Invalid page.', 400);
      const params = new URLSearchParams({ page: String(page), resultsPerPage: '15', sortBy: 'ModifiedDate' });
      const search = String(one(query.search) || '').trim().slice(0, 200);
      if (search) params.set('search', search);
      return `sites/${positiveId(one(query.siteId))}/assets?${params}`;
    }
    case 'pages': {
      const page = Number(one(query.page) || 0);
      if (!Number.isSafeInteger(page) || page < 0) throw new ServiceError('Invalid page.', 400);
      const params = new URLSearchParams({ page: String(page), resultsPerPage: '10', sortBy: one(query.sortBy) === 'CreationDate' ? 'CreationDate' : 'Name' });
      const search = String(one(query.search) || '').trim().slice(0, 200);
      if (search) params.set('search', search);
      const language = one(query.language);
      if (language && languages.some(([code]) => code === language)) params.set('language', language);
      const status = one(query.status);
      if (status === 'Active' || status === 'Inactive') params.set('status', status);
      return `sites/${positiveId(one(query.siteId))}/pages?${params}`;
    }
    default: throw new ServiceError('Unsupported read request.', 400);
  }
}

export async function readCms(path, token, fetcher = fetch) {
  if (!path || path.startsWith('/') || path.includes('://')) throw new ServiceError('Invalid service request.', 400);
  const response = await fetcher(`${connection.cms}/${path}`, { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(20000), headers: { 'Client-Id': connection.clientId, Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    throw new ServiceError(response.status === 401 ? 'Your session has expired. Sign in again.' : response.status === 403 ? 'Your account does not have access to this content.' : response.status === 404 ? 'This item was not found.' : 'The CMS is unavailable. Please retry.', response.status);
  }
  return response.json();
}

export async function updateCmsPage(query, body, token, fetcher = fetch) {
  const siteId = positiveId(one(query.siteId)), pageId = positiveId(one(query.pageId));
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ServiceError('Invalid page.', 400);
  const error = validatePage(body);
  if (error) throw new ServiceError(error, 400);
  if (!languages.some(([code]) => code === body.language)) throw new ServiceError('Choose a supported language.', 400);
  const payload = pagePayload(body);
  payload.order = Number(payload.order);
  const response = await fetcher(`${connection.cms}/sites/${siteId}/Pages/${pageId}`, {
    method: 'PUT', cache: 'no-store', signal: AbortSignal.timeout(30000),
    headers: { 'Client-Id': connection.clientId, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let detail = '';
    if (response.status === 400) {
      const text = await response.text();
      try { const data = JSON.parse(text); detail = typeof data === 'string' ? data : Object.values(data.errors || {}).flat().join(' ') || data.title || ''; } catch { detail = text; }
    }
    throw new ServiceError(response.status === 401 ? 'Your session has expired. Sign in again to retry saving.' : response.status === 403 ? 'Your account does not have permission to edit this page.' : detail.slice(0, 600) || 'Unable to save. Your edits are still here; retry saving.', response.status);
  }
}

export async function signIn(username, password, fetcher = fetch) {
  if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password || username.length > 320 || password.length > 4096) throw new ServiceError('Enter your email and password.', 400);
  const response = await fetcher(`${connection.identity}/api/token`, {
    method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: { 'Client-Id': connection.clientId, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'password', username: username.trim(), password, client_id: connection.clientId }),
  });
  if (!response.ok) {
    if (response.status === 400 || response.status === 401) throw new ServiceError('Email or password is incorrect.', 401);
    if (response.status === 429) throw new ServiceError('Too many sign-in attempts. Please wait and try again.', 429);
    throw new ServiceError('Sign-in is unavailable. Please try again.', 503);
  }
  const tokens = await response.json();
  if (typeof tokens.access_token !== 'string' || !tokens.access_token) throw new ServiceError('Sign-in did not return a valid session. Please try again.', 503);
  // Sign-in only succeeds for people who can see at least one site, so a valid account without CMS access is told so clearly.
  const sites = await readCms('sites', tokens.access_token, fetcher).catch(error => { if (error.status === 403) throw new ServiceError('You do not have access to this CMS.', 403); throw error; });
  // Who signed in, for display only (best effort; the CMS API decides what the account may do).
  const profile = await fetcher(`${connection.identity}/api/account/userinfo`, { cache: 'no-store', signal: AbortSignal.timeout(10000), headers: { 'Client-Id': connection.clientId, Authorization: `Bearer ${tokens.access_token}` } }).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const role = profile?.roles ?? profile?.role ?? [];
  const user = { name: String(profile?.preferred_username || profile?.email || '').slice(0, 200), roles: (Array.isArray(role) ? role : [role]).filter(r => typeof r === 'string').slice(0, 10) };
  return { accessToken: tokens.access_token, expiresIn: Number(tokens.expires_in) || 3600, sites, user };
}

export const noStore = res => { res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('Pragma', 'no-cache'); res.setHeader('X-Content-Type-Options', 'nosniff'); };
export const failure = (res, error) => res.status(error instanceof ServiceError ? error.status : 502).json({ message: error instanceof ServiceError ? error.message : 'Unable to reach the CMS. Please retry.' });
export const bearer = req => { const header = req.headers.authorization || ''; return header.startsWith('Bearer ') && header.length < 20000 ? header.slice(7) : ''; };

