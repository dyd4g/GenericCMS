import { createTheme } from '@mui/material/styles';

// A calm, editor-focused look for the CMS. The learner site keeps the HP LIFE look; this tool only borrows its blue and its font.
export const theme = createTheme({
  cssVariables: true,
  palette: {
    primary: { main: '#024AD8', dark: '#0036C4', light: '#E4EEFA' },
    secondary: { main: '#2C3038' },
    success: { main: '#1b7f3b', light: '#e3f4e8' },
    warning: { main: '#9a6200', light: '#fff4dc' },
    background: { default: '#f4f6f9', paper: '#ffffff' },
    text: { primary: '#1d2230', secondary: '#5b6475' },
    divider: '#e3e7ee',
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"FormaDJRUIRegular", "Segoe UI", Arial, sans-serif',
    h4: { fontSize: 26, fontWeight: 600, letterSpacing: -0.3 },
    h5: { fontSize: 20, fontWeight: 600 },
    h6: { fontSize: 16, fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTableCell: { styleOverrides: { head: { fontSize: 12, fontWeight: 600, color: '#5b6475', background: '#fafbfd', textTransform: 'uppercase', letterSpacing: 0.4 } } },
    MuiTab: { styleOverrides: { root: { minHeight: 44 } } },
  },
});
