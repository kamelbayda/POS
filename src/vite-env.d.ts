/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Licence server (super-app-backend/worker), e.g. https://pos-licensing.<account>.workers.dev */
  readonly VITE_LICENSE_SERVER_URL?: string;
  /** Licence signing public key (base64 SPKI), shown on the licence server's /admin page. */
  readonly VITE_LICENSE_PUBLIC_KEY?: string;
  /** "true" to use the local Firebase emulators (auth :9099, firestore :8080). */
  readonly VITE_FIREBASE_EMULATOR?: string;
}
