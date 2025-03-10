import { chromium } from 'playwright';
import path from 'path';

async function runTests() {
  let browser = null;
  let context = null;

  try {
    console.log('Browser launch configuration:', {
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      env: {
        LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH,
      },
    });

    // Увеличиваем таймаут запуска и добавляем больше аргументов для стабильности
    browser = await chromium
      .launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        timeout: 120000,
      })
      .catch((error) => {
        console.error('Error launching browser:', error);
        throw error;
      });

    console.log('Browser launched successfully');
    console.log('Browser version:', await browser.version());
    console.log('Browser process pid:', browser.process().pid);

    if (!browser.isConnected()) {
      throw new Error('Browser disconnected immediately after launch');
    }

    // Увеличиваем задержку после запуска браузера
    console.log('Waiting for browser to stabilize...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    if (!browser.isConnected()) {
      throw new Error('Browser disconnected after initial delay');
    }
    console.log('Browser is still connected after delay');

    console.log('Creating browser context...');
    context = await browser
      .newContext({
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        bypassCSP: true,
      })
      .catch((error) => {
        console.error('Error creating context:', error);
        throw error;
      });
    console.log('Browser context created successfully');

    // Проверяем, что контекст создан успешно
    const contexts = browser.contexts();
    console.log(`Number of active contexts: ${contexts.length}`);

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
        if (browser.isConnected()) {
          console.log('Active browser contexts:', browser.contexts().length);
        }
      }
    }

    console.log('Starting cleanup...');
    if (context) {
      try {
        console.log('Preparing to close context...');
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (browser && browser.isConnected()) {
          await context.close().catch((e) => console.error('Context close error:', e));
          console.log('Context closed successfully');
        } else {
          console.log('Skipping context close - browser already disconnected');
        }
      } catch (error) {
        console.error('Error closing context:', error);
      }
    }

    if (browser) {
      try {
        console.log('Preparing to close browser...');
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (browser.isConnected()) {
          await browser.close().catch((e) => console.error('Browser close error:', e));
          console.log('Browser closed successfully');
        } else {
          console.log('Browser already disconnected');
        }
      } catch (error) {
        console.error('Error closing browser:', error);
      }
    }

    return {
      success,
      output,
      errorOutput,
      code: success ? 0 : 1,
    };
  } catch (error) {
    console.error('Error during test execution:', error);
    console.error('Error stack:', error.stack);

    if (context || browser) {
      console.log('Attempting cleanup after error...');

      if (context) {
        try {
          await context.close().catch(() => {});
          console.log('Context closed during error handling');
        } catch (closeError) {
          console.error('Error closing context during error handling:', closeError);
        }
      }

      if (browser) {
        try {
          if (browser.isConnected()) {
            await browser.close().catch(() => {});
            console.log('Browser closed during error handling');
          } else {
            console.log('Browser already disconnected during error handling');
          }
        } catch (closeError) {
          console.error('Error closing browser during error handling:', closeError);
        }
      }
    }

    return {
      success: false,
      output: '',
      errorOutput: `${error.message}\nStack: ${error.stack}`,
      code: 1,
    };
  }
}

export { runTests };
