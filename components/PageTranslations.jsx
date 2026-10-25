import { useState } from 'react';
import Link from 'next/link';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { languages, languageName } from '../lib/config';
import { cmsCreateTranslation } from '../lib/client';
import { translationVersions } from '../lib/translations';

export default function PageTranslations({ page, siteId, onRefresh }) {
  const [target, setTarget] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [created, setCreated] = useState([]);
  const versions = [...translationVersions(page), ...created].filter((item, index, all) => all.findIndex(other => other.language === item.language) === index);
  async function create() {
    setBusy(true); setError('');
    try {
      const { id } = await cmsCreateTranslation(siteId, page.id, target);
      setCreated(items => [...items, { id, language: target, name: page.name }]); setTarget(''); onRefresh();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Stack spacing={2}>
    <Typography variant="body2" color="text.secondary">Language versions share the path /{page.path}. Open a version to edit it, or create a missing one from this saved page.</Typography>
    <Alert severity="info">New versions start Inactive with copied text, HTML, CSS, SEO, attributes, and parent relationship. Translate and review them before activating. Featured images and individual page managers are not copied.</Alert>
    {error && <Alert severity="error" action={<Button color="inherit" onClick={onRefresh}>Refresh</Button>}>{error}</Alert>}
    {languages.map(([code, label]) => {
      const version = versions.find(item => item.language === code);
      return <Box key={code} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} alignItems="center"><Typography>{label}</Typography><Chip size="small" variant="outlined" label={code === page.language ? 'Current' : version ? 'Available' : 'Missing'} /></Stack>
        {version ? code !== page.language && <Button component={Link} href={`/sites/${siteId}/pages/${version.id}`}>Open</Button> : <Button disabled={busy} onClick={() => { setTarget(code); setError(''); }}>Create translation</Button>}
      </Box>;
    })}
    <Dialog open={!!target} onClose={() => !busy && setTarget('')}><DialogTitle>Create {languageName(target)} version?</DialogTitle><DialogContent><Typography>This copies the saved {languageName(page.language)} page. Unsaved edits are not included. The new page stays hidden until you activate it.</Typography>{error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}</DialogContent><DialogActions><Button disabled={busy} onClick={() => setTarget('')}>Cancel</Button><Button variant="contained" disabled={busy} onClick={create}>{busy ? 'Creating…' : 'Create inactive translation'}</Button></DialogActions></Dialog>
  </Stack>;
}
