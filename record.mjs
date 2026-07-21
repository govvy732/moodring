// Record a screen capture of the live Moodring demo for the 90s video
import { chromium } from 'playwright';

const URL = 'https://moodring-d49o.onrender.com';
const OUT = '/workspace/moodring/assets/recording';
const CHROME = '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome';

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  console.log('recording landing page...');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('scrolling to demo widget...');
  await page.evaluate(() => document.getElementById('demo').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(1500);

  console.log('clicking loss preset + classify...');
  await page.click('button.chip[data-preset="loss"]');
  await page.waitForTimeout(800);
  await page.click('#demo-run');
  await page.waitForTimeout(2500);

  console.log('trying win preset...');
  await page.click('button.chip[data-preset="win"]');
  await page.waitForTimeout(500);
  await page.click('#demo-run');
  await page.waitForTimeout(2500);

  console.log('scrolling to wallet weather...');
  await page.evaluate(() => document.getElementById('wallet').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(1000);
  await page.fill('#wallet-addr', '0x8bfc0f414be2f70c5930f7713be1db188eb0c3bd');
  await page.click('#wallet-run');
  await page.waitForTimeout(2500);

  console.log('scrolling to services...');
  await page.evaluate(() => document.getElementById('services').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(2000);

  console.log('scrolling to integrate...');
  await page.evaluate(() => document.getElementById('integrate').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(2000);

  await browser.close();
  console.log('recording complete');
})();
