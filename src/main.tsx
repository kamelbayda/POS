import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (location.protocol.startsWith('http')) {
  // Web version: install/offline support. The new version activates on the next start.
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true })).catch(() => {});
  // Ask the browser not to evict the shop's local data (products, invoices, licence).
  navigator.storage?.persist?.().catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
