/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of super-app-backend, e.g. https://xxx.up.railway.app */
  readonly VITE_LICENSE_SERVER_URL?: string;
  /** Licence signing public key (base64 SPKI), from `npm run generate-license-keys` in the backend. */
  readonly VITE_LICENSE_PUBLIC_KEY?: string;
}
