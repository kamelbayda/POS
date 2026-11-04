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
import { keepAppUpdated } from './lib/appUpdates';

// 3*12, 24x0.75+2... in any number field becomes the result
installMathInputs();

if (location.protocol.startsWith('http')) {
  // Web version: install/offline support. A new version is picked up at start, and while the app
  // stays open it is looked for at quiet moments (see keepAppUpdated).
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true, onRegisteredSW: (_url, registration) => keepAppUpdated(registration) }))
    .catch(() => {});
  // Ask the browser not to evict the shop's local data (products, invoices, licence).
  navigator.storage?.persist?.().catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
