#!/bin/bash

# Создаем временную директорию для сборки
BUILD_DIR="lambda-build"
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR

# Копируем необходимые файлы
cp package.json $BUILD_DIR/
cp package-lock.json $BUILD_DIR/
cp -r tests $BUILD_DIR/
cp playwright.config.ts $BUILD_DIR/

# Создаем index.js для Lambda
cat > $BUILD_DIR/index.js << 'EOL'
const { execSync } = require('child_process');
const path = require('path');

exports.handler = async (event) => {
    try {
        // Устанавливаем переменные окружения
        process.env.AWS_LAMBDA_FUNCTION_NAME = process.env.AWS_LAMBDA_FUNCTION_NAME;
        process.env.TEST_ENV = process.env.TEST_ENV;
        process.env.REGION = process.env.REGION;

        // Запускаем тесты
        execSync('npx playwright test tests/integration.spec.ts', {
            stdio: 'inherit',
            cwd: path.dirname(__filename)
        });

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

# Устанавливаем зависимости
cd $BUILD_DIR
npm ci --production

# Устанавливаем Playwright
npx playwright install chromium --with-deps

# Создаем ZIP архив
zip -r ../lambda-function.zip .

# Возвращаемся в корневую директорию
cd ..

echo "Lambda package prepared successfully!" 