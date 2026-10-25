import { forwardRef, useDeferredValue, useState } from 'react';
import { Box, Button, Dialog, DialogContent, DialogTitle, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import CodeEditor from './CodeEditor';
import PagePreview from './PagePreview';

const SourceWorkspace = forwardRef(function SourceWorkspace({ value, onChange, language, label, disabled, stateCache, page }, ref) {
  const [layout, setLayout] = useState('split'), [expanded, setExpanded] = useState(false);
  const preview = useDeferredValue(page);
  const workspace = <Stack spacing={2}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="space-between">
      <ToggleButtonGroup exclusive size="small" value={layout} onChange={(_, next) => next && setLayout(next)} aria-label="Editor layout"><ToggleButton value="code">Code only</ToggleButton><ToggleButton value="split">Code and preview</ToggleButton></ToggleButtonGroup>
      <Button onClick={() => setExpanded(value => !value)}>{expanded ? 'Close expanded editor' : 'Expand editor'}</Button>
    </Stack>
    <Typography variant="body2" color="text.secondary">Edit the original {language === 'css' ? 'CSS' : 'HTML'}. Existing classes and layout stay intact. Preview changes before saving.</Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: layout === 'split' ? 'minmax(0,1.1fr) minmax(0,1fr)' : 'minmax(0,1fr)' }, gap: 3, alignItems: 'start' }}>
      <CodeEditor ref={ref} value={value} onChange={onChange} language={language} label={label} disabled={disabled} stateCache={stateCache} />
      {layout === 'split' && <Box sx={{ minWidth: 0 }}><PagePreview page={preview} unsaved /></Box>}
    </Box>
  </Stack>;
  return expanded ? <Dialog fullScreen open onClose={() => setExpanded(false)}><DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>{label}</DialogTitle><DialogContent sx={{ pt: '24px !important' }}>{workspace}</DialogContent></Dialog> : workspace;
});
export default SourceWorkspace;
