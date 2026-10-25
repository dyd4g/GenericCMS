import '../styles.css';
import Head from 'next/head';
import { AppCacheProvider } from '@mui/material-nextjs/v15-pagesRouter';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../theme';

export default function App(props) {
  const { Component, pageProps } = props;
  return <AppCacheProvider {...props}>
    <Head><meta name="viewport" content="width=device-width, initial-scale=1" /><title>HP LIFE CMS</title></Head>
    <ThemeProvider theme={theme}><CssBaseline /><Component {...pageProps} /></ThemeProvider>
  </AppCacheProvider>;
}
