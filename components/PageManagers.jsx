import { useEffect, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemText, Stack, TextField, Typography } from '@mui/material';
import useCms from './useCms';
import { cmsGet, cmsPagePermission } from '../lib/client';

export default function PageManagers({ siteId, page, blocked, onUpdated, onPending }) {
  const [search, setSearch] = useState(''), [term, setTerm] = useState(''), [index, setIndex] = useState(0), [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [confirm, setConfirm] = useState(null);
  const candidates = useCms({ resource: 'pagePermissionCandidates', siteId, pageId: page.id, page: index, search: term }, reload);
  const [managers, setManagers] = useState(page.permissions || []);
  useEffect(() => { onPending(busy); return () => onPending(false); }, [busy, onPending]);
  async function refresh() {
    const latest = await cmsGet({ resource: 'page', siteId, pageId: page.id });
    setManagers(latest.permissions || []); onUpdated(latest); setReload(value => value + 1);
  }
  async function change() {
    const action = confirm; setBusy(true); setError(''); setNotice(''); setConfirm(null);
    try {
      await cmsPagePermission(siteId, page.id, action.user.id, action.method);
      await refresh(); setNotice(action.method === 'POST' ? 'Page manager added.' : 'Page manager removed. Site-wide administrator access is unchanged.');
    } catch (e) { setError(e.message); try { await refresh(); } catch { setError(`${e.message} The current manager list could not be refreshed; reload before retrying.`); } }
    finally { setBusy(false); }
  }
  async function reloadManagers() { setBusy(true); setError(''); try { await refresh(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <Stack spacing={3}>
    <Alert severity="info">Page managers can maintain this language version. Site administrators and system administrators retain their existing access. Changes take effect immediately and do not change site-wide roles.</Alert>
    {blocked && <Alert severity="info">Save or reset your content edits before changing page managers.</Alert>}
    {error && <Alert severity="error">{error}</Alert>}{notice && <Alert severity="success">{notice}</Alert>}
    <Stack direction="row" alignItems="center" justifyContent="space-between"><Typography variant="h6">Current page managers ({managers.length})</Typography><Button disabled={busy} onClick={reloadManagers}>Refresh</Button></Stack>
    {!managers.length ? <Typography color="text.secondary">No individual page managers. Site administrators can still maintain this page.</Typography> : <List disablePadding>{managers.map(user => <ListItem key={user.id} disableGutters divider><ListItemText primary={user.name || user.email || `User ${user.id}`} secondary={user.name ? user.email : undefined} /><Button color="error" disabled={busy || blocked} onClick={() => setConfirm({ method: 'DELETE', user })}>Remove</Button></ListItem>)}</List>}
    <Typography variant="h6">Add a page manager</Typography>
    <Typography variant="body2" color="text.secondary">Search members of this site’s group. The API lists eligible users who do not already have individual access. Only site administrators can change assignments.</Typography>
    <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={1} onSubmit={e => { e.preventDefault(); setTerm(search.trim()); setIndex(0); }}><TextField label="Search by name or email" value={search} onChange={e => setSearch(e.target.value)} fullWidth disabled={busy} /><Button type="submit" disabled={busy}>Search</Button></Stack>
    {candidates.loading ? <Typography role="status">Loading eligible users…</Typography> : candidates.error ? <Alert severity="error" action={<Button disabled={busy} onClick={() => setReload(value => value + 1)}>Retry</Button>}>{candidates.error} Searching eligible users requires site administrator permission.</Alert> : <Box>
      <List disablePadding>{(candidates.data?.results || []).map(user => <ListItem key={user.id} disableGutters divider><ListItemText primary={user.name || user.email || `User ${user.id}`} secondary={user.name ? user.email : undefined} /><Button disabled={busy || blocked || managers.some(item => item.id === user.id)} onClick={() => setConfirm({ method: 'POST', user })}>Add manager</Button></ListItem>)}</List>
      {!candidates.data?.results?.length && <Typography color="text.secondary">{term ? 'No eligible members match your search.' : 'No additional eligible members.'}</Typography>}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}><Button disabled={busy || !index} onClick={() => setIndex(value => value - 1)}>Previous</Button><Typography variant="body2">Page {index + 1} of {Math.max(1, candidates.data?.pagesCount || 0)}</Typography><Button disabled={busy || index + 1 >= (candidates.data?.pagesCount || 0)} onClick={() => setIndex(value => value + 1)}>Next</Button></Stack>
    </Box>}
    <Dialog open={!!confirm} onClose={() => setConfirm(null)}><DialogTitle>{confirm?.method === 'POST' ? 'Add page manager?' : 'Remove page manager?'}</DialogTitle><DialogContent><Typography>{confirm?.method === 'POST' ? 'Grant' : 'Remove'} individual access for {confirm?.user.name || confirm?.user.email} on “{page.name}”. This takes effect immediately. Site administrator roles and access to other pages remain unchanged.</Typography></DialogContent><DialogActions><Button onClick={() => setConfirm(null)}>Cancel</Button><Button variant="contained" color={confirm?.method === 'DELETE' ? 'error' : 'primary'} disabled={blocked || busy} onClick={change}>Confirm {confirm?.method === 'POST' ? 'add' : 'removal'}</Button></DialogActions></Dialog>
  </Stack>;
}
