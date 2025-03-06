#!/bin/bash

rm -rf lambda-build
mkdir lambda-build

cp package.json package-lock.json lambda-build/
cp -r tests lambda-build/

cat > lambda-build/index.js << 'EOL'
const { execSync } = require('child_process');

exports.handler = async (event) => {
  try {
    process.env.PLAYWRIGHT_BROWSERS_PATH = '/tmp';
    process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';

    execSync('npx playwright test tests/integration.spec.ts', { stdio: 'inherit' });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Tests completed successfully' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
EOL

cd lambda-build
npm install --omit=dev playwright-core @playwright/test

mkdir -p .cache/ms-playwright/chromium-1091/chrome-mac/Chromium.app/Contents/MacOS/
cp ../.cache/ms-playwright/chromium-1091/chrome-mac/Chromium.app/Contents/MacOS/Chromium .cache/ms-playwright/chromium-1091/chrome-mac/Chromium.app/Contents/MacOS/

find node_modules -type f -name "*.d.ts" -delete
find node_modules -type f -name "*.map" -delete
find node_modules -type f -name "*.ts" -delete
find node_modules -type f -name "*.tsx" -delete
find node_modules -type f -name "*.jsx" -delete
find node_modules -type f -name "*.md" -delete
find node_modules -type f -name "*.txt" -delete
find node_modules -type f -name "*.json" ! -name "package.json" -delete
find node_modules -type d -name "test" -exec rm -rf {} +
find node_modules -type d -name "tests" -exec rm -rf {} +
find node_modules -type d -name "docs" -exec rm -rf {} +
find node_modules -type d -name "examples" -exec rm -rf {} +
find node_modules -type d -name "src" -exec rm -rf {} +
find node_modules -type d -name "dist" -exec rm -rf {} +

find node_modules -type d -name "cjs" -exec rm -rf {} +
find node_modules -type d -name "esm" -exec rm -rf {} +
find node_modules -type d -name "es" -exec rm -rf {} +

find node_modules -type d -name "locale" -exec rm -rf {} +
find node_modules -type d -name "firefox" -exec rm -rf {} +
find node_modules -type d -name "webkit" -exec rm -rf {} +

find node_modules/@polkadot -type f -name "*.wasm" -delete
find node_modules/@polkadot -type f -name "*.wasm.js" -delete
find node_modules/@polkadot -type f -name "*.wasm.wasm" -delete
find node_modules/@polkadot -type f -name "*.wasm.js.map" -delete
find node_modules/@polkadot -type f -name "*.wasm.wasm.map" -delete

find node_modules/@cere -type f -name "*.wasm" -delete
find node_modules/@cere -type f -name "*.wasm.js" -delete
find node_modules/@cere -type f -name "*.wasm.wasm" -delete
find node_modules/@cere -type f -name "*.wasm.js.map" -delete
find node_modules/@cere -type f -name "*.wasm.wasm.map" -delete

find node_modules -type f -name "*.wasm" -delete
find node_modules -type f -name "*.wasm.js" -delete
find node_modules -type f -name "*.wasm.wasm" -delete
find node_modules -type f -name "*.wasm.js.map" -delete
find node_modules -type f -name "*.wasm.wasm.map" -delete

find node_modules -type d -empty -delete

cd ..
zip -r lambda-package.zip lambda-build/*

rm -rf lambda-build

echo "Package for Lambda prepared successfully"
