import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'https://moodring-d49o.onrender.com';
const CHROME = '/root/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const VIDEO_DIR = '/workspace/moodring/assets/phone-rec-v2';
const VIDEO_PATH = `${VIDEO_DIR}/raw.webm`;

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
    recordVideo: { dir: VIDEO_DIR, size: { width: 430, height: 932 } },
  });
  const page = await ctx.newPage();

  console.log('Scene 1: open + scroll hero (8s)');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  for (let i = 0; i < 25; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * 18);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(500);
  for (let i = 25; i >= 0; i--) {
    await page.evaluate((y) => window.scrollTo(0, y), i * 18);
    await page.waitForTimeout(60);
  }

  console.log('Scene 2: scroll to demo (8s)');
  await page.evaluate(() => document.getElementById('demo').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(2000);
  const y2 = await page.evaluate(() => window.scrollY);
  for (let i = 0; i < 12; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), y2 + i * 15);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(2000);

  console.log('Scene 3: type + scroll (7s)');
  await page.evaluate(() => document.getElementById('demo').scrollIntoView({ behavior: 'instant' }));
  await page.fill('#demo-text', 'Just lost 30% on a position. Sleep is going to be tough tonight.');
  await page.waitForTimeout(1500);
  const y3 = await page.evaluate(() => window.scrollY);
  for (let i = 0; i < 10; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), y3 + i * 18);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(2000);

  console.log('Scene 4: tap classify + scroll (10s)');
  await page.tap('#demo-run');
  await page.waitForTimeout(2500);
  const y4 = await page.evaluate(() => window.scrollY);
  for (let i = 0; i < 20; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), y4 + i * 12);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(2500);

  console.log('Scene 5: win + classify (7s)');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById('demo').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(1000);
  await page.tap('button.chip[data-preset="win"]');
  await page.waitForTimeout(1000);
  await page.tap('#demo-run');
  await page.waitForTimeout(3000);

  console.log('Scene 6: scroll to wallet (7s)');
  await page.evaluate(() => document.getElementById('wallet').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(2000);
  const y6 = await page.evaluate(() => window.scrollY);
  for (let i = 0; i < 12; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), y6 + i * 18);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(2000);

  console.log('Scene 7: fill + forecast + scroll (10s)');
  await page.evaluate(() => document.getElementById('wallet').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(1000);
  await page.fill('#wallet-addr', '0x8bfc0f414be2f70c5930f7713be1db188eb0c3bd');
  await page.waitForTimeout(500);
  await page.tap('#wallet-run');
  await page.waitForTimeout(2500);
  const y7 = await page.evaluate(() => window.scrollY);
  for (let i = 0; i < 20; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), y7 + i * 10);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(2000);

  console.log('Scene 8: services (10s)');
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

  console.log('Scene 9: integrate (8s)');
  await page.evaluate(() => document.getElementById('integrate').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(2000);
  const y9 = await page.evaluate(() => window.scrollY);
  for (let i = 0; i < 20; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), y9 + i * 18);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(2000);

  console.log('Scene 10: github (7s)');
  await page.goto('https://github.com/govvy732/moodring', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  for (let i = 0; i < 8; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * 60);
    await page.waitForTimeout(150);
  }
  for (let i = 8; i >= 0; i--) {
    await page.evaluate((y) => window.scrollTo(0, y), i * 60);
    await page.waitForTimeout(100);
  }

  console.log('Scene 11: x402 manifest (3s)');
  await page.goto('https://moodring-d49o.onrender.com/.well-known/x402', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Close context to flush video
  await ctx.close();
  await browser.close();
  
  // Find the video file
  const files = fs.readdirSync(VIDEO_DIR);
  console.log('files in dir:', files);
})();
