import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Button, Paper, Stack } from '@mui/material';
import Shell from '../../../../components/Shell';
import PageEditor from '../../../../components/PageEditor';
import useCms from '../../../../components/useCms';
import { Failure, Loading } from '../../../../components/common';
import { newPageSeed } from '../../../../lib/page-create';

export default function NewPage() {
  const { query, isReady } = useRouter();
  const { siteId, source } = query;
  const [created, setCreated] = useState(null), [reload, setReload] = useState(0);
  const result = useCms(siteId && source ? { resource: 'page', siteId, pageId: source } : null, reload);
  const duplicate = source ? result.data : null;
  const page = newPageSeed(duplicate);
  return <Shell crumbs={[['Sites', '/'], ['Pages', `/sites/${siteId}`], [source ? 'Duplicate page' : 'New page']]} title={source ? 'Duplicate page' : 'New page'}>
    {!isReady || !siteId || (source && result.loading) ? <Loading /> : result.error ? <Failure error={result.error} expired={result.expired} retry={() => setReload(value => value + 1)} /> : created ? <Alert severity="success" action={<Button component={Link} href={`/sites/${siteId}/pages/${created.id}`}>Open page</Button>}>Page created as Inactive. Open it to continue editing and preview it before activating.</Alert> : <Stack spacing={2}>
      <Alert severity="info">{source ? 'This copies the saved content, CSS, SEO, attributes and parent relationship. Choose a new name and path. Featured images, child pages and individual managers are not copied.' : 'Enter the page settings, content and required attributes. The new page will stay hidden until you activate it.'}</Alert>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}><PageEditor key={source || 'new'} page={page} siteId={siteId} isNew onSaved={setCreated} /></Paper>
    </Stack>}
  </Shell>;
}
