#!/bin/bash

set -e

# Определяем корень проекта для корректных путей
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "➡ Removing old directory and creating new one..."
rm -rf "$PROJECT_ROOT/lambda-build" "$PROJECT_ROOT/lambda-package.zip"
mkdir -p "$PROJECT_ROOT/lambda-build/tests"

echo "➡ Copying test files..."
cp "$PROJECT_ROOT/tests/integration.spec.js" "$PROJECT_ROOT/lambda-build/tests/"

echo "➡ Creating package.json..."
cat > "$PROJECT_ROOT/lambda-build/package.json" << EOL
{
  "name": "lambda-tests",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "playwright test"
  },
  "dependencies": {
    "@playwright/test": "^1.40.0",
    "playwright": "^1.40.0",
    "playwright-core": "^1.40.0",
    "tar": "^6.2.0"
  }
}
EOL

echo "➡ Creating playwright.config.js..."
cat > "$PROJECT_ROOT/lambda-build/playwright.config.js" << EOL
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  reporter: [['list', { outputDir: '/tmp/test-results' }]],
  outputDir: '/tmp/test-results',
});
EOL

echo "➡ Creating run-tests.js..."
cat > "$PROJECT_ROOT/lambda-build/run-tests.js" << EOL
import { spawn } from 'child_process';
import path from 'path';

async function runTests() {
  return new Promise((resolve) => {
    const playwright = spawn('npx', [
      'playwright',
      'test',
      '--config=playwright.config.js'
    ], { 
      env: {
        ...process.env,
        PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH,
        PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1',
        NODE_PATH: process.env.NODE_PATH || '/var/task/node_modules'
      },
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    playwright.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      console.log(chunk);
    });
    
    playwright.stderr.on('data', (data) => {
      const chunk = data.toString();
      errorOutput += chunk;
      console.error(chunk);
    });
    
    playwright.on('close', (code) => {
      resolve({
        success: code === 0,
        output,
        errorOutput,
        code
      });
    });
  });
}

export { runTests };
EOL

echo "➡ Creating Lambda handler..."
cat > "$PROJECT_ROOT/lambda-build/index.js" << EOL
import { mkdir } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { pipeline } from 'stream/promises';
import os from 'os';
import tar from 'tar';
import { runTests } from './run-tests.js';

const CHROMIUM_URL = 'https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar';

// Функция для загрузки файла с поддержкой редиректов
async function downloadFile(url, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      followRedirects: true
    }, response => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        const newUrl = new URL(response.headers.location, url).toString();
        downloadFile(newUrl, destination).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(\`Failed to download: \${response.statusCode}\`));
        return;
      }
      
      const fileStream = fs.createWriteStream(destination);
      pipeline(response, fileStream)
        .then(() => resolve())
        .catch(err => reject(err));
    });
    
    request.on('error', reject);
  });
}

// Функция для распаковки Chromium
async function extractChromium(archivePath, outputDir) {
  await mkdir(outputDir, { recursive: true });
  
  await tar.extract({
    file: archivePath,
    cwd: outputDir,
    strip: 1
  });
  
  const chromePath = path.join(outputDir, 'chrome');
  if (fs.existsSync(chromePath)) {
    fs.chmodSync(chromePath, 0o755);
  }
  
  await fs.promises.unlink(archivePath);
}

// Главная функция
export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const region = event.region || 'unknown';
    const environment = event.environment || 'unknown';
    
    console.log(\`Running tests in \${region} for \${environment}\`);
    
    // Подготовка директорий
    const tmpDir = os.tmpdir();
    const browserDir = path.join(tmpDir, 'chromium');
    const chromePath = path.join(browserDir, 'chrome');
    
    // Установка Chromium если его нет
    if (!fs.existsSync(chromePath)) {
      console.log('Installing Chromium...');
      const archivePath = path.join(tmpDir, 'chromium.tar');
      
      await downloadFile(CHROMIUM_URL, archivePath);
      await extractChromium(archivePath, browserDir);
      
      console.log('Chromium installed successfully');
    }
    
    // Настройка переменных окружения для Playwright
    process.env.PLAYWRIGHT_BROWSERS_PATH = browserDir;
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = chromePath;
    process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
    process.env.NODE_PATH = '/var/task/node_modules';
    
    // Запуск тестов
    console.log('Starting Playwright tests...');
    const result = await runTests();
    
    return {
      statusCode: result.success ? 200 : 500,
      body: JSON.stringify({
        success: result.success,
        output: result.output,
        errorOutput: result.errorOutput,
        region,
        environment
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
};
EOL

echo "➡ Creating bootstrap script..."
cat > "$PROJECT_ROOT/lambda-build/bootstrap" << EOL
#!/bin/sh
set -euo pipefail

export LAMBDA_TASK_ROOT="/var/task"
export PATH="\${LAMBDA_TASK_ROOT}/node_modules/.bin:\${PATH}"
export NODE_PATH="\${LAMBDA_TASK_ROOT}/node_modules"

while true
do
  HEADERS="\$(mktemp)"
  EVENT_DATA="\$(mktemp)"
  
  curl -sS -LD "\$HEADERS" -o "\$EVENT_DATA" "http://\${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/next"
  
  REQUEST_ID=\$(grep -Fi Lambda-Runtime-Aws-Request-Id "\$HEADERS" | tr -d '[:space:]' | cut -d: -f2)
  
  node --experimental-vm-modules --input-type=module -e "import { handler } from './index.js'; handler(JSON.parse(process.argv[1]))" "\$(cat \$EVENT_DATA)" > /tmp/output.json || true
  
  curl -s -X POST "http://\${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/\$REQUEST_ID/response" -d "\$(cat /tmp/output.json)"
done
EOL

chmod +x "$PROJECT_ROOT/lambda-build/bootstrap"

echo "➡ Installing dependencies..."
cd "$PROJECT_ROOT/lambda-build"
npm install

echo "➡ Cleaning up unnecessary files..."
find node_modules -name "*.map" -delete 2>/dev/null || true
find node_modules -name "*.d.ts" -delete 2>/dev/null || true
find node_modules -name "*.md" -delete 2>/dev/null || true
find node_modules -name "LICENSE*" -delete 2>/dev/null || true
find node_modules -name "example*" -type d -exec rm -rf {} \; 2>/dev/null || true
find node_modules -name "test" -type d -exec rm -rf {} \; 2>/dev/null || true
find node_modules -name "docs" -type d -exec rm -rf {} \; 2>/dev/null || true

echo "➡ Removing pre-bundled browsers..."
find node_modules -path "*/playwright*/browsers" -type d -exec rm -rf {} \; 2>/dev/null || true
find node_modules -path "*/.cache/ms-playwright" -type d -exec rm -rf {} \; 2>/dev/null || true

echo "➡ Creating ZIP archive..."
cd "$PROJECT_ROOT/lambda-build" && zip -9 -r ../lambda-package.zip . && cd ..

echo "➡ Final package size:"
du -sh lambda-package.zip

echo "✅ Lambda package built successfully!"
