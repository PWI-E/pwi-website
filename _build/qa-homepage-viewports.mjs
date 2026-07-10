import { chromium, devices } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const outDir = join(root, '_build', 'qa-screenshots');

const mime = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

function serveFile(res, filePath) {
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = extname(filePath);
  res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
}

const server = createServer((req, res) => {
  const url = req.url.split('?')[0];
  const rel = url === '/' ? '/index.html' : url;
  serveFile(res, join(root, decodeURIComponent(rel)));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/`;

mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'iphone-14', width: 390, height: 844 },
  { name: 'ipad', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const browser = await chromium.launch();
const page = await browser.newPage();

const checks = [];

for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const banner = document.getElementById('pwi-cookie-banner');
    if (banner) banner.remove();
  });
  await page.waitForTimeout(400);

  const metrics = await page.evaluate(() => {
    const search = document.querySelector('.hero-search-input');
    const submit = document.querySelector('.hero-search-submit');
    const pause = document.getElementById('hp-slideshow-toggle');
    const lede = document.querySelector('.hero-lede');
    const rectOverlap = (a, b) => {
      if (!a || !b || b.hidden) return false;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return !(ra.right <= rb.left || ra.left >= rb.right || ra.bottom <= rb.top || ra.top >= rb.bottom);
    };
    const searchRect = search?.getBoundingClientRect();
    const scrollW = document.documentElement.scrollWidth;
    const clientW = document.documentElement.clientWidth;
    return {
      placeholder: search?.placeholder || '',
      ledeScrollH: lede?.scrollHeight || 0,
      ledeClientH: lede?.clientHeight || 0,
      ledeClamped: lede ? lede.scrollHeight > lede.clientHeight + 1 : false,
      pauseOverlapsSearch: rectOverlap(pause, submit) || rectOverlap(pause, search),
      horizontalOverflow: scrollW > clientW + 1,
    };
  });

  await page.screenshot({
    path: join(outDir, `homepage-${vp.name}.png`),
    fullPage: vp.name === 'iphone-se' || vp.name === 'iphone-14',
  });

  checks.push({ viewport: vp.name, ...metrics });
}

await browser.close();
server.close();

console.log(JSON.stringify({ base, outDir, checks }, null, 2));
