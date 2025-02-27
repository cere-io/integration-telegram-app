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
    await page.goto('https://telegram-viewer-app.stage.cere.io/campaignId=115');

    // await page.locator('.tgui-bca5056bf34297b0').click();
    // await page.locator('.welcom-cta-text').click();

    await page.locator('#sign_in').click();
    await page.locator('[name="login"]').fill(userName);
    await page.locator(':r1:').click();
    await page.locator('#otp').fill(otp);
    await page.locator(':r3:').click();

    const questTitle = await page.locator('.t1uqjrzu').innerText();
    expect(questTitle).toBe('Complete Quests to Earn!');

    const questTab = await page.locator('.tgui-e6658d0b8927f95e').innerText();
    expect(questTab).toBe('Active Quests');

    const end = Date.now();
    const timeTaken = end - start;
    console.log(`Время для загрузки экрана активных квестов: ${timeTaken}ms`);
    logTime('Active Quests Screen', timeTaken);
    expect(timeTaken).toBeLessThan(20000);
  });

  test('Open leaderboard screen', async ({ page }) => {
    const start = Date.now();
    await page.goto('https://telegram-viewer-app.stage.cere.io/campaignId=115');

    // await page.locator('.tgui-bca5056bf34297b0').click();
    // await page.locator('.welcom-cta-text').click();

    await page.locator('#sign_in').click();
    await page.locator('[name="login"]').fill(userName);
    await page.locator(':r1:').click();
    await page.locator('#otp').fill(otp);
    await page.locator(':r3:').click();

    const questTitle = await page.locator('.t1uqjrzu').innerText();
    expect(questTitle).toBe('Complete Quests to Earn!');

    await page.locator('/html/body/div[1]/div/div/div[2]/button[2]').click();

    const leaderboardTab = await page.locator('.tgui-e6658d0b8927f95e').innerText();
    expect(leaderboardTab).toBe('Leaderboard');

    const leaderboardTitle = await page.locator('.jss1').innerText();
    expect(leaderboardTitle).toBe('Leaderboard');

    await page.locator('.l1shii3t').click();

    const leaderboardResult = await page.locator('.p1kqqlhg').innerText();
    expect(leaderboardResult).toBe('1 out of 3 tasks completed – Could do better');

    const end = Date.now();
    const timeTaken = end - start;
    console.log(`Время для загрузки экрана лидерборда: ${timeTaken}ms`);
    logTime('Leaderboard Screen', timeTaken);
    expect(timeTaken).toBeLessThan(20000);
  });

  test('Open library screen', async ({ page }) => {
    const start = Date.now();
    await page.goto('https://telegram-viewer-app.stage.cere.io/campaignId=115');

    // await page.locator('.tgui-bca5056bf34297b0').click();
    // await page.locator('.welcom-cta-text').click();

    await page.locator('#sign_in').click();
    await page.locator('[name="login"]').fill(userName);
    await page.locator(':r1:').click();
    await page.locator('#otp').fill(otp);
    await page.locator(':r3:').click();

    const questTitle = await page.locator('.t1uqjrzu').innerText();
    expect(questTitle).toBe('Complete Quests to Earn!');

    await page.locator('/html/body/div[1]/div/div/div[2]/button[3]').click();

    const libraryTitle = await page.locator('.tgui-72c2a480384c4fb1').innerText();
    expect(libraryTitle).toBe('Library');

    const end = Date.now();
    const timeTaken = end - start;
    console.log(`Время для загрузки экрана библиотеки: ${timeTaken}ms`);
    logTime('Library Screen', timeTaken);
    expect(timeTaken).toBeLessThan(20000);
  });
});
