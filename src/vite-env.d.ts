/// <reference types="vite/client" />

import type { HostRuntimeConfig } from './config/runtime';

declare global {
  interface Window {
    __EDUCATIONMIND_CONFIG__?: HostRuntimeConfig;
  }
}

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string;
  readonly VITE_EDUCATION_API_URL?: string;
}
