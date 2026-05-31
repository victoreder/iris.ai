/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_PUBLIC_URL: string;
  readonly VITE_BACKEND_URL: string;
  readonly VITE_GO_URL: string;
  readonly VITE_QR_PUBLIC_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
