import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import '@fontsource/cairo/300.css';
import '@fontsource/cairo/400.css';
import '@fontsource/cairo/500.css';
import '@fontsource/cairo/600.css';
import '@fontsource/cairo/700.css';
import '@fontsource/cairo/800.css';
import '@fontsource/cairo/900.css';
import './index.css';
import { installMathInputs } from './lib/mathInputs';
import { keepAppUpdated, newVersionWaiting } from './lib/appUpdates';
import { UpdateBanner } from './components/UpdateBanner';

// 3*12, 24x0.75+2... in any number field becomes the result
installMathInputs();

if (location.protocol.startsWith('http')) {
  // Web version: install/offline support. A new version downloads in the background and a message
  // asks to close and reopen the app (see appUpdates.ts).
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh: () => newVersionWaiting(updateSW),
        onRegisteredSW: (_url, registration) => keepAppUpdated(registration),
      });
    })
    .catch(() => {});
  // Ask the browser not to evict the shop's local data (products, invoices, licence).
  navigator.storage?.persist?.().catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <UpdateBanner />
  </StrictMode>,
);
