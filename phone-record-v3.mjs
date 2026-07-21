import { chromium } from 'playwright';

const URL = 'https://moodring-d49o.onrender.com';
const CHROME = '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome';

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

  // Start video recording - this is the key for real motion capture
  await page.video({ path: '/workspace/moodring/assets/phone-rec-v2/raw.webm' });

  console.log('Scene 1: open + scroll hero (8s)');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  for (let i = 0; i < 30; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * 15);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(500);
  for (let i = 30; i >= 0; i--) {
    await page.evaluate((y) => window.scrollTo(0, y), i * 15);
    await page.waitForTimeout(60);
  }

  console.log('Scene 2: scroll to demo (8s)');
  await page.evaluate(() => document.getElementById('demo').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(2500);
  // Scroll within the demo section
  const startY = await page.evaluate(() => window.scrollY);
  for (let i = 0; i < 15; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), startY + i * 15);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(2000);
  // Back to start of demo
  await page.evaluate(() => document.getElementById('demo').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(1500);

  console.log('Scene 3: type text + scroll (8s)');
  await page.fill('#demo-text', 'Just lost 30% on a position. Sleep is going to be tough tonight.');
  await page.waitForTimeout(1500);
  // Slight scroll
  const y3 = await page.evaluate(() => window.scrollY);
  for (let i = 0; i < 12; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), y3 + i * 20);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(2000);

  console.log('Scene 4: tap classify (8s)');
  await page.tap('#demo-run');
  await page.waitForTimeout(3000);
  // Slow scroll to see result
  const y4 = await page.evaluate(() => window.scrollY);
  for (let i = 0; i < 20; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), y4 + i * 15);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(2500);

  console.log('Scene 5: tap win + classify (8s)');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById('demo').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(1000);
  await page.tap('button.chip[data-preset="win"]');
  await page.waitForTimeout(1000);
  await page.tap('#demo-run');
  await page.waitForTimeout(4000);

  console.log('Scene 6: scroll to wallet (8s)');
  await page.evaluate(() => document.getElementById('wallet').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(2000);
  const y6 = await page.evaluate(() => window.scrollY);
  for (let i = 0; i < 15; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), y6 + i * 18);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(2000);

  console.log('Scene 7: fill wallet + forecast + scroll (10s)');
  await page.evaluate(() => document.getElementById('wallet').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(1000);
  await page.fill('#wallet-addr', '0x8bfc0f414be2f70c5930f7713be1db188eb0c3bd');
  await page.waitForTimeout(800);
  await page.tap('#wallet-run');
  await page.waitForTimeout(2500);
  const y7 = await page.evaluate(() => window.scrollY);
  for (let i = 0; i < 25; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), y7 + i * 12);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(2500);

  console.log('Scene 8: scroll to services (10s)');
  await page.evaluate(() => document.getElementById('services').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(2000);
  const y8 = await page.evaluate(() => window.scrollY);
  for (let i = 0; i < 20; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), y8 + i * 25);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(2000);
  for (let i = 20; i >= 0; i--) {
    await page.evaluate((y) => window.scrollTo(0, y), y8 + i * 25);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(1500);

  console.log('Scene 9: scroll to integrate (8s)');
  await page.evaluate(() => document.getElementById('integrate').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(2000);
  const y9 = await page.evaluate(() => window.scrollY);
  for (let i = 0; i < 20; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), y9 + i * 20);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(2500);

  console.log('Scene 10: github (5s)');
  await page.goto('https://github.com/govvy732/moodring', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  for (let i = 0; i < 8; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * 50);
    await page.waitForTimeout(150);
  }
  for (let i = 8; i >= 0; i--) {
    await page.evaluate((y) => window.scrollTo(0, y), i * 50);
    await page.waitForTimeout(100);
  }

  console.log('Scene 11: x402 manifest (3s)');
  await page.goto('https://moodring-d49o.onrender.com/.well-known/x402', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Stop recording
  const video = page.video();
  if (video) await video.stop();
  await browser.close();
  console.log('done');
})();
