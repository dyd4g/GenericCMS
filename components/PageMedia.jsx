import { useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, List, ListItemButton, ListItemText, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import useCms from './useCms';
import { cmsMedia } from '../lib/client';
import { mediaMarkup, permanentMediaUrl } from '../lib/media';

export default function PageMedia({ siteId, page, busy, setBusy, onInsert, onFeatured, onSessionError }) {
  const [open, setOpen] = useState(false), [tab, setTab] = useState('url'), [error, setError] = useState('');
  const [url, setUrl] = useState(''), [label, setLabel] = useState(''), [image, setImage] = useState(true);
  const [search, setSearch] = useState(''), [term, setTerm] = useState(''), [index, setIndex] = useState(0), [assetId, setAssetId] = useState(null), [reload, setReload] = useState(0);
  const [file, setFile] = useState(null), [featuredFile, setFeaturedFile] = useState(null), [featured, setFeatured] = useState(page.featuredImageUrl || '');
  const assets = useCms(open && tab === 'library' ? { resource: 'assets', siteId, search: term, page: index } : null, reload);
  const asset = useCms(open && tab === 'library' && assetId ? { resource: 'asset', siteId, assetId } : null, reload);
  const fail = e => { setError(e.message); if (/session|sign in/i.test(e.message)) { setOpen(false); onSessionError(e.message); } };
  async function upload(isFeatured, remove = false) {
    const selected = isFeatured ? featuredFile : file;
    if (!remove && (!selected || selected.size > 29 * 1024 * 1024)) { setError('Choose a file smaller than 29 MB.'); return; }
    if (isFeatured && !remove && !/^image\/(png|jpeg|gif|webp|avif)$/.test(selected.type)) { setError('Choose a PNG, JPEG, GIF, WebP, or AVIF image.'); return; }
    if (isFeatured && !window.confirm(remove ? 'Remove the featured image now? This takes effect immediately.' : 'Update the featured image now? This takes effect immediately.')) return;
    setBusy(true); setError('');
    try {
      const result = await cmsMedia(isFeatured ? { action: 'featured', siteId, pageId: page.id } : { action: 'assetFile', siteId, assetId }, remove ? 'DELETE' : isFeatured ? 'PUT' : 'POST', remove ? undefined : selected);
      if (isFeatured) { const value = remove ? '' : permanentMediaUrl(result); if (!remove && !value) throw new Error('The image was uploaded, but its URL could not be read. Reload the saved page before retrying.'); setFeatured(value); setFeaturedFile(null); onFeatured(value); }
      else { setFile(null); setReload(value => value + 1); }
    } catch (e) { fail(e); } finally { setBusy(false); }
  }
  function insert() {
    try { onInsert(mediaMarkup(url, label, image)); setOpen(false); setError(''); } catch (e) { setError(e.message); }
  }
  return <>
    <Button variant="outlined" disabled={busy} onClick={() => setOpen(true)}>Images and files</Button>
    <Dialog open={open} onClose={() => !busy && setOpen(false)} fullWidth maxWidth="md">
      <DialogTitle>Images and files</DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_, value) => { setTab(value); setError(''); }} variant="scrollable" sx={{ mb: 3 }}><Tab value="url" label="Insert by URL" disabled={busy} /><Tab value="library" label="Media library" disabled={busy} /><Tab value="featured" label="Featured image" disabled={busy} /></Tabs>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {tab === 'url' && <Stack spacing={2}>
          <Typography variant="body2">Insert at your cursor position in the HTML editor. The content changes when you save the page.</Typography>
          <Stack direction="row" spacing={1}><Button variant={image ? 'contained' : 'outlined'} onClick={() => setImage(true)}>Image</Button><Button variant={!image ? 'contained' : 'outlined'} onClick={() => setImage(false)}>File link</Button></Stack>
          <TextField label="Permanent image or file URL" value={url} onChange={e => setUrl(e.target.value)} fullWidth helperText="Use a public http or https URL. Temporary download links cannot be inserted." />
          <TextField label={image ? 'Alternative text' : 'Link text'} value={label} onChange={e => setLabel(e.target.value)} fullWidth helperText={image ? 'Describe the image, or leave empty if it is decorative.' : 'Describe the file visitors will open.'} />
          {image && permanentMediaUrl(url) && <Box component="img" src={permanentMediaUrl(url)} alt={label} sx={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain', alignSelf: 'flex-start' }} />}
          <Button variant="contained" onClick={insert} disabled={!permanentMediaUrl(url)}>Insert {image ? 'image' : 'file link'}</Button>
        </Stack>}
        {tab === 'library' && <Stack spacing={2}>
          <Alert severity="info">Uploads are added to the selected asset immediately. Asset files use temporary private download links; use a permanent public URL for page content.</Alert>
          <Stack component="form" direction="row" spacing={1} onSubmit={e => { e.preventDefault(); setTerm(search); setIndex(0); setAssetId(null); }}><TextField label="Search assets" value={search} onChange={e => setSearch(e.target.value)} fullWidth disabled={busy} /><Button type="submit" disabled={busy}>Search</Button></Stack>
          {assets.loading ? <Typography role="status">Loading assets…</Typography> : assets.error ? <Alert severity="error" action={<Button onClick={() => setReload(value => value + 1)}>Retry</Button>}>{assets.error}</Alert> : <>
            <List dense sx={{ maxHeight: 220, overflow: 'auto', border: 1, borderColor: 'divider' }}>{(assets.data?.results || []).map(item => <ListItemButton key={item.id} selected={assetId === item.id} disabled={busy} onClick={() => { setAssetId(item.id); setFile(null); }}><ListItemText primary={item.name} secondary={item.status} /></ListItemButton>)}</List>
            {!assets.data?.results?.length && <Typography>No assets found.</Typography>}
            <Stack direction="row" spacing={2} alignItems="center"><Button disabled={busy || index === 0} onClick={() => { setIndex(value => value - 1); setAssetId(null); }}>Previous</Button><Typography variant="body2">Page {index + 1} of {Math.max(1, assets.data?.pagesCount || 0)}</Typography><Button disabled={busy || index + 1 >= (assets.data?.pagesCount || 0)} onClick={() => { setIndex(value => value + 1); setAssetId(null); }}>Next</Button></Stack>
          </>}
          {assetId && <>
            <Divider />
            {asset.loading ? <Typography role="status">Loading files…</Typography> : asset.error ? <Alert severity="error" action={<Button onClick={() => setReload(value => value + 1)}>Retry</Button>}>{asset.error}</Alert> : asset.data && <>
              <Typography variant="h6">{asset.data.name}</Typography>
              {(asset.data.items || []).map(item => <Stack key={item.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                <Typography sx={{ wordBreak: 'break-word' }}>{item.name || item.originalFileName || `File ${item.id}`}</Typography>
                <Stack direction="row" spacing={1}>
                  {/^https?:\/\//i.test(item.url) && <Button component="a" href={item.url} target="_blank" rel="noopener noreferrer">Open</Button>}
                  <Button disabled={busy || !permanentMediaUrl(item.url)} onClick={() => { setUrl(item.url); setLabel(item.name || item.originalFileName || ''); setImage(/\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(item.url)); setTab('url'); }}>Use in page</Button>
                </Stack>
              </Stack>)}
              {!asset.data.items?.length && <Typography color="text.secondary">No files in this asset yet.</Typography>}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <Button component="label" disabled={busy}>Choose file<input type="file" hidden onChange={e => { setFile(e.target.files?.[0] || null); e.target.value = ''; }} /></Button>
                <Typography variant="body2">{file?.name || 'No file selected'}</Typography>
                <Button variant="contained" disabled={busy || !file} onClick={() => upload(false)}>{busy ? 'Uploading…' : 'Upload to asset'}</Button>
              </Stack>
            </>}
          </>}
        </Stack>}
        {tab === 'featured' && <Stack spacing={2}>
          <Alert severity="info">Featured image changes take effect immediately, separately from Save changes.</Alert>
          {featured ? <Box component="img" src={featured} alt="Current featured image" sx={{ maxHeight: 240, maxWidth: '100%', objectFit: 'contain', alignSelf: 'flex-start' }} /> : <Typography>No featured image.</Typography>}
          <Button component="label" disabled={busy}>Choose image<input type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/avif" hidden onChange={e => { setFeaturedFile(e.target.files?.[0] || null); e.target.value = ''; }} /></Button>
          {featuredFile && <Typography variant="body2">{featuredFile.name}</Typography>}
          <Stack direction="row" spacing={1}><Button variant="contained" disabled={busy || !featuredFile} onClick={() => upload(true)}>{busy ? 'Updating…' : 'Update featured image'}</Button><Button color="error" disabled={busy || !featured} onClick={() => upload(true, true)}>Remove</Button>
            {featured && <Button disabled={busy} onClick={() => { setUrl(featured); setLabel(''); setImage(true); setTab('url'); }}>Insert into content</Button>}
          </Stack>
        </Stack>}
      </DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setOpen(false)}>Close</Button></DialogActions>
    </Dialog>
  </>;
}

