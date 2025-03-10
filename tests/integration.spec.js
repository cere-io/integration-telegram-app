import { chromium } from 'playwright';
import fs from 'fs';

const userName = process.env.TEST_USER_EMAIL || 'veronika.filipenko@cere.io';
const otp = process.env.TEST_USER_OTP || '555555';
const appUrl = process.env.TEST_APP_URL || 'https://telegram-viewer-app.stage.cere.io';
const campaignId = process.env.TEST_CAMPAIGN_ID || '117';

const logTime = (testName, time) => {
  const logMessage = `${testName} took ${time}ms\n`;
  fs.appendFileSync(`performance-log.txt`, logMessage);
};

const login = async (page, userName, otp) => {
  await page.waitForSelector('#torusIframe', { timeout: 30000 });
  const torusFrame = await page.frameLocator('#torusIframe');

  await page.waitForSelector('iframe[title="Embedded browser"]', { timeout: 30000 });
  const embeddedFrame = await torusFrame.frameLocator('iframe[title="Embedded browser"]');

  await embeddedFrame.locator('button:has-text("I already have a wallet")').waitFor({ timeout: 30000 });
  await embeddedFrame.getByRole('button', { name: 'I already have a wallet' }).click();

  await embeddedFrame.locator('input[type="email"]').waitFor({ timeout: 30000 });
  await embeddedFrame.getByRole('textbox', { name: 'Email' }).fill(userName);

  await embeddedFrame.locator('button:has-text("Sign In")').waitFor({ timeout: 30000 });
  await embeddedFrame.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForTimeout(2000);
  await embeddedFrame.locator('input[type="text"]').waitFor({ timeout: 30000 });
  await embeddedFrame.getByRole('textbox', { name: 'OTP input' }).fill(otp);

  await embeddedFrame.locator('button:has-text("Verify")').waitFor({ timeout: 30000 });
  await embeddedFrame.getByRole('button', { name: 'Verify' }).click();
};

export default async function runIntegrationTest({ browser, context }) {
  console.log('Starting integration test...');
  
  // Добавляем задержку после создания контекста
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Проверяем состояние браузера
  if (!browser.isConnected()) {
    throw new Error('Browser is not connected before creating page');
  }
  
  console.log('Browser connection status:', browser.isConnected());
  console.log('Creating new page...');
  
  let page;
  try {
    page = await context.newPage();
    console.log('Page created successfully');

    // Environment and Geolocation Check
    const env = process.env.TEST_ENV || 'dev';
    const isLambda = process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
    const region = process.env.REGION || 'local';

    console.log(`Running in environment: ${env}`);
    console.log(`Is Lambda: ${isLambda}`);
    console.log(`Region: ${region}`);

    await page.goto('https://api64.ipify.org?format=json');
    const ipResponse = await page.locator('pre').textContent();
    const { ip } = JSON.parse(ipResponse || '{}');
    console.log(`Detected IP: ${ip}`);

    await page.goto('https://ipapi.co/json/');
    const locationResponse = await page.locator('pre').textContent();
    const { country_name, country } = JSON.parse(locationResponse || '{}');
    console.log(`Detected Country: ${country_name} (${country})`);

    // Active Quests Screen Performance
    let start = Date.now();
    await page.goto(`${appUrl}/?campaignId=${campaignId}`, {
      timeout: 30000,
      waitUntil: 'networkidle'
    });

    await page.locator('.tgui-bca5056bf34297b0').click();
    await page.locator('.welcom-cta-text').click();

    await login(page, userName, otp);

    let timeTaken = Date.now() - start;
    console.log(`Time to load active quests screen: ${timeTaken}ms`);
    logTime('Active Quests Screen', timeTaken);
    if (timeTaken >= 60000) throw new Error('Active Quests Screen test failed: took too long');

    // Leaderboard Screen Performance
    start = Date.now();
    await page.goto(`${appUrl}/?campaignId=${campaignId}`, {
      timeout: 30000,
      waitUntil: 'networkidle'
    });

    await page.locator('.tgui-bca5056bf34297b0').click();
    await page.locator('.welcom-cta-text').click();

    await login(page, userName, otp);

    await page.getByRole('button', { name: 'Leaderboard' }).click();
    const leaderboardFrame = await page.frameLocator('iframe[title="Leaderboard"]');
    await leaderboardFrame.locator('img').click();

    timeTaken = Date.now() - start;
    console.log(`Time to load leaderboard screen: ${timeTaken}ms`);
    logTime('Leaderboard Screen', timeTaken);
    if (timeTaken >= 60000) throw new Error('Leaderboard Screen test failed: took too long');

    // Library Screen Performance
    start = Date.now();
    await page.goto(`${appUrl}/?campaignId=${campaignId}`, {
      timeout: 30000,
      waitUntil: 'networkidle'
    });

    await page.locator('.tgui-bca5056bf34297b0').click();
    await page.locator('.welcom-cta-text').click();

    await page.getByRole('button', { name: 'Library' }).click();

    timeTaken = Date.now() - start;
    console.log(`Time to load library screen: ${timeTaken}ms`);
    logTime('Library Screen', timeTaken);
    if (timeTaken >= 60000) throw new Error('Library Screen test failed: took too long');

  } catch (error) {
    console.error('Test error:', error);
    console.error('Browser connected:', browser.isConnected());
    throw error;
  } finally {
    if (page) {
      try {
        console.log('Closing page...');
        await page.close().catch(e => console.error('Error closing page:', e));
      } catch (error) {
        console.error('Error in finally block:', error);
      }
    }
  }
} 