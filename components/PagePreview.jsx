import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { DesktopWindows, PhoneIphone, TabletMac } from '@mui/icons-material';
import { connection } from '../lib/config';
import { previewDocument } from '../lib/preview';

// Two previews of the same page record:
//  - "In the HP LIFE site": the learner site's own preview page shows the content inside the real header and footer.
//  - "Content only": the HTML and CSS alone, in a sandboxed frame with the HP LIFE fonts and colors. No scripts run.
const widths = { desktop: '100%', tablet: '768px', mobile: '375px' };
const frameOrigin = (() => { try { return new URL(connection.previewFrame).origin; } catch { return ''; } })();

const clip = text => String(text ?? '').replace(/<\/?style[^>]*>?/gi, '');

export default function PagePreview({ page, unsaved = false }) {
  const [mode, setMode] = useState('site'), [device, setDevice] = useState('desktop');
  const frame = useRef(null);
  const payload = useMemo(() => ({ type: 'cms-preview', title: page.title, content: page.content, style: clip(page.style), language: page.language }), [page]);
  const send = useCallback(() => { if (frame.current?.contentWindow && frameOrigin) frame.current.contentWindow.postMessage(payload, frameOrigin); }, [payload]);
  useEffect(() => {
    if (mode !== 'site') return;
    const onMessage = event => { if (event.origin === frameOrigin && event.source === frame.current?.contentWindow && event.data?.type === 'cms-preview-ready') send(); };
    window.addEventListener('message', onMessage);
    send();
    return () => window.removeEventListener('message', onMessage);
  }, [mode, send]);
  const srcDoc = useMemo(() => previewDocument(page), [page]);
  return <Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
      <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && setMode(v)} aria-label="Preview type">
        <ToggleButton value="site">In the HP LIFE site</ToggleButton>
        <ToggleButton value="content">Content only</ToggleButton>
      </ToggleButtonGroup>
      <ToggleButtonGroup size="small" exclusive value={device} onChange={(_, v) => v && setDevice(v)} aria-label="Screen width">
        <ToggleButton value="desktop" aria-label="Desktop"><DesktopWindows fontSize="small" /></ToggleButton>
        <ToggleButton value="tablet" aria-label="Tablet"><TabletMac fontSize="small" /></ToggleButton>
        <ToggleButton value="mobile" aria-label="Mobile"><PhoneIphone fontSize="small" /></ToggleButton>
      </ToggleButtonGroup>
    </Stack>
    {mode === 'site'
      ? <Alert severity="info" sx={{ mb: 2 }}>This shows {unsaved ? 'your current edits' : 'the saved page'} inside the learner site's own header and footer. If it stays blank, the learner site preview is not running ({connection.previewFrame}); use Content only.</Alert>
      : <Alert severity="info" sx={{ mb: 2 }}>HTML and CSS only, as stored. Scripts are blocked. The header and footer of the site are not included.</Alert>}
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: '#e9ecf2', p: device === 'desktop' ? 0 : 2, overflow: 'auto' }}>
      <Box sx={{ width: widths[device], maxWidth: '100%', mx: 'auto', bgcolor: '#fff' }}>
        {mode === 'site'
          ? <iframe ref={frame} title="Page preview in the HP LIFE site" src={connection.previewFrame} onLoad={send} sandbox="allow-scripts allow-same-origin allow-popups" style={{ width: '100%', height: 720, border: 0, display: 'block' }} />
          : <iframe title="Page content preview" srcDoc={srcDoc} sandbox="" style={{ width: '100%', height: 720, border: 0, display: 'block' }} />}
      </Box>
    </Box>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{unsaved ? 'Preview of your current edits. Changes are not saved until you save the page.' : 'Preview of the saved page.'}</Typography>
  </Box>;
}
