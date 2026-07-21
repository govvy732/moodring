import { chromium } from 'playwright';

const URL = 'https://moodring-d49o.onrender.com';
const CHROME = '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome';
const OUT = '/workspace/moodring/assets/phone-rec';

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  // Use a phone-sized viewport but wide enough to show the demo widget
  // iPhone 14 Pro Max: 430x932 - good for showing full UI
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();

  console.log('frame 1: hero (top of page)...');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/01-hero.png` });

  console.log('frame 2: scroll to demo widget...');
  await page.evaluate(() => {
    const el = document.querySelector('#demo');
    if (el) el.scrollIntoView({ behavior: 'instant' });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/02-demo-empty.png` });

  console.log('frame 3: tap "I lost money today" preset...');
  await page.tap('button.chip[data-preset="loss"]');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/03-preset-tapped.png` });

  console.log('frame 4: tap Classify mood...');
  await page.tap('#demo-run');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${OUT}/04-classified-loss.png` });

  console.log('frame 5: tap win preset + classify...');
  await page.tap('button.chip[data-preset="win"]');
  await page.waitForTimeout(500);
  await page.tap('#demo-run');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${OUT}/05-classified-win.png` });

  console.log('frame 6: scroll to wallet weather...');
  await page.evaluate(() => {
    const el = document.querySelector('#wallet');
    if (el) el.scrollIntoView({ behavior: 'instant' });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/06-wallet-weather.png` });

  console.log('frame 7: type wallet address + forecast...');
  await page.fill('#wallet-addr', '0x8bfc0f414be2f70c5930f7713be1db188eb0c3bd');
  await page.waitForTimeout(500);
  await page.tap('#wallet-run');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/07-wallet-result.png` });

  console.log('frame 8: scroll to services...');
  await page.evaluate(() => {
    const el = document.querySelector('#services');
    if (el) el.scrollIntoView({ behavior: 'instant' });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/08-services.png` });

  console.log('frame 9: scroll to integrate...');
  await page.evaluate(() => {
    const el = document.querySelector('#integrate');
    if (el) el.scrollIntoView({ behavior: 'instant' });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/09-integrate.png` });

  await browser.close();
  console.log('done');
})();
