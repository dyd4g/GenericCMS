import { Alert, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { languageName } from '../lib/config';

export const formatDate = value => { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); };
export const formatDateTime = value => { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(); };

export function Loading({ label = 'Loading…' }) {
  return <Stack role="status" alignItems="center" sx={{ py: 8 }}><CircularProgress size={28} /><Typography sx={{ mt: 2 }} color="text.secondary">{label}</Typography></Stack>;
}

export function Failure({ error, expired, retry }) {
  return <Alert severity={expired ? 'warning' : 'error'} action={expired ? <Button color="inherit" onClick={() => window.location.reload()}>Sign in again</Button> : retry && <Button color="inherit" onClick={retry}>Retry</Button>}>{error}</Alert>;
}

// Active and Inactive are the only page states. Active pages are public.
export function StatusChip({ status }) {
  const active = status === 'Active' || status === 1;
  return <Chip size="small" label={active ? 'Active' : 'Inactive'} sx={{ fontWeight: 600, bgcolor: active ? 'success.light' : '#eef0f4', color: active ? 'success.main' : 'text.secondary' }} />;
}

export const LanguageChip = ({ language }) => <Chip size="small" variant="outlined" label={languageName(language)} />;
