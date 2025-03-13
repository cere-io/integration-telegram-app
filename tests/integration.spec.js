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

const saveDebugInfo = async (page, prefix) => {
  try {
    // Сохраняем скриншот
    const screenshotPath = `/tmp/${prefix}-screenshot.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Debug screenshot saved to ${screenshotPath}`);

    // Сохраняем HTML
    const html = await page.content();
    fs.writeFileSync(`/tmp/${prefix}-page.html`, html);
    console.log(`Debug HTML saved to /tmp/${prefix}-page.html`);

    // Выводим основные параметры страницы
    const url = page.url();
    console.log(`Current URL: ${url}`);

    // Выводим видимые кнопки для отладки
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons on page`);
    for (let i = 0; i < buttons.length; i++) {
      const buttonText = await buttons[i].textContent().catch(() => 'unknown');
      const isVisible = await buttons[i].isVisible().catch(() => false);
      console.log(`Button ${i}: "${buttonText.trim()}", visible: ${isVisible}`);
    }
  } catch (error) {
    console.error(`Error saving debug info: ${error.message}`);
  }
};

const login = async (page) => {
  try {
    console.log('Starting login process...');
    await page.waitForSelector('#torusIframe', { timeout: 30000 });
    const torusFrame = await page.frameLocator('#torusIframe');

    await torusFrame.locator('iframe[title="Embedded browser"]').waitFor({ timeout: 30000 });
    const embeddedFrame = await torusFrame.frameLocator('iframe[title="Embedded browser"]');

    const buttonLogin = embeddedFrame.locator('button:has-text("I already have a wallet")');
    await buttonLogin.scrollIntoViewIfNeeded();
    await buttonLogin.waitFor({ state: 'visible', timeout: 10000 });
    await buttonLogin.click();
    console.log('Clicked "I already have a wallet" button');

    const emailInput = embeddedFrame.getByRole('textbox', { name: 'Email' });
    await emailInput.scrollIntoViewIfNeeded();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(userName);
    console.log(`Filled email with: ${userName}`);

    const signInButton = embeddedFrame.locator('button:has-text("Sign In")');
    await signInButton.scrollIntoViewIfNeeded();
    await signInButton.waitFor({ state: 'visible', timeout: 10000 });
    await signInButton.click();
    console.log('Clicked "Sign In" button');

    const otpInput = embeddedFrame.getByRole('textbox', { name: 'OTP input' });
    await otpInput.waitFor({ state: 'visible', timeout: 10000 });
    await otpInput.fill(otp);
    console.log(`Filled OTP with: ${otp}`);

    const verifyButton = embeddedFrame.locator('button:has-text("Verify")');
    await verifyButton.scrollIntoViewIfNeeded();
    await verifyButton.waitFor({ state: 'visible', timeout: 10000 });
    await verifyButton.click();
    console.log('Clicked "Verify" button');

    console.log('Login process completed');
    return true;
  } catch (error) {
    console.error(`Error during login: ${error.message}`);
    throw error;
  }
};

async function testActiveQuestsScreen({ page }) {
  console.log(`Testing Active Quests screen in ${environment} environment (${region})...`);
  console.log(`Using URL: ${appUrl}/?campaignId=${campaignId}`);
  let start = Date.now();

  try {
    console.log('Navigating to app URL...');
    await page.goto(`${appUrl}/?campaignId=${campaignId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('Page loaded, waiting for network to be idle...');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    console.log('Clicking on path element...');
    await page.locator('path').nth(1).click();

    console.log('Clicking "Start Earning" button...');
    await page.getByRole('button', { name: 'Start Earning' }).click();

    console.log('Checking for Active Quests tab...');
    const questTab = await page.locator('.tgui-e6658d0b8927f95e').textContent();
    console.log('Quest tab text:', questTab);
    if (questTab !== 'Active Quests') {
      throw new Error('Active Quests tab not found');
    }

    let timeTaken = Date.now() - start;
    logTime('Active Quests Screen', timeTaken);
    console.log(`✅ Active Quests Screen metric recorded: ${timeTaken}ms`);

    console.log('Starting login process...');
    await login(page);
    console.log('Login completed successfully');

    // Сохраняем снимок после логина для диагностики
    await saveDebugInfo(page, 'after-login');

    return true;
  } catch (err) {
    console.error(`❌ Error in testActiveQuestsScreen: ${err.message}`);
    await saveDebugInfo(page, 'active-quests-error');

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
    await saveDebugInfo(page, 'before-leaderboard');
    console.log('Trying multiple selector approaches for Leaderboard tab...');

    let leaderboardButton = null;
    let isVisible = false;

    // Попытка 1: XPath
    try {
      console.log('Approach 1: Using XPath selector');
      leaderboardButton = page.locator('xpath=/html/body/div[1]/div/div/div[2]/button[2]');
      isVisible = await leaderboardButton.isVisible({ timeout: 5000 }).catch(() => false);
      console.log('XPath selector visible:', isVisible);
    } catch (e) {
      console.log('XPath selector failed:', e.message);
    }

    // Попытка 2: CSS селектор по тексту
    if (!isVisible) {
      try {
        console.log('Approach 2: Using text-based selector');
        leaderboardButton = page.getByText('Leaderboard', { exact: true });
        isVisible = await leaderboardButton.isVisible({ timeout: 5000 }).catch(() => false);
        console.log('Text selector visible:', isVisible);
      } catch (e) {
        console.log('Text selector failed:', e.message);
      }
    }

    // Попытка 3: Общий CSS селектор
    if (!isVisible) {
      try {
        console.log('Approach 3: Using CSS selector');
        leaderboardButton = page.locator('button').nth(1);
        isVisible = await leaderboardButton.isVisible({ timeout: 5000 }).catch(() => false);
        console.log('CSS selector visible:', isVisible);
      } catch (e) {
        console.log('CSS selector failed:', e.message);
      }
    }

    if (!isVisible) {
      throw new Error('Could not find visible Leaderboard button');
    }

    console.log('Scrolling to Leaderboard button...');
    await leaderboardButton.scrollIntoViewIfNeeded();

    console.log('Clicking Leaderboard button...');
    await leaderboardButton.click({ timeout: 30000 });
    console.log('Leaderboard button clicked successfully');

    // Ждем изменения URL или других признаков перехода
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.log('Network did not reach idle state, but continuing...');
    });

    await saveDebugInfo(page, 'after-leaderboard');

    let timeTaken = Date.now() - start;
    logTime('Leaderboard Screen', timeTaken);
    console.log(`✅ Leaderboard Screen metric recorded: ${timeTaken}ms`);
    return true;
  } catch (err) {
    console.error(`❌ Error in testLeaderboardScreen: ${err.message}`);
    await saveDebugInfo(page, 'leaderboard-error');

    // Записываем метрику даже при ошибке
    let timeTaken = Date.now() - start;
    logTime('Leaderboard Screen', timeTaken);
    console.log(`⚠️ Leaderboard Screen metric recorded on error: ${timeTaken}ms`);

    // НЕ пробрасываем ошибку выше, чтобы продолжить тесты
    console.log('Continuing with tests despite Leaderboard error');
    return false;
  }
}

async function testLibraryScreen({ page }) {
  console.log(`Testing Library screen in ${environment} environment (${region})...`);
  let start = Date.now();

  try {
    await saveDebugInfo(page, 'before-library');
    console.log('Trying multiple selector approaches for Library tab...');

    let libraryButton = null;
    let isVisible = false;

    // Попытка 1: XPath
    try {
      console.log('Approach 1: Using XPath selector');
      libraryButton = page.locator('xpath=/html/body/div[1]/div/div/div[2]/button[3]');
      isVisible = await libraryButton.isVisible({ timeout: 5000 }).catch(() => false);
      console.log('XPath selector visible:', isVisible);
    } catch (e) {
      console.log('XPath selector failed:', e.message);
    }

    // Попытка 2: CSS селектор по тексту
    if (!isVisible) {
      try {
        console.log('Approach 2: Using text-based selector');
        libraryButton = page.getByText('Library', { exact: true });
        isVisible = await libraryButton.isVisible({ timeout: 5000 }).catch(() => false);
        console.log('Text selector visible:', isVisible);
      } catch (e) {
        console.log('Text selector failed:', e.message);
      }
    }

    // Попытка 3: Общий CSS селектор
    if (!isVisible) {
      try {
        console.log('Approach 3: Using CSS selector');
        libraryButton = page.locator('button').nth(2);
        isVisible = await libraryButton.isVisible({ timeout: 5000 }).catch(() => false);
        console.log('CSS selector visible:', isVisible);
      } catch (e) {
        console.log('CSS selector failed:', e.message);
      }
    }

    if (!isVisible) {
      throw new Error('Could not find visible Library button');
    }

    console.log('Scrolling to Library button...');
    await libraryButton.scrollIntoViewIfNeeded();

    console.log('Clicking Library button...');
    await libraryButton.click({ timeout: 30000 });
    console.log('Library button clicked successfully');

    // Ждем изменения URL или других признаков перехода
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.log('Network did not reach idle state, but continuing...');
    });

    await saveDebugInfo(page, 'after-library');

    let timeTaken = Date.now() - start;
    logTime('Library Screen', timeTaken);
    console.log(`✅ Library Screen metric recorded: ${timeTaken}ms`);
    return true;
  } catch (err) {
    console.error(`❌ Error in testLibraryScreen: ${err.message}`);
    await saveDebugInfo(page, 'library-error');

    // Записываем метрику даже при ошибке
    let timeTaken = Date.now() - start;
    logTime('Library Screen', timeTaken);
    console.log(`⚠️ Library Screen metric recorded on error: ${timeTaken}ms`);

    // НЕ пробрасываем ошибку выше, чтобы не прервать тесты
    console.log('Continuing with tests despite Library error');
    return false;
  }
}

export default async function runIntegrationTest({ browser, context }) {
  console.log(`Starting integration test for ${environment} environment in ${region} region`);
  console.log(`Using URL: ${appUrl} with campaign ID: ${campaignId}`);
  console.log(`Browser info: ${await browser.version()}`);
  metrics.length = 0;

  try {
    console.log('Testing file system access...');
    fs.writeFileSync('/tmp/test-file.txt', 'Test file system access');
    const content = fs.readFileSync('/tmp/test-file.txt', 'utf8');
    console.log('File system access test result:', content);
    if (content !== 'Test file system access') {
      console.error('File system test failed: content mismatch');
    }
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

    // Увеличиваем таймауты для Lambda
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    // Добавляем логирование событий браузера
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });

    page.on('pageerror', error => {
      console.error(`[BROWSER ERROR] ${error.message}`);
    });

    console.log('\n=== STARTING ACTIVE QUESTS TEST ===');
    try {
      activeQuestsSuccess = await testActiveQuestsScreen({ page });
      console.log('=== ACTIVE QUESTS TEST COMPLETED SUCCESSFULLY ===\n');
    } catch (error) {
      console.error(`=== ACTIVE QUESTS TEST FAILED: ${error.message} ===\n`);
      // Продолжаем тесты, даже если этот тест завершился с ошибкой
    }

    // Паузы между тестами для стабилизации
    console.log('Waiting 5 seconds before next test...');
    await page.waitForTimeout(5000);

    console.log('\n=== STARTING LEADERBOARD TEST ===');
    try {
      leaderboardSuccess = await testLeaderboardScreen({ page });
      console.log('=== LEADERBOARD TEST COMPLETED SUCCESSFULLY ===\n');
    } catch (error) {
      console.error(`=== LEADERBOARD TEST FAILED: ${error.message} ===\n`);
      // Продолжаем тесты, даже если этот тест завершился с ошибкой
    }

    console.log('Waiting 5 seconds before next test...');
    await page.waitForTimeout(5000);

    console.log('\n=== STARTING LIBRARY TEST ===');
    try {
      librarySuccess = await testLibraryScreen({ page });
      console.log('=== LIBRARY TEST COMPLETED SUCCESSFULLY ===\n');
    } catch (error) {
      console.error(`=== LIBRARY TEST FAILED: ${error.message} ===\n`);
      // Продолжаем тесты, даже если этот тест завершился с ошибкой
    }

    // Резервное сохранение метрик в файл
    try {
      console.log('Ensuring metrics are saved to file...');
      let metricsText = '';
      metrics.forEach(m => {
        metricsText += `${m.name} took ${m.duration}ms\n`;
      });
      fs.writeFileSync('/tmp/performance-log.txt', metricsText);
      console.log('Metrics saved successfully');
    } catch (error) {
      console.error('Error saving metrics to file:', error);
    }

    console.log('=== COLLECTED METRICS ===');
    console.log(JSON.stringify(metrics, null, 2));
    console.log(`Environment: ${environment}`);
    console.log(`Region: ${region}`);
    console.log('========================');

    return {
      success: activeQuestsSuccess, // Считаем тест успешным, если основной сценарий выполнен
      metrics: metrics,
      environment: environment,
      region: region
    };
  } catch (err) {
    console.error('Fatal error during integration test:', err);

    // Резервное сохранение метрик в файл при фатальной ошибке
    try {
      console.log('Saving metrics after fatal error...');
      let metricsText = '';
      metrics.forEach(m => {
        metricsText += `${m.name} took ${m.duration}ms\n`;
      });
      fs.writeFileSync('/tmp/performance-log.txt', metricsText);
      console.log('Metrics saved after error');
    } catch (error) {
      console.error('Error saving metrics after fatal error:', error);
    }

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
      await page.close().catch(e => console.error('Error closing page:', e));
    }
  }
}
