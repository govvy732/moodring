import { chromium } from 'playwright';
const URL = 'https://moodring-d49o.onrender.com';
const CHROME = '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome';
const OUT = '/workspace/moodring/assets/screenshots';

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  // 1. Landing hero
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/01-hero.png` });

  // 2. Demo widget - click loss preset
  await page.evaluate(() => document.getElementById('demo').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/02-demo-empty.png` });
  await page.click('button.chip[data-preset="loss"]');
  await page.waitForTimeout(500);
  await page.click('#demo-run');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/03-demo-loss-result.png` });

  // 3. Win preset
  await page.click('button.chip[data-preset="win"]');
  await page.waitForTimeout(500);
  await page.click('#demo-run');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/04-demo-win-result.png` });

  // 4. Wallet weather
  await page.evaluate(() => document.getElementById('wallet').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(800);
  await page.fill('#wallet-addr', '0x8bfc0f414be2f70c5930f7713be1db188eb0c3bd');
  await page.click('#wallet-run');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/05-wallet-weather.png` });

  // 5. Services
  await page.evaluate(() => document.getElementById('services').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/06-services.png` });

  // 6. Integrate
  await page.evaluate(() => document.getElementById('integrate').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/07-integrate.png` });

  await browser.close();
  console.log('screenshots saved');
})();
