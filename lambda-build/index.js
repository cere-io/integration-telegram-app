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
      cwd: path.dirname(__filename),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Tests completed successfully' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
