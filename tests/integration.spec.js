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
    campaignId: '117',
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
  await page.waitForSelector('#torusIframe', { timeout: 30000 });
  const torusFrame = await page.frameLocator('#torusIframe');

  await torusFrame.locator('iframe[title="Embedded browser"]').waitFor({ timeout: 30000 });
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
};

async function testActiveQuestsScreen({ page }) {
  console.log(`Testing Active Quests screen in ${environment} environment (${region})...`);
  let start = Date.now();

  await page.goto(`${appUrl}/?campaignId=${campaignId}`, {
    waitUntil: 'networkidle'
  });

  await page.waitForLoadState('networkidle');

  await page.locator('path').nth(1).click();
  await page.getByRole('button', { name: 'Start Earning' }).click();

  const questTab = await page.locator('.tgui-e6658d0b8927f95e').textContent();
  console.log('Quest tab text:', questTab);
  if (questTab !== 'Active Quests') {
    throw new Error('Active Quests tab not found');
  }

  let timeTaken = Date.now() - start;
  logTime('Active Quests Screen', timeTaken);

  await login(page);
}

async function testLeaderboardScreen({ page }) {
  console.log(`Testing Leaderboard screen in ${environment} environment (${region})...`);
  let start = Date.now();

  const leaderboardTabButton = page.locator('xpath=/html/body/div[1]/div/div/div[2]/button[2]');
  await leaderboardTabButton.scrollIntoViewIfNeeded();
  await leaderboardTabButton.click();

  let timeTaken = Date.now() - start;
  logTime('Leaderboard Screen', timeTaken);
}

async function testLibraryScreen({ page }) {
  console.log(`Testing Library screen in ${environment} environment (${region})...`);
  let start = Date.now();

  const libraryTabButton = page.locator('xpath=/html/body/div[1]/div/div/div[2]/button[3]');
  await libraryTabButton.scrollIntoViewIfNeeded();
  await libraryTabButton.click();

  console.log('Library tab clicked successfully.');

  let timeTaken = Date.now() - start;
  logTime('Library Screen', timeTaken);
}

export default async function runIntegrationTest({ browser, context }) {
  console.log(`Starting integration test for ${environment} environment in ${region} region`);
  console.log(`Using URL: ${appUrl} with campaign ID: ${campaignId}`);
  metrics.length = 0;

  try {
    fs.writeFileSync('/tmp/performance-log.txt', '');
    console.log('Metrics file cleared');
  } catch (error) {
    console.error(`Error clearing metrics file: ${error.message}`);
  }

  let page;

  try {
    page = await context.newPage();
    console.log('Page created successfully');

    await testActiveQuestsScreen({ page });
    await testLeaderboardScreen({ page });
    await testLibraryScreen({ page });

    console.log('=== COLLECTED METRICS ===');
    console.log(JSON.stringify(metrics, null, 2));
    console.log(`Environment: ${environment}`);
    console.log(`Region: ${region}`);
    console.log('========================');

    return {
      success: true,
      metrics: metrics,
      environment: environment,
      region: region
    };
  } catch (err) {
    console.error('Error during integration test:', err);

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
