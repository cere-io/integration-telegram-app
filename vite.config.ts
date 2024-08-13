import { defineConfig, loadEnv } from 'vite';
// import preact from '@preact/preset-vite'; // TonConnect dosn't work with preact. TODO: Figure out why
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import generate from 'vite-plugin-generate-file';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  const appName = env.VITE_APP_NAME;
  const appUrl = env.VITE_APP_URL || 'https://localhost:5000';

  const url = new URL(appUrl);
  const appHost = url.hostname;
  const devPort = +url.port || 5000;

  return {
    plugins: [
      tsconfigPaths(),
      react(),
      generate({
        type: 'json',
        output: 'tonconnect-manifest.json',
        data: {
          appName,
          url: appUrl,
          iconUrl: new URL('/icon.png', appUrl).href,
        },
      }),

      mkcert({
        hosts: [appHost],
      }),
    ],

    preview: {
      port: devPort,
      host: appHost,
    },

    server: {
      port: devPort,
      host: appHost,
    },
  };
});
