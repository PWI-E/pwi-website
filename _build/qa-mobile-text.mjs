/**
 * Mobile text size audit — flags visible copy smaller than recommended thresholds.
 * Run: npm run qa:mobile-text
 *      npm run qa:mobile-text -- --pages=index.html,led-lighting.html
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join, extname, relative } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const outDir = join(root, '_build', 'audit');
mkdirSync(outDir, { recursive: true });

const DEV_PAGE_RE = /^(nav|footer|_pages|all-pages|style-guide|mobile-|index-legacy|index-redesign|qr-|pwi-|pgisr).*\.html$/;
const SKIP_DIRS = new Set(['node_modules', '.git', '_build', '_privacy-review', 'deploy', 'archive', 'pgisr-site', 'qr-code-download']);

const MIN_HARD = 12; // below = fail
const MIN_BODY = 14; // below = warn on body copy
const MIN_BODY_IDEAL = 16; // below = note on paragraphs only

const pagesArg = process.argv.find((a) => a.startsWith('--pages='));
const strict = process.argv.includes('--strict');

function walkHtml(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const p = join(dir, name);
    if (!statSync(p).isDirectory()) {
      if (name.endsWith('.html')) acc.push(relative(root, p));
      continue;
    }
    if (SKIP_DIRS.has(name)) continue;
    walkHtml(p, acc);
  }
  return acc;
}

function publicPages() {
  return walkHtml(root)
    .filter((p) => !p.includes('/'))
    .filter((p) => !DEV_PAGE_RE.test(p.split('/').pop()))
    .filter((p) => !/^qr-/.test(p) && !/^mobile-/.test(p))
    .sort();
}

const mime = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

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

let pages = publicPages();
if (pagesArg) {
  const wanted = pagesArg.slice('--pages='.length).split(',').map((p) => (p === 'index' ? 'index.html' : p.endsWith('.html') ? p : `${p}.html`));
  pages = pages.filter((p) => wanted.includes(p));
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

const results = [];

for (const pagePath of pages) {
  const page = await context.newPage();
  try {
    await page.goto(base + pagePath, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(400);
    await page.evaluate(() => document.getElementById('pwi-cookie-banner')?.remove());

    const issues = await page.evaluate(({ MIN_HARD, MIN_BODY, MIN_BODY_IDEAL, strict }) => {
      const BODY_TAGS = new Set(['P', 'LI', 'TD', 'TH', 'DD', 'DT', 'LABEL', 'BLOCKQUOTE']);
      const TEXT_TAGS = new Set([...BODY_TAGS, 'A', 'BUTTON', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'SMALL', 'STRONG', 'EM', 'SUMMARY']);

      const IGNORE_ANCESTORS = [
        'footer',
        '.pwi-footer',
        '#mobile-nav',
        '.product-badge',
        '.model-pill',
        '.product-desc-label',
        '.cert-chip',
        '.sn-pill',
        '.pill-wrap',
        '.finish-pill',
        '.gallery-hero-badge',
        '.approvals-block',
        '[aria-label="Product photo gallery"]',
        '.photo-gallery-notice',
        '.kb-slider',
        '.kb-tag',
        '.dd-chevron',
        '.trust-card',
        '.about-stat-band',
        '.pdf-label',
        '.feature-card',
        '.config-table',
        '.spec-table',
        '.available-block',
        '.finish-pills',
        '.led-quick-jumps',
        '.pr-date-badge',
        '.stc-hero-tools-label',
      ];

      function isIgnored(el) {
        for (const sel of IGNORE_ANCESTORS) {
          if (el.closest(sel)) return true;
        }
        const cls = typeof el.className === 'string' ? el.className : '';
        if (/eyebrow|kicker/i.test(cls)) return true;
        if (/text-\[(10|11|12)px\]/.test(cls)) return true;
        if (el.matches('.showcase-section-head, .led-quick-jumps-label')) return true;
        if (el.closest('[class*="eyebrow"], [class*="kicker"], [class*="Eyebrow"], [class*="Kicker"]')) return true;
        return false;
      }

      function visible(el) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
        if (el.closest('.sr-only, [aria-hidden="true"]')) return false;
        const r = el.getBoundingClientRect();
        return r.width >= 2 && r.height >= 2 && r.bottom > 0 && r.top < innerHeight;
      }

      function selector(el) {
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const cls = el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.')
          : '';
        return `${tag}${id}${cls}`;
      }

      function hasTextChild(el) {
        return [...el.children].some((c) => (c.textContent || '').trim().length > 0);
      }

      const found = [];
      const scope = document.querySelector('main') || document.body;
      scope.querySelectorAll('*').forEach((el) => {
        if (!TEXT_TAGS.has(el.tagName)) return;
        if (isIgnored(el)) return;
        const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
        if (text.length < 2) return;
        if (!visible(el)) return;
        if (hasTextChild(el) && !['A', 'BUTTON', 'SUMMARY', 'LABEL'].includes(el.tagName)) return;

        const px = parseFloat(getComputedStyle(el).fontSize);
        if (!Number.isFinite(px)) return;

        let level = null;
        if (px < MIN_HARD) level = 'fail';
        else if (px < MIN_BODY) level = 'warn';
        else if (strict && BODY_TAGS.has(el.tagName) && px < MIN_BODY_IDEAL) level = 'note';

        if (!level) return;
        found.push({
          level,
          px: Math.round(px * 10) / 10,
          tag: el.tagName.toLowerCase(),
          selector: selector(el),
          text: text.slice(0, 72),
        });
      });

      const uniq = new Map();
      for (const item of found) {
        const key = `${item.level}|${item.px}|${item.selector}|${item.text}`;
        if (!uniq.has(key)) uniq.set(key, item);
      }
      return [...uniq.values()].sort((a, b) => a.px - b.px);
    }, { MIN_HARD, MIN_BODY, MIN_BODY_IDEAL, strict });

    if (issues.length) results.push({ page: pagePath, issues });
  } catch (err) {
    results.push({ page: pagePath, issues: [{ level: 'fail', px: 0, tag: 'page', selector: 'load', text: String(err).slice(0, 80) }] });
  }
  await page.close();
}

await context.close();
await browser.close();
server.close();

const failCount = results.reduce((n, r) => n + r.issues.filter((i) => i.level === 'fail').length, 0);
const warnCount = results.reduce((n, r) => n + r.issues.filter((i) => i.level === 'warn').length, 0);

const summary = {
  auditedAt: new Date().toISOString(),
  viewport: '390x844',
  pagesChecked: pages.length,
  pagesWithIssues: results.length,
  failCount,
  warnCount,
  thresholds: {
    failBelowPx: MIN_HARD,
    warnBelowPx: MIN_BODY,
    bodyIdealPx: MIN_BODY_IDEAL,
  },
  results: results.slice(0, 100),
};

writeFileSync(join(outDir, 'mobile-text.json'), JSON.stringify(summary, null, 2));

console.log(JSON.stringify({
  pagesChecked: summary.pagesChecked,
  pagesWithIssues: summary.pagesWithIssues,
  failCount,
  warnCount,
}, null, 2));

for (const r of results.slice(0, 25)) {
  console.log(`\n${r.page}`);
  for (const i of r.issues.slice(0, 8)) {
    console.log(`  [${i.level}] ${i.px}px ${i.selector} — "${i.text}"`);
  }
  if (r.issues.length > 8) console.log(`  ... +${r.issues.length - 8} more`);
}

process.exit(failCount > 0 ? 1 : 0);
