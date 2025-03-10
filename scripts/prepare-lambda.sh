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
cp "$PROJECT_ROOT/playwright.config.js" "$PROJECT_ROOT/lambda-build/"

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
    "playwright-core": "^1.40.0",
    "adm-zip": "^0.5.10",
    "puppeteer-core": "^21.10.0",
    "tar": "^6.2.0"
  }
}
EOL

echo "➡ Creating Lambda handler..."
cat > "$PROJECT_ROOT/lambda-build/index.js" << EOL
import { readFile, mkdir, writeFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import https from 'https';
import AdmZip from 'adm-zip';
import { spawn } from 'child_process';
import { pipeline } from 'stream/promises';
import os from 'os';
import { promisify } from 'util';
import tar from 'tar';

// Адрес для загрузки Chromium оптимизированного для AWS Lambda
const CHROMIUM_URL = 'https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar';
const mkdir_p = promisify(fs.mkdir);

// Функция для очистки диска
async function freeDiskSpace() {
  try {
    // Используем нативные методы Node.js вместо команды find
    const tmpDir = os.tmpdir();
    console.log(`Cleaning up temporary directory: ${tmpDir}`);
    
    // Проверяем если директория существует
    if (!fs.existsSync(tmpDir)) {
      console.log('Temporary directory does not exist, nothing to clean');
      return;
    }
    
    // Получаем список файлов
    const files = await fs.promises.readdir(tmpDir);
    console.log(`Found ${files.length} files/directories in temp directory`);
    
    // Устанавливаем порог времени (файлы старше 1 дня)
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    
    let deletedCount = 0;
    
    // Проходим по файлам и удаляем старые
    for (const file of files) {
      try {
        // Пропускаем системные или специальные файлы
        if (file.startsWith('.') || file === 'chromium') {
          continue;
        }
        
        const filePath = path.join(tmpDir, file);
        const stats = await fs.promises.stat(filePath);
        
        // Если файл старше 1 дня, удаляем его
        if (stats.mtime < oneDayAgo) {
          if (stats.isDirectory()) {
            // Рекурсивно удаляем директорию
            await fs.promises.rm(filePath, { recursive: true, force: true });
          } else {
            // Удаляем файл
            await fs.promises.unlink(filePath);
          }
          deletedCount++;
        }
      } catch (err) {
        console.warn(`Failed to process file ${file}: ${err.message}`);
      }
    }
    
    console.log(`Cleaned ${deletedCount} files/directories from temp directory`);
  } catch (error) {
    console.warn(`Warning during disk cleanup: ${error.message}`);
    // Продолжаем работу даже при ошибке
  }
}

// Функция для загрузки файла
async function downloadFile(url, destination) {
  try {
    await mkdir(path.dirname(destination), { recursive: true });
    
    const fileStream = fs.createWriteStream(destination);
    
    await new Promise((resolve, reject) => {
      https.get(url, response => {
        if (response.statusCode !== 200) {
          reject(new Error(\`Failed to download: \${response.statusCode} \${response.statusMessage}\`));
          return;
        }
        
        pipeline(response, fileStream)
          .then(() => resolve())
          .catch(err => reject(err));
      }).on('error', err => {
        reject(err);
      });
    });
    
    return true;
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}

// Функция распаковки архива
async function extractTarArchive(archivePath, outputDir) {
  try {
    console.log(\`Extracting \${archivePath} to \${outputDir}\`);
    
    // Создаем директорию если ее нет
    await mkdir(outputDir, { recursive: true });
    
    // Распаковка TAR-архива с помощью npm-пакета tar
    await tar.extract({
      file: archivePath,
      cwd: outputDir
    });
    
    console.log('Successfully extracted Chromium');
    
    // Находим исполняемый файл и устанавливаем права на исполнение
    const chromiumPath = path.join(outputDir, 'chrome-linux', 'chrome');
    if (fs.existsSync(chromiumPath)) {
      fs.chmodSync(chromiumPath, 0o755);
      console.log(\`Set permissions for \${chromiumPath}\`);
    } else {
      console.warn('Chrome executable not found at the expected path');
    }
    
    // Удаляем архив для экономии места
    await fs.promises.unlink(archivePath);
    console.log('Removed archive to free space');
    
    return true;
  } catch (error) {
    console.error('Error extracting archive:', error);
    throw error;
  }
}

// Главная функция обработчика
export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const region = event.region || 'unknown';
    const environment = event.environment || 'unknown';
    
    console.log('Running tests in region:', region);
    console.log('Running tests for environment:', environment);
    
    // Создаем временные директории
    const tmpDir = os.tmpdir();
    const browserDir = path.join(tmpDir, 'chromium');
    
    // Очищаем диск
    await freeDiskSpace();
    
    // Проверяем наличие Chromium браузера
    const chromiumPath = path.join(browserDir, 'chrome-linux', 'chrome');
    if (!fs.existsSync(chromiumPath)) {
      console.log('Downloading and installing Chromium browser...');
      const chromiumArchive = path.join(tmpDir, 'chromium.tar');
      
      try {
        // Загружаем Chromium
        console.log(\`Downloading Chromium from \${CHROMIUM_URL}\`);
        await downloadFile(CHROMIUM_URL, chromiumArchive);
        
        // Показываем размер скачанного файла
        const stats = fs.statSync(chromiumArchive);
        console.log(\`Downloaded file size: \${stats.size / 1024 / 1024} MB\`);
        
        // Распаковываем архив
        console.log('Extracting Chromium...');
        await extractTarArchive(chromiumArchive, browserDir);
        
        console.log('Chromium installation complete');
        
        // Записываем путь к исполняемому файлу Chrome
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = chromiumPath;
      } catch (err) {
        console.error('Error installing Chromium:', err);
        return {
          statusCode: 500,
          body: JSON.stringify({
            success: false,
            error: 'Failed to install Chromium: ' + err.message
          })
        };
      }
    } else {
      console.log('Chromium browser already installed');
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = chromiumPath;
    }
    
    // Запуск тестов
    console.log('Running Playwright tests...');
    
    return new Promise((resolve, reject) => {
      const playwright = spawn('npx', ['playwright', 'test', '--reporter=list'], {
        env: {
          ...process.env,
          PLAYWRIGHT_BROWSERS_PATH: browserDir,
          PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: chromiumPath
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
cat > "$PROJECT_ROOT/lambda-build/bootstrap" << EOL
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

cd "$PROJECT_ROOT/lambda-build"

echo "➡ Making bootstrap executable..."
chmod +x bootstrap

echo "➡ Installing dependencies..."
npm install --omit=dev

echo "➡ Removing unnecessary files to reduce package size..."
# Remove dev dependencies and extras to reduce size
find node_modules -name "*.map" -delete 2>/dev/null || true
find node_modules -name "*.d.ts" -delete 2>/dev/null || true
find node_modules -name "*.md" -delete 2>/dev/null || true
find node_modules -name "LICENSE*" -delete 2>/dev/null || true
find node_modules -name "CHANGELOG*" -delete 2>/dev/null || true
find node_modules -name "README*" -delete 2>/dev/null || true
# Используем -exec rm -rf вместо -delete для директорий
find node_modules -name "example*" -type d -exec rm -rf {} \; 2>/dev/null || true
find node_modules -name "test" -type d -exec rm -rf {} \; 2>/dev/null || true
find node_modules -name "docs" -type d -exec rm -rf {} \; 2>/dev/null || true
find node_modules -name ".github" -type d -exec rm -rf {} \; 2>/dev/null || true

# Удаляем ненужные бинарные файлы и браузеры
echo "➡ Removing pre-bundled browsers to save space..."
find node_modules -path "*/playwright*/browsers" -type d -exec rm -rf {} \; 2>/dev/null || true
find node_modules -path "*/.cache/ms-playwright" -type d -exec rm -rf {} \; 2>/dev/null || true

# Log the package size before compression
echo "➡ Package size before compression:"
du -sh .

cd ..
echo "➡ Creating ZIP archive..."
cd "$PROJECT_ROOT/lambda-build" && zip -9 -r ../lambda-package.zip . && cd ..

echo "➡ Final package size:"
du -sh lambda-package.zip

echo "✅ Lambda package built successfully!"
