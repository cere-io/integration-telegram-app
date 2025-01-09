/// <reference types="vite/client" />

declare module '*.svg?react' {
  import { FunctionComponent, SVGAttributes } from 'react';
  const content: FunctionComponent<SVGAttributes<SVGElement>>;

  export default content;
}

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string;
  readonly VITE_APP_ENV: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_URL: string;
  readonly VITE_TELEGRAM_BOT_URL: string;
  readonly VITE_TELEGRAM_APP_URL: `${string}://${string}`;
}

declare global {
  interface Window {
    Telegram: {
      WebApp: {
        initData: string;
        initDataUnsafe?: Record<string, unknown>;
        [key: string]: any;
      };
    };
  }
}
