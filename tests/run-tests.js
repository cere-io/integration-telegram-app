import { chromium } from 'playwright';
import path from 'path';

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

async function runTests() {
  let browser = null;
  let context = null;

  try {
    console.log('Checking system resources...');
    const resourcesOk = await checkSystemResources();
    if (!resourcesOk) {
      throw new Error('System resources check failed');
    }

    console.log('Browser launch configuration:', {
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      env: {
        LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH,
      },
    });

    // Конфигурация запуска браузера с дополнительными опциями
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
        '--disable-site-isolation-trials',
      ],
      timeout: 120000,
      env: {
        ...process.env,
        DISPLAY: process.env.DISPLAY || ':0',
      },
    };

    console.log('Launching browser with options:', launchOptions);
    browser = await chromium.launch(launchOptions).catch((error) => {
      console.error('Error launching browser:', error);
      throw error;
    });

    console.log('Browser launched successfully');
    console.log('Browser version:', await browser.version());

    const pid = browser.process().pid;
    console.log('Browser process pid:', pid);

    if (!browser.isConnected()) {
      throw new Error('Browser disconnected immediately after launch');
    }

    // Увеличенная задержка после запуска браузера
    console.log('Waiting for browser to stabilize...');
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Проверка состояния браузера после задержки
    if (!browser.isConnected()) {
      throw new Error('Browser disconnected after initial delay');
    }
    console.log('Browser is still connected after delay');

    // Проверка процесса браузера
    try {
      process.kill(pid, 0);
      console.log('Browser process is still running');
    } catch (e) {
      throw new Error('Browser process is not running');
    }

    // Проверяем ресурсы после запуска браузера
    const resourcesAfterLaunch = await checkSystemResources();
    if (!resourcesAfterLaunch) {
      throw new Error('System resources check failed after browser launch');
    }

    console.log('Creating browser context...');
    context = await browser
      .newContext({
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        bypassCSP: true,
        userAgent:
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
      })
      .catch((error) => {
        console.error('Error creating context:', error);
        throw error;
      });

    console.log('Browser context created successfully');
    const contexts = browser.contexts();
    console.log(`Number of active contexts: ${contexts.length}`);

    // Проверка состояния браузера после создания контекста
    if (!browser.isConnected()) {
      throw new Error('Browser disconnected after context creation');
    }

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
