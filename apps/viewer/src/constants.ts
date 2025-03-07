import npmPackage from '../../../package.json';

export const APP_VERSION = npmPackage.version;
export const APP_ENV = import.meta.env.VITE_APP_ENV || 'dev';
export const TELEGRAM_APP_URL = import.meta.env.VITE_TELEGRAM_APP_URL;
export const TELEGRAM_BOT_ID = import.meta.env.VITE_TELEGRAM_BOT_ID;

export const EVENT_DISPATCH_URL = import.meta.env.VITE_EVENT_DISPATCH_URL;
export const EVENT_LISTEN_URL = import.meta.env.VITE_EVENT_LISTEN_URL;

export const MINI_APP_APP_ID = import.meta.env.VITE_MINI_APP_APP_ID;
export const MINI_APP_DATA_SERVICE_PUBLIC_KEY = import.meta.env.VITE_MINI_APP_DATA_SERVICE_PUBLIC_KEY;
export const MINI_APP_APP_PUBLIC_KEY = import.meta.env.VITE_MINI_APP_APP_PUBLIC_KEY;

export const ENGAGEMENT_TIMEOUT_DURATION = 3000;

export const AGENT_SERVICE_REGISTRY_URL = import.meta.env.VITE_AGENT_SERVICE_REGISTRY_URL;
export const RMS_URL = import.meta.env.VITE_RMS_URL;

export const VIDEO_SEGMENT_LENGTH = import.meta.env.VITE_APP_VIDEO_SEGMENT_LENGTH || 10;
