import { test, expect } from '@playwright/test';
import fs from 'fs';

const userName = 'veronika.filipenko@cere.io';
const otp = '555555';

test.describe('Performance testing for screens', () => {
  const logTime = (testName: string, time: number) => {
    const logMessage = `${testName} took ${time}ms\n`;
    fs.appendFileSync('performance-log.txt', logMessage);
  };

  test('Open active quests screen', async ({ page }) => {
    const start = Date.now();
    await page.goto('https://telegram-viewer-app.stage.cere.io/?campaignId=117');

    await page.locator('.tgui-bca5056bf34297b0').click();
    await page.locator('.welcom-cta-text').click();

    await page
      .locator('#torusIframe')
      .contentFrame()
      .locator('iframe[title="Embedded browser"]')
      .contentFrame()
      .getByRole('button', { name: 'I already have a wallet' })
      .click();
    await page
      .locator('#torusIframe')
      .contentFrame()
      .locator('iframe[title="Embedded browser"]')
      .contentFrame()
      .getByRole('textbox', { name: 'Email' })
      .click();
    await page
      .locator('#torusIframe')
      .contentFrame()
      .locator('iframe[title="Embedded browser"]')
      .contentFrame()
      .getByRole('textbox', { name: 'Email' })
      .fill(userName);
    await page
      .locator('#torusIframe')
      .contentFrame()
      .locator('iframe[title="Embedded browser"]')
      .contentFrame()
      .getByRole('button', { name: 'Sign In' })
      .click();
    await page
      .locator('#torusIframe')
      .contentFrame()
      .locator('iframe[title="Embedded browser"]')
      .contentFrame()
      .getByRole('textbox', { name: 'OTP input' })
      .fill(otp);
    await page
      .locator('#torusIframe')
      .contentFrame()
      .locator('iframe[title="Embedded browser"]')
      .contentFrame()
      .getByRole('button', { name: 'Verify' })
      .click();

    const end = Date.now();
    const timeTaken = end - start;
    console.log(`Время для загрузки экрана активных квестов: ${timeTaken}ms`);
    logTime('Active Quests Screen', timeTaken);
    expect(timeTaken).toBeLessThan(20000);
  });

  test('Open leaderboard screen', async ({ page }) => {
    const start = Date.now();
    await page.goto('https://telegram-viewer-app.stage.cere.io/?campaignId=117');

    await page.locator('.tgui-bca5056bf34297b0').click();
    await page.locator('.welcom-cta-text').click();

    await page
      .locator('#torusIframe')
      .contentFrame()
      .locator('iframe[title="Embedded browser"]')
      .contentFrame()
      .getByRole('button', { name: 'I already have a wallet' })
      .click();
    await page
      .locator('#torusIframe')
      .contentFrame()
      .locator('iframe[title="Embedded browser"]')
      .contentFrame()
      .getByRole('textbox', { name: 'Email' })
      .click();
    await page
      .locator('#torusIframe')
      .contentFrame()
      .locator('iframe[title="Embedded browser"]')
      .contentFrame()
      .getByRole('textbox', { name: 'Email' })
      .fill(userName);
    await page
      .locator('#torusIframe')
      .contentFrame()
      .locator('iframe[title="Embedded browser"]')
      .contentFrame()
      .getByRole('button', { name: 'Sign In' })
      .click();
    await page
      .locator('#torusIframe')
      .contentFrame()
      .locator('iframe[title="Embedded browser"]')
      .contentFrame()
      .getByRole('textbox', { name: 'OTP input' })
      .fill(otp);
    await page
      .locator('#torusIframe')
      .contentFrame()
      .locator('iframe[title="Embedded browser"]')
      .contentFrame()
      .getByRole('button', { name: 'Verify' })
      .click();

    await page.getByRole('button', { name: 'Leaderboard' }).click();
    await page.locator('iframe[title="Leaderboard"]').contentFrame().getByRole('img').click();

    const end = Date.now();
    const timeTaken = end - start;
    console.log(`Время для загрузки экрана лидерборда: ${timeTaken}ms`);
    logTime('Leaderboard Screen', timeTaken);
    expect(timeTaken).toBeLessThan(20000);
  });

  test('Open library screen', async ({ page }) => {
    const start = Date.now();
    await page.goto('https://telegram-viewer-app.stage.cere.io/?campaignId=117');

    await page.locator('.tgui-bca5056bf34297b0').click();
    await page.locator('.welcom-cta-text').click();

    await page
      .locator('#torusIframe')
      .contentFrame()
      .locator('iframe[title="Embedded browser"]')
      .contentFrame()
      .getByRole('button', { name: 'I already have a wallet' })
      .click();
    await page
      .locator('#torusIframe')
      .contentFrame()
      .locator('iframe[title="Embedded browser"]')
      .contentFrame()
      .getByRole('textbox', { name: 'Email' })
      .click();
    await page
      .locator('#torusIframe')
      .contentFrame()
      .locator('iframe[title="Embedded browser"]')
      .contentFrame()
      .getByRole('textbox', { name: 'Email' })
      .fill(userName);
    await page
      .locator('#torusIframe')
      .contentFrame()
      .locator('iframe[title="Embedded browser"]')
      .contentFrame()
      .getByRole('button', { name: 'Sign In' })
      .click();
    await page
      .locator('#torusIframe')
      .contentFrame()
      .locator('iframe[title="Embedded browser"]')
      .contentFrame()
      .getByRole('textbox', { name: 'OTP input' })
      .fill(otp);
    await page
      .locator('#torusIframe')
      .contentFrame()
      .locator('iframe[title="Embedded browser"]')
      .contentFrame()
      .getByRole('button', { name: 'Verify' })
      .click();

    await page.getByRole('button', { name: 'Library' }).click();

    const end = Date.now();
    const timeTaken = end - start;
    console.log(`Время для загрузки экрана библиотеки: ${timeTaken}ms`);
    logTime('Library Screen', timeTaken);
    expect(timeTaken).toBeLessThan(20000);
  });
});
