import { useState } from 'react';
import Link from 'next/link';
import { Box, Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import { ArticleOutlined, ChevronRight } from '@mui/icons-material';
import Shell from '../components/Shell';
import useCms from '../components/useCms';
import { Failure, Loading } from '../components/common';

export default function Sites() {
  const [reload, setReload] = useState(0);
  const sites = useCms({ resource: 'sites' }, reload);
  const list = Array.isArray(sites.data) ? sites.data : sites.data?.results || [];
  return <Shell title="Sites">
    <Typography color="text.secondary" sx={{ mb: 3, mt: -2 }}>Choose the site whose pages you want to review.</Typography>
    {sites.loading && !sites.data ? <Loading /> : sites.error ? <Failure error={sites.error} expired={sites.expired} retry={() => setReload(v => v + 1)} /> :
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
        {list.map(site => <Card key={site.id} variant="outlined">
          <CardActionArea component={Link} href={`/sites/${site.id}`}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.main', display: 'grid', placeItems: 'center' }}><ArticleOutlined /></Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h6" noWrap>{site.name}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>{site.code || site.host || `Site ${site.id}`}</Typography>
                </Box>
                <ChevronRight color="action" />
              </Stack>
            </CardContent>
          </CardActionArea>
        </Card>)}
        {!list.length && <Typography color="text.secondary">This account cannot see any site. The CMS shows a site only to system administrators and people given access to it. Sign in with the account you use in the existing CMS.</Typography>}
      </Box>}
  </Shell>;
}
