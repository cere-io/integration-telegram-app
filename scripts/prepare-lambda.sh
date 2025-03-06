#!/bin/bash

set -e

echo "➡ Removing old directory and creating new one..."
rm -rf lambda-build lambda-package.zip
mkdir -p lambda-build/tests

echo "➡ Copying test files..."
cp tests/integration.spec.js lambda-build/tests/

echo "➡ Creating package.json..."
cat > lambda-build/package.json << EOL
{
  "name": "lambda-tests",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "node tests/integration.spec.js"
  },
  "dependencies": {
    "@playwright/test": "^1.50.1",
    "playwright-core": "^1.50.1"
  }
}
EOL

echo "➡ Creating Lambda handler..."
cat > lambda-build/index.js << EOL
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  try {
    // Установка переменных окружения для Playwright
    process.env.PLAYWRIGHT_BROWSERS_PATH = '/tmp';
    process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';

    // Проверяем наличие директории с Chromium
    const chromiumDir = path.join(__dirname, '.cache', 'ms-playwright', 'chromium-1091');
    if (fs.existsSync(chromiumDir)) {
      // Копируем файлы Chromium в /tmp
      execSync(\`cp -r \${chromiumDir} /tmp/\`, { stdio: 'inherit' });
    }

    // Запускаем тесты
    execSync('npm test', { stdio: 'inherit' });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Tests completed successfully' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
EOL

cd lambda-build

echo "➡ Installing dependencies..."
npm install

echo "➡ Preparing directory for Chromium..."
mkdir -p .cache/ms-playwright/chromium-1091

if [ -d "/opt/chromium" ]; then
  echo "➡ Copying Chromium..."
  cp -r /opt/chromium/* .cache/ms-playwright/chromium-1091/
else
  echo "⚠️ Chromium not found in /opt/chromium, skipping copy"
fi

echo "➡ Removing unnecessary files..."
find node_modules -name "*.map" -delete
find node_modules -name "*.d.ts" -delete
find node_modules -name "*.md" -delete
find node_modules -name "LICENSE*" -delete
find node_modules -name "CHANGELOG*" -delete
find node_modules -name "README*" -delete

cd ..
echo "➡ Creating ZIP archive..."
cd lambda-build && zip -9 -r ../lambda-package.zip . && cd ..

echo "➡ Cleaning up temporary files..."
rm -rf lambda-build

echo "✅ Lambda package built successfully!"
