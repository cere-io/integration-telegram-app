// import preact from '@preact/preset-vite'; // TonConnect dosn't work with preact. TODO: Figure out why
import react from '@vitejs/plugin-react';
import * as path from 'path';
import { defineConfig, loadEnv, searchForWorkspaceRoot } from 'vite';
import { ngrok } from 'vite-plugin-ngrok';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

const rootDir = searchForWorkspaceRoot(__dirname);
const outDir = path.join(rootDir, 'dist', path.basename(__dirname));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  const plugins = [
    tsconfigPaths({ root: __dirname }),
    react(),
    svgr(),
    nodePolyfills({
      include: ['buffer'],
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
    base: './',
    envDir: rootDir,
    build: { outDir, emptyOutDir: true },
    plugins,
    server: {
      port: 5174,
    },
  };
});
