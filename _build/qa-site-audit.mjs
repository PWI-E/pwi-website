/**
 * Site-wide audit: static HTML checks on all pages + Playwright smoke on mobile.
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { join, extname, relative } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const outDir = join(root, '_build', 'audit');
mkdirSync(outDir, { recursive: true });

const mime = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.pdf': 'application/pdf',
};

function walkHtml(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const p = join(dir, name);
    if (!statSync(p).isDirectory()) {
      if (name.endsWith('.html')) acc.push(relative(root, p));
      continue;
    }
    if (['node_modules', '.git', '_build', '_privacy-review'].includes(name)) continue;
    walkHtml(p, acc);
  }
  return acc;
}

function staticAudit(pagePath) {
  const html = readFileSync(join(root, pagePath), 'utf8');
  const issues = [];
  if (!html.includes('meta name="viewport"')) issues.push('missing viewport meta');
  if (!/<title>[^<]+<\/title>/i.test(html)) issues.push('missing/empty title');
  if (html.includes('pwi-approvals-details') && !html.includes('pwi-footer-accordion')) {
    issues.push('old footer markup');
  }
  if (html.includes('cabin-led-product.css?v=202606264')) issues.push('stale cabin-led CSS cache');

  const hrefRe = /href=["']([^"'#?]+)["']/gi;
  let m;
  const broken = [];
  while ((m = hrefRe.exec(html))) {
    const href = m[1];
    if (/^(https?:|mailto:|tel:|javascript:)/i.test(href)) continue;
    const file = href.endsWith('/') ? href + 'index.html' : href;
    if (!existsSync(join(root, decodeURIComponent(file)))) broken.push(href);
  }
  if (broken.length) issues.push(`broken local links: ${[...new Set(broken)].slice(0, 3).join(', ')}`);

  const srcRe = /(?:src|href)=["']([^"']+\.(?:css|js|webp|jpg|jpeg|png|svg|woff2))(?:\?[^"']*)?["']/gi;
  const missingAssets = [];
  while ((m = srcRe.exec(html))) {
    const asset = m[1].split('?')[0];
    if (/^https?:/i.test(asset)) continue;
    if (!existsSync(join(root, decodeURIComponent(asset)))) missingAssets.push(asset);
  }
  if (missingAssets.length) issues.push(`missing assets: ${[...new Set(missingAssets)].slice(0, 3).join(', ')}`);

  return issues;
}

const allPages = walkHtml(root).sort();
const staticResults = allPages.map((p) => ({ page: p, issues: staticAudit(p) }));
const staticIssues = staticResults.filter((r) => r.issues.length);

const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let rel = url === '/' ? '/index.html' : url;
  let filePath = join(root, rel);
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
    rel = join(rel, 'index.html');
  }
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

const browserPath = join(root, '_build/pw-browsers/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const browser = await chromium.launch({ executablePath: existsSync(browserPath) ? browserPath : undefined });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

const runtimeResults = [];
const asset404s = new Map();

for (const pagePath of allPages) {
  const page = await context.newPage();
  const jsErrors = [];
  const failedAssets = [];
  page.on('pageerror', (e) => jsErrors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith(base)) {
      failedAssets.push({ status: r.status(), url: r.url().replace(base, '') });
    }
  });

  const issues = [];
  try {
    await page.goto(base + pagePath, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(400);
    await page.evaluate(() => document.getElementById('pwi-cookie-banner')?.remove());

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const main = document.querySelector('main') || document.body;
      let clipped = 0;
      main.querySelectorAll('*').forEach((el) => {
        const cs = getComputedStyle(el);
        if (cs.position === 'absolute' || cs.position === 'fixed') return;
        const r = el.getBoundingClientRect();
        if (r.right > doc.clientWidth + 2 && r.width > 40) clipped++;
      });
      const heroCol = document.querySelector('.hero-grid > div:first-child, .product-hero-grid > div:first-child');
      const heroColW = heroCol ? Math.round(heroCol.getBoundingClientRect().width) : null;
      const wrap = document.querySelector('.product-hero-wrap');
      const contentW = wrap ? Math.round(wrap.getBoundingClientRect().width - 48) : doc.clientWidth - 48;
      return {
        scrollOverflow: doc.scrollWidth > doc.clientWidth + 1,
        overflowPx: doc.scrollWidth - doc.clientWidth,
        clippedElements: clipped,
        heroBlowout: heroColW != null && heroColW > contentW + 10,
      };
    });

    if (metrics.scrollOverflow) issues.push(`horizontal overflow +${metrics.overflowPx}px`);
    if (metrics.heroBlowout) issues.push('hero column wider than viewport');
    if (metrics.clippedElements > 0 && !pagePath.includes('pdf')) {
      issues.push(`${metrics.clippedElements} elements extend past viewport`);
    }
    if (jsErrors.length) issues.push(`JS: ${[...new Set(jsErrors)].slice(0, 2).join(' | ')}`);

    const uniqFailed = [...new Map(failedAssets.map((a) => [a.url, a])).values()];
    if (uniqFailed.length) {
      issues.push(`HTTP errors: ${uniqFailed.slice(0, 3).map((a) => `${a.status} ${a.url}`).join(', ')}`);
      for (const a of uniqFailed) asset404s.set(a.url, a.status);
    }
  } catch (err) {
    issues.push(`load failed: ${String(err).slice(0, 120)}`);
  }

  runtimeResults.push({ page: pagePath, issues });
  await page.close();
}

await context.close();
await browser.close();
server.close();

const runtimeIssues = runtimeResults.filter((r) => r.issues.length);

const summary = {
  auditedAt: new Date().toISOString(),
  totalPages: allPages.length,
  staticIssuePages: staticIssues.length,
  runtimeIssuePages: runtimeIssues.length,
  uniqueFailedAssets: [...asset404s.entries()].map(([url, status]) => ({ url, status })),
  staticIssues: staticIssues.slice(0, 80),
  runtimeIssues: runtimeIssues.slice(0, 80),
};

writeFileSync(join(outDir, 'site-audit.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({
  totalPages: summary.totalPages,
  staticIssuePages: summary.staticIssuePages,
  runtimeIssuePages: summary.runtimeIssuePages,
  failedAssets: summary.uniqueFailedAssets.length,
}, null, 2));

if (staticIssues.length) {
  console.log('\nSTATIC ISSUES (first 25):');
  for (const r of staticIssues.slice(0, 25)) {
    console.log(`  ${r.page}: ${r.issues.join('; ')}`);
  }
}
if (runtimeIssues.length) {
  console.log('\nRUNTIME ISSUES (first 25):');
  for (const r of runtimeIssues.slice(0, 25)) {
    console.log(`  ${r.page}: ${r.issues.join('; ')}`);
  }
}
if (asset404s.size) {
  console.log('\nFAILED ASSETS:');
  for (const [url, status] of [...asset404s.entries()].slice(0, 20)) {
    console.log(`  ${status} ${url}`);
  }
}
