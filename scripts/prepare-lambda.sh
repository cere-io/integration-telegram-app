#!/bin/bash

# Create temporary build directory
BUILD_DIR="lambda-build"
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR

# Copy necessary files
cp package.json $BUILD_DIR/
cp package-lock.json $BUILD_DIR/
cp -r tests $BUILD_DIR/
cp playwright.config.ts $BUILD_DIR/

# Create index.js for Lambda
cat > $BUILD_DIR/index.js << 'EOL'
const { execSync } = require('child_process');
const path = require('path');

exports.handler = async (event) => {
    try {
        // Set environment variables
        process.env.AWS_LAMBDA_FUNCTION_NAME = process.env.AWS_LAMBDA_FUNCTION_NAME;
        process.env.TEST_ENV = process.env.TEST_ENV;
        process.env.REGION = process.env.REGION;

        // Run tests
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

# Install dependencies
cd $BUILD_DIR
npm ci --production

# Install Playwright
npx playwright install chromium --with-deps

# Create ZIP archive
zip -r ../lambda-function.zip .

# Return to root directory
cd ..

# Remove temporary directory
rm -rf $BUILD_DIR

echo "Lambda package prepared successfully!" 