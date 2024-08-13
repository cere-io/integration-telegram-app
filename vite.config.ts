import { defineConfig, loadEnv } from 'vite';
// import preact from '@preact/preset-vite'; // TonConnect dosn't work with preact. TODO: Figure out why
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import generate from 'vite-plugin-generate-file';
import { ngrok } from 'vite-plugin-ngrok';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  const appName = env.VITE_APP_NAME;
  const appUrl = env.VITE_APP_URL;

  const plugins = [
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
  ];

  if (env.VITE_NGROK_AUTH_TOKEN) {
    plugins.push(
      ngrok({
        authtoken: env.VITE_NGROK_AUTH_TOKEN,
        domain: env.VITE_NGROK_DOMAIN || undefined,
      }),
    );
  }

  return {
    plugins,
  };
});
