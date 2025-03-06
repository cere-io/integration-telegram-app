#!/bin/bash

set -e

echo "➡ Removing old directory and creating new one..."
rm -rf lambda-build lambda-package.zip
mkdir -p lambda-build/tests

echo "➡ Creating package.json..."
cat > lambda-build/package.json << EOL
{
  "name": "lambda-tests",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "playwright-core": "^1.40.0"
  }
}
EOL

echo "➡ Creating Playwright test..."
cat > lambda-build/tests/integration.spec.ts << EOL
import { chromium } from 'playwright-core';

test('basic test', async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://example.com');
  await expect(page.title()).resolves.toMatch(/Example Domain/);
  await browser.close();
});
EOL

echo "➡ Creating Lambda handler..."
cat > lambda-build/index.js << EOL
const { execSync } = require('child_process');
const fs = require('fs');

exports.handler = async () => {
  try {
    console.log("➡ Running Playwright tests...");
    
    process.env.PLAYWRIGHT_BROWSERS_PATH = '/tmp/ms-playwright';
    process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';

    const browserDir = '/tmp/ms-playwright';
    if (!fs.existsSync(browserDir)) fs.mkdirSync(browserDir, { recursive: true });

    if (fs.existsSync('/opt/chromium')) {
      execSync('cp -r /opt/chromium/* /tmp/ms-playwright/chromium-*');
    } else {
      console.log("⚠️ Chromium not found in /opt/chromium, skipping copy");
    }

    execSync('node tests/integration.spec.js', { stdio: 'inherit' });

    return { statusCode: 200, body: JSON.stringify({ message: 'Tests passed ✅' }) };
  } catch (error) {
    console.error("❌ Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
EOL

cd lambda-build

echo "➡ Installing dependencies..."
npm install

echo "➡ Installing TypeScript and ts-jest..."
npm install --save-dev typescript ts-jest @types/jest @types/node

echo "➡ Creating tsconfig.json..."
cat > tsconfig.json << EOL
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": ".",
    "rootDir": "."
  },
  "include": ["tests/**/*"],
  "exclude": ["node_modules"]
}
EOL

echo "➡ Compiling TypeScript..."
npx tsc

echo "➡ Installing production dependencies..."
npm ci --omit=dev

echo "➡ Preparing directory for Chromium..."
mkdir -p node_modules/.cache/playwright-core/chromium-*

if [ -d "/opt/chromium" ]; then
  echo "➡ Copying Chromium..."
  cp -r /opt/chromium/* node_modules/.cache/playwright-core/chromium-*/
else
  echo "⚠️ Chromium not found in /opt/chromium, skipping copy"
fi

echo "➡ Removing unnecessary files..."
rm -rf node_modules/playwright-core/types
rm -rf node_modules/playwright-core/lib/vite
rm -rf node_modules/playwright-core/lib/utilsBundleImpl
rm -rf node_modules/playwright-core/lib/transform
rm -rf node_modules/playwright-core/lib/server/trace
rm -rf node_modules/playwright-core/lib/server/recorder
rm -rf node_modules/playwright-core/lib/server/codegen
rm -rf node_modules/playwright-core/lib/server/bidi
rm -rf node_modules/playwright-core/lib/server/android
rm -rf node_modules/playwright-core/lib/server/electron
rm -rf node_modules/playwright-core/lib/server/firefox
rm -rf node_modules/playwright-core/lib/server/webkit

find node_modules -name "*.map" -delete
find node_modules -name "*.d.ts" -delete
find node_modules -name "*.ts" -delete
find node_modules -name "*.md" -delete
find node_modules -name "LICENSE*" -delete
find node_modules -name "CHANGELOG*" -delete
find node_modules -name "README*" -delete

rm -rf node_modules/typescript/lib/lib.*.d.ts
rm -rf node_modules/typescript/lib/pl
rm -rf node_modules/typescript/lib/ja
rm -rf node_modules/typescript/lib/it
rm -rf node_modules/typescript/lib/cs
rm -rf node_modules/typescript/lib/ru
rm -rf node_modules/typescript/lib/zh-cn
rm -rf node_modules/typescript/lib/zh-tw
rm -rf node_modules/typescript/lib/pt-br
rm -rf node_modules/typescript/lib/de
rm -rf node_modules/typescript/lib/ko
rm -rf node_modules/typescript/lib/fr
rm -rf node_modules/typescript/lib/es
rm -rf node_modules/typescript/lib/tr

cd ..
echo "➡ Creating ZIP archive..."
cd lambda-build && zip -9 -r ../lambda-package.zip . && cd ..

echo "➡ Cleaning up temporary files..."
rm -rf lambda-build

echo "✅ Lambda package built successfully!"
