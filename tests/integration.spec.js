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

// Flags to track console listeners setup
const consoleListenersSetup = {
  global: false,
  signup: false,
  login: false
};

// Reduced timeout values to prevent Lambda timeout
const NAVIGATION_TIMEOUT = 25000; // reduced from 50000
const ELEMENT_TIMEOUT = 8000; // reduced from 10000
const AUTH_TIMEOUT = 20000; // reduced from 30000

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
    timestamp: new Date().toISOString()
  });

  try {
    fs.appendFileSync(`/tmp/error-log.txt`, logMessage);
    console.log(`Error recorded for ${errorName}`);
  } catch (error) {
    console.error(`Error writing to error file: ${error.message}`);
  }
};

// More efficient sign-up flow with faster timeouts
const signUp = async (page) => {
  const consoleErrors = [];
  const randomEmail = generateRandomEmail();

  console.log(`Starting signup with email: ${randomEmail}`);

  // Set up console logging but only once
  if (!consoleListenersSetup.signup) {
    // Define the function for console errors
    const handleConsoleMessage = (msg) => {
      const type = msg.type();
      const text = msg.text();
      const time = new Date().toISOString();

      if (type === 'error') {
        console.log(`[Signup Console Error] ${text}`);
        consoleErrors.push({ type, text, time });
        consoleErrorLog.push({ type, text, time, source: 'signup-console' });

        try {
          fs.appendFileSync('/tmp/console-errors.txt', `[${type}] [${time}] ${text}\n`);
        } catch (err) {
          console.error('Failed to write console error to file:', err);
        }
      }
    };

    // Attach the listener
    page.on('console', handleConsoleMessage);
    consoleListenersSetup.signup = true;
  }

  try {
    console.log('Waiting for Torus iframe...');
    await page.waitForSelector('#torusIframe', { timeout: NAVIGATION_TIMEOUT });

    const torusFrame = await page.frameLocator('#torusIframe');
    console.log('Found Torus iframe, looking for embedded browser...');

    await torusFrame.locator('iframe[title="Embedded browser"]').waitFor({ timeout: NAVIGATION_TIMEOUT });
    const embeddedFrame = await torusFrame.frameLocator('iframe[title="Embedded browser"]');
    console.log('Found embedded browser iframe');

    // Create new wallet
    console.log('Looking for "Create a new wallet" button...');
    const buttonSignUp = embeddedFrame.locator('button:has-text("Create a new wallet")');
    await buttonSignUp.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT });
    await buttonSignUp.click();
    console.log('Clicked "Create a new wallet" button');

    // Fill email
    console.log('Filling email field...');
    const emailInput = embeddedFrame.getByRole('textbox', { name: 'Email' });
    await emailInput.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT });
    await emailInput.fill(randomEmail);

    // Click sign up
    console.log('Clicking "Sign Up" button...');
    const signUpButton = embeddedFrame.locator('button:has-text("Sign Up")');
    await signUpButton.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT });
    await signUpButton.click();

    // Fill OTP
    console.log('Filling OTP field...');
    const otpInput = embeddedFrame.getByRole('textbox', { name: 'OTP input' });
    await otpInput.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT });
    await otpInput.fill(otp);

    // Click verify
    console.log('Clicking "Verify" button...');
    const verifyButton = embeddedFrame.locator('button:has-text("Verify")');
    await verifyButton.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT });
    await verifyButton.click();

    // Handle continue button that appears for new users
    try {
      console.log('Looking for "Continue" button...');
      const continueButton = embeddedFrame.locator('button:has-text("Continue")');
      await continueButton.waitFor({ state: 'visible', timeout: AUTH_TIMEOUT });
      await continueButton.click();
      console.log('Clicked "Continue" button');
    } catch (continueError) {
      console.log('Continue button not found or not clickable - may not be needed for this user flow');
    }

    console.log('Waiting for quest tab to appear...');
    await page.waitForSelector('.tgui-e6658d0b8927f95e', { timeout: ELEMENT_TIMEOUT });
    console.log('Signup completed successfully');

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
      logError('SignupConsoleErrors', `Found ${consoleErrors.length} errors during signup`);
    }

    throw error;
  }
};

// Keep existing login for backward compatibility, but with optimized timeouts
const login = async (page) => {
  const consoleErrors = [];
  console.log(`Starting login with email: ${userName}`);

  // Set up console logging but only once
  if (!consoleListenersSetup.login) {
    // Define the function for console errors
    const handleConsoleMessage = (msg) => {
      const type = msg.type();
      const text = msg.text();
      const time = new Date().toISOString();

      if (type === 'error') {
        console.log(`[Login Console Error] ${text}`);
        consoleErrors.push({ type, text, time });
        consoleErrorLog.push({ type, text, time, source: 'login-console' });

        try {
          fs.appendFileSync('/tmp/console-errors.txt', `[${type}] [${time}] ${text}\n`);
        } catch (err) {
          console.error('Failed to write console error to file:', err);
        }
      }
    };

    // Attach the listener
    page.on('console', handleConsoleMessage);
    consoleListenersSetup.login = true;
  }

  try {
    console.log('Waiting for Torus iframe...');
    await page.waitForSelector('#torusIframe', { timeout: NAVIGATION_TIMEOUT });

    const torusFrame = await page.frameLocator('#torusIframe');
    console.log('Found Torus iframe, looking for embedded browser...');

    await torusFrame.locator('iframe[title="Embedded browser"]').waitFor({ timeout: NAVIGATION_TIMEOUT });
    const embeddedFrame = await torusFrame.frameLocator('iframe[title="Embedded browser"]');
    console.log('Found embedded browser iframe');

    // Click "I already have a wallet"
    console.log('Looking for "I already have a wallet" button...');
    const buttonLogin = embeddedFrame.locator('button:has-text("I already have a wallet")');
    await buttonLogin.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT });
    await buttonLogin.click();
    console.log('Clicked "I already have a wallet" button');

    // Fill email
    console.log('Filling email field...');
    const emailInput = embeddedFrame.getByRole('textbox', { name: 'Email' });
    await emailInput.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT });
    await emailInput.fill(userName);

    // Click sign in
    console.log('Clicking "Sign In" button...');
    const signInButton = embeddedFrame.locator('button:has-text("Sign In")');
    await signInButton.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT });
    await signInButton.click();

    // Fill OTP
    console.log('Filling OTP field...');
    const otpInput = embeddedFrame.getByRole('textbox', { name: 'OTP input' });
    await otpInput.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT });
    await otpInput.fill(otp);

    // Click verify
    console.log('Clicking "Verify" button...');
    const verifyButton = embeddedFrame.locator('button:has-text("Verify")');
    await verifyButton.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT });
    await verifyButton.click();

    console.log('Waiting for quest tab to appear...');
    await page.waitForSelector('.tgui-e6658d0b8927f95e', { timeout: ELEMENT_TIMEOUT });
    console.log('Login completed successfully');

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
      logError('LoginConsoleErrors', `Found ${consoleErrors.length} errors during login`);
    }

    throw error;
  }
};

async function navigateToWelcomePage({ page }) {
  console.log(`Navigating to welcome page: ${appUrl}/?campaignId=${campaignId}`);
  try {
    await page.goto(`${appUrl}/?campaignId=${campaignId}`, {
      waitUntil: 'domcontentloaded',
      timeout: NAVIGATION_TIMEOUT
    });

    console.log('Waiting for hero title to appear...');
    await page.waitForSelector('.hero-title', { timeout: ELEMENT_TIMEOUT });
    const welcomeTitle = await page.locator('.hero-title').textContent();
    console.log('Welcome page title:', welcomeTitle);
    
    // Check if the title matches the expected text
    if (welcomeTitle !== 'Sit back, Enjoy, and Earn!') {
      throw new Error(`Unexpected welcome title: ${welcomeTitle}`);
    }

    console.log('Clicking first button to start...');
    await page.locator('.tgui-bca5056bf34297b0').click();
    
    console.log('Clicking "Start Earning" button...');
    await page.locator('.welcom-cta-text').click();
    
    console.log('Successfully navigated to welcome page');
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
    console.log('Clicking leaderboard tab...');
    const leaderboardTabButton = page.locator('button:nth-child(2)');
    await leaderboardTabButton.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT });
    await leaderboardTabButton.click();

    // Brief wait for content to load
    console.log('Waiting for leaderboard content to load...');
    await page.waitForTimeout(1000);

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
    console.log('Clicking library tab...');
    const libraryTabButton = page.locator('button:nth-child(3)');
    await libraryTabButton.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT });
    await libraryTabButton.click();

    // Brief wait for content to load
    console.log('Waiting for library content to load...');
    await page.waitForTimeout(1000);

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

  // Reset listener flags
  consoleListenersSetup.global = false;
  consoleListenersSetup.signup = false;
  consoleListenersSetup.login = false;

  // Initialize log files
  try {
    fs.writeFileSync('/tmp/console-errors.txt', '');
    fs.writeFileSync('/tmp/performance-log.txt', '');
    fs.writeFileSync('/tmp/error-log.txt', '');
    console.log('Log files initialized');
  } catch (error) {
    console.error(`Error initializing log files: ${error.message}`);
  }

  let page;
  const globalConsoleErrors = [];

  try {
    console.log('Creating new page...');
    page = await context.newPage();
    console.log('Page created successfully');

    // Set up global console error logging - without assigning function name
    if (!consoleListenersSetup.global) {
      page.on('console', (msg) => {
        const type = msg.type();
        const text = msg.text();
        const time = new Date().toISOString();

        // Only log errors and warnings to reduce noise
        if (type === 'error' || type === 'warning') {
          console.log(`[${type.toUpperCase()}] ${text}`);
          const consoleEvent = { type, text, time };
          globalConsoleErrors.push(consoleEvent);
          
          // Add to global log for reporting
          consoleErrorLog.push({ type, text, time, source: 'global-page' });

          try {
            fs.appendFileSync('/tmp/console-errors.txt', `[${type}] [${time}] ${text}\n`);
          } catch (err) {
            console.error('Failed to write console error to file:', err);
          }
        }
      });
      
      // Set up page error logging
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
          source: 'page-error'
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
      
      consoleListenersSetup.global = true;
    }

    // Run core tests - active quests first
    let testData = { success: false };
    
    try {
      console.log('Running Active Quests test...');
      await testActiveQuestsScreen({ page, useNewUser: true });
      
      console.log('Running Leaderboard test...');
      await testLeaderboardScreen({ page });
      
      console.log('Running Library test...');
      await testLibraryScreen({ page });
      
      // All tests passed
      testData.success = true;
    } catch (testError) {
      console.error('Test execution error:', testError.message);
      testData.success = false;
      testData.error = testError.message;
      
      // Even if a test fails, make sure we have at least recorded the failure
      logError('TestExecutionError', testError.message);
    }

    console.log('=== COLLECTED METRICS ===');
    console.log(JSON.stringify(metrics, null, 2));
    console.log(`Environment: ${environment}`);
    console.log(`Region: ${region}`);
    console.log('========================');

    // Determine test success - require at least 3 metrics
    const testSuccess = metrics.length >= 3;
    
    console.log(`Test success status: ${testSuccess ? 'PASSED' : 'FAILED'}`);
    console.log(`Collected ${metrics.length} metrics (minimum required: 3)`);

    // Prepare basic test result data
    let testResultData = {
      success: testSuccess,
      metrics: metrics,
      environment: environment,
      region: region,
    };

    // Always include console errors in the report
    if (globalConsoleErrors.length > 0 || consoleErrorLog.length > 0) {
      // Use the larger of the two logs
      const errorsToReport = consoleErrorLog.length > globalConsoleErrors.length ? consoleErrorLog : globalConsoleErrors;
      
      testResultData.consoleErrors = errorsToReport;
      console.log(`Found ${errorsToReport.length} console errors/warnings during test`);

      try {
        fs.writeFileSync('/tmp/console-errors.json', JSON.stringify(errorsToReport, null, 2));
      } catch (fileError) {
        console.error('Failed to write console errors JSON file:', fileError);
      }
    }

    // Handle auth error case
    if (authError) {
      testResultData.authError = authError;

      // Add placeholder metrics if they're missing due to auth error
      if (!metrics.find((m) => m.name === 'Leaderboard Screen')) {
        metrics.push({
          name: 'Leaderboard Screen',
          duration: 0,
          faked: true,
          reason: 'Auth error prevented test',
        });
        fs.appendFileSync(`/tmp/performance-log.txt`, `Leaderboard Screen took 0ms [AUTH_ERROR]\n`);
      }

      if (!metrics.find((m) => m.name === 'Library Screen')) {
        metrics.push({
          name: 'Library Screen',
          duration: 0,
          faked: true,
          reason: 'Auth error prevented test',
        });
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
    console.error('Fatal error during integration test:', err);
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
      const errorsToReport = consoleErrorLog.length > globalConsoleErrors.length ? consoleErrorLog : globalConsoleErrors;
      
      testResultData.consoleErrors = errorsToReport;
      console.log(`Found ${errorsToReport.length} console errors/warnings during failed test`);

      try {
        fs.writeFileSync('/tmp/console-errors.json', JSON.stringify(errorsToReport, null, 2));
      } catch (fileError) {
        console.error('Failed to write console errors JSON file:', fileError);
      }
    }

    // Handle auth error case
    if (authError) {
      testResultData.authError = authError;

      // Add placeholder metrics if they're missing due to auth error
      if (!metrics.find((m) => m.name === 'Leaderboard Screen')) {
        metrics.push({
          name: 'Leaderboard Screen',
          duration: 0,
          faked: true,
          reason: 'Auth error prevented test',
        });
        fs.appendFileSync(`/tmp/performance-log.txt`, `Leaderboard Screen took 0ms [AUTH_ERROR]\n`);
      }

      if (!metrics.find((m) => m.name === 'Library Screen')) {
        metrics.push({
          name: 'Library Screen',
          duration: 0,
          faked: true,
          reason: 'Auth error prevented test',
        });
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
        timestamp: new Date().toISOString()
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
      console.log('Closing page...');
      await page.close().catch(e => console.error('Error closing page:', e));
    }
  }
}
