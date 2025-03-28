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

// Default email with random number to avoid conflicts
const generateRandomEmail = () => {
  const randomNumber = Math.floor(Math.random() * 100000);
  return `veronika.filipenko+${randomNumber}@cere.io`;
};

const userName = process.env.TEST_USER_EMAIL || generateRandomEmail();
const otp = process.env.TEST_USER_OTP || '555555';
const appUrl = process.env.TEST_APP_URL || currentConfig.baseURL;
const campaignId = process.env.TEST_CAMPAIGN_ID || currentConfig.campaignId;

const metrics = [];
let authError = null;
const consoleErrorLog = [];

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

  // Add to our in-memory log for lambda reporting
  consoleErrorLog.push({
    type: 'error',
    name: errorName,
    message: errorMessage,
    timestamp: new Date().toISOString(),
  });

  try {
    fs.appendFileSync(`/tmp/error-log.txt`, logMessage);
    console.log(`Error recorded for ${errorName}`);
  } catch (error) {
    console.error(`Error writing to error file: ${error.message}`);
  }
};

// New signup flow based on Selenium tests
const signUp = async (page) => {
  const consoleErrors = [];
  const randomEmail = generateRandomEmail();

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    const time = new Date().toISOString();

    console.log(`[Browser Console] [${type}] ${text}`);

    if (type === 'error') {
      consoleErrors.push({ type, text, time });

      // Add to global error log for report
      consoleErrorLog.push({ type, text, time, source: 'browser-console' });

      try {
        fs.appendFileSync('/tmp/console-errors.txt', `[${type}] [${time}] ${text}\n`);
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

    // Updated to match the Selenium test logic for new user signup
    const buttonSignUp = embeddedFrame.locator('button:has-text("Create a new wallet")');
    await buttonSignUp.scrollIntoViewIfNeeded();
    await buttonSignUp.waitFor({ state: 'visible', timeout: 10000 });
    await buttonSignUp.click();

    const emailInput = embeddedFrame.getByRole('textbox', { name: 'Email' });
    await emailInput.scrollIntoViewIfNeeded();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(randomEmail);

    const signUpButton = embeddedFrame.locator('button:has-text("Sign Up")');
    await signUpButton.scrollIntoViewIfNeeded();
    await signUpButton.waitFor({ state: 'visible', timeout: 10000 });
    await signUpButton.click();

    const otpInput = embeddedFrame.getByRole('textbox', { name: 'OTP input' });
    await otpInput.waitFor({ state: 'visible', timeout: 10000 });
    await otpInput.fill(otp);

    const verifyButton = embeddedFrame.locator('button:has-text("Verify")');
    await verifyButton.scrollIntoViewIfNeeded();
    await verifyButton.waitFor({ state: 'visible', timeout: 10000 });
    await verifyButton.click();

    // Handle continue button that appears for new users
    try {
      const continueButton = embeddedFrame.locator('button:has-text("Continue")');
      await continueButton.waitFor({ state: 'visible', timeout: 30000 });
      await continueButton.click();
    } catch (continueError) {
      console.log('Continue button not found or not clickable - may not be needed for this user flow');
    }

    await page.waitForSelector('.tgui-e6658d0b8927f95e', { timeout: 15000 });

    return { success: true, consoleErrors, email: randomEmail };
  } catch (error) {
    try {
      await page.screenshot({ path: '/tmp/signup-error.png' });
      console.log('Saved error screenshot to /tmp/signup-error.png');
    } catch (screenshotError) {
      console.error('Failed to save screenshot:', screenshotError);
    }

    console.error(`Signup error: ${error.message}`);
    authError = {
      type: 'SignupError',
      message: error.message,
      timestamp: new Date().toISOString(),
      consoleErrors: consoleErrors,
    };

    logError('Web3AuthSignupError', error.message);

    if (consoleErrors.length > 0) {
      try {
        fs.appendFileSync('/tmp/error-log.txt', '\nConsole Errors during signup:\n');
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

// Keep existing login for backward compatibility
const login = async (page) => {
  const consoleErrors = [];

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    const time = new Date().toISOString();

    console.log(`[Browser Console] [${type}] ${text}`);

    if (type === 'error') {
      consoleErrors.push({ type, text, time });

      // Add to global error log for report
      consoleErrorLog.push({ type, text, time, source: 'browser-console' });

      try {
        fs.appendFileSync('/tmp/console-errors.txt', `[${type}] [${time}] ${text}\n`);
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

async function navigateToWelcomePage({ page }) {
  try {
    await page.goto(`${appUrl}/?campaignId=${campaignId}`, {
      waitUntil: 'domcontentloaded',
    });

    await page.waitForSelector('.hero-title', { timeout: 10000 });
    const welcomeTitle = await page.locator('.hero-title').textContent();
    console.log('Welcome page title:', welcomeTitle);

    // Check if the title matches the expected text
    if (welcomeTitle !== 'Sit back, Enjoy, and Earn!') {
      throw new Error(`Unexpected welcome title: ${welcomeTitle}`);
    }

    await page.locator('.tgui-bca5056bf34297b0').click();
    await page.locator('.welcom-cta-text').click();

    return true;
  } catch (err) {
    console.error(`Error in navigating to welcome page: ${err.message}`);
    logError('NavigationError', err.message);
    throw err;
  }
}

async function testActiveQuestsScreen({ page, useNewUser = false }) {
  console.log(`Testing Active Quests screen in ${environment} environment (${region})...`);
  let start = Date.now();

  try {
    await navigateToWelcomePage({ page });

    // Choose authentication method based on parameter
    if (useNewUser) {
      const signupResult = await signUp(page);
      console.log('Signup successful:', signupResult.success);
      console.log('Created user with email:', signupResult.email);
    } else {
      const loginResult = await login(page);
      console.log('Login successful:', loginResult.success);
    }

    const questTab = await page.locator('.tgui-e6658d0b8927f95e').textContent();
    console.log('Quest tab text:', questTab);
    if (questTab !== 'Active Quests') {
      throw new Error('Active Quests tab not found');
    }

    let timeTaken = Date.now() - start;
    logTime('Active Quests Screen', timeTaken);
    console.log(`✅ Active Quests Screen metric recorded: ${timeTaken}ms`);

    return true;
  } catch (err) {
    console.error(`❌ Error in testActiveQuestsScreen: ${err.message}`);
    logError('ActiveQuestsScreenError', err.message);
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
    // Updated to use button click to navigate to leaderboard tab
    const leaderboardTabButton = page.locator('button:nth-child(2)');
    await leaderboardTabButton.scrollIntoViewIfNeeded();
    await leaderboardTabButton.click();

    // Wait for leaderboard content to load
    await page.waitForTimeout(2000);

    let timeTaken = Date.now() - start;
    logTime('Leaderboard Screen', timeTaken);
    console.log(`✅ Leaderboard Screen metric recorded: ${timeTaken}ms`);
    return true;
  } catch (err) {
    console.error(`❌ Error in testLeaderboardScreen: ${err.message}`);
    logError('LeaderboardScreenError', err.message);
    let timeTaken = Date.now() - start;
    logTime('Leaderboard Screen', timeTaken);
    console.log(`⚠️ Leaderboard Screen metric recorded on error: ${timeTaken}ms`);
    throw err;
  }
}

async function testLibraryScreen({ page }) {
  console.log(`Testing Library screen in ${environment} environment (${region})...`);
  let start = Date.now();

  try {
    // Updated to use button click to navigate to library tab
    const libraryTabButton = page.locator('button:nth-child(3)');
    await libraryTabButton.scrollIntoViewIfNeeded();
    await libraryTabButton.click();

    // Wait for library content to load
    await page.waitForTimeout(2000);

    let timeTaken = Date.now() - start;
    logTime('Library Screen', timeTaken);
    console.log(`✅ Library Screen metric recorded: ${timeTaken}ms`);
    return true;
  } catch (err) {
    console.error(`❌ Error in testLibraryScreen: ${err.message}`);
    logError('LibraryScreenError', err.message);
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
  consoleErrorLog.length = 0;

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

  try {
    fs.writeFileSync('/tmp/error-log.txt', '');
    console.log('Error log file cleared');
  } catch (error) {
    console.error(`Error clearing error log file: ${error.message}`);
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

        // Add to global log for reporting
        consoleErrorLog.push({ type, text, time, source: 'global-page' });

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

      // Add to global log for reporting
      consoleErrorLog.push({
        type: 'pageerror',
        text: error.message,
        stack: error.stack || 'No stack trace',
        time,
        source: 'page-error',
      });

      try {
        fs.appendFileSync(
          '/tmp/console-errors.txt',
          `[pageerror] [${time}] ${error.message}\n${error.stack || 'No stack trace'}\n\n`,
        );
      } catch (err) {
        console.error('Failed to write page error to file:', err);
      }
    });

    // Create a new user for testing
    await testActiveQuestsScreen({ page, useNewUser: true });
    await testLeaderboardScreen({ page });
    await testLibraryScreen({ page });

    console.log('=== COLLECTED METRICS ===');
    console.log(JSON.stringify(metrics, null, 2));
    console.log(`Environment: ${environment}`);
    console.log(`Region: ${region}`);
    console.log('========================');

    // Determine test success - require at least 3 metrics
    const testSuccess = metrics.length >= 3;

    console.log(`Test success status: ${testSuccess ? 'PASSED' : 'FAILED'}`);
    console.log(`Collected ${metrics.length} metrics (minimum required: 3)`);

    let testResultData = {
      success: testSuccess,
      metrics: metrics,
      environment: environment,
      region: region,
    };

    // Always include console errors in the report
    if (globalConsoleErrors.length > 0 || consoleErrorLog.length > 0) {
      // Use the larger of the two logs
      const errorsToReport =
        consoleErrorLog.length > globalConsoleErrors.length ? consoleErrorLog : globalConsoleErrors;

      testResultData.consoleErrors = errorsToReport;
      console.log(`Found ${errorsToReport.length} console errors/warnings during test`);

      try {
        fs.writeFileSync('/tmp/console-errors.json', JSON.stringify(errorsToReport, null, 2));
        console.log(`Wrote ${errorsToReport.length} console errors to /tmp/console-errors.json for debugging`);
      } catch (fileError) {
        console.error('Failed to write console errors JSON file:', fileError);
      }

      try {
        let consoleErrorsText = errorsToReport
          .map((err) => `[${err.type}] [${err.time}] ${err.source ? `[${err.source}] ` : ''}${err.text}`)
          .join('\n');

        fs.writeFileSync('/tmp/console-errors-formatted.txt', consoleErrorsText);
        console.log('Wrote formatted console errors to /tmp/console-errors-formatted.txt');
      } catch (fileError) {
        console.error('Failed to write formatted console errors file:', fileError);
      }
    }

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

    // Prepare Lambda report with consolidated information
    const lambdaReport = {
      testSuccess: testSuccess,
      environment: environment,
      region: region,
      metrics: metrics,
      totalMetrics: metrics.length,
      requiredMetrics: 3,
      errors: consoleErrorLog,
      totalErrors: consoleErrorLog.length,
      authError: authError,
      timestamp: new Date().toISOString(),
    };

    // Write Lambda report to a file that can be picked up
    try {
      fs.writeFileSync('/tmp/lambda-report.json', JSON.stringify(lambdaReport, null, 2));
      console.log('Lambda report written to /tmp/lambda-report.json');
    } catch (reportError) {
      console.error('Failed to write Lambda report:', reportError);
    }

    return testResultData;
  } catch (err) {
    console.error('Error during integration test:', err);
    logError('IntegrationTestError', err.message);

    console.log('=== METRICS AT ERROR ===');
    console.log(JSON.stringify(metrics, null, 2));
    console.log(`Environment: ${environment}`);
    console.log(`Region: ${region}`);
    console.log('=======================');

    // Determine test success - require at least 3 metrics
    const testSuccess = metrics.length >= 3;

    console.log(`Test success status: ${testSuccess ? 'PASSED' : 'FAILED'}`);
    console.log(`Collected ${metrics.length} metrics (minimum required: 3)`);

    let testResultData = {
      success: testSuccess,
      error: err.message,
      metrics: metrics,
      environment: environment,
      region: region,
    };

    // Always include console errors in the report
    if (globalConsoleErrors.length > 0 || consoleErrorLog.length > 0) {
      // Use the larger of the two logs
      const errorsToReport =
        consoleErrorLog.length > globalConsoleErrors.length ? consoleErrorLog : globalConsoleErrors;

      testResultData.consoleErrors = errorsToReport;
      console.log(`Found ${errorsToReport.length} console errors/warnings during failed test`);

      try {
        fs.writeFileSync('/tmp/console-errors.json', JSON.stringify(errorsToReport, null, 2));
        console.log(`Wrote ${errorsToReport.length} console errors to /tmp/console-errors.json for debugging`);
      } catch (fileError) {
        console.error('Failed to write console errors JSON file:', fileError);
      }

      try {
        let consoleErrorsText = errorsToReport
          .map((err) => `[${err.type}] [${err.time}] ${err.source ? `[${err.source}] ` : ''}${err.text}`)
          .join('\n');

        fs.writeFileSync('/tmp/console-errors-formatted.txt', consoleErrorsText);
        console.log('Wrote formatted console errors to /tmp/console-errors-formatted.txt');
      } catch (fileError) {
        console.error('Failed to write formatted console errors file:', fileError);
      }
    }

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

    // Prepare Lambda report with consolidated information
    const lambdaReport = {
      testSuccess: testSuccess,
      environment: environment,
      region: region,
      metrics: metrics,
      totalMetrics: metrics.length,
      requiredMetrics: 3,
      errors: consoleErrorLog,
      totalErrors: consoleErrorLog.length,
      mainError: {
        type: 'IntegrationTestError',
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      },
      authError: authError,
      timestamp: new Date().toISOString(),
    };

    // Write Lambda report to a file that can be picked up
    try {
      fs.writeFileSync('/tmp/lambda-report.json', JSON.stringify(lambdaReport, null, 2));
      console.log('Lambda report written to /tmp/lambda-report.json');
    } catch (reportError) {
      console.error('Failed to write Lambda report:', reportError);
    }

    return testResultData;
  } finally {
    if (page) {
      await page.close();
    }
  }
}
