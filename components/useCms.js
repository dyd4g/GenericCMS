import { useEffect, useState } from 'react';
import { cmsGet, SessionError } from '../lib/client';

// Loads one read from the CMS and tracks loading, error and sign-in expiry. Pass null to skip.
export default function useCms(params, reload = 0) {
  const key = params ? JSON.stringify(params) : null;
  const [state, setState] = useState({ key, loading: !!params, data: null, error: null, expired: false });
  useEffect(() => {
    if (!key) return;
    const abort = new AbortController();
    setState(s => ({ key, loading: true, data: s.key === key ? s.data : null, error: null, expired: false }));
    cmsGet(JSON.parse(key), abort.signal)
      .then(data => { if (!abort.signal.aborted) setState({ key, loading: false, data, error: null, expired: false }); })
      .catch(error => { if (!abort.signal.aborted && error.name !== 'AbortError') setState({ key, loading: false, data: null, error: error.message, expired: error instanceof SessionError }); });
    return () => abort.abort();
  }, [key, reload]);
  return state.key === key ? state : { loading: !!params, data: null, error: null, expired: false };
}
