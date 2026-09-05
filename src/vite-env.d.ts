/// <reference types="vite/client" />

// Tipagem das variáveis de ambiente Vite usadas pelo client (ver src/config/env.ts).
// Sem a declaração, `import.meta.env.VITE_*` cai na index signature `any` do
// vite/client; com ela, cada acesso é `string | undefined`.
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
}

declare const __APP_VERSION__: string;

declare module '*.css' {
  const content: string;
  export default content;
}
