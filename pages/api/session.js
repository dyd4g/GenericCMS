import { failure, noStore, ServiceError, signIn } from '../../lib/server';

// Sign in with the existing identity service. The password is forwarded once and never stored or logged.
export default async function handler(req, res) {
  noStore(res);
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ message: 'Method not allowed.' }); }
  // Credentials may only be submitted from this app itself.
  let origin; try { origin = new URL(req.headers.origin).host; } catch {}
  if (!origin || origin !== req.headers.host) return failure(res, new ServiceError('Please sign in from the CMS app.', 403));
  if (!req.headers['content-type']?.startsWith('application/json')) return failure(res, new ServiceError('Unsupported request.', 415));
  try { res.status(200).json(await signIn(req.body?.username, req.body?.password)); } catch (error) { failure(res, error); }
}

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };
