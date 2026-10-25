import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import PagePreview from './PagePreview';
import CodeEditor from './CodeEditor';
import SourceWorkspace from './SourceWorkspace';
import PageAttributes from './PageAttributes';
import PageMedia from './PageMedia';
import ParentPagePicker from './ParentPagePicker';
import useCms from './useCms';
import { validateAttributes } from '../lib/page-attributes';
import { cmsCreatePage, cmsGet, cmsUpdatePage, saveSession, signInRequest } from '../lib/client';
import { languages, languageName } from '../lib/config';
import { pagePayload, savedPageView, validatePage } from '../lib/page-edit';

// Source editing preserves the custom markup used by existing HP LIFE pages.
export default function PageEditor({ page, siteId, onSaved, isNew = false, onPending }) {
  const router = useRouter();
  const htmlInput = useRef(null);
  const htmlState = useRef(null), cssState = useRef(null);
  const [draft, setDraft] = useState(() => pagePayload(page));
  const [baseline, setBaseline] = useState(() => JSON.stringify(pagePayload(page)));
  const [tab, setTab] = useState(isNew ? 'settings' : 'content'), [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirm, setConfirm] = useState(false);
  const [login, setLogin] = useState(false), [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [attributeReload, setAttributeReload] = useState(0);
  const attributeResult = useCms({ resource: 'pageAttributes', siteId }, attributeReload);
  const [compareId, setCompareId] = useState('');
  const [compareReload, setCompareReload] = useState(0);
  const comparison = useCms(compareId ? { resource: 'page', siteId, pageId: compareId } : null, compareReload);
  const dirty = JSON.stringify(draft) !== baseline;
  useEffect(() => { onPending?.(dirty || busy); return () => onPending?.(false); }, [dirty, busy, onPending]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const unload = e => { e.preventDefault(); e.returnValue = ''; };
    const route = () => {
      if (busy || !window.confirm('Leave this page and lose your unsaved edits?')) {
        router.events.emit('routeChangeError');
        throw new Error('Navigation cancelled: page edits are not saved.');
      }
    };
    const click = e => { if (e.target.closest('button')?.textContent?.includes('Sign out') && (busy || !window.confirm('Sign out and lose your unsaved edits?'))) { e.preventDefault(); e.stopPropagation(); } };
    window.addEventListener('beforeunload', unload); router.events.on('routeChangeStart', route); document.addEventListener('click', click, true);
    return () => { window.removeEventListener('beforeunload', unload); router.events.off('routeChangeStart', route); document.removeEventListener('click', click, true); };
  }, [dirty, busy, router]);
  const change = (key, value) => setDraft(d => ({ ...d, [key]: value }));
  const field = (key, label, props = {}) => <TextField key={key} label={label} value={draft[key] ?? ''} onChange={e => change(key, e.target.value)} disabled={busy} fullWidth {...props} />;
  async function save() {
    setConfirm(false); setError('');
    const validation = validatePage(draft); if (validation) { setError(validation); return; }
    const attributeError = validateAttributes(attributeResult.data, draft.attributes);
    if (attributeError) { setError(attributeError); setTab('attributes'); return; }
    setBusy(true);
    try {
      if (isNew) { const created = await cmsCreatePage(siteId, draft); setBaseline(JSON.stringify(draft)); onSaved(created); return; }
      await cmsUpdatePage(siteId, page.id, draft);
      setBaseline(JSON.stringify(draft));
      // Re-read server-generated fields, such as the publish date, after a successful PUT.
      try { const saved = await cmsGet({ resource: 'page', siteId, pageId: page.id }); const value = pagePayload(saved); setDraft(value); setBaseline(JSON.stringify(value)); onSaved(saved); }
      catch { onSaved(savedPageView(page, draft, attributeResult.data)); setError('Changes were saved, but the page could not be reloaded. Refresh when the connection is available.'); }
    } catch (e) { setError(e.message); if (/session|sign in/i.test(e.message)) setLogin(true); }
    finally { setBusy(false); }
  }
  return <Stack spacing={2}>
    <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" spacing={2} sx={{ position: 'sticky', top: 64, zIndex: 2, bgcolor: 'background.paper', py: 1.5 }}>
      <Typography variant="body2" color="text.secondary">{busy ? 'Saving…' : dirty ? 'Unsaved changes' : 'Page editor'}</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
        {!isNew && <PageMedia siteId={siteId} page={page} busy={busy} setBusy={setBusy} onSessionError={message => { setError(message); setLogin(true); }}
          onFeatured={featuredImageUrl => onSaved({ ...page, featuredImageUrl })}
          onInsert={markup => {
            if (htmlInput.current?.insert) { htmlInput.current.insert(`\n${markup}\n`); setTab('content'); return; }
            const start = htmlInput.current?.selectionStart ?? draft.content.length;
            const end = htmlInput.current?.selectionEnd ?? start;
            const insert = `\n${markup}\n`;
            change('content', draft.content.slice(0, start) + insert + draft.content.slice(end));
            setTab('content');
            setTimeout(() => { htmlInput.current?.focus(); htmlInput.current?.setSelectionRange(start + insert.length, start + insert.length); }, 0);
          }} />}
        <Button disabled={!dirty || busy} onClick={() => { if (window.confirm('Reset all unsaved edits?')) { setDraft(JSON.parse(baseline)); setError(''); } }}>Reset edits</Button>
        <Button variant="contained" disabled={(!dirty && !isNew) || busy} onClick={() => !isNew && (page.status === 'Active' || draft.status === 'Active') ? setConfirm(true) : save()}>{busy ? 'Saving…' : isNew ? 'Create inactive page' : 'Save changes'}</Button>
      </Stack>
    </Stack>
    {error && <Alert severity="error" action={/session|sign in/i.test(error) ? <Button color="inherit" onClick={() => setLogin(true)}>Sign in</Button> : undefined}>{error}</Alert>}
    <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable"><Tab value="content" label="Content" /><Tab value="style" label="Custom CSS" /><Tab value="settings" label="Page settings" /><Tab value="attributes" label="Attributes" /><Tab value="compare" label="Compare languages" /><Tab value="preview" label="Preview changes" /></Tabs>
    {tab === 'compare' && <Stack spacing={2}>
      <TextField select label="Reference language" value={compareId} onChange={e => setCompareId(e.target.value)} disabled={busy} fullWidth>
        <MenuItem value="">Choose a language</MenuItem>{(page.translations || []).map(item => <MenuItem key={item.id} value={item.id}>{languageName(item.language)}</MenuItem>)}
      </TextField>
      {!page.translations?.length && <Alert severity="info">No other language versions exist yet. Create one in the Languages tab.</Alert>}
      {comparison.loading && <Typography role="status">Loading reference page…</Typography>}
      {comparison.error && <Alert severity="error" action={<Button onClick={() => setCompareReload(value => value + 1)}>Retry</Button>}>{comparison.error}</Alert>}
      {comparison.data && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        <Stack spacing={2}><Typography variant="h6">{languageName(comparison.data.language)} reference (saved)</Typography><TextField label="Reference title" value={comparison.data.title || ''} slotProps={{ input: { readOnly: true }, htmlInput: { dir: comparison.data.language === 'ar' ? 'rtl' : 'ltr' } }} /><CodeEditor label="Reference HTML" value={comparison.data.content || ''} readOnly /></Stack>
        <Stack spacing={2}><Typography variant="h6">{languageName(draft.language)} (editing)</Typography>{field('title', 'Page title')}<CodeEditor ref={htmlInput} label="Page HTML" value={draft.content} onChange={value => change('content', value)} disabled={busy} stateCache={htmlState} /></Stack>
      </Box>}
    </Stack>}
    {tab === 'attributes' && <PageAttributes result={attributeResult} attributes={draft.attributes} onChange={value => change('attributes', value)} disabled={busy} retry={() => setAttributeReload(value => value + 1)} />}
    {tab === 'content' && <SourceWorkspace ref={htmlInput} value={draft.content} onChange={value => change('content', value)} language="html" label="Page HTML" disabled={busy} stateCache={htmlState} page={{ ...page, ...draft }} />}
    {tab === 'style' && <SourceWorkspace value={draft.style || ''} onChange={value => change('style', value)} language="css" label="Custom CSS" disabled={busy} stateCache={cssState} page={{ ...page, ...draft }} />}
    {tab === 'settings' && <Stack spacing={3}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {field('name', 'Page name', { required: true })}{field('path', 'Page path', { helperText: 'Changing the path can break existing links.' })}
        {field('title', 'Page title')}{field('heading', 'Heading')}{field('author', 'Author')}
        {field('language', 'Language', { select: true, children: languages.map(([code, label]) => <MenuItem key={code} value={code}>{label}</MenuItem>) })}
        {field('status', 'Visibility', { select: true, disabled: busy || isNew, children: ['Active', 'Inactive'].map(value => <MenuItem key={value} value={value}>{value}</MenuItem>), helperText: isNew ? 'New pages start Inactive. Activate after reviewing.' : 'Inactive pages are hidden from visitors.' })}
        {field('order', 'Order', { type: 'number', slotProps: { htmlInput: { step: 1 } } })}
      </Box>
      {field('description', 'Description', { multiline: true, minRows: 3 })}
      <ParentPagePicker siteId={siteId} pageId={page.id} parentId={draft.parentId} parentName={page.parent?.id === draft.parentId ? page.parent?.name : ''} onChange={value => change('parentId', value)} busy={busy} setBusy={setBusy} />
      <Typography variant="h6">Search engines</Typography>
      {['description', 'keywords'].map(key => <TextField key={key} fullWidth label={key === 'description' ? 'SEO description' : 'SEO keywords'} value={draft.seo[key] ?? ''} disabled={busy} onChange={e => setDraft(d => ({ ...d, seo: { ...d.seo, [key]: e.target.value } }))} />)}
      <Typography variant="body2" color="text.secondary">Edit page attributes in the Attributes tab. {isNew ? 'Create the page before uploading a featured image.' : 'The publish date and featured image are preserved when saving.'}</Typography>
    </Stack>}
    {tab === 'preview' && <PagePreview page={{ ...page, ...draft }} unsaved />}
    <Dialog open={confirm} onClose={() => setConfirm(false)}><DialogTitle>Save changes to the live site?</DialogTitle><DialogContent><Typography>{draft.status === 'Inactive' ? 'This will hide the page from visitors.' : 'Visitors will see these changes immediately. The CMS does not keep a previous version.'}</Typography></DialogContent><DialogActions><Button onClick={() => setConfirm(false)}>Keep editing</Button><Button variant="contained" onClick={save}>Save changes</Button></DialogActions></Dialog>
    <Dialog open={login} onClose={() => !busy && setLogin(false)}><DialogTitle>Sign in to save your edits</DialogTitle><DialogContent><Stack component="form" id="editor-sign-in" spacing={2} sx={{ pt: 1 }} onSubmit={async e => { e.preventDefault(); setBusy(true); try { const result = await signInRequest(email, password); saveSession(result.accessToken, result.expiresIn, result.user); setPassword(''); setLogin(false); setError(''); } catch (err) { setError(err.message); } finally { setBusy(false); } }}><Typography>Your unsaved edits stay here while you sign in.</Typography>{error && <Alert severity="error">{error}</Alert>}<TextField label="Email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /><TextField label="Password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setLogin(false)}>Cancel</Button><Button disabled={busy} type="submit" form="editor-sign-in">Sign in</Button></DialogActions></Dialog>
  </Stack>;
}

