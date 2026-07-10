/**
 * Refresh sitemap.xml <lastmod> from each page file's modification date.
 * Run: node _build/update-sitemap-lastmod.mjs
 */
import { readFileSync, writeFileSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const sitemapPath = join(root, 'sitemap.xml');
let xml = readFileSync(sitemapPath, 'utf8');

function lastmodForUrl(loc) {
  const path = loc.replace('https://pwi-e.com/', '');
  const file = path ? path : 'index.html';
  const filePath = join(root, file);
  if (!existsSync(filePath)) {
    console.warn(`Missing file for ${loc}`);
    return new Date().toISOString().slice(0, 10);
  }
  return statSync(filePath).mtime.toISOString().slice(0, 10);
}

xml = xml.replace(
  /(<loc>https:\/\/pwi-e\.com\/[^<]*<\/loc>\s*)<lastmod>[^<]*<\/lastmod>/g,
  (match, locTag) => {
    const loc = locTag.match(/<loc>([^<]+)<\/loc>/)[1];
    return `${locTag}<lastmod>${lastmodForUrl(loc)}</lastmod>`;
  }
);

writeFileSync(sitemapPath, xml);
console.log('Updated', sitemapPath);
