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
    "playwright-core": "^1.40.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3",
    "@types/node": "^20.11.19",
    "tslib": "^2.6.2"
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

    execSync('./node_modules/.bin/ts-node tests/integration.spec.ts', { stdio: 'inherit' });

    return { statusCode: 200, body: JSON.stringify({ message: 'Tests passed ✅' }) };
  } catch (error) {
    console.error("❌ Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
EOL

cd lambda-build

echo "➡ Removing old dependencies..."
rm -rf node_modules package-lock.json

echo "➡ Installing dependencies and creating package-lock.json..."
npm install

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

cd ..
echo "➡ Creating ZIP archive..."
cd lambda-build && zip -r ../lambda-package.zip . && cd ..

echo "➡ Cleaning up temporary files..."
rm -rf lambda-build

echo "✅ Lambda package built successfully!"
