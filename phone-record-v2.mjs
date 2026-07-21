import { chromium } from 'playwright';

const URL = 'https://moodring-d49o.onrender.com';
const CHROME = '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome';
const OUT = '/workspace/moodring/assets/phone-rec-v2';

async function scrollPage(page, fromY, toY, durationMs) {
  const steps = Math.floor(durationMs / 50);
  const delta = (toY - fromY) / steps;
  for (let i = 0; i <= steps; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), fromY + delta * i);
    await page.waitForTimeout(50);
  }
}

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

  // SCENE 1: Open + scroll hero (0-8s)
  console.log('scene 1: open + scroll hero...');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  // Slow scroll down to expose full hero
  await scrollPage(page, 0, 400, 4000);
  await page.waitForTimeout(500);
  // Scroll back up
  await scrollPage(page, 400, 0, 2500);

  // SCENE 2: Scroll to demo widget (8-15s)
  console.log('scene 2: scroll to demo...');
  await page.evaluate(() => document.getElementById('demo').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(2000);
  await scrollPage(page, page.evaluate(() => window.scrollY), 0, 1000);
  await page.evaluate(() => document.getElementById('demo').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(2000);

  // SCENE 3: Type text + scroll within demo (15-22s)
  console.log('scene 3: type + scroll...');
  await page.fill('#demo-text', 'Just lost 30% on a position. Sleep is going to be tough tonight.');
  await page.waitForTimeout(1000);
  await scrollPage(page, page.evaluate(() => window.scrollY), page.evaluate(() => window.scrollY) + 200, 1500);
  await page.waitForTimeout(1500);

  // SCENE 4: Tap classify + wait (22-30s)
  console.log('scene 4: tap classify + scroll...');
  await page.tap('#demo-run');
  await page.waitForTimeout(3000);
  await scrollPage(page, page.evaluate(() => window.scrollY), page.evaluate(() => window.scrollY) + 300, 2000);
  await page.waitForTimeout(2000);

  // SCENE 5: Tap win preset (30-38s)
  console.log('scene 5: tap win + classify...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById('demo').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(1000);
  await page.tap('button.chip[data-preset="win"]');
  await page.waitForTimeout(1000);
  await page.tap('#demo-run');
  await page.waitForTimeout(4000);

  // SCENE 6: Scroll to wallet weather (38-46s)
  console.log('scene 6: scroll to wallet...');
  await page.evaluate(() => document.getElementById('wallet').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(2000);
  await scrollPage(page, page.evaluate(() => window.scrollY), page.evaluate(() => window.scrollY) + 250, 2500);
  await page.waitForTimeout(2000);

  // SCENE 7: Fill address + forecast + scroll result (46-56s)
  console.log('scene 7: fill wallet + forecast...');
  await page.evaluate(() => document.getElementById('wallet').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(1000);
  await page.fill('#wallet-addr', '0x8bfc0f414be2f70c5930f7713be1db188eb0c3bd');
  await page.waitForTimeout(500);
  await page.tap('#wallet-run');
  await page.waitForTimeout(3000);
  await scrollPage(page, page.evaluate(() => window.scrollY), page.evaluate(() => window.scrollY) + 200, 3000);
  await page.waitForTimeout(1000);

  // SCENE 8: Scroll to services (56-66s)
  console.log('scene 8: scroll to services...');
  await page.evaluate(() => document.getElementById('services').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(2000);
  await scrollPage(page, page.evaluate(() => window.scrollY), page.evaluate(() => window.scrollY) + 400, 4000);
  await page.waitForTimeout(2000);
  await scrollPage(page, page.evaluate(() => window.scrollY), page.evaluate(() => window.scrollY) - 200, 2000);

  // SCENE 9: Scroll to integrate + code block (66-78s)
  console.log('scene 9: scroll to integrate...');
  await page.evaluate(() => document.getElementById('integrate').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(2000);
  await scrollPage(page, page.evaluate(() => window.scrollY), page.evaluate(() => window.scrollY) + 300, 4000);
  await page.waitForTimeout(2000);
  await scrollPage(page, page.evaluate(() => window.scrollY), page.evaluate(() => window.scrollY) - 100, 2000);

  // SCENE 10: GitHub repo (78-85s)
  console.log('scene 10: github...');
  await page.goto('https://github.com/govvy732/moodring', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await scrollPage(page, 0, 300, 3500);
  await scrollPage(page, 300, 0, 2000);

  // SCENE 11: x402 manifest (85-90s)
  console.log('scene 11: x402 manifest...');
  await page.goto('https://moodring-d49o.onrender.com/.well-known/x402', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await scrollPage(page, 0, 200, 2500);

  await browser.close();
  console.log('done');
})();
