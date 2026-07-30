/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Gateway origin. Unset → https://gateway.duynh.me.
   * An explicit "" means same-origin (deliberate `??` semantics in config.ts).
   */
  readonly VITE_API_BASE_URL: string | undefined;
  /** "true" enables the in-app mock API. Any other value is off. */
  readonly VITE_USE_MOCK: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
