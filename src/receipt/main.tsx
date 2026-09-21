import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { chibiTheme } from '../theme';
import { DigitalReceiptViewer } from '../components/receipt/DigitalReceiptViewer';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={chibiTheme}>
      <CssBaseline />
      <DigitalReceiptViewer />
    </ThemeProvider>
  </StrictMode>
);
