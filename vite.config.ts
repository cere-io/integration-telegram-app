import { defineConfig } from 'vite';
// import preact from '@preact/preset-vite'; // TonConnect dosn't work with preact. TODO: Figure out why
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import generate from 'vite-plugin-generate-file';
import mkcert from 'vite-plugin-mkcert';

const tonconnectManifest = () =>
  generate({
    type: 'json',
    output: 'tonconnect-manifest.json',
    data: {
      appName: 'TG Mini App',
      url: 'https://tg-mini-app.local',
      iconUrl: 'https://tg-mini-app.local/icon.png',
    },
  });

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    react(),
    tonconnectManifest(),
    mkcert({
      hosts: ['tg-mini-app.local'],
    }),
  ],

  server: {
    port: 5000,
    host: 'tg-mini-app.local',
  },
});
