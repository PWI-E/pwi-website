/**
 * Export docs/cookies-privacy-guide.md to PDF via Playwright.
 * Run: node _build/export-cookies-privacy-pdf.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const mdPath = path.join(root, 'docs/cookies-privacy-guide.md');
const pdfPath = path.join(root, 'docs/cookies-privacy-guide.pdf');

function inline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

function mdToHtml(md) {
  const lines = md.trim().split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('# ')) {
      out.push(`<h1>${inline(line.slice(2))}</h1>`);
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      out.push(`<h2>${inline(line.slice(3))}</h2>`);
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      out.push(`<h3>${inline(line.slice(4))}</h3>`);
      i++;
      continue;
    }
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!/^\|[\s\-:|]+\|$/.test(lines[i])) {
          rows.push(
            lines[i]
              .split('|')
              .slice(1, -1)
              .map((c) => c.trim())
          );
        }
        i++;
      }
      if (rows.length) {
        const [head, ...body] = rows;
        out.push('<table><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>');
        body.forEach((row) => {
          out.push('<tr>' + row.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>');
        });
        out.push('</tbody></table>');
      }
      continue;
    }
    if (line.startsWith('- ')) {
      out.push('<ul>');
      while (i < lines.length && lines[i].startsWith('- ')) {
        out.push(`<li>${inline(lines[i].slice(2))}</li>`);
        i++;
      }
      out.push('</ul>');
      continue;
    }
    if (line.trim() === '') {
      i++;
      continue;
    }
    out.push(`<p>${inline(line)}</p>`);
    i++;
  }

  return out.join('\n');
}

const md = fs.readFileSync(mdPath, 'utf8');
const body = mdToHtml(md);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Cookies &amp; Privacy (pwi-e.com)</title>
  <style>
    @page { margin: 0.65in 0.75in; }
    * { box-sizing: border-box; }
    body {
      font-family: Rubik, Helvetica, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.45;
      color: #1e293b;
      max-width: 7in;
      margin: 0 auto;
    }
    h1 {
      font-size: 18pt;
      font-weight: 600;
      color: #0f172a;
      margin: 0 0 6pt;
      line-height: 1.2;
    }
    h2 {
      font-size: 11pt;
      font-weight: 600;
      color: #1e4ed8;
      margin: 14pt 0 6pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    h3 {
      font-size: 10.5pt;
      font-weight: 600;
      color: #0f172a;
      margin: 10pt 0 4pt;
    }
    code {
      font-family: Menlo, Consolas, monospace;
      font-size: 9pt;
      background: #f1f5f9;
      padding: 1pt 3pt;
      border-radius: 2pt;
    }
    p { margin: 0 0 8pt; }
    ul { margin: 0 0 8pt 18pt; padding: 0; }
    li { margin-bottom: 3pt; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 6pt 0 10pt;
      font-size: 9.5pt;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 5pt 7pt;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f1f5f9;
      font-weight: 600;
    }
    a { color: #1e4ed8; text-decoration: none; }
    .footer {
      margin-top: 16pt;
      padding-top: 8pt;
      border-top: 1px solid #e2e8f0;
      font-size: 8.5pt;
      color: #64748b;
    }
  </style>
</head>
<body>
${body}
<div class="footer">PWI, Inc. · pwi-e.com</div>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.pdf({
  path: pdfPath,
  format: 'Letter',
  printBackground: true,
  margin: { top: '0.65in', right: '0.75in', bottom: '0.65in', left: '0.75in' }
});
await browser.close();

console.log('Wrote', pdfPath);
