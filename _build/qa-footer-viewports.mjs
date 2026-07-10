import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const outDir = join(root, '_build', 'qa-screenshots', 'footer');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

const server = createServer((req, res) => {
  const url = req.url.split('?')[0];
  const rel = url === '/' ? '/index.html' : url;
  const filePath = join(root, decodeURIComponent(rel));
  if (!existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;
mkdirSync(outDir, { recursive: true });

const widths = [375, 640, 768, 900, 1024, 1100, 1280, 1440, 1600];
const browser = await chromium.launch();
const page = await browser.newPage();
const results = [];

for (const width of widths) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.getElementById('pwi-cookie-banner')?.remove());
  const metrics = await page.evaluate(() => {
    const footer = document.querySelector('.pwi-footer-grid');
    const approvals = document.querySelector('.pwi-approvals-groups');
    const cols = approvals ? [...approvals.querySelectorAll('.pwi-approvals-group')].map((el) => {
      const r = el.getBoundingClientRect();
      const sample = el.querySelector('.pwi-approvals-list li');
      return { w: Math.round(r.width), sample: sample?.textContent?.trim().slice(0, 40) };
    }) : [];
    const gridStyle = footer ? getComputedStyle(footer).gridTemplateColumns : '';
    const apprStyle = approvals ? getComputedStyle(approvals).gridTemplateColumns : '';
    const narrowCol = cols.length ? Math.min(...cols.map((c) => c.w)) : 0;
    return { gridTemplateColumns: gridStyle, approvalsGrid: apprStyle, approvalColWidths: cols, narrowestApprovalCol: narrowCol, broken: narrowCol > 0 && narrowCol < 120 };
  });
  await page.locator('.pwi-footer').screenshot({ path: join(outDir, `footer-${width}px.png`) });
  results.push({ width, ...metrics });
}

await browser.close();
server.close();
console.log(JSON.stringify(results, null, 2));
