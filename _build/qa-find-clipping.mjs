/**
 * Find elements extending past mobile viewport on specific pages.
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const pages = [
  'led-lighting.html',
  'stc-pma-data.html',
  'fluxgate-magnetometers.html',
  'citation-led-cabin-light-system.html',
  'contract-manufacturing.html',
  'engineering.html',
  'tape-wound-bobbin-cores-magnetometers.html',
];

const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let rel = url === '/' ? '/index.html' : url;
  let filePath = join(root, rel);
  if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = join(filePath, 'index.html');
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

for (const pagePath of pages) {
  const page = await context.newPage();
  await page.goto(base + pagePath, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById('pwi-cookie-banner')?.remove());

  const clipped = await page.evaluate(() => {
    const doc = document.documentElement;
    const vw = doc.clientWidth;
    const out = [];
    document.querySelectorAll('main * , body > *:not(script):not(style)').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.position === 'absolute' || cs.position === 'fixed') return;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 2 && r.width > 40) {
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const cls = el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
          : '';
        out.push({
          overflow: Math.round(r.right - vw),
          width: Math.round(r.width),
          selector: `${tag}${id}${cls}`,
          text: (el.textContent || '').trim().slice(0, 60),
        });
      }
    });
    return out.sort((a, b) => b.overflow - a.overflow).slice(0, 8);
  });

  console.log(`\n=== ${pagePath} (${clipped.length}) ===`);
  for (const c of clipped) console.log(`  +${c.overflow}px  ${c.width}px  ${c.selector}  "${c.text}"`);
  await page.close();
}

await context.close();
await browser.close();
server.close();
