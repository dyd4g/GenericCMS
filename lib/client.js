// Browser side: the session lives in sessionStorage (cleared when the tab closes) and every request goes through /api/cms.
const key = 'generic-cms-session';
export class SessionError extends Error {}

export function readSession() {
  try { const s = JSON.parse(sessionStorage.getItem(key) || 'null'); return s && s.accessToken && s.expiresAt > Date.now() ? s : null; } catch { return null; }
}
export const saveSession = (accessToken, expiresIn, user) => { try { sessionStorage.setItem(key, JSON.stringify({ accessToken, expiresAt: Date.now() + expiresIn * 1000, user: user || null })); } catch {} };
export const clearSession = () => { try { sessionStorage.removeItem(key); } catch {} };

export async function signInRequest(username, password) {
  const response = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }), cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Unable to sign in. Please try again.');
  return body;
}

export async function cmsGet(params, signal) {
  const session = readSession();
  if (!session) throw new SessionError('Sign in to continue.');
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const response = await fetch(`/api/cms?${query}`, { headers: { Authorization: `Bearer ${session.accessToken}` }, cache: 'no-store', signal });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) { clearSession(); throw new SessionError(body.message || 'Your session has expired. Sign in again.'); }
  if (!response.ok) throw new Error(body.message || 'The CMS is unavailable. Please retry.');
  return body;
}

// Who is signed in (display only; the CMS API decides what the account may do).
export const sessionUser = () => readSession()?.user || null;

export async function cmsUpdatePage(siteId, pageId, page) {
  const session = readSession();
  if (!session) throw new SessionError('Your session has expired. Your edits are still here. Sign in again to retry.');
  const response = await fetch(`/api/page?${new URLSearchParams({ siteId, pageId })}`, {
    method: 'PUT', cache: 'no-store', headers: { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(page),
  });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.message || 'Unable to save. Your edits are still here; retry saving.'); }
}

export async function cmsMedia(params, method, file) {
  const session = readSession();
  if (!session) throw new SessionError('Your session has expired. Sign in again before uploading.');
  const data = new FormData(); if (file) data.append('file', file);
  const response = await fetch(`/api/media?${new URLSearchParams(params)}`, { method, headers: { Authorization: `Bearer ${session.accessToken}` }, ...(file ? { body: data } : {}) });
  const body = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Unable to change media. Check the library before retrying.');
  return body.value;
}

export async function cmsCreateTranslation(siteId, pageId, language) {
  const session = readSession(); if (!session) throw new SessionError('Your session has expired. Sign in again.');
  const response = await fetch('/api/translation', { method: 'POST', cache: 'no-store', headers: { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ siteId, pageId, language }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Creation could not be confirmed. Refresh translations before retrying.');
  return body;
}

