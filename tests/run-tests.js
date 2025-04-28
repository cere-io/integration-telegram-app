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

async function findChromePid() {
  try {
    // Skip PID check in Lambda environment and rely on browser.isConnected()
    console.log('Running in Lambda environment, skipping PID check');
    return null;
  } catch (e) {
    console.error('Error finding Chrome PID:', e);
    return null;
  }
}

async function runTests() {
  let browser = null;
  let context = null;
  let chromePid = null;

  try {
    console.log('Checking system resources...');
    const resourcesOk = await checkSystemResources();
    if (!resourcesOk) {
      throw new Error('System resources check failed');
    }

    const launchOptions = {
      headless: false,
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
        '--allow-insecure-localhost',
        '--disable-extensions',
        '--disable-popup-blocking',
        '--ignore-certificate-errors',
      ],
      timeout: 120000,
      env: {
        ...process.env,
        DISPLAY: ':0',
      },
    };

    console.log('Browser launch configuration:', launchOptions);

    browser = await chromium.launch(launchOptions).catch((error) => {
      console.error('Error launching browser:', error);
      throw error;
    });

    console.log('Browser launched successfully');
    console.log('Browser version:', await browser.version());

    if (!browser.isConnected()) {
      throw new Error('Browser disconnected immediately after launch');
    }

    chromePid = await findChromePid();
    console.log('Browser PID:', chromePid);

    if (!chromePid) {
      console.warn('Browser process not found or not running, but continuing anyway');
    }

    console.log('Waiting for browser to stabilize...');
    await new Promise((resolve) => setTimeout(resolve, 10000));

    if (!browser.isConnected()) {
      throw new Error('Browser disconnected during stabilization period');
    }

    if (chromePid) {
      console.warn('Browser process not running after stabilization, but browser is still connected');
    }

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
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      })
      .catch((error) => {
        console.error('Error creating context:', error);
        throw error;
      });

    const contexts = browser.contexts();
    console.log('Active contexts:', contexts.length);

    console.log('Loading test file...');
    const testFile = path.join(process.cwd(), 'tests', 'integration.spec.js');
    const testModule = await import(testFile);

    console.log('Running tests...');
    let success = true;
    let output = '';
    let errorOutput = '';
    let authError = null;
    let testResult = null;
    let performanceMetrics = '';

    try {
      const testFn = testModule.default;
      testResult = await testFn({ browser, context });

      if (testResult.authError) {
        authError = testResult.authError;
        console.log('Authentication error detected:', authError);
      }

      const metrics = testResult.metrics || [];
      console.log('Collected metrics:', metrics.length);

      if (metrics && metrics.length > 0) {
        for (const metric of metrics) {
          const authErrorTag = metric.faked ? ' [AUTH_ERROR]' : '';
          performanceMetrics += `${metric.name} took ${metric.duration}ms${authErrorTag}\n`;
        }
      }

      success = testResult.success === true;
      output = success ? 'Tests completed successfully' : 'Tests completed with errors';

      if (testResult.errorInfo) {
        errorOutput = testResult.errorInfo.message;
      }

      console.log(output);
    } catch (error) {
      success = false;
      errorOutput = error.message;
      console.error('Test failed:', error);
      console.error('Error stack:', error.stack);

      if (browser) {
        console.log('Browser connected after error:', browser.isConnected());
      }

      if (testResult && testResult.authError) {
        authError = testResult.authError;
      }

      if (testResult && testResult.metrics) {
        for (const metric of testResult.metrics) {
          const authErrorTag = metric.faked ? ' [AUTH_ERROR]' : '';
          performanceMetrics += `${metric.name} took ${metric.duration}ms${authErrorTag}\n`;
        }
      }
    }

    const result = {
      success,
      output,
      errorOutput,
      performanceMetrics,
      metrics: testResult ? testResult.metrics || [] : [],
      authError,
      code: success ? 0 : 1,
    };

    return result;
  } catch (error) {
    console.error('Error during test execution:', error);
    console.error('Error stack:', error.stack);

    return {
      success: false,
      output: '',
      errorOutput: `${error.message}\nStack: ${error.stack}`,
      code: 1,
    };
  } finally {
    if (context || browser) {
      console.log('Starting cleanup...');

      if (context) {
        try {
          await context.close().catch((e) => console.error('Context close error:', e));
          console.log('Context closed successfully');
        } catch (error) {
          console.error('Error closing context:', error);
        }
      }

      if (browser) {
        try {
          await browser.close().catch((e) => console.error('Browser close error:', e));
          console.log('Browser closed successfully');
        } catch (error) {
          console.error('Error closing browser:', error);
        }
      }
    }
  }
}

export { runTests };
