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

const login = async (page) => {
  try {
    console.log('Starting login process...');
    await page.waitForSelector('#torusIframe', { timeout: 30000 });
    console.log('Torus iframe found');

    const torusFrame = await page.frameLocator('#torusIframe');

    await torusFrame.locator('iframe[title="Embedded browser"]').waitFor({ timeout: 30000 });
    console.log('Embedded browser iframe found');

    const embeddedFrame = await torusFrame.frameLocator('iframe[title="Embedded browser"]');

    const buttonLogin = embeddedFrame.locator('button:has-text("I already have a wallet")');
    await buttonLogin.scrollIntoViewIfNeeded();
    await buttonLogin.waitFor({ state: 'visible', timeout: 10000 });
    console.log('I already have a wallet button found');
    await buttonLogin.click();
    console.log('I already have a wallet button clicked');

    const emailInput = embeddedFrame.getByRole('textbox', { name: 'Email' });
    await emailInput.scrollIntoViewIfNeeded();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('Email input found');
    await emailInput.fill(userName);
    console.log('Email filled');

    const signInButton = embeddedFrame.locator('button:has-text("Sign In")');
    await signInButton.scrollIntoViewIfNeeded();
    await signInButton.waitFor({ state: 'visible', timeout: 10000 });
    console.log('Sign In button found');
    await signInButton.click();
    console.log('Sign In button clicked');

    const otpInput = embeddedFrame.getByRole('textbox', { name: 'OTP input' });
    await otpInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('OTP input found');
    await otpInput.fill(otp);
    console.log('OTP filled');

    const verifyButton = embeddedFrame.locator('button:has-text("Verify")');
    await verifyButton.scrollIntoViewIfNeeded();
    await verifyButton.waitFor({ state: 'visible', timeout: 10000 });
    console.log('Verify button found');
    await verifyButton.click();
    console.log('Verify button clicked');

    await page.waitForTimeout(5000);
    console.log('Login process completed successfully');
    return true;
  } catch (err) {
    console.error(`Login process failed: ${err.message}`);
    console.error(err.stack);
    return false;
  }
};

async function testActiveQuestsScreen({ page }) {
  console.log(`Testing Active Quests screen in ${environment} environment (${region})...`);
  console.log(`Using URL: ${appUrl}/?campaignId=${campaignId}`);
  let start = Date.now();

  try {
    console.log('Step 1: Navigating to the app URL');
    await page.goto(`${appUrl}/?campaignId=${campaignId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    console.log('Navigation complete');

    await page.waitForTimeout(2000);

    console.log('Step 2: Clicking path element');
    await page.locator('path').nth(1).click();
    console.log('Path element clicked');

    console.log('Step 3: Clicking Start Earning button');
    await page.getByRole('button', { name: 'Start Earning' }).click();
    console.log('Start Earning button clicked');

    console.log('Step 4: Checking quest tab text');
    const questTab = await page.locator('.tgui-e6658d0b8927f95e').textContent();
    console.log('Quest tab text:', questTab);
    if (questTab !== 'Active Quests') {
      throw new Error('Active Quests tab not found');
    }
    console.log('Quest tab verified');

    let timeTaken = Date.now() - start;
    logTime('Active Quests Screen', timeTaken);
    console.log(`✅ Active Quests Screen metric recorded: ${timeTaken}ms`);

    console.log('Step 5: Starting login process');
    await login(page);
    return true;
  } catch (err) {
    console.error(`❌ Error in testActiveQuestsScreen: ${err.message}`);
    console.error(err.stack);

    let timeTaken = Date.now() - start;
    logTime('Active Quests Screen', timeTaken);
    console.log(`⚠️ Active Quests Screen metric recorded on error: ${timeTaken}ms`);

    try {
      await page.screenshot({ path: '/tmp/active-quests-error.png' });
      console.log('Error screenshot saved to /tmp/active-quests-error.png');
    } catch (e) {
      console.error('Failed to take screenshot:', e.message);
    }

    throw err;
  }
}

async function testLeaderboardScreen({ page }) {
  console.log(`Testing Leaderboard screen in ${environment} environment (${region})...`);
  let start = Date.now();

  try {
    console.log('Leaderboard test - finding tab buttons...');

    const currentUrl = page.url();
    console.log('Current URL before Leaderboard test:', currentUrl);

    const allButtons = await page.locator('button').all();
    console.log(`Found ${allButtons.length} buttons on page`);

    for (let i = 0; i < allButtons.length; i++) {
      const text = await allButtons[i].textContent().catch(() => 'unknown');
      const isVisible = await allButtons[i].isVisible().catch(() => false);
      console.log(`Button ${i}: text="${text.trim()}", visible=${isVisible}`);
    }

    console.log('Attempt 1: Finding Leaderboard button by text');
    const leaderboardByText = page.getByText('Leaderboard', { exact: true });
    const leaderboardByTextVisible = await leaderboardByText.isVisible().catch(() => false);
    console.log('Leaderboard button by text visible:', leaderboardByTextVisible);

    console.log('Attempt 2: Finding Leaderboard button by CSS selector');
    const leaderboardByCSS = page.locator('button:nth-child(2)');
    const leaderboardByCSSVisible = await leaderboardByCSS.isVisible().catch(() => false);
    console.log('Leaderboard button by CSS visible:', leaderboardByCSSVisible);

    console.log('Attempt 3: Finding Leaderboard button by XPath');
    const leaderboardByXPath = page.locator('xpath=/html/body/div[1]/div/div/div[2]/button[2]');
    const leaderboardByXPathVisible = await leaderboardByXPath.isVisible().catch(() => false);
    console.log('Leaderboard button by XPath visible:', leaderboardByXPathVisible);

    let leaderboardTabButton;

    if (leaderboardByTextVisible) {
      console.log('Using text selector for Leaderboard button');
      leaderboardTabButton = leaderboardByText;
    } else if (leaderboardByCSSVisible) {
      console.log('Using CSS selector for Leaderboard button');
      leaderboardTabButton = leaderboardByCSS;
    } else if (leaderboardByXPathVisible) {
      console.log('Using XPath selector for Leaderboard button');
      leaderboardTabButton = leaderboardByXPath;
    } else {
      await page.screenshot({ path: '/tmp/leaderboard-not-found.png' });
      console.log('Screenshot saved to /tmp/leaderboard-not-found.png');

      const html = await page.content();
      fs.writeFileSync('/tmp/leaderboard-page.html', html);
      console.log('Page HTML saved to /tmp/leaderboard-page.html');

      throw new Error('Leaderboard tab button not found with any selector');
    }

    console.log('Clicking Leaderboard tab button');
    await leaderboardTabButton.scrollIntoViewIfNeeded();
    await leaderboardTabButton.click();
    console.log('Leaderboard tab clicked successfully');

    console.log('Waiting for Leaderboard content to load');
    await page.waitForTimeout(2000);

    let timeTaken = Date.now() - start;
    logTime('Leaderboard Screen', timeTaken);
    console.log(`✅ Leaderboard Screen metric recorded: ${timeTaken}ms`);
    return true;
  } catch (err) {
    console.error(`❌ Error in testLeaderboardScreen: ${err.message}`);
    console.error(err.stack);

    let timeTaken = Date.now() - start;
    logTime('Leaderboard Screen', timeTaken);
    console.log(`⚠️ Leaderboard Screen metric recorded on error: ${timeTaken}ms`);

    try {
      await page.screenshot({ path: '/tmp/leaderboard-error.png' });
      console.log('Error screenshot saved to /tmp/leaderboard-error.png');
    } catch (e) {
      console.error('Failed to take screenshot:', e.message);
    }

    return false;
  }
}

async function testLibraryScreen({ page }) {
  console.log(`Testing Library screen in ${environment} environment (${region})...`);
  let start = Date.now();

  try {
    console.log('Library test - finding tab buttons...');

    const allButtons = await page.locator('button').all();
    console.log(`Found ${allButtons.length} buttons on page`);

    for (let i = 0; i < allButtons.length; i++) {
      const text = await allButtons[i].textContent().catch(() => 'unknown');
      const isVisible = await allButtons[i].isVisible().catch(() => false);
      console.log(`Button ${i}: text="${text.trim()}", visible=${isVisible}`);
    }

    console.log('Attempt 1: Finding Library button by text');
    const libraryByText = page.getByText('Library', { exact: true });
    const libraryByTextVisible = await libraryByText.isVisible().catch(() => false);
    console.log('Library button by text visible:', libraryByTextVisible);

    console.log('Attempt 2: Finding Library button by CSS selector');
    const libraryByCSS = page.locator('button:nth-child(3)');
    const libraryByCSSVisible = await libraryByCSS.isVisible().catch(() => false);
    console.log('Library button by CSS visible:', libraryByCSSVisible);

    console.log('Attempt 3: Finding Library button by XPath');
    const libraryByXPath = page.locator('xpath=/html/body/div[1]/div/div/div[2]/button[3]');
    const libraryByXPathVisible = await libraryByXPath.isVisible().catch(() => false);
    console.log('Library button by XPath visible:', libraryByXPathVisible);

    let libraryTabButton;

    if (libraryByTextVisible) {
      console.log('Using text selector for Library button');
      libraryTabButton = libraryByText;
    } else if (libraryByCSSVisible) {
      console.log('Using CSS selector for Library button');
      libraryTabButton = libraryByCSS;
    } else if (libraryByXPathVisible) {
      console.log('Using XPath selector for Library button');
      libraryTabButton = libraryByXPath;
    } else {
      await page.screenshot({ path: '/tmp/library-not-found.png' });
      console.log('Screenshot saved to /tmp/library-not-found.png');

      const html = await page.content();
      fs.writeFileSync('/tmp/library-page.html', html);
      console.log('Page HTML saved to /tmp/library-page.html');

      throw new Error('Library tab button not found with any selector');
    }

    console.log('Clicking Library tab button');
    await libraryTabButton.scrollIntoViewIfNeeded();
    await libraryTabButton.click();
    console.log('Library tab clicked successfully');

    console.log('Waiting for Library content to load');
    await page.waitForTimeout(2000);

    let timeTaken = Date.now() - start;
    logTime('Library Screen', timeTaken);
    console.log(`✅ Library Screen metric recorded: ${timeTaken}ms`);
    return true;
  } catch (err) {
    console.error(`❌ Error in testLibraryScreen: ${err.message}`);
    console.error(err.stack);

    let timeTaken = Date.now() - start;
    logTime('Library Screen', timeTaken);
    console.log(`⚠️ Library Screen metric recorded on error: ${timeTaken}ms`);

    try {
      await page.screenshot({ path: '/tmp/library-error.png' });
      console.log('Error screenshot saved to /tmp/library-error.png');
    } catch (e) {
      console.error('Failed to take screenshot:', e.message);
    }

    return false;
  }
}

export default async function runIntegrationTest({ browser, context }) {
  console.log(`Starting integration test for ${environment} environment in ${region} region`);
  console.log(`Using URL: ${appUrl} with campaign ID: ${campaignId}`);
  metrics.length = 0;

  try {
    console.log('Testing file system access...');
    fs.writeFileSync('/tmp/test-file.txt', 'Test file system access');
    const content = fs.readFileSync('/tmp/test-file.txt', 'utf8');
    console.log('File system test result:', content);
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
  let activeQuestsSuccess = false;
  let leaderboardSuccess = false;
  let librarySuccess = false;

  try {
    page = await context.newPage();
    console.log('Page created successfully');

    page.setDefaultTimeout(60000);

    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[BROWSER ERROR] ${err.message}`));

    console.log('\n=== STARTING ACTIVE QUESTS TEST ===');
    activeQuestsSuccess = await testActiveQuestsScreen({ page });
    console.log('=== ACTIVE QUESTS TEST COMPLETED ===\n');

    console.log('Waiting 5 seconds before next test...');
    await page.waitForTimeout(5000);

    console.log('\n=== STARTING LEADERBOARD TEST ===');
    try {
      leaderboardSuccess = await testLeaderboardScreen({ page });
      console.log('=== LEADERBOARD TEST COMPLETED ===\n');
    } catch (error) {
      console.error(`Leaderboard test error: ${error.message}, but continuing tests`);
    }

    console.log('Waiting 5 seconds before next test...');
    await page.waitForTimeout(5000);

    console.log('\n=== STARTING LIBRARY TEST ===');
    try {
      librarySuccess = await testLibraryScreen({ page });
      console.log('=== LIBRARY TEST COMPLETED ===\n');
    } catch (error) {
      console.error(`Library test error: ${error.message}`);
    }

    console.log('Ensuring metrics are saved to file...');
    let metricsText = '';
    metrics.forEach(m => {
      metricsText += `${m.name} took ${m.duration}ms\n`;
    });
    fs.writeFileSync('/tmp/performance-log.txt', metricsText);

    console.log('=== COLLECTED METRICS ===');
    console.log(JSON.stringify(metrics, null, 2));
    console.log(`Environment: ${environment}`);
    console.log(`Region: ${region}`);
    console.log('========================');

    return {
      success: activeQuestsSuccess,
      metrics: metrics,
      environment: environment,
      region: region
    };
  } catch (err) {
    console.error('Error during integration test:', err);

    let metricsText = metrics.map(m => `${m.name} took ${m.duration}ms`).join('\n');
    fs.writeFileSync('/tmp/performance-log.txt', metricsText);

    console.log('=== METRICS AT ERROR ===');
    console.log(JSON.stringify(metrics, null, 2));
    console.log(`Environment: ${environment}`);
    console.log(`Region: ${region}`);
    console.log('=======================');

    return {
      success: false,
      error: err.message,
      metrics: metrics,
      environment: environment,
      region: region
    };
  } finally {
    if (page) {
      await page.close();
    }
  }
}
