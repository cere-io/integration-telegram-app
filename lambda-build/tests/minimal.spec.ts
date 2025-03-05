import { test, expect } from '@playwright/test';

test('basic test', async ({ page }) => {
  await page.goto('https://telegram-viewer-app.stage.cere.io/?campaignId=117');
  await expect(page).toHaveTitle(/Cere/);
}); 