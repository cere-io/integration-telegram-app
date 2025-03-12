import { chromium } from 'playwright';
import fs from 'fs';

const userName = process.env.TEST_USER_EMAIL || 'veronika.filipenko@cere.io';
const otp = process.env.TEST_USER_OTP || '555555';
const appUrl = process.env.TEST_APP_URL || 'https://telegram-viewer-app.stage.cere.io';
const campaignId = process.env.TEST_CAMPAIGN_ID || '120';

const logTime = (testName, time) => {
  console.log(`Recording metric: ${testName} took ${time}ms`);
  const logMessage = `${testName} took ${time}ms\n`;
  fs.appendFileSync(`/tmp/performance-log.txt`, logMessage);
  console.log(`Metric recorded for ${testName}`);
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
  console.log('Testing Active Quests screen...');
  let start = Date.now();

  await page.goto(`${appUrl}/?campaignId=${campaignId}`, {
    waitUntil: 'networkidle'
  });

  await page.waitForLoadState('networkidle');

  await page.locator('path').nth(1).click();
  await page.getByRole('button', { name: 'Start Earning' }).click();

  await login(page, userName, otp);

  const questTab = await page.locator('.tgui-e6658d0b8927f95e').textContent();
  console.log('Quest tab text:', questTab);
  if (questTab !== 'Active Quests') {
    throw new Error('Active Quests tab not found');
  }

  let timeTaken = Date.now() - start;
  logTime('Active Quests Screen', timeTaken);
}

async function testLeaderboardScreen({ page }) {
  console.log('Testing Leaderboard screen...');
  let start = Date.now();

  const leaderboardTabButton = page.locator('xpath=/html/body/div[1]/div/div/div[2]/button[2]');
  await leaderboardTabButton.scrollIntoViewIfNeeded();
  await leaderboardTabButton.click();

  let timeTaken = Date.now() - start;
  logTime('Leaderboard Screen', timeTaken);
}

async function testLibraryScreen({ page }) {
  console.log('Testing Library screen...');
  let start = Date.now();

  const libraryTabButton = page.locator('xpath=/html/body/div[1]/div/div/div[2]/button[3]');
  await libraryTabButton.scrollIntoViewIfNeeded();
  await libraryTabButton.click();

  console.log('Library tab clicked successfully.');

  let timeTaken = Date.now() - start;
  logTime('Library Screen', timeTaken);
}

export default async function runIntegrationTest({ browser, context }) {
  console.log('Starting integration test...');
  let page;

  try {
    page = await context.newPage();
    console.log('Page created successfully');

    await testActiveQuestsScreen({ page });
    await testLeaderboardScreen({ page });
    await testLibraryScreen({ page });
  } catch (err) {
    console.error('Error during integration test:', err);

    try {
      if (fs.existsSync('/tmp/performance-log.txt')) {
        const metrics = fs.readFileSync('/tmp/performance-log.txt', 'utf8');
        console.log('Current performance metrics:');
        console.log(metrics);
      }
    } catch (readErr) {
      console.error('Error reading performance metrics:', readErr);
    }
  } finally {
    if (page) {
      await page.close();
    }
  }
}
