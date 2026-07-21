import { chromium } from 'playwright';

const CHROME = '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome';
const OUT = '/workspace/moodring/assets/phone-rec';

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const ctx = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();

  // GitHub repo
  console.log('frame: github...');
  await page.goto('https://github.com/govvy732/moodring', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/10-github-mobile.png` });

  // x402 manifest
  console.log('frame: x402 manifest...');
  await page.goto('https://moodring-d49o.onrender.com/.well-known/x402', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/11-x402-manifest.png` });

  // API health
  console.log('frame: health...');
  await page.goto('https://moodring-d49o.onrender.com/health', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/12-health.png` });

  await browser.close();
  console.log('done');
})();
