#!/bin/bash

set -e

echo "➡ Removing old directory and creating new one..."
rm -rf lambda-build lambda-package.zip
mkdir -p lambda-build/tests

echo "➡ Copying test files..."
cp tests/integration.spec.js lambda-build/tests/
cp playwright.config.js lambda-build/

echo "➡ Creating package.json..."
cat > lambda-build/package.json << EOL
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
    "playwright-core": "^1.40.0",
    "adm-zip": "^0.5.10"
  }
}
EOL

echo "➡ Creating Lambda handler..."
cat > lambda-build/index.js << EOL
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import https from 'https';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// URL мини-версии хромиума, оптимизированного для Playwright
const CHROMIUM_URL = 'https://playwright.azureedge.net/builds/chromium/1060/chromium-linux.zip';

// Функция для загрузки файла
async function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(outputPath);
    const request = https.get(url, response => {
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(outputPath, () => {});
        reject(new Error(\`Failed to download file, status code: \${response.statusCode}\`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });
    
    request.on('error', err => {
      file.close();
      fs.unlink(outputPath, () => {});
      reject(err);
    });
    
    file.on('error', err => {
      file.close();
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

// Функция распаковки архива с использованием adm-zip
async function extractZip(zipPath, outputDir) {
  try {
    console.log(\`Extracting \${zipPath} to \${outputDir}\`);
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(outputDir, true);
    console.log('Extraction complete');
    return true;
  } catch (error) {
    console.error('Error extracting zip:', error);
    throw error;
  }
}

// Главная функция обработчика
export const handler = async (event) => {
  console.log('Event received:', JSON.stringify(event));
  
  try {
    const region = event.region || 'unknown';
    const environment = event.environment || 'unknown';
    
    console.log('Running tests in region:', region);
    console.log('Running tests for environment:', environment);
    
    // Создаем временные директории
    const tmpDir = '/tmp/playwright';
    const browserDir = \`\${tmpDir}/browser\`;
    const resultsDir = \`\${tmpDir}/test-results\`;
    
    await mkdir(tmpDir, { recursive: true });
    await mkdir(browserDir, { recursive: true });
    await mkdir(resultsDir, { recursive: true });
    
    // Устанавливаем переменные окружения
    process.env.PLAYWRIGHT_BROWSERS_PATH = browserDir;
    process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
    process.env.TEST_ENV = environment;
    process.env.REGION = region;
    
    console.log('Checking for Chromium browser...');
    const chromiumPath = path.join(browserDir, 'chromium-1060');
    if (!fs.existsSync(chromiumPath)) {
      console.log('Downloading and installing Chromium browser...');
      const chromiumZip = path.join(tmpDir, 'chromium.zip');
      
      try {
        // Загружаем мини-версию хромиума
        console.log(\`Downloading Chromium from \${CHROMIUM_URL}\`);
        await downloadFile(CHROMIUM_URL, chromiumZip);
        
        // Распаковываем архив с использованием adm-zip
        console.log('Extracting Chromium...');
        await extractZip(chromiumZip, browserDir);
        
        console.log('Chromium installation complete');
      } catch (err) {
        console.error('Failed to download or extract Chromium:', err);
        throw err;
      }
    } else {
      console.log('Chromium browser already installed');
    }
    
    // Запуск тестов
    console.log('Running Playwright tests...');
    
    return new Promise((resolve, reject) => {
      const playwright = spawn('npx', ['playwright', 'test', '--reporter=list'], {
        env: {
          ...process.env,
          PLAYWRIGHT_BROWSERS_PATH: browserDir
        }
      });
      
      let output = '';
      let errorOutput = '';
      
      playwright.stdout.on('data', data => {
        const chunk = data.toString();
        output += chunk;
        console.log(chunk);
      });
      
      playwright.stderr.on('data', data => {
        const chunk = data.toString();
        errorOutput += chunk;
        console.error(chunk);
      });
      
      playwright.on('close', code => {
        console.log(\`Playwright process exited with code \${code}\`);
        
        if (code === 0) {
          resolve({
            statusCode: 200,
            body: JSON.stringify({
              message: 'Tests completed successfully',
              region: region,
              environment: environment,
              output: output
            })
          });
        } else {
          resolve({
            statusCode: 500,
            body: JSON.stringify({
              error: 'Tests failed',
              exitCode: code,
              output: output,
              errorOutput: errorOutput,
              region: region,
              environment: environment
            })
          });
        }
      });
      
      playwright.on('error', err => {
        console.error('Error running Playwright:', err);
        reject({
          statusCode: 500,
          body: JSON.stringify({
            error: err.message,
            stack: err.stack
          })
        });
      });
    });
    
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
cat > lambda-build/bootstrap << EOL
#!/bin/sh

set -euo pipefail

# Handler format: <script_name>.<function_name>
# Uses the AWS Lambda Node.js runtime interface
# See: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html

# Initialization - load function handler
# shellcheck disable=SC2155
export LAMBDA_TASK_ROOT="/var/task"
export PATH="\${LAMBDA_TASK_ROOT}/node_modules/.bin:\${PATH}"

# Processing
while true
do
  HEADERS="\$(mktemp)"
  EVENT_DATA="\$(mktemp)"
  
  # Get an event. The HTTP request will block until one is received
  curl -sS -LD "\$HEADERS" -o "\$EVENT_DATA" "http://\${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/next"
  
  # Extract request ID by scraping response headers received above
  REQUEST_ID=\$(grep -Fi Lambda-Runtime-Aws-Request-Id "\$HEADERS" | tr -d '[:space:]' | cut -d: -f2)
  
  # Run the handler function from the script
  node --input-type=module -e "import { handler } from './index.js'; handler(JSON.parse(process.argv[1]))" "\$(cat \$EVENT_DATA)" > /tmp/output.json || true
  
  # Send the response
  curl -s -X POST "http://\${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/\$REQUEST_ID/response" -d "\$(cat /tmp/output.json)"
done
EOL

cd lambda-build

echo "➡ Making bootstrap executable..."
chmod +x bootstrap

echo "➡ Installing dependencies..."
npm install --omit=dev

echo "➡ Removing unnecessary files to reduce package size..."
# Remove dev dependencies and extras to reduce size
find node_modules -name "*.map" -delete
find node_modules -name "*.d.ts" -delete
find node_modules -name "*.md" -delete
find node_modules -name "LICENSE*" -delete
find node_modules -name "CHANGELOG*" -delete
find node_modules -name "README*" -delete
find node_modules -name "example*" -delete
find node_modules -name "test" -type d -exec rm -rf {} +
find node_modules -name "docs" -type d -exec rm -rf {} +
find node_modules -name ".github" -type d -exec rm -rf {} +

# Удаляем ненужные бинарные файлы и браузеры
echo "➡ Removing pre-bundled browsers to save space..."
find node_modules -path "*/playwright*/browsers" -type d -exec rm -rf {} +
find node_modules -path "*/.cache/ms-playwright" -type d -exec rm -rf {} +

# Log the package size before compression
echo "➡ Package size before compression:"
du -sh .

cd ..
echo "➡ Creating ZIP archive..."
cd lambda-build && zip -9 -r ../lambda-package.zip . && cd ..

echo "➡ Final package size:"
du -sh lambda-package.zip

echo "✅ Lambda package built successfully!"
