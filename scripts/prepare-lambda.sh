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
cat > "$PROJECT_ROOT/lambda-build/run-tests.js" << 'EOL'
import { chromium } from 'playwright';
import path from 'path';

async function runTests() {
  try {
    console.log('Initializing browser...');
    const browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    });

    console.log('Creating new context...');
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true
    });

    console.log('Loading test file...');
    const testFile = path.join(process.cwd(), 'tests', 'integration.spec.js');
    const testModule = await import(testFile);

    console.log('Running tests...');
    let success = true;
    let output = '';
    let errorOutput = '';

    try {
      const testFn = testModule.default;
      await testFn({ browser, context });
      output = 'Tests completed successfully';
    } catch (error) {
      success = false;
      errorOutput = error.message;
      console.error('Test failed:', error);
    }

    console.log('Cleaning up...');
    await context.close();
    await browser.close();

    return {
      success,
      output,
      errorOutput,
      code: success ? 0 : 1
    };
  } catch (error) {
    console.error('Error during test execution:', error);
    return {
      success: false,
      output: '',
      errorOutput: error.message,
      code: 1
    };
  }
}

export { runTests };
EOL

echo "➡ Creating test file..."
cat > "$PROJECT_ROOT/lambda-build/tests/integration.spec.js" << 'EOL'
export default async function runIntegrationTest({ browser, context }) {
  const page = await context.newPage();
  
  try {
    await page.goto('https://example.com');
    const title = await page.title();
    if (!title.includes('Example Domain')) {
      throw new Error(`Expected title to include 'Example Domain', got '${title}'`);
    }
    console.log('Test passed: title matches expected value');
  } finally {
    await page.close();
  }
}
EOL

echo "➡ Creating Lambda handler..."
cat > "$PROJECT_ROOT/lambda-build/index.js" << 'EOL'
import { mkdir } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { pipeline } from 'stream/promises';
import os from 'os';
import tar from 'tar';
import { runTests } from './run-tests.js';
import { execSync } from 'child_process';

const CHROMIUM_URL = 'https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar';

async function downloadFile(url, destination) {
  console.log('Starting download from:', url);
  await mkdir(path.dirname(destination), { recursive: true });
  
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      followRedirects: true
    }, response => {
      console.log('Response status:', response.statusCode);
      console.log('Response headers:', JSON.stringify(response.headers, null, 2));
      
      if (response.statusCode === 302 || response.statusCode === 301) {
        const newUrl = new URL(response.headers.location, url).toString();
        console.log('Following redirect to:', newUrl);
        downloadFile(newUrl, destination).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      const fileStream = fs.createWriteStream(destination);
      pipeline(response, fileStream)
        .then(() => {
          const stats = fs.statSync(destination);
          console.log('File downloaded successfully');
          console.log('File size:', stats.size);
          resolve();
        })
        .catch(err => reject(err));
    });
    
    request.on('error', error => {
      console.error('Download error:', error);
      reject(error);
    });
  });
}

async function extractChromium(archivePath, outputDir) {
  console.log('Starting Chromium extraction');
  console.log('Archive path:', archivePath);
  console.log('Output directory:', outputDir);
  
  if (!fs.existsSync(archivePath)) {
    throw new Error('Archive file does not exist!');
  }
  
  const archiveStats = fs.statSync(archivePath);
  console.log('Archive file exists, size:', archiveStats.size);
  
  await mkdir(outputDir, { recursive: true });
  
  try {
    console.log('Extracting with tar...');
    await tar.extract({
      file: archivePath,
      cwd: outputDir,
      onentry: entry => console.log('Extracting:', entry.path)
    });
    
    console.log('Extraction completed, processing Brotli files...');
    
    // Распаковка Brotli-файлов
    const files = fs.readdirSync(outputDir);
    console.log('Files to process:', files);
    
    for (const file of files) {
      const filePath = path.join(outputDir, file);
      if (file.endsWith('.br')) {
        console.log('Processing Brotli file:', file);
        try {
          // Установка brotli если его нет
          try {
            execSync('which brotli');
          } catch {
            console.log('Installing brotli...');
            execSync('yum install -y brotli || apt-get update && apt-get install -y brotli');
          }
          
          // Распаковка Brotli
          const outputPath = filePath.slice(0, -3); // Удаляем .br
          console.log('Decompressing to:', outputPath);
          execSync(`brotli -d "${filePath}" -o "${outputPath}"`);
          
          // Если это tar-архив, распаковываем его
          if (outputPath.endsWith('.tar')) {
            console.log('Extracting tar:', outputPath);
            await tar.extract({
              file: outputPath,
              cwd: outputDir,
              onentry: entry => console.log('Extracting from tar:', entry.path)
            });
            // Удаляем промежуточный tar-файл
            fs.unlinkSync(outputPath);
          }
          
          // Удаляем оригинальный .br файл
          fs.unlinkSync(filePath);
        } catch (error) {
          console.error('Error processing Brotli file:', file, error);
        }
      }
    }
    
    console.log('All Brotli files processed');
    console.log('Output directory contents:', fs.readdirSync(outputDir));
    
    const chromePath = path.join(outputDir, 'chrome');
    if (fs.existsSync(chromePath)) {
      console.log('Chrome executable exists');
      const stats = fs.statSync(chromePath);
      console.log('Chrome executable size:', stats.size);
      console.log('Chrome executable permissions:', stats.mode.toString(8));
      fs.chmodSync(chromePath, 0o755);
      console.log('Updated Chrome executable permissions:', fs.statSync(chromePath).mode.toString(8));
    } else {
      console.log('Chrome executable not found!');
      console.log('Contents of output directory:', fs.readdirSync(outputDir));
      
      // Рекурсивный поиск chrome
      function findChrome(dir) {
        const files = fs.readdirSync(dir);
        console.log('Searching in directory:', dir);
        console.log('Found files:', files);
        
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            findChrome(fullPath);
          } else if (file === 'chrome') {
            console.log('Found chrome at:', fullPath);
          }
        }
      }
      
      findChrome(outputDir);
    }
  } catch (error) {
    console.error('Extraction error:', error);
    throw error;
  }
  
  try {
    await fs.promises.unlink(archivePath);
    console.log('Archive file deleted');
  } catch (error) {
    console.error('Failed to delete archive:', error);
  }
}

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const region = event.region || 'unknown';
    const environment = event.environment || 'unknown';
    
    console.log(`Running tests in ${region} for ${environment}`);
    
    // Подготовка директорий
    const tmpDir = os.tmpdir();
    const browserDir = path.join(tmpDir, 'chromium');
    const chromePath = path.join(browserDir, 'chrome');
    
    console.log('Temporary directory:', tmpDir);
    console.log('Browser directory:', browserDir);
    console.log('Chrome path:', chromePath);
    
    // Установка Chromium если его нет
    if (!fs.existsSync(chromePath)) {
      console.log('Installing Chromium...');
      const archivePath = path.join(tmpDir, 'chromium.tar');
      console.log('Archive path:', archivePath);
      
      console.log('Downloading Chromium...');
      await downloadFile(CHROMIUM_URL, archivePath);
      console.log('Download completed');
      
      console.log('Extracting Chromium...');
      await extractChromium(archivePath, browserDir);
      console.log('Extraction completed');
      
      if (fs.existsSync(chromePath)) {
        console.log('Chrome executable exists after installation');
        const stats = fs.statSync(chromePath);
        console.log('Chrome executable permissions:', stats.mode.toString(8));
      } else {
        console.log('Chrome executable does not exist after installation!');
        console.log('Contents of browser directory:', fs.readdirSync(browserDir));
      }
    } else {
      console.log('Chrome executable already exists');
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

echo "➡ Installing Playwright globally..."
npm install -g playwright

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
