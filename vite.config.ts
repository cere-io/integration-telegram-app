import { defineConfig, loadEnv } from 'vite';
// import preact from '@preact/preset-vite'; // TonConnect dosn't work with preact. TODO: Figure out why
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tsconfigPaths from 'vite-tsconfig-paths';
import generate from 'vite-plugin-generate-file';
import { ngrok } from 'vite-plugin-ngrok';
import svgr from 'vite-plugin-svgr';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  const appName = env.VITE_APP_NAME;
  const appUrl = env.VITE_APP_URL;

  const plugins = [
    tsconfigPaths(),
    react(),
    svgr(),
    nodePolyfills({
      include: ['buffer'],
    }),

    generate({
      type: 'json',
      output: 'tonconnect-manifest.json',
      data: {
        name: appName,
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
