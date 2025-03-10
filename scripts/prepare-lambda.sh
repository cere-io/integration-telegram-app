#!/bin/bash

set -e

# Define project root for correct paths
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
  timeout: 120000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process',
        '--disable-web-security',
        '--disable-features=site-per-process',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials'
      ],
      timeout: 120000,
      env: {
        DISPLAY: ':0'
      }
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
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkSystemResources() {
  try {
    const totalMemory = process.memoryUsage().heapTotal / 1024 / 1024;
    const usedMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`Memory usage - Total: ${totalMemory.toFixed(2)}MB, Used: ${usedMemory.toFixed(2)}MB`);

    if (usedMemory > 900) {
      throw new Error('Memory usage is too high');
    }

    return true;
  } catch (error) {
    console.error('Error checking system resources:', error);
    return false;
  }
}

async function findChromePid() {
  try {
    // Skip PID check in Lambda environment and rely on browser.isConnected()
    console.log('Running in Lambda environment, skipping PID check');
    return null;
  } catch (e) {
    console.error('Error finding Chrome PID:', e);
    return null;
  }
}

async function checkBrowserProcess(pid) {
  // Always return true in Lambda as we rely on browser.isConnected()
  return true;
}

async function runTests() {
  let browser = null;
  let context = null;
  let chromePid = null;

  try {
    console.log('Checking system resources...');
    const resourcesOk = await checkSystemResources();
    if (!resourcesOk) {
      throw new Error('System resources check failed');
    }

    const launchOptions = {
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process',
        '--disable-web-security',
        '--disable-features=site-per-process',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials'
      ],
      timeout: 120000,
      env: {
        ...process.env,
        DISPLAY: ':0'
      }
    };

    console.log('Browser launch configuration:', launchOptions);

    browser = await chromium.launch(launchOptions).catch(error => {
      console.error('Error launching browser:', error);
      throw error;
    });
    
    console.log('Browser launched successfully');
    console.log('Browser version:', await browser.version());

    // Проверяем состояние браузера
    if (!browser.isConnected()) {
      throw new Error('Browser disconnected immediately after launch');
    }

    // Находим PID браузера альтернативным способом
    chromePid = await findChromePid();
    console.log('Browser PID:', chromePid);

    if (!chromePid || !(await checkBrowserProcess(chromePid))) {
      console.warn('Browser process not found or not running, but continuing anyway');
    }

    // Увеличенная задержка после запуска браузера
    console.log('Waiting for browser to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Проверяем, что браузер все еще работает
    if (!browser.isConnected()) {
      throw new Error('Browser disconnected during stabilization period');
    }
    
    if (chromePid && !(await checkBrowserProcess(chromePid))) {
      console.warn('Browser process not running after stabilization, but browser is still connected');
    }

    // Проверяем ресурсы после запуска браузера
    const resourcesAfterLaunch = await checkSystemResources();
    if (!resourcesAfterLaunch) {
      throw new Error('System resources check failed after browser launch');
    }

    console.log('Creating browser context...');
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
      bypassCSP: true,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
    }).catch(error => {
      console.error('Error creating context:', error);
      throw error;
    });

    // Проверяем количество активных контекстов
    const contexts = browser.contexts();
    console.log('Active contexts:', contexts.length);

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
      console.log(output);
    } catch (error) {
      success = false;
      errorOutput = error.message;
      console.error('Test failed:', error);
      console.error('Error stack:', error.stack);
      
      if (browser) {
        console.log('Browser connected after error:', browser.isConnected());
        if (chromePid) {
          console.log('Browser process still running:', await checkBrowserProcess(chromePid));
        }
      }
    }

    return {
      success,
      output,
      errorOutput,
      code: success ? 0 : 1
    };
  } catch (error) {
    console.error('Error during test execution:', error);
    console.error('Error stack:', error.stack);

    return {
      success: false,
      output: '',
      errorOutput: `${error.message}\nStack: ${error.stack}`,
      code: 1
    };
  } finally {
    if (context || browser) {
      console.log('Starting cleanup...');
      
      if (context) {
        try {
          await context.close().catch(e => console.error('Context close error:', e));
          console.log('Context closed successfully');
        } catch (error) {
          console.error('Error closing context:', error);
        }
      }
      
      if (browser) {
        try {
          await browser.close().catch(e => console.error('Browser close error:', e));
          console.log('Browser closed successfully');
        } catch (error) {
          console.error('Error closing browser:', error);
        }
      }
    }
  }
}

export { runTests };
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
import { brotliDecompressSync } from 'zlib';

const CHROMIUM_URL = 'https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar';

async function downloadFile(url, destination) {
  console.log('Starting download from:', url);
  await mkdir(path.dirname(destination), { recursive: true });
  
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      followRedirects: true
    }, response => {
      console.log('Initial response status:', response.statusCode);
      console.log('Initial response headers:', JSON.stringify(response.headers, null, 2));
      
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
          console.log('Downloaded file size:', stats.size);
          console.log('Downloaded file path:', destination);
          resolve();
        })
        .catch(err => {
          console.error('Pipeline error:', err);
          reject(err);
        });
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
      onentry: entry => {
        console.log('Extracting file:', entry.path);
        console.log('File size:', entry.size);
        console.log('File type:', entry.type);
      }
    });
    
    console.log('Initial extraction completed, checking for Brotli files...');
    
    async function processBrotliFiles(dir) {
      const files = fs.readdirSync(dir);
      console.log('Processing directory:', dir);
      console.log('Found files:', files);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          await processBrotliFiles(filePath);
        } else if (file.endsWith('.br')) {
          console.log('Processing Brotli file:', filePath);
          try {
            const brContent = fs.readFileSync(filePath);
            console.log('Brotli file size:', brContent.length);
            
            const decompressed = brotliDecompressSync(brContent);
            console.log('Decompressed size:', decompressed.length);
            
            const outputPath = filePath.slice(0, -3);
            fs.writeFileSync(outputPath, decompressed);
            console.log('Wrote decompressed file:', outputPath);
            
            if (outputPath.endsWith('.tar')) {
              console.log('Found tar after Brotli:', outputPath);
              await tar.extract({
                file: outputPath,
                cwd: path.dirname(outputPath),
                onentry: entry => console.log('Extracting from inner tar:', entry.path)
              });
              fs.unlinkSync(outputPath);
              console.log('Removed intermediate tar:', outputPath);
            }
            
            fs.unlinkSync(filePath);
            console.log('Removed Brotli file:', filePath);
          } catch (error) {
            console.error('Error processing Brotli file:', filePath);
            console.error('Error details:', error);
            throw error;
          }
        }
      }
    }
    
    await processBrotliFiles(outputDir);
    
    console.log('All files processed, final directory contents:');
    function listDirRecursive(dir, level = 0) {
      const indent = '  '.repeat(level);
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        console.log(`${indent}- ${file} (${stat.size} bytes)`);
        if (stat.isDirectory()) {
          listDirRecursive(fullPath, level + 1);
        }
      });
    }
    listDirRecursive(outputDir);
    
  } catch (error) {
    console.error('Extraction error:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

async function findChrome(startDir) {
  console.log('Starting Chrome search in:', startDir);
  
  function searchRecursively(dir) {
    console.log('Searching in directory:', dir);
    const files = fs.readdirSync(dir);
    console.log('Found files:', files);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        const result = searchRecursively(fullPath);
        if (result) return result;
      } else if (file === 'chrome' || file === 'chromium') {
        console.log('Found potential Chrome executable:', fullPath);
        try {
          fs.chmodSync(fullPath, 0o755);
          console.log('Updated permissions for:', fullPath);
          return fullPath;
        } catch (error) {
          console.error('Error setting permissions:', error);
        }
      }
    }
    return null;
  }
  
  const chromePath = searchRecursively(startDir);
  if (!chromePath) {
    throw new Error('Chrome executable not found in: ' + startDir);
  }
  return chromePath;
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
    
    // Установка Chromium если его нет
    const archivePath = path.join(tmpDir, 'chromium.tar');
    console.log('Archive path:', archivePath);
    
    console.log('Downloading Chromium...');
    await downloadFile(CHROMIUM_URL, archivePath);
    console.log('Download completed');
    
    console.log('Extracting Chromium...');
    await extractChromium(archivePath, browserDir);
    console.log('Extraction completed');
    
    // Поиск Chrome в любом месте внутри browserDir
    const chromePath = await findChrome(browserDir);
    console.log('Found Chrome executable at:', chromePath);
    
    // Настройка путей к библиотекам
    const libPath = path.join(browserDir, 'lib');
    const currentLibPath = process.env.LD_LIBRARY_PATH || '';
    process.env.LD_LIBRARY_PATH = `${libPath}:${currentLibPath}`;
    console.log('Updated LD_LIBRARY_PATH:', process.env.LD_LIBRARY_PATH);
    
    // Проверяем наличие необходимых библиотек
    const requiredLibs = ['libnss3.so', 'libnspr4.so', 'libnssutil3.so'];
    for (const lib of requiredLibs) {
      const libFile = path.join(libPath, lib);
      if (fs.existsSync(libFile)) {
        console.log(`Found required library: ${lib}`);
        const stats = fs.statSync(libFile);
        console.log(`Library ${lib} size: ${stats.size} bytes`);
      } else {
        console.error(`Missing required library: ${lib}`);
        throw new Error(`Required library ${lib} not found in ${libPath}`);
      }
    }
    
    // Настройка переменных окружения для Playwright
    process.env.PLAYWRIGHT_BROWSERS_PATH = browserDir;
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = chromePath;
    process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
    process.env.NODE_PATH = '/var/task/node_modules';
    process.env.DISPLAY = ':0';
    
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
export DISPLAY=":0"

# Create virtual display
Xvfb :0 -screen 0 1280x720x24 -ac +extension GLX +render -noreset &
sleep 2

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
