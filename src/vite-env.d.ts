/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_SYSTEM_API_KEY?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
