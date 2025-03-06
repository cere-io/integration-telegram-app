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
    "@playwright/test": "^1.40.0",
    "playwright-core": "^1.40.0"
  }
}
EOL

echo "➡ Creating Playwright test..."
cat > lambda-build/tests/integration.spec.ts << EOL
import { test, expect } from '@playwright/test';

test('basic test', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example Domain/);
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

    execSync('npx playwright test', { stdio: 'inherit' });

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

cd ..
echo "➡ Creating ZIP archive..."
zip -rq lambda-package.zip lambda-build

echo "➡ Cleaning up temporary files..."
rm -rf lambda-build

echo "✅ Lambda package built successfully!"
