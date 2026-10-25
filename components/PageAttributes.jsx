import { Alert, Box, Button, Checkbox, Chip, FormControl, FormHelperText, InputLabel, ListItemText, MenuItem, Select, Stack, Typography } from '@mui/material';
import { selectAttribute } from '../lib/page-attributes';

function AttributeFields({ definitions, attributes, onChange, disabled }) {
  return <Stack spacing={3}>{definitions.map(definition => {
    const selected = attributes[definition.id] || [];
    const values = definition.values || [];
    const unknown = selected.filter(id => !values.some(value => value.id === id));
    const labelId = `page-attribute-${definition.id}`;
    return <Box key={definition.id}>
      <FormControl fullWidth required={definition.isRequired} disabled={disabled || !values.length}>
        <InputLabel id={labelId}>{definition.name}</InputLabel>
        <Select labelId={labelId} label={definition.name} multiple={definition.allowMultiSelection} value={definition.allowMultiSelection ? selected : selected[0] ?? ''}
          renderValue={value => {
            const ids = Array.isArray(value) ? value : [value];
            return <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>{ids.map(id => <Chip key={id} size="small" label={values.find(v => v.id === id)?.value || `Existing value (${id})`} />)}</Box>;
          }}
          onChange={event => {
            const value = event.target.value;
            const ids = Array.isArray(value) ? value : value === '' ? [] : [value];
            onChange(selectAttribute(definition, ids, attributes));
          }}>
          {!definition.allowMultiSelection && <MenuItem value=""><em>None</em></MenuItem>}
          {unknown.map(id => <MenuItem key={id} value={id} disabled>Existing value ({id})</MenuItem>)}
          {values.map(value => <MenuItem key={value.id} value={value.id}>
            {definition.allowMultiSelection && <Checkbox checked={selected.includes(value.id)} />}
            <ListItemText primary={value.value} />
          </MenuItem>)}
        </Select>
        <FormHelperText>{definition.description || (definition.allowMultiSelection ? 'Select one or more values.' : 'Select one value.')}{!values.length ? ' No values are configured.' : ''}</FormHelperText>
      </FormControl>
      {unknown.length > 0 && <Alert severity="warning" sx={{ mt: 1 }}>Some saved values are no longer listed. They are preserved until you change this selection.</Alert>}
      {values.filter(value => selected.includes(value.id) && value.attributes?.length).map(value => <Box key={value.id} sx={{ mt: 2, pl: { xs: 2, md: 3 }, borderLeft: 2, borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{value.value}</Typography>
        <AttributeFields definitions={value.attributes} attributes={attributes} onChange={onChange} disabled={disabled} />
      </Box>)}
    </Box>;
  })}</Stack>;
}

export default function PageAttributes({ result, attributes, onChange, disabled, retry }) {
  if (result.loading) return <Typography role="status">Loading page attributes…</Typography>;
  if (result.error) return <Alert severity="error" action={<Button color="inherit" onClick={retry}>Retry</Button>}>{result.error} Existing selections are preserved.</Alert>;
  if (!result.data?.length) return <Alert severity="info">No page attributes are configured for this site.</Alert>;
  return <Stack spacing={3}>
    <Typography variant="body2" color="text.secondary">Choose the attributes for this page. Dependent fields appear below their selected value. Changes are included when you save the page.</Typography>
    <AttributeFields definitions={result.data} attributes={attributes} onChange={onChange} disabled={disabled} />
  </Stack>;
}
