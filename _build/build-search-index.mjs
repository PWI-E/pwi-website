import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));

const excludedPathParts = new Set([
  ".audit",
  ".git",
  "_build",
  "_pgbackup",
  "archive",
  "deploy",
  "Eric's Edits 060326",
  "Eric - LED Dimming Controller Page",
  "node_modules"
]);

const excludedFiles = new Set([
  "404.html",
  "_pages.html",
  "all-pages.html",
  "contact-form.html",
  "footer.html",
  "nav.html",
  "pgisr.html",
  "style-guide.html"
]);

const excludedFilePrefixes = [
  "qr-",
  "qr-code-download/"
];

const excludedFilePatterns = [
  /^127\.0\.0\.1_.*\.report\.html$/
];

function isExcluded(path) {
  return path.split(sep).some((part) => excludedPathParts.has(part));
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

function pageContent(html) {
  const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return normalizeText(mainMatch?.[1] || bodyMatch?.[1] || html);
}

const htmlFiles = (await walk(root)).sort();
const index = [];

for (const file of htmlFiles) {
  const rel = relative(root, file).split(sep).join("/");
  const html = await readFile(file, "utf8");
  const title = extractTitle(html, rel.replace(/\.html$/i, "").replace(/[-/]/g, " "));
  const content = [title, pageContent(html)].join(" ").replace(/\s+/g, " ").trim();

  if (!content) continue;
  if (/noindex/i.test(html.match(/<meta[^>]+name=["']robots["'][^>]*>/i)?.[0] || "")) continue;
  index.push({ title, url: rel, content });
}

const output = `window.searchIndex = ${JSON.stringify(index, null, 2)};\n`;
await writeFile(join(root, "search-index.js"), output);

console.log(`Wrote search-index.js with ${index.length} pages.`);
