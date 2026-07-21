import { chromium } from 'playwright';
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

  // GitHub repo page
  await page.goto('https://github.com/govvy732/moodring', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/08-github-repo.png` });

  // Render dashboard
  await page.goto('https://dashboard.render.com/web/srv-d9f64vrrjlhs73dkkgo0', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/09-render.png` });

  await browser.close();
  console.log('repo screenshots saved');
})();
