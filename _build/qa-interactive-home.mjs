import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const outDir = join(root, '_build', 'qa-screenshots');
mkdirSync(outDir, { recursive: true });

const mime = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.ico': 'image/x-icon', '.json': 'application/json',
};

const server = createServer((req, res) => {
  const url = req.url.split('?')[0];
  const rel = url === '/' ? '/index.html' : url;
  const filePath = join(root, decodeURIComponent(rel));
  if (!existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
});

await new Promise((r) => server.listen(4173, r));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto('http://localhost:4173/index.html', { waitUntil: 'networkidle' });

// 1. Autocomplete
await page.fill('#hero-search', 'king air');
await page.waitForSelector('.hero-suggest.is-open', { timeout: 5000 });
const suggestCount = await page.locator('.hero-suggest-item').count();
console.log('autocomplete suggestions for "king air":', suggestCount);
await page.screenshot({ path: join(outDir, 'interactive-autocomplete.png') });
await page.keyboard.press('ArrowDown');
const selected = await page.locator('.hero-suggest-item.is-selected').count();
console.log('keyboard selection works:', selected === 1);
await page.keyboard.press('Escape');

// 2. Slideshow dots
const dotCount = await page.locator('.hp-dot').count();
console.log('slideshow dots:', dotCount);
await page.locator('.hp-dot').nth(3).click();
await page.waitForTimeout(600);
const activeSlideHref = await page.locator('.hp-slide.hp-active').getAttribute('href');
console.log('slide after clicking last dot:', activeSlideHref);
const captionText = await page.locator('#hp-slide-caption .hp-caption-title').textContent();
console.log('caption:', captionText);

// 3. Stats counters
await page.locator('.pwi-stats-strip').scrollIntoViewIfNeeded();
await page.waitForTimeout(1800);
const statVal = await page.locator('.pwi-stat-num').first().textContent();
console.log('years counter value:', statVal);
await page.screenshot({ path: join(outDir, 'interactive-stats.png') });

// Mobile pass
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
mob.on('pageerror', (e) => errors.push('mobile pageerror: ' + e.message));
await mob.goto('http://localhost:4173/index.html', { waitUntil: 'networkidle' });
// Scroll through the page so scroll-reveals fire and lazy images load
await mob.evaluate(async () => {
  const step = window.innerHeight / 2;
  for (let y = 0; y <= document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 150));
  }
  window.scrollTo(0, 0);
});
await mob.waitForTimeout(800);
await mob.screenshot({ path: join(outDir, 'interactive-mobile.png'), fullPage: true });

console.log('JS errors:', errors.length ? errors : 'none');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
