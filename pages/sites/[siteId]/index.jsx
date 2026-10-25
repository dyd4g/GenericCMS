import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Box, Button, Chip, InputAdornment, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import { Refresh, Search } from '@mui/icons-material';
import Shell from '../../../components/Shell';
import useCms from '../../../components/useCms';
import { Failure, formatDate, LanguageChip, Loading, StatusChip } from '../../../components/common';
import { languages } from '../../../lib/config';

const PAGE_SIZE = 10;

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export default function Pages() {
  const { query } = useRouter();
  const siteId = query.siteId;
  const [search, setSearch] = useState(''), [language, setLanguage] = useState(''), [status, setStatus] = useState(''), [sortBy, setSortBy] = useState('Name'), [page, setPage] = useState(0), [reload, setReload] = useState(0);
  const term = useDebounced(search.trim());
  useEffect(() => setPage(0), [term, language, status, sortBy]);
  const site = useCms(siteId ? { resource: 'site', siteId } : null);
  const pages = useCms(siteId ? { resource: 'pages', siteId, search: term, language, status, sortBy, page } : null, reload);
  const rows = pages.data?.results || [], total = pages.data?.resultsCount ?? 0;
  return <Shell crumbs={[['Sites', '/'], [site.data?.name || 'Site']]} title={site.data?.name ? `${site.data.name} pages` : 'Pages'}
    actions={<Stack direction="row" spacing={1}><Button component={Link} href={`/sites/${siteId}/pages/new`} variant="contained">New page</Button><Button startIcon={<Refresh />} onClick={() => setReload(v => v + 1)} disabled={pages.loading}>Refresh</Button></Stack>}>
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField size="small" label="Search by page name or path" value={search} onChange={e => setSearch(e.target.value)} sx={{ flex: 1, minWidth: 240 }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} />
        <TextField select size="small" label="Language" value={language} onChange={e => setLanguage(e.target.value)} sx={{ minWidth: 170 }}><MenuItem value="">All languages</MenuItem>{languages.map(([code, name]) => <MenuItem key={code} value={code}>{name}</MenuItem>)}</TextField>
        <TextField select size="small" label="Status" value={status} onChange={e => setStatus(e.target.value)} sx={{ minWidth: 140 }}><MenuItem value="">All</MenuItem><MenuItem value="Active">Active</MenuItem><MenuItem value="Inactive">Inactive</MenuItem></TextField>
        <TextField select size="small" label="Sort by" value={sortBy} onChange={e => setSortBy(e.target.value)} sx={{ minWidth: 150 }}><MenuItem value="Name">Name</MenuItem><MenuItem value="CreationDate">Newest first</MenuItem></TextField>
      </Stack>
    </Paper>
    {pages.loading && !pages.data ? <Loading /> : pages.error ? <Failure error={pages.error} expired={pages.expired} retry={() => setReload(v => v + 1)} /> :
      <TableContainer component={Paper} variant="outlined">
        <Table aria-label="Pages">
          <TableHead><TableRow>{['Page', 'Language', 'Status', 'Published', 'Feature scope'].map(h => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {rows.map(row => <TableRow key={row.id} hover sx={{ opacity: pages.loading ? 0.6 : 1 }}>
              <TableCell>
                <Typography component={Link} href={`/sites/${siteId}/pages/${row.id}`} fontWeight={600} sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { color: 'primary.main', textDecoration: 'underline' } }}>{row.name}</Typography>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ fontFamily: 'Consolas, monospace' }}>/{row.path}</Typography>
              </TableCell>
              <TableCell><LanguageChip language={row.language} /></TableCell>
              <TableCell><StatusChip status={row.status} /></TableCell>
              <TableCell>{formatDate(row.publishDate)}</TableCell>
              <TableCell><Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>{(row.attributes?.featureScope || []).map(v => <Chip key={v} size="small" label={v} variant="outlined" />)}{!(row.attributes?.featureScope || []).length && '—'}</Box></TableCell>
            </TableRow>)}
            {!rows.length && <TableRow><TableCell colSpan={5}><Typography color="text.secondary">{term || language || status ? 'No pages match these filters.' : 'This site has no pages.'}</Typography></TableCell></TableRow>}
          </TableBody>
        </Table>
        <TablePagination component="div" count={total} page={page} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]} onPageChange={(_, p) => setPage(p)} />
      </TableContainer>}
  </Shell>;
}

