/**
 * Run Lighthouse on a representative pre-launch page panel (local static server).
 * Reports: _build/lighthouse/<page-slug>.report.html + summary.json
 *
 * Usage:
 *   npm run qa:lighthouse
 *   npm run qa:lighthouse -- --pages=index,request-quote
 *   npm run qa:lighthouse -- --full   (all panel pages, all categories)
 */
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const outDir = join(root, '_build', 'lighthouse');

const PANEL = [
  { path: 'index.html', slug: 'index', full: true },
  { path: 'about-us.html', slug: 'about-us', full: false },
  { path: 'request-quote.html', slug: 'request-quote', full: false },
  { path: 'contact-form.html', slug: 'contact-form', full: false },
  { path: 'newsletter-signup.html', slug: 'newsletter-signup', full: false },
  { path: 'search.html', slug: 'search', full: false },
  { path: 'king-air-ice-light-windows.html', slug: 'king-air-ice-light-windows', full: false },
  { path: 'qr-pilatus-pc-12-led-cabin.html', slug: 'qr-pilatus-pc-12-led-cabin', full: false },
  { path: 'cookie-policy.html', slug: 'cookie-policy', full: false },
];

const A11Y_CATEGORIES = ['accessibility', 'best-practices'];
const FULL_CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

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

function parseArgs(argv) {
  const opts = { fullPanel: false, slugs: null };
  for (const arg of argv) {
    if (arg === '--full') opts.fullPanel = true;
    else if (arg.startsWith('--pages=')) {
      opts.slugs = new Set(arg.slice(8).split(',').map((s) => s.trim()).filter(Boolean));
    }
  }
  return opts;
}

function resolveFilePath(rootDir, relPath) {
  let filePath = join(rootDir, relPath);
  if (!existsSync(filePath)) return null;
  if (statSync(filePath).isDirectory()) {
    const indexPath = join(filePath, 'index.html');
    if (existsSync(indexPath) && statSync(indexPath).isFile()) return indexPath;
    return null;
  }
  return filePath;
}

function serveFile(res, filePath) {
  if (!filePath || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = extname(filePath);
  res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
}

function scorePct(score) {
  return score == null ? null : Math.round(score * 100);
}

function failingAudits(lhr, limit = 8) {
  const out = [];
  for (const audit of Object.values(lhr.audits)) {
    if (audit.scoreDisplayMode === 'informative' || audit.scoreDisplayMode === 'manual') continue;
    if (audit.score != null && audit.score < 1) {
      out.push({
        id: audit.id,
        score: audit.score,
        title: audit.title,
        displayValue: audit.displayValue || '',
      });
    }
  }
  out.sort((a, b) => a.score - b.score);
  return out.slice(0, limit);
}

const cli = parseArgs(process.argv.slice(2));

let pages = PANEL;
if (cli.slugs) {
  pages = PANEL.filter((p) => cli.slugs.has(p.slug));
  if (!pages.length) {
    console.error('No matching pages. Slugs:', [...cli.slugs].join(', '));
    process.exit(1);
  }
}

for (const page of pages) {
  if (!existsSync(join(root, page.path))) {
    console.error(`Missing page file: ${page.path}`);
    process.exit(1);
  }
}

const server = createServer((req, res) => {
  const url = req.url.split('?')[0];
  const rel = url === '/' ? '/index.html' : url;
  serveFile(res, resolveFilePath(root, decodeURIComponent(rel)));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/`;

mkdirSync(outDir, { recursive: true });

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox'] });
const lighthouseOpts = {
  logLevel: 'error',
  output: 'html',
  port: chrome.port,
};

const summary = {
  generatedAt: new Date().toISOString(),
  base,
  outDir,
  pages: [],
};

console.log(`Lighthouse panel — ${pages.length} page(s) at ${base}`);

for (const page of pages) {
  const url = base + page.path;
  const categories = (cli.fullPanel || page.full)
    ? FULL_CATEGORIES
    : A11Y_CATEGORIES;

  const config = {
    extends: 'lighthouse:default',
    settings: {
      onlyCategories: categories,
      formFactor: 'mobile',
    },
  };

  console.log(`  → ${page.path} [${categories.join(', ')}]`);

  const runner = await lighthouse(url, lighthouseOpts, config);
  const lhr = runner.lhr;

  const categoriesOut = {};
  for (const [id, cat] of Object.entries(lhr.categories)) {
    categoriesOut[id] = scorePct(cat.score);
  }

  const prefix = join(outDir, page.slug);
  writeFileSync(`${prefix}.report.html`, runner.report);
  writeFileSync(`${prefix}.report.json`, JSON.stringify(lhr, null, 2));

  const entry = {
    path: page.path,
    slug: page.slug,
    url,
    categories: categoriesOut,
    failingAudits: failingAudits(lhr),
    reports: {
      html: `${page.slug}.report.html`,
      json: `${page.slug}.report.json`,
    },
  };
  summary.pages.push(entry);

  const scoreLine = Object.entries(categoriesOut)
    .map(([k, v]) => `${k} ${v ?? '—'}`)
    .join(' | ');
  console.log(`     ${scoreLine}`);
}

await chrome.kill();
server.close();

const summaryPath = join(outDir, 'summary.json');
writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(`\nDone. Summary: ${summaryPath}`);
