import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { ArrowDownward, ArrowUpward, DragIndicator } from '@mui/icons-material';
import { cmsGet, cmsPageAction } from '../lib/client';
import { loadPageGroup, movePage, persistPageOrder } from '../lib/page-organize';
import { languageName } from '../lib/config';

export default function PageOrganizer({ siteId, page, blocked, onUpdated, onDeleted, onPending }) {
  const [mode, setMode] = useState('siblings'), [rows, setRows] = useState([]), [baseline, setBaseline] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0), [remove, setRemove] = useState(false), [name, setName] = useState('');
  const drag = useRef(null);
  const [warning, setWarning] = useState('');
  const dirty = JSON.stringify(rows.map(item => item.id)) !== baseline;
  useEffect(() => { let alive = true; setLoading(true); setError('');
    loadPageGroup(siteId, page, mode === 'children', cmsGet).then(items => { if (alive) { setRows(items); setBaseline(JSON.stringify(items.map(item => item.id))); } }).catch(e => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [siteId, page.id, mode, reload]);
  useEffect(() => { onPending((dirty && !loading) || busy); return () => onPending(false); }, [dirty, loading, busy, onPending]);
  async function save() {
    setBusy(true); setError(''); setNotice('');
    try {
      await persistPageOrder(rows, (id, order) => cmsPageAction(siteId, id, 'PUT', order));
      onUpdated(await cmsGet({ resource: 'page', siteId, pageId: page.id }));
      setNotice('Page order saved.'); setReload(value => value + 1);
    } catch (e) { setWarning(`${e.message} Some positions may already have saved. The list is being reloaded.`); setReload(value => value + 1); }
    finally { setBusy(false); }
  }
  async function deletePage() {
    setBusy(true); setError('');
    try { await cmsPageAction(siteId, page.id, 'DELETE'); onDeleted(); }
    catch (e) { setError(e.message); setRemove(false); } finally { setBusy(false); }
  }
  function move(id, target) { setRows(items => movePage(items, id, target)); setNotice(''); }
  return <Stack spacing={3}>
    {blocked && <Alert severity="info">Save or reset your content edits before ordering or deleting pages.</Alert>}
    <Typography variant="h6">Page order</Typography>
    <Typography variant="body2" color="text.secondary">Drag the handles to reorder pages you can access. Arrow buttons provide keyboard and touch controls. Saving changes the order immediately, one page at a time.</Typography>
    <ToggleButtonGroup value={mode} exclusive size="small" onChange={(_, value) => { if (value) setMode(value); }} disabled={busy || dirty || blocked}><ToggleButton value="siblings">Same level</ToggleButton><ToggleButton value="children">Child pages</ToggleButton></ToggleButtonGroup>
    {error && <Alert severity="error" action={<Button disabled={busy} onClick={() => setReload(value => value + 1)}>Reload</Button>}>{error}</Alert>}
    {warning && <Alert severity="warning" onClose={() => setWarning('')}>{warning}</Alert>}
    {notice && <Alert severity="success">{notice}</Alert>}
    {loading ? <Typography role="status">Loading page order…</Typography> : !error && <>
      {!rows.length && <Typography color="text.secondary">No pages in this group.</Typography>}
      <Stack spacing={1}>{rows.map((item, index) => <Box key={item.id} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!busy && !blocked && drag.current) move(drag.current, item.id); drag.current = null; }} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
        <Box component="button" type="button" aria-label={`Drag ${item.name}`} disabled={busy || blocked} draggable={!busy && !blocked} onDragStart={e => { drag.current = item.id; e.dataTransfer.setData('text/plain', String(item.id)); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { drag.current = null; }} sx={{ border: 0, bgcolor: 'transparent', color: 'text.secondary', cursor: 'grab', p: 0.5 }}><DragIndicator /></Box>
        <Typography sx={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{index + 1}. {item.name}</Typography><Chip size="small" label={languageName(item.language)} />
        <IconButton aria-label={`Move ${item.name} up`} disabled={busy || blocked || index === 0} onClick={() => move(item.id, rows[index - 1].id)}><ArrowUpward fontSize="small" /></IconButton><IconButton aria-label={`Move ${item.name} down`} disabled={busy || blocked || index === rows.length - 1} onClick={() => move(item.id, rows[index + 1].id)}><ArrowDownward fontSize="small" /></IconButton>
      </Box>)}</Stack>
      <Stack direction="row" spacing={1}><Button variant="contained" disabled={!dirty || busy || blocked} onClick={save}>{busy ? 'Saving…' : 'Save order'}</Button><Button disabled={!dirty || busy} onClick={() => setReload(value => value + 1)}>Reset order</Button></Stack>
    </>}
    <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 3 }}><Typography variant="h6" gutterBottom>Delete page</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Deletes this language version. Other translations remain. Its child pages become top-level pages. This cannot be undone.</Typography><Button color="error" variant="outlined" disabled={blocked || busy || dirty} onClick={() => { setName(''); setRemove(true); }}>Delete page</Button></Box>
    <Dialog open={remove} onClose={() => !busy && setRemove(false)}><DialogTitle>Delete {page.name}?</DialogTitle><DialogContent><Stack spacing={2}><Alert severity="warning">{page.status === 'Active' ? 'This Active page will disappear from the site immediately. ' : ''}There is no undo. Other language versions will remain.</Alert><Typography>{page.children?.length || 0} child page(s) will become top-level pages. Links to this page may stop working.</Typography><TextField label="Type the page name to confirm" value={name} onChange={e => setName(e.target.value)} disabled={busy} fullWidth /></Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setRemove(false)}>Cancel</Button><Button color="error" variant="contained" disabled={busy || name !== page.name} onClick={deletePage}>{busy ? 'Deleting…' : 'Delete permanently'}</Button></DialogActions></Dialog>
  </Stack>;
}
