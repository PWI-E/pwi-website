import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));

const excludedPathParts = new Set([
  ".audit",
  ".git",
  "_build",
  "_pgbackup",
  "_pginfo",
  "_privacy-review",
  "archive",
  "deploy",
  "Eric's Edits 060326",
  "Eric - LED Dimming Controller Page",
  "node_modules",
  "pgisr-site",
  "pgisr-site-v1-backup",
  "pgisr-site-v2",
  "tmp",
  "output"
]);

const excludedFiles = new Set([
  "404.html",
  "_pages.html",
  "all-pages.html",
  "contact-form.html",
  "footer.html",
  "form-email-mockups.html",
  "index-legacy.html",
  "index-redesign.html",
  "mobile-nav-review.html",
  "mobile-nav-review-frame.html",
  "mobile-pages-review.html",
  "mobile-pages-review-navopen-frame.html",
  "nav.html",
  "newsletter-popup-mockups.html",
  "newsletter-popup-size-mockups.html",
  "pgisr.html",
  "style-guide.html"
]);

const excludedFilePrefixes = [
  "qr-",
  "qr-code-download/"
];

const excludedFilePatterns = [
  /^127\.0\.0\.1_.*\.report\.html$/,
  /(?:^|\/)[^/]*mockups?\.html$/i,
  /(?:^|\/)[^/]*-review(?:-|$|\.html)/i
];

function isExcluded(path) {
  return path.split(sep).some((part) => {
    if (excludedPathParts.has(part)) return true;
    // Catch backup / worktree folders that are not public site content
    if (/backup/i.test(part)) return true;
    if (/^pgisr-site/i.test(part)) return true;
    // Catch dotfiles/dirs (.git, .claude, .vscode, etc.) — never public site content
    if (part.startsWith(".") && part !== "." && part !== "..") return true;
    return false;
  });
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (isExcluded(path)) continue;

    if (entry.isDirectory()) {
      files.push(...await walk(path));
    } else if (extname(entry.name).toLowerCase() === ".html") {
      const rel = relative(root, path);
      const skipByPrefix = excludedFilePrefixes.some((prefix) => rel.startsWith(prefix));
      const skipByPattern = excludedFilePatterns.some((pattern) => pattern.test(rel));
      if (!excludedFiles.has(rel) && !skipByPrefix && !skipByPattern) files.push(path);
    }
  }

  return files;
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function extractTitle(html, fallback) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return fallback;
  return normalizeText(match[1]) || fallback;
}

function normalizeText(value) {
  return decodeEntities(String(value || ""))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMetaDescription(html) {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  return match ? normalizeText(match[1]) : "";
}

function cleanIndexedText(text, title) {
  let value = String(text || "");

  // Drop breadcrumb trails like "Home / Aircraft Lighting / King Air …"
  value = value.replace(/\bHome\s*\/\s*[A-Za-z0-9][^.]{0,120}?(?=\s{2,}|\s+[A-Z][a-z]|\s*$)/g, " ");
  value = value.replace(/\bHome\s*\/(?:\s*[^/\s][^/]*\/?){1,6}/gi, " ");

  // Drop common chrome / utility phrases that pollute snippets
  value = value
    .replace(/\bSkip to content\b/gi, " ")
    .replace(/\bRequest a Quote\b/gi, " ")
    .replace(/\bEmail for Pricing\b/gi, " ")
    .replace(/\bDownload Product Information\b/gi, " ")
    .replace(/\bView photo gallery[^.]*\b/gi, " ")
    .replace(/\bView serials\b/gi, " ")
    .replace(/\bSelect language\b/gi, " ")
    .replace(/\bCookie Settings\b/gi, " ")
    .replace(/\bPrivacy Request\b/gi, " ");

  value = value.replace(/\s+/g, " ").trim();

  // Avoid repeating the page title at the start of indexed content
  if (title) {
    const titleNorm = title.replace(/\s+/g, " ").trim();
    if (titleNorm && value.toLowerCase().startsWith(titleNorm.toLowerCase())) {
      value = value.slice(titleNorm.length).replace(/^[\s—\-|:]+/, "").trim();
    }
  }

  return value;
}

function pageContent(html) {
  let source = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]
    || html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1]
    || html;

  // Prefer page body without shared chrome when present
  source = source
    .replace(/<header\b[\s\S]*?<\/header>/gi, " ")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, " ")
    .replace(/<!--\s*NAV:START[\s\S]*?NAV:END\s*-->/gi, " ")
    .replace(/<!--\s*FOOTER:START[\s\S]*?FOOTER:END\s*-->/gi, " ");

  return normalizeText(source);
}

const htmlFiles = (await walk(root)).sort();
const index = [];

for (const file of htmlFiles) {
  const rel = relative(root, file).split(sep).join("/");
  const html = await readFile(file, "utf8");
  const title = extractTitle(html, rel.replace(/\.html$/i, "").replace(/[-/]/g, " "));
  const description = extractMetaDescription(html);
  const body = cleanIndexedText(pageContent(html), title);
  const content = [title, description, body].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

  if (!content) continue;
  if (/noindex/i.test(html.match(/<meta[^>]+name=["']robots["'][^>]*>/i)?.[0] || "")) continue;
  index.push({ title, url: rel, content });
}

const output = `window.searchIndex = ${JSON.stringify(index, null, 2)};\n`;
await writeFile(join(root, "search-index.js"), output);

console.log(`Wrote search-index.js with ${index.length} pages.`);
