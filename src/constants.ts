import npmPackage from '../package.json';

export const APP_VERSION = npmPackage.version;
export const APP_ENV = import.meta.env.VITE_APP_ENV || 'dev';
export const APP_URL = import.meta.env.VITE_APP_URL;
export const TONCONNECT_MANIFEST_URL = new URL('/tonconnect-manifest.json', APP_URL).href;
export const TELEGRAM_APP_URL = import.meta.env.VITE_TELEGRAM_APP_URL;
export const TELEGRAM_BOT_URL = import.meta.env.VITE_TELEGRAM_BOT_URL;
export const DEFAULT_START_PARAM = import.meta.env.VITE_DEFAULT_START_PARAM || undefined;
