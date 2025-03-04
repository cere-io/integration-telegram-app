import { exec } from 'child_process';
import fs from 'fs';

export const lambdaHandler = async () => {
  const resultsDir = '/tmp/test-results'; // Директория для результатов тестов
  const testsDir = '/var/task/tests'; // Директория, где находятся тесты Playwright

  // Проверяем, существует ли директория для результатов тестов
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true }); // Создаем директорию
  }

  // Проверяем, существует ли директория с тестами
  if (!fs.existsSync(testsDir)) {
    return { statusCode: 500, body: 'Tests directory not found at: ' + testsDir };
  }

  console.log('Starting Playwright tests...');

  return new Promise((resolve, reject) => {
    exec(
      'npx playwright test --reporter=html --output=' + resultsDir, // Указываем путь к результатам
      { cwd: testsDir }, // Указываем директорию с тестами
      (error, stdout, stderr) => {
        if (error) {
          console.error('Error during Playwright test execution:', stderr);
          reject({ statusCode: 500, body: `Error: ${stderr}` });
        } else {
          console.log('Test execution result:', stdout);
          resolve({
            statusCode: 200,
            body: `Tests executed successfully:\n${stdout}`,
          });
        }
      },
    );
  });
};
