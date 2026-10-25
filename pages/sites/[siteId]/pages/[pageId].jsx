import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Box, Button, Chip, Divider, Paper, Stack, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import { ContentCopy } from '@mui/icons-material';
import Shell from '../../../../components/Shell';
import PagePreview from '../../../../components/PagePreview';
import PageEditor from '../../../../components/PageEditor';
import PageTranslations from '../../../../components/PageTranslations';
import useCms from '../../../../components/useCms';
import { Failure, formatDate, formatDateTime, LanguageChip, Loading, StatusChip } from '../../../../components/common';
import { languageName } from '../../../../lib/config';

function Fact({ label, children }) {
  return <Box sx={{ minWidth: 0 }}>
    <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
    <Typography component="div" sx={{ wordBreak: 'break-word' }}>{children || '—'}</Typography>
  </Box>;
}

function Source({ label, text }) {
  const [copied, setCopied] = useState(false);
  const value = text || '';
  const lines = value ? value.split('\n').length : 0;
  const copy = async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} };
  return <Box>
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
      <Typography variant="body2" color="text.secondary">{value ? `${lines} lines · ${new Intl.NumberFormat().format(value.length)} characters` : `No ${label}.`}</Typography>
      {value && <Tooltip title={copied ? 'Copied' : `Copy ${label}`}><Button size="small" startIcon={<ContentCopy fontSize="small" />} onClick={copy}>Copy</Button></Tooltip>}
    </Stack>
    {value && <Box component="pre" tabIndex={0} aria-label={`${label} source`} sx={{ m: 0, p: 2, maxHeight: 640, overflow: 'auto', bgcolor: '#101828', color: '#e6edf7', borderRadius: 2, fontFamily: 'Consolas, "Courier New", monospace', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{value}</Box>}
  </Box>;
}

function Links({ items, siteId, empty = '—' }) {
  if (!items?.length) return empty;
  return <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>{items.map(item => <Chip key={item.id} component={Link} href={`/sites/${siteId}/pages/${item.id}`} clickable size="small" variant="outlined" label={`${item.name} (${languageName(item.language)})`} />)}</Stack>;
}

export default function PageView() {
  const { query } = useRouter();
  const { siteId, pageId } = query;
  const [tab, setTab] = useState('preview'), [reload, setReload] = useState(0);
  const site = useCms(siteId ? { resource: 'site', siteId } : null);
  const result = useCms(siteId && pageId ? { resource: 'page', siteId, pageId } : null, reload);
  const [savedPage, setSavedPage] = useState(null);
  const page = savedPage?.id === Number(pageId) ? savedPage : result.data;
  return <Shell crumbs={[['Sites', '/'], [site.data?.name || 'Site', `/sites/${siteId}`], [page?.name || 'Page']]} title={page?.name || 'Page'}
    actions={page && <Stack direction="row" spacing={1} alignItems="center"><StatusChip status={page.status} /><LanguageChip language={page.language} /></Stack>}>
    {result.loading && !page ? <Loading /> : result.error ? <Failure error={result.error} expired={result.expired} retry={() => setReload(v => v + 1)} /> : page && <>
      <Alert severity={page.status === 'Active' ? 'warning' : 'info'} sx={{ mb: 3 }}>
        {page.status === 'Active'
          ? 'This page is Active. Saving changes updates the live site immediately. Preview your changes before saving.'
          : 'This page is Inactive. Visitors cannot see it. You can edit and preview changes before making it Active.'}
      </Alert>
      <Paper variant="outlined">
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab value="edit" label="Edit page" /><Tab value="translations" label="Languages" /><Tab value="preview" label="Saved preview" /><Tab value="html" label="HTML" /><Tab value="css" label="Custom CSS" /><Tab value="details" label="Details" />
        </Tabs>
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={{ display: tab === 'edit' ? 'block' : 'none' }}><PageEditor key={`${siteId}-${page.id}`} page={page} siteId={siteId} onSaved={setSavedPage} /></Box>
          {tab === 'translations' && <PageTranslations key={page.id} page={page} siteId={siteId} onRefresh={() => { setSavedPage(null); setReload(value => value + 1); }} />}
          {tab === 'preview' && <PagePreview page={page} />}
          {tab === 'html' && <Source label="HTML" text={page.content} />}
          {tab === 'css' && <Source label="CSS" text={page.style} />}
          {tab === 'details' && <Stack spacing={3}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
              <Fact label="Page name">{page.name}</Fact>
              <Fact label="Path"><code>/{page.path}</code></Fact>
              <Fact label="Language">{languageName(page.language)}</Fact>
              <Fact label="Title">{page.title}</Fact>
              <Fact label="Heading">{page.heading}</Fact>
              <Fact label="Author">{page.author}</Fact>
              <Fact label="Status"><StatusChip status={page.status} /></Fact>
              <Fact label="Publish date">{formatDateTime(page.publishDate)}</Fact>
              <Fact label="Created">{formatDate(page.creationDate)}</Fact>
              <Fact label="Order">{page.order == null ? null : String(page.order)}</Fact>
              <Fact label="Parent page">{page.parent ? <Links items={[page.parent]} siteId={siteId} /> : null}</Fact>
              <Fact label="Featured image">{page.featuredImageUrl ? <a href={page.featuredImageUrl} target="_blank" rel="noopener noreferrer">Open image</a> : null}</Fact>
            </Box>
            <Fact label="Description (excerpt)">{page.description}</Fact>
            <Divider />
            <Typography variant="h6">Search engines (SEO)</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              <Fact label="SEO description">{page.seo?.description}</Fact>
              <Fact label="Keywords">{page.seo?.keywords}</Fact>
            </Box>
            <Divider />
            <Typography variant="h6">Attributes</Typography>
            {page.attributes?.length ? <Stack spacing={1.5}>{page.attributes.map(a => <Box key={a.id}>
              <Typography variant="caption" color="text.secondary" display="block">{a.name}{a.description ? ` — ${a.description}` : ''}</Typography>
              <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>{a.values?.length ? a.values.map(v => <Chip key={v.id} size="small" label={v.value} />) : <Typography color="text.secondary">No value selected</Typography>}</Stack>
            </Box>)}</Stack> : <Typography color="text.secondary">No attributes.</Typography>}
            <Divider />
            <Typography variant="h6">Translations</Typography>
            <Links items={page.translations} siteId={siteId} empty={<Typography color="text.secondary">No other languages.</Typography>} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              <Fact label="Pages on the same level"><Links items={page.siblings} siteId={siteId} /></Fact>
              <Fact label="Child pages"><Links items={page.children} siteId={siteId} /></Fact>
            </Box>
            <Divider />
            <Typography variant="h6">Page managers</Typography>
            {page.permissions?.length ? <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>{page.permissions.map(p => <Chip key={p.id} size="small" variant="outlined" label={`${p.name || p.email}`} />)}</Stack> : <Typography color="text.secondary">No individual managers. Site administrators can manage this page.</Typography>}
          </Stack>}
        </Box>
      </Paper>
    </>}
  </Shell>;
}

