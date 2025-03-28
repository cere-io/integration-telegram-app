import { chromium } from 'playwright';
import fs from 'fs';

const envConfigs = {
  dev: {
    baseURL: 'https://telegram-viewer-app.stage.cere.io',
    campaignId: '120',
  },
  stage: {
    baseURL: 'https://telegram-viewer-app.stage.cere.io',
    campaignId: '120',
  },
  prod: {
    baseURL: 'https://telegram-viewer-app.cere.io',
    campaignId: '12',
  },
};

const environment = process.env.TEST_ENV || 'stage';
const region = process.env.AWS_REGION || 'us-west-2';

const currentConfig = envConfigs[environment] || envConfigs.stage;

const userName = process.env.TEST_USER_EMAIL || 'veronika.filipenko@cere.io';
const otp = process.env.TEST_USER_OTP || '555555';
const appUrl = process.env.TEST_APP_URL || currentConfig.baseURL;
const campaignId = process.env.TEST_CAMPAIGN_ID || currentConfig.campaignId;

const metrics = [];
let authError = null;

const logTime = (testName, time) => {
  const logMessage = `${testName} took ${time}ms\n`;
  console.log(`Recording metric: ${logMessage.trim()}`);

  metrics.push({ name: testName, duration: time });

  try {
    fs.appendFileSync(`/tmp/performance-log.txt`, logMessage);
    console.log(`Metric recorded for ${testName}`);
  } catch (error) {
    console.error(`Error writing to metrics file: ${error.message}`);
  }
};

const logError = (errorName, errorMessage) => {
  const logMessage = `${errorName}: ${errorMessage}\n`;
  console.error(`Recording error: ${logMessage.trim()}`);

  try {
    fs.appendFileSync(`/tmp/error-log.txt`, logMessage);
    console.log(`Error recorded for ${errorName}`);
  } catch (error) {
    console.error(`Error writing to error file: ${error.message}`);
  }
};

const login = async (page) => {
  const consoleErrors = [];

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();

    console.log(`[Browser Console] [${type}] ${text}`);

    if (type === 'error') {
      consoleErrors.push({ type, text, time: new Date().toISOString() });

      try {
        fs.appendFileSync('/tmp/console-errors.txt', `[${type}] [${new Date().toISOString()}] ${text}\n`);
      } catch (err) {
        console.error('Failed to write console error to file:', err);
      }
    }
  });

  try {
    await page.waitForSelector('#torusIframe', { timeout: 50000 });
    const torusFrame = await page.frameLocator('#torusIframe');

    await torusFrame.locator('iframe[title="Embedded browser"]').waitFor({ timeout: 50000 });
    const embeddedFrame = await torusFrame.frameLocator('iframe[title="Embedded browser"]');

    const buttonLogin = embeddedFrame.locator('button:has-text("I already have a wallet")');
    await buttonLogin.scrollIntoViewIfNeeded();
    await buttonLogin.waitFor({ state: 'visible', timeout: 10000 });
    await buttonLogin.click();

    const emailInput = embeddedFrame.getByRole('textbox', { name: 'Email' });
    await emailInput.scrollIntoViewIfNeeded();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(userName);

    const signInButton = embeddedFrame.locator('button:has-text("Sign In")');
    await signInButton.scrollIntoViewIfNeeded();
    await signInButton.waitFor({ state: 'visible', timeout: 10000 });
    await signInButton.click();

    const otpInput = embeddedFrame.getByRole('textbox', { name: 'OTP input' });
    await otpInput.waitFor({ state: 'visible', timeout: 10000 });
    await otpInput.fill(otp);

    const verifyButton = embeddedFrame.locator('button:has-text("Verify")');
    await verifyButton.scrollIntoViewIfNeeded();
    await verifyButton.waitFor({ state: 'visible', timeout: 10000 });
    await verifyButton.click();

    await page.waitForSelector('.tgui-e6658d0b8927f95e', { timeout: 15000 });

    return { success: true, consoleErrors };
  } catch (error) {
    try {
      await page.screenshot({ path: '/tmp/login-error.png' });
      console.log('Saved error screenshot to /tmp/login-error.png');
    } catch (screenshotError) {
      console.error('Failed to save screenshot:', screenshotError);
    }

    console.error(`Login error: ${error.message}`);
    authError = {
      type: 'LoginError',
      message: error.message,
      timestamp: new Date().toISOString(),
      consoleErrors: consoleErrors,
    };

    logError('Web3AuthError', error.message);

    if (consoleErrors.length > 0) {
      try {
        fs.appendFileSync('/tmp/error-log.txt', '\nConsole Errors during login:\n');
        consoleErrors.forEach((err) => {
          fs.appendFileSync('/tmp/error-log.txt', `[${err.type}] ${err.text}\n`);
        });
      } catch (fileError) {
        console.error('Failed to write console errors to error log:', fileError);
      }
    }

    throw error;
  }
};

async function testActiveQuestsScreen({ page }) {
  console.log(`Testing Active Quests screen in ${environment} environment (${region})...`);
  let start = Date.now();

  try {
    await page.goto(`${appUrl}/?campaignId=${campaignId}`, {
      waitUntil: 'domcontentloaded',
    });

    await page.locator('path').nth(1).click();
    await page.getByRole('button', { name: 'Start Earning' }).click();

    const questTab = await page.locator('.tgui-e6658d0b8927f95e').textContent();
    console.log('Quest tab text:', questTab);
    if (questTab !== 'Active Quests') {
      throw new Error('Active Quests tab not found');
    }

    let timeTaken = Date.now() - start;
    logTime('Active Quests Screen', timeTaken);
    console.log(`✅ Active Quests Screen metric recorded: ${timeTaken}ms`);

    const loginResult = await login(page);
    console.log('Login successful:', loginResult.success);

    if (loginResult.consoleErrors && loginResult.consoleErrors.length > 0) {
      console.log(`Found ${loginResult.consoleErrors.length} console errors during login`);
      loginResult.consoleErrors.forEach((err) => {
        console.log(`Console ${err.type}: ${err.text}`);
      });
    }

    return true;
  } catch (err) {
    console.error(`❌ Error in testActiveQuestsScreen: ${err.message}`);
    let timeTaken = Date.now() - start;
    logTime('Active Quests Screen', timeTaken);
    console.log(`⚠️ Active Quests Screen metric recorded on error: ${timeTaken}ms`);
    throw err;
  }
}

async function testLeaderboardScreen({ page }) {
  console.log(`Testing Leaderboard screen in ${environment} environment (${region})...`);
  let start = Date.now();

  try {
    const leaderboardTabButton = page.locator('xpath=/html/body/div[1]/div/div/div[2]/button[2]');
    await leaderboardTabButton.scrollIntoViewIfNeeded();
    await leaderboardTabButton.click();

    let timeTaken = Date.now() - start;
    logTime('Leaderboard Screen', timeTaken);
    return true;
  } catch (err) {
    console.error(`❌ Error in testLeaderboardScreen: ${err.message}`);
    let timeTaken = Date.now() - start;
    logTime('Leaderboard Screen', timeTaken);
    console.log(`⚠️ Leaderboard Screen metric recorded on error: ${timeTaken}ms`);
    throw err;
  }
}

async function testLibraryScreen({ page }) {
  try {
    console.log(`Testing Library screen in ${environment} environment (${region})...`);
    let start = Date.now();

    const libraryTabButton = page.locator('xpath=/html/body/div[1]/div/div/div[2]/button[3]');
    await libraryTabButton.scrollIntoViewIfNeeded();
    await libraryTabButton.click();

    console.log('Library tab clicked successfully.');

    let timeTaken = Date.now() - start;
    logTime('Library Screen', timeTaken);
  } catch (err) {
    console.error(`❌ Error in testLibraryScreen: ${err.message}`);
    let timeTaken = Date.now() - start;
    logTime('Library Screen', timeTaken);
    console.log(`⚠️ Library Screen metric recorded on error: ${timeTaken}ms`);
    throw err;
  }
}

export default async function runIntegrationTest({ browser, context }) {
  console.log(`Starting integration test for ${environment} environment in ${region} region`);
  console.log(`Using URL: ${appUrl} with campaign ID: ${campaignId}`);
  metrics.length = 0;

  console.log(`Starting integration test for ${environment} environment in ${region} region`);
  console.log(`Using URL: ${appUrl} with campaign ID: ${campaignId}`);
  metrics.length = 0;

  try {
    fs.writeFileSync('/tmp/console-errors.txt', '');
    console.log('Console errors file cleared');
  } catch (error) {
    console.error(`Error clearing console errors file: ${error.message}`);
  }

  try {
    console.log('Testing file system access...');
    fs.writeFileSync('/tmp/test-file.txt', 'Test file system access');
    const content = fs.readFileSync('/tmp/test-file.txt', 'utf8');
    console.log('File system access test result:', content);
    if (content !== 'Test file system access') {
      console.error('File system test failed: content mismatch');
    }
  } catch (error) {
    console.error('File system access test failed:', error);
  }

  try {
    fs.writeFileSync('/tmp/performance-log.txt', '');
    console.log('Metrics file cleared');
  } catch (error) {
    console.error(`Error clearing metrics file: ${error.message}`);
  }

  let page;
  const globalConsoleErrors = [];

  try {
    page = await context.newPage();
    console.log('Page created successfully');

    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      const time = new Date().toISOString();

      console.log(`[BROWSER CONSOLE] [${type}] ${text}`);

      if (type === 'error' || type === 'warning') {
        const consoleEvent = { type, text, time };
        globalConsoleErrors.push(consoleEvent);

        try {
          fs.appendFileSync('/tmp/console-errors.txt', `[${type}] [${time}] ${text}\n`);
          console.log(`Console ${type} logged to file: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
        } catch (err) {
          console.error('Failed to write console error to file:', err);
        }
      }
    });

    page.on('pageerror', (error) => {
      const time = new Date().toISOString();
      console.error(`[PAGE ERROR] ${error.message}`);

      const errorInfo = {
        type: 'pageerror',
        text: error.message,
        stack: error.stack || 'No stack trace',
        time,
      };
      globalConsoleErrors.push(errorInfo);

      try {
        fs.appendFileSync(
          '/tmp/console-errors.txt',
          `[pageerror] [${time}] ${error.message}\n${error.stack || 'No stack trace'}\n\n`,
        );
      } catch (err) {
        console.error('Failed to write page error to file:', err);
      }
    });

    await testActiveQuestsScreen({ page });
    await testLeaderboardScreen({ page });
    await testLibraryScreen({ page });

    console.log('=== COLLECTED METRICS ===');
    console.log(JSON.stringify(metrics, null, 2));
    console.log(`Environment: ${environment}`);
    console.log(`Region: ${region}`);
    console.log('========================');

    let testResultData = {
      success: metrics.length >= 3,
      metrics: metrics,
      environment: environment,
      region: region,
    };

    if (globalConsoleErrors.length > 0) {
      testResultData.consoleErrors = globalConsoleErrors;
      console.log(`Found ${globalConsoleErrors.length} console errors/warnings during failed test`);

      try {
        fs.writeFileSync('/tmp/console-errors.json', JSON.stringify(globalConsoleErrors, null, 2));
        console.log(`Wrote ${globalConsoleErrors.length} console errors to /tmp/console-errors.json for debugging`);
      } catch (fileError) {
        console.error('Failed to write console errors JSON file:', fileError);
      }

      try {
        let consoleErrorsText = globalConsoleErrors.map((err) => `[${err.type}] [${err.time}] ${err.text}`).join('\n');

        fs.writeFileSync('/tmp/console-errors-formatted.txt', consoleErrorsText);
        console.log('Wrote formatted console errors to /tmp/console-errors-formatted.txt');
      } catch (fileError) {
        console.error('Failed to write formatted console errors file:', fileError);
      }
    } else {
      globalConsoleErrors.push(testError);
      testResultData.consoleErrors = globalConsoleErrors;
      console.log('Added test console error from error handler');
    }

    globalConsoleErrors.push({
      type: 'error',
      text: 'FORCED_ERROR_HANDLER: forced console error from error handler',
      time: new Date().toISOString(),
    });
    testResultData.consoleErrors = globalConsoleErrors;
    console.log('Added forced console error from error handler');

    if (authError) {
      testResultData.authError = authError;

      if (!metrics.find((m) => m.name === 'Leaderboard Screen')) {
        metrics.push({
          name: 'Leaderboard Screen',
          duration: 0,
          faked: true,
          reason: 'Auth error prevented test',
        });

        console.log('Added placeholder Leaderboard Screen metric due to auth error');
        fs.appendFileSync(`/tmp/performance-log.txt`, `Leaderboard Screen took 0ms [AUTH_ERROR]\n`);
      }

      if (!metrics.find((m) => m.name === 'Library Screen')) {
        metrics.push({
          name: 'Library Screen',
          duration: 0,
          faked: true,
          reason: 'Auth error prevented test',
        });

        console.log('Added placeholder Library Screen metric due to auth error');
        fs.appendFileSync(`/tmp/performance-log.txt`, `Library Screen took 0ms [AUTH_ERROR]\n`);
      }

      testResultData.success = false;
      testResultData.errorInfo = {
        type: 'AuthenticationError',
        message: `Authentication failed: ${authError.message}`,
        timestamp: authError.timestamp,
      };
    }

    return testResultData;
  } catch (err) {
    console.error('Error during integration test:', err);

    console.log('=== METRICS AT ERROR ===');
    console.log(JSON.stringify(metrics, null, 2));
    console.log(`Environment: ${environment}`);
    console.log(`Region: ${region}`);
    console.log('=======================');

    let testResultData = {
      success: false,
      error: err.message,
      metrics: metrics,
      environment: environment,
      region: region,
    };

    if (globalConsoleErrors.length > 0) {
      testResultData.consoleErrors = globalConsoleErrors;
      console.log(`Found ${globalConsoleErrors.length} console errors/warnings during failed test`);

      try {
        fs.writeFileSync('/tmp/console-errors.json', JSON.stringify(globalConsoleErrors, null, 2));
        console.log(`Wrote ${globalConsoleErrors.length} console errors to /tmp/console-errors.json for debugging`);
      } catch (fileError) {
        console.error('Failed to write console errors JSON file:', fileError);
      }

      try {
        let consoleErrorsText = globalConsoleErrors.map((err) => `[${err.type}] [${err.time}] ${err.text}`).join('\n');

        fs.writeFileSync('/tmp/console-errors-formatted.txt', consoleErrorsText);
        console.log('Wrote formatted console errors to /tmp/console-errors-formatted.txt');
      } catch (fileError) {
        console.error('Failed to write formatted console errors file:', fileError);
      }
    } else {
      testResultData.consoleErrors = globalConsoleErrors;
      console.log('Added test console error from error handler');
    }

    globalConsoleErrors.push({
      type: 'error',
      text: 'FORCED_ERROR_HANDLER: Forced error from test error handler (catch block)',
      time: new Date().toISOString(),
    });
    testResultData.consoleErrors = globalConsoleErrors;
    console.log('Added forced console error from error handler (catch block)');

    if (authError) {
      testResultData.authError = authError;

      if (!metrics.find((m) => m.name === 'Leaderboard Screen')) {
        metrics.push({
          name: 'Leaderboard Screen',
          duration: 0,
          faked: true,
          reason: 'Auth error prevented test',
        });

        console.log('Added placeholder Leaderboard Screen metric due to auth error');
        fs.appendFileSync(`/tmp/performance-log.txt`, `Leaderboard Screen took 0ms [AUTH_ERROR]\n`);
      }

      if (!metrics.find((m) => m.name === 'Library Screen')) {
        metrics.push({
          name: 'Library Screen',
          duration: 0,
          faked: true,
          reason: 'Auth error prevented test',
        });

        console.log('Added placeholder Library Screen metric due to auth error');
        fs.appendFileSync(`/tmp/performance-log.txt`, `Library Screen took 0ms [AUTH_ERROR]\n`);
      }

      testResultData.success = false;
      testResultData.errorInfo = {
        type: 'AuthenticationError',
        message: `Authentication failed: ${authError.message}`,
        timestamp: authError.timestamp,
      };
    }

    return testResultData;
  } finally {
    if (page) {
      await page.close();
    }
  }
}
