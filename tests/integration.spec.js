import { chromium } from 'playwright';
import fs from 'fs';

const userName = process.env.TEST_USER_EMAIL || 'veronika.filipenko@cere.io';
const otp = process.env.TEST_USER_OTP || '555555';
const appUrl = process.env.TEST_APP_URL || 'https://telegram-viewer-app.stage.cere.io';
const campaignId = process.env.TEST_CAMPAIGN_ID || '114';

const logTime = (testName, time) => {
  const logMessage = `${testName} took ${time}ms\n`;
  fs.appendFileSync(`performance-log.txt`, logMessage);
};

const login = async (page) => {
  // Добавляем ожидание данных фрейма
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

export default async function runIntegrationTest({ browser, context }) {
  console.log('Starting integration test...');
  let page;

  try {
    page = await context.newPage();
    console.log('Page created successfully');

    // Test 1: Active Quests Screen
    console.log('Testing Active Quests screen...');
    let start = Date.now();

    // Заходим на URL
    await page.goto(`${appUrl}/?campaignId=${campaignId}`, {
      waitUntil: 'networkidle'
    });

    // Проверяем, что страница загружена
    await page.waitForLoadState('networkidle');

    // Попробуем кликнуть на кнопки с логами видимости элемента
    // const welcomeButton = page.locator('.tgui-bca5056bf34297b0');
    // if (await welcomeButton.isVisible()) {
    //   console.log('Welcome button is visible');
    //   await welcomeButton.click();
    // } else {
    //   throw new Error('Welcome button is not visible or interactable!');
    // }
    //
    // const welcomeCtaText = page.locator('.welcom-cta-text');
    // if (await welcomeCtaText.isVisible()) {
    //   console.log('Welcome CTA button is visible');
    //   await welcomeCtaText.click();
    // } else {
    //   throw new Error('Welcome CTA button is not visible or interactable!');
    // }

    await page.locator('path').nth(1).click();
    await page.getByRole('button', { name: 'Start Earning' }).click();

    // Авторизация
    await login(page, userName, otp);

    // Проверяем вкладку Active Quests
    const questTab = await page.locator('.tgui-e6658d0b8927f95e').textContent();
    console.log('Quest tab text:', questTab);
    if (questTab !== 'Active Quests') {
      throw new Error('Active Quests tab not found');
    }

    let timeTaken = Date.now() - start;
    logTime('Active Quests Screen', timeTaken);

    // Test 2: Leaderboard Screen
    console.log('Testing Leaderboard screen...');
    start = Date.now();

    // Клик по табу Leaderboard
    const leaderboardTabButton = page.locator('xpath=/html/body/div[1]/div/div/div[2]/button[2]');
    await leaderboardTabButton.scrollIntoViewIfNeeded();
    await leaderboardTabButton.click();

    // Проверяем вкладку Leaderboard
    const leaderboardTab = await page.locator('.tgui-e6658d0b8927f95e').textContent();
    if (leaderboardTab !== 'Leaderboard') {
      throw new Error('Leaderboard tab not found');
    }

    // Проверяем заголовок Leaderboard
    const leaderboardTitle = await page.locator('.jss1').textContent();
    if (leaderboardTitle !== 'Leaderboard') {
      throw new Error('Leaderboard title not found');
    }

    // Клик на элемент Leaderboard
    const leaderboardElement = await page.locator('.l1shii3t');
    await leaderboardElement.scrollIntoViewIfNeeded();
    await leaderboardElement.click();

    // Проверяем результат Leaderboard
    const leaderboardResult = await page.locator('.p1kqqlhg').textContent();
    if (leaderboardResult !== '1 out of 3 tasks completed – Could do better') {
      throw new Error('Incorrect leaderboard result');
    }

    timeTaken = Date.now() - start;
    logTime('Leaderboard Screen', timeTaken);

    // Test 3: Library Screen
    console.log('Testing Library screen...');
    start = Date.now();

    // Клик по табу Library
    const libraryTabButton = page.locator('xpath=/html/body/div[1]/div/div/div[2]/button[3]');
    await libraryTabButton.scrollIntoViewIfNeeded();
    await libraryTabButton.click();

    console.log('Library tab clicked successfully.');

    timeTaken = Date.now() - start;
    logTime('Library Screen', timeTaken);
  } catch (err) {
    console.error('Error during integration test:', err);
  } finally {
    if (page) {
      await page.close();
    }
  }
}
