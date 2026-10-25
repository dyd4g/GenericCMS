import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItemButton, ListItemText, Stack, TextField, Typography } from '@mui/material';
import useCms from './useCms';
import { cmsGet } from '../lib/client';
import { languageName } from '../lib/config';
import { verifyParent } from '../lib/page-create';

export default function ParentPagePicker({ siteId, pageId, parentId, parentName, onChange, busy, setBusy }) {
  const [open, setOpen] = useState(false), [search, setSearch] = useState(''), [term, setTerm] = useState(''), [index, setIndex] = useState(0), [reload, setReload] = useState(0), [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const result = useCms(open ? { resource: 'pages', siteId, search: term, page: index } : null, reload);
  async function choose(candidate) {
    setBusy(true); setError('');
    try {
      // The original API excludes only self, so check ancestors before offering a parent change.
      await verifyParent(candidate.id, pageId, id => cmsGet({ resource: 'page', siteId, pageId: id }));
      onChange(candidate.id); setSelected(candidate); setOpen(false);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Stack spacing={1}>
    <Typography variant="body2">Parent page: {parentId ? (selected?.id === parentId ? selected.name : parentName || `Page ${parentId}`) : 'None (top level)'}</Typography>
    <Stack direction="row" spacing={1}><Button variant="outlined" disabled={busy} onClick={() => setOpen(true)}>Choose parent</Button><Button disabled={busy || !parentId} onClick={() => { onChange(null); setSelected(null); }}>Clear parent</Button></Stack>
    <Dialog open={open} onClose={() => !busy && setOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Choose parent page</DialogTitle><DialogContent><Stack spacing={2}>
      <Typography variant="body2">The relationship is saved with the page. Pages that would create a loop cannot be selected.</Typography>
      <Stack component="form" direction="row" spacing={1} onSubmit={e => { e.preventDefault(); setTerm(search); setIndex(0); }}><TextField label="Search pages" value={search} onChange={e => setSearch(e.target.value)} fullWidth disabled={busy} /><Button type="submit" disabled={busy}>Search</Button></Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {result.loading ? <Typography role="status">Loading pages…</Typography> : result.error ? <Alert severity="error" action={<Button onClick={() => setReload(value => value + 1)}>Retry</Button>}>{result.error}</Alert> : <>
        <List>{(result.data?.results || []).map(item => <ListItemButton key={item.id} disabled={busy || item.id === pageId} selected={item.id === parentId} onClick={() => choose(item)}><ListItemText primary={item.name} secondary={`${languageName(item.language)} /${item.path}`} /></ListItemButton>)}</List>
        {!result.data?.results?.length && <Typography>No pages found.</Typography>}
        <Stack direction="row" spacing={1} alignItems="center"><Button disabled={busy || !index} onClick={() => setIndex(value => value - 1)}>Previous</Button><Typography variant="body2">Page {index + 1} of {Math.max(1, result.data?.pagesCount || 0)}</Typography><Button disabled={busy || index + 1 >= (result.data?.pagesCount || 0)} onClick={() => setIndex(value => value + 1)}>Next</Button></Stack>
      </>}
    </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setOpen(false)}>Cancel</Button></DialogActions></Dialog>
  </Stack>;
}
