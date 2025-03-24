import { runTests } from './run-tests.js';

// Configure environment for local testing
// Let Playwright find the browser automatically
process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = '';
process.env.DISPLAY = ':0';

async function main() {
  try {
    const result = await runTests();
    console.log('Test result:', result);
    process.exit(result.code);
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

main(); 