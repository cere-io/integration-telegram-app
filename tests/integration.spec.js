import { chromium } from 'playwright';
import fs from 'fs';

const userName = process.env.TEST_USER_EMAIL || 'veronika.filipenko@cere.io';
const otp = process.env.TEST_USER_OTP || '555555';
const appUrl = process.env.TEST_APP_URL || 'https://telegram-viewer-app.stage.cere.io';
const campaignId = process.env.TEST_CAMPAIGN_ID || '120';

// Собираем метрики в глобальную переменную для надежности
const metrics = [];

const logTime = (testName, time) => {
  const logMessage = `${testName} took ${time}ms\n`;
  console.log(`Recording metric: ${logMessage.trim()}`);

  // Добавляем в массив метрик
  metrics.push({ name: testName, duration: time });

  // Также пишем в файл как раньше
  try {
    fs.appendFileSync(`/tmp/performance-log.txt`, logMessage);
    console.log(`Metric recorded for ${testName}`);
  } catch (error) {
    console.error(`Error writing to metrics file: ${error.message}`);
  }
};

// ... все остальные функции ...

export default async function runIntegrationTest({ browser, context }) {
  console.log('Starting integration test...');
  // Очищаем массив метрик
  metrics.length = 0;

  // Очищаем файл метрик
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

    // Выводим собранные метрики для отладки
    console.log('=== COLLECTED METRICS ===');
    console.log(JSON.stringify(metrics, null, 2));
    console.log('========================');

    // Также читаем файл для проверки
    try {
      if (fs.existsSync('/tmp/performance-log.txt')) {
        const fileMetrics = fs.readFileSync('/tmp/performance-log.txt', 'utf8');
        console.log('Metrics from file:');
        console.log(fileMetrics);
      } else {
        console.log('Metrics file does not exist!');
      }
    } catch (readErr) {
      console.error('Error reading metrics file:', readErr);
    }

    // Возвращаем метрики как часть результата
    return {
      success: true,
      metrics: metrics
    };
  } catch (err) {
    console.error('Error during integration test:', err);

    // Выводим метрики даже в случае ошибки
    console.log('=== METRICS AT ERROR ===');
    console.log(JSON.stringify(metrics, null, 2));
    console.log('=======================');

    // Возвращаем ошибку и собранные до ошибки метрики
    return {
      success: false,
      error: err.message,
      metrics: metrics
    };
  } finally {
    if (page) {
      await page.close();
    }
  }
}
