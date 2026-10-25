import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, AppBar, Box, Breadcrumbs, Button, Chip, CircularProgress, Container, IconButton, InputAdornment, Paper, Stack, TextField, Toolbar, Typography } from '@mui/material';
import { Logout, Visibility, VisibilityOff } from '@mui/icons-material';
import { connection } from '../lib/config';
import { clearSession, readSession, saveSession, sessionUser, signInRequest } from '../lib/client';

// Sign-in gate plus the page frame. Everything inside only renders for a signed-in editor.
function SignIn({ onSignedIn, notice }) {
  const [username, setUsername] = useState(''), [password, setPassword] = useState(''), [show, setShow] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(notice || '');
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { const result = await signInRequest(username, password); saveSession(result.accessToken, result.expiresIn, result.user); setPassword(''); onSignedIn(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Box component="main" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3 }}>
    <Paper variant="outlined" sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 } }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <Box component="img" src="/brand/logo.svg" alt="HP LIFE" sx={{ height: 40 }} />
        <Typography variant="h6">Content Manager</Typography>
      </Stack>
      <Chip label={connection.name} size="small" variant="outlined" sx={{ mb: 2 }} />
      <Typography component="h1" variant="h5" gutterBottom>Sign in</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Use your existing CMS account.</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box component="form" onSubmit={submit}>
        <Stack spacing={2.5}>
          <TextField label="Email" type="email" name="username" autoComplete="username" required fullWidth value={username} onChange={e => setUsername(e.target.value)} disabled={busy} slotProps={{ htmlInput: { maxLength: 320 } }} />
          <TextField label="Password" type={show ? 'text' : 'password'} name="password" autoComplete="current-password" required fullWidth value={password} onChange={e => setPassword(e.target.value)} disabled={busy}
            slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(v => !v)} edge="end">{show ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> } }} />
          <Button type="submit" variant="contained" size="large" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
        </Stack>
      </Box>
    </Paper>
  </Box>;
}

export function useSignedIn() {
  const [state, setState] = useState('checking');
  useEffect(() => { setState(readSession() ? 'in' : 'out'); }, []);
  return [state, setState];
}

export default function Shell({ crumbs = [], title, actions, children }) {
  const [state, setState] = useSignedIn();
  const user = state === 'in' ? sessionUser() : null;
  if (state === 'checking') return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><CircularProgress aria-label="Loading" /></Box>;
  if (state === 'out') return <SignIn onSignedIn={() => setState('in')} />;
  return <Box sx={{ minHeight: '100vh' }}>
    <a className="skip-link" href="#content">Skip to main content</a>
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar sx={{ gap: 2 }}>
        <Link href="/" aria-label="Sites" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
          <Box component="img" src="/brand/logo.svg" alt="HP LIFE" sx={{ height: 36 }} />
          <Typography variant="h6" sx={{ display: { xs: 'none', sm: 'block' } }}>Content Manager</Typography>
        </Link>
        <Chip label={connection.name} size="small" variant="outlined" sx={{ ml: 1 }} />
        
        <Box sx={{ flex: 1 }} />
        {user?.name && <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>Signed in as {user.name}{user.roles.length ? ` (${user.roles.join(', ')})` : ''}</Typography>}
        <Button startIcon={<Logout />} onClick={() => { clearSession(); setState('out'); }}>Sign out</Button>
      </Toolbar>
    </AppBar>
    <Container id="content" maxWidth="xl" sx={{ py: 4 }}>
      {crumbs.length > 0 && <Breadcrumbs sx={{ mb: 1.5, fontSize: 14 }}>{crumbs.map(([label, href]) => href ? <Link key={label} href={href} style={{ color: 'inherit' }}>{label}</Link> : <Typography key={label} color="text.primary" fontSize={14}>{label}</Typography>)}</Breadcrumbs>}
      {(title || actions) && <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography component="h1" variant="h4">{title}</Typography>
        {actions}
      </Stack>}
      {children}
    </Container>
  </Box>;
}

