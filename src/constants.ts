export const APP_URL = import.meta.env.VITE_APP_URL;
export const TONCONNECT_MANIFEST_URL = new URL('/tonconnect-manifest.json', APP_URL).href;
