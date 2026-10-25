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
