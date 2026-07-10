/**
 * Static SEO / Google Search Console readiness audit.
 * Run: node _build/qa-seo-audit.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');

const DEV_PAGE_RE = /^(nav|footer|_pages|all-pages|style-guide|mobile-|index-legacy|index-redesign|qr-)\./;
const SKIP_DIRS = new Set(['node_modules', '.git', '_build', '_privacy-review', 'deploy', 'archive', 'pgisr-site', 'qr-code-download']);

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

function sitemapUrls() {
  const xml = readFileSync(join(root, 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace('https://pwi-e.com/', ''));
}

function auditPage(pagePath) {
  const html = readFileSync(join(root, pagePath), 'utf8');
  const issues = [];
  const base = pagePath.split('/').pop();

  if (!/name=["']viewport["']/i.test(html)) issues.push('missing viewport');
  if (!/<title>[^<]+<\/title>/i.test(html)) issues.push('missing title');
  if (!html.includes('name="description"')) issues.push('missing meta description');
  if (!html.includes('rel="canonical"') && !html.includes("rel='canonical'")) issues.push('missing canonical');
  if (!html.includes('lang="en"')) issues.push('missing lang="en"');
  if (html.includes('<h1') && !/<h1[^>]*>[^<]+/i.test(html)) issues.push('empty h1');

  const canonical = html.match(/rel=["']canonical["'][^>]*href=["']([^"']+)["']|href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  const href = canonical?.[1] || canonical?.[2];
  if (href && !href.startsWith('https://pwi-e.com/')) issues.push(`canonical not on pwi-e.com: ${href}`);

  return issues;
}

const publicPages = walkHtml(root)
  .filter((p) => !p.includes('/'))
  .filter((p) => !DEV_PAGE_RE.test(p))
  .filter((p) => !/^qr-/.test(p) && !/^mobile-/.test(p))
  .sort();

const sitemap = new Set(sitemapUrls());
const notInSitemap = publicPages.filter((p) => {
  const urlKey = p === 'index.html' ? '' : p;
  if (['404.html', 'search.html', 'pgisr.html'].includes(p)) return false;
  if (p.startsWith('pwi-') && p.endsWith('-pdf.html')) return false;
  if (/^qr-/.test(p) || /^mobile-/.test(p)) return false;
  return !sitemap.has(urlKey);
});

const pageIssues = publicPages
  .map((p) => ({ page: p, issues: auditPage(p) }))
  .filter((r) => r.issues.length);

const robots = readFileSync(join(root, 'robots.txt'), 'utf8');
const infraIssues = [];
if (!robots.includes('Sitemap: https://pwi-e.com/sitemap.xml')) infraIssues.push('robots.txt missing sitemap URL');
for (const rule of ['Disallow: /qr-', 'Disallow: /pwi-', 'Disallow: /search.html']) {
  if (!robots.includes(rule)) infraIssues.push(`robots.txt missing ${rule}`);
}

const htaccess = readFileSync(join(root, '.htaccess'), 'utf8');
if (!htaccess.includes('RewriteEngine On')) infraIssues.push('.htaccess missing HTTPS/host redirects');

const summary = {
  publicPages: publicPages.length,
  sitemapEntries: sitemap.size,
  pagesWithSeoIssues: pageIssues.length,
  publicPagesMissingFromSitemap: notInSitemap,
  infrastructureIssues: infraIssues,
};

console.log(JSON.stringify(summary, null, 2));

if (pageIssues.length) {
  console.log('\nPAGE SEO ISSUES:');
  for (const r of pageIssues.slice(0, 30)) {
    console.log(`  ${r.page}: ${r.issues.join(', ')}`);
  }
}

if (notInSitemap.length) {
  console.log('\nPUBLIC PAGES NOT IN SITEMAP:');
  for (const p of notInSitemap) console.log(`  ${p}`);
}

if (infraIssues.length) {
  console.log('\nINFRASTRUCTURE:');
  for (const i of infraIssues) console.log(`  ${i}`);
}

process.exit(pageIssues.length || notInSitemap.length || infraIssues.length ? 1 : 0);
