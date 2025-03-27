import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';

console.log('Test script loaded!');

const userName = process.env.TEST_USER_EMAIL || 'veronika.filipenko@cere.io';
const otp = process.env.TEST_USER_OTP || '555555';

const env = process.env.TEST_ENV || 'dev';

let configAppUrl;
let configCampaignId;

switch (env) {
  case 'dev':
    configAppUrl = process.env.DEV_APP_URL;
    configCampaignId = process.env.DEV_CAMPAIGN_ID;
    break;
  case 'stage':
    configAppUrl = process.env.STAGE_APP_URL;
    configCampaignId = process.env.STAGE_CAMPAIGN_ID;
    break;
  case 'prod':
    configAppUrl = process.env.PROD_APP_URL;
    configCampaignId = process.env.PROD_CAMPAIGN_ID;
    break;
}

const appUrl = process.env.TEST_APP_URL || configAppUrl || 'https://telegram-viewer-app.stage.cere.io';
const campaignId = process.env.TEST_CAMPAIGN_ID || configCampaignId || '120';

const logTime = (testName: string, time: number) => {
  const logMessage = `${testName} took ${time}ms\n`;
  fs.appendFileSync(`performance-log.txt`, logMessage);
};

const login = async (page: Page, userName: string, otp: string) => {
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

test('Environment and Geolocation Check', async ({ page }) => {
  const isLambda = process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
  const region = process.env.REGION || 'local';

  console.log(`Running in environment: ${env}`);
  console.log(`Is Lambda: ${isLambda}`);
  console.log(`Region: ${region}`);

  // Check IP and country
  await page.goto('https://api64.ipify.org?format=json');
  const ipResponse = await page.locator('pre').textContent();
  const { ip } = JSON.parse(ipResponse || '{}');
  console.log(`Detected IP: ${ip}`);

  await page.goto('https://ipapi.co/json/');
  const locationResponse = await page.locator('pre').textContent();
  const { country_name, country } = JSON.parse(locationResponse || '{}');
  console.log(`Detected Country: ${country_name} (${country})`);
});

test('Active Quests Screen Performance', async ({ page }) => {
  try {
    const start = Date.now();
    await page.goto(`${appUrl}/?campaignId=${campaignId}`);
    console.log('Page loaded, waiting for networkidle...');
    await page.waitForLoadState('networkidle');
    console.log('Network idle reached');

    try {
      await page.locator('path').nth(1).click();
      console.log('Clicked on path[1]');
    } catch (e) {
      console.log('Failed to click on path[1], trying alternative selector');
      try {
        await page.locator('.tgui-bca5056bf34297b0').click();
        console.log('Clicked on .tgui-bca5056bf34297b0');
      } catch (e2) {
        console.log('Failed to click on .tgui-bca5056bf34297b0, trying another selector');
        await page.locator('.welcom-cta-text').click();
        console.log('Clicked on .welcom-cta-text');
      }
    }

    console.log('Waiting for "Start Earning" button...');
    await page.getByRole('button', { name: 'Start Earning' }).click();
    console.log('Clicked "Start Earning" button');

    console.log('Starting login process...');
    await login(page, userName, otp);
    console.log('Login completed');

    const timeTaken = Date.now() - start;
    console.log(`Time to load active quests screen: ${timeTaken}ms`);
    logTime('Active Quests Screen', timeTaken);
    expect(timeTaken).toBeLessThan(60000);
  } catch (e) {
    console.error('Test failed with error:', e);
    throw e;
  }
});

test('Leaderboard Screen Performance', async ({ page }) => {
  const start = Date.now();
  await page.goto(`${appUrl}/?campaignId=${campaignId}`);
  await page.waitForLoadState('networkidle');

  // await page.locator('.tgui-bca5056bf34297b0').click();
  // await page.locator('.welcom-cta-text').click();
  await page.locator('path').nth(1).click();
  await page.getByRole('button', { name: 'Start Earning' }).click({ timeout: 10000 });

  await login(page, userName, otp);

  await page.getByRole('button', { name: 'Leaderboard' }).click();
  const leaderboardFrame = await page.frameLocator('iframe[title="Leaderboard"]');
  await leaderboardFrame.locator('img').click();

  const timeTaken = Date.now() - start;
  console.log(`Time to load leaderboard screen: ${timeTaken}ms`);
  logTime('Leaderboard Screen', timeTaken);
  expect(timeTaken).toBeLessThan(60000);
});

test('Library Screen Performance', async ({ page }) => {
  const start = Date.now();
  await page.goto(`${appUrl}/?campaignId=${campaignId}`);
  await page.waitForLoadState('networkidle');

  // await page.locator('.tgui-bca5056bf34297b0').click();
  // await page.locator('.welcom-cta-text').click();
  await page.locator('path').nth(1).click();
  await page.getByRole('button', { name: 'Start Earning' }).click({ timeout: 10000 });

  await page.getByRole('button', { name: 'Library' }).click();

  const timeTaken = Date.now() - start;
  console.log(`Time to load library screen: ${timeTaken}ms`);
  logTime('Library Screen', timeTaken);
  expect(timeTaken).toBeLessThan(60000);
});
