import { exec } from 'child_process';
import fs from 'fs';

export const lambdaHandler = async () => {
  const resultsDir = '/tmp/test-results';
  const testsDir = '/var/task/tests';

  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  if (!fs.existsSync(testsDir)) {
    return { statusCode: 500, body: 'Tests directory not found at: ' + testsDir };
  }

  console.log('Starting Playwright tests...');

  return new Promise((resolve, reject) => {
    exec('npx playwright test --reporter=html --output=' + resultsDir, { cwd: testsDir }, (error, stdout, stderr) => {
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
    });
  });
};
