import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const outDir = join(root, '_build', 'qa-screenshots', 'mobile-pass');
mkdirSync(outDir, { recursive: true });

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
  '.pdf': 'application/pdf',
};

const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const rel = url === '/' ? '/index.html' : url;
  const filePath = join(root, rel);
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

const pages = [
  'index.html',
  'about-us.html',
  'services.html',
  'led-wingtip-light-assemblies.html',
  'led-lighting.html',
  'contact.html',
];

const viewports = [
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'iphone-14', width: 390, height: 844 },
  { name: 'ipad', width: 768, height: 1024 },
];

const browserPath = join(
  root,
  '_build/pw-browsers/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'
);

const browser = await chromium.launch({
  executablePath: existsSync(browserPath) ? browserPath : undefined,
});

const results = [];

for (const pagePath of pages) {
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    const jsErrors = [];
    const failedAssets = [];

    page.on('pageerror', (e) => jsErrors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') jsErrors.push(m.text());
    });
    page.on('response', (r) => {
      if (r.status() >= 400 && r.url().startsWith(base)) {
        failedAssets.push(`${r.status()} ${r.url().replace(base, '')}`);
      }
    });

    const slug = pagePath.replace('.html', '');
    let loadError = null;

    try {
      await page.goto(base + pagePath, { waitUntil: 'networkidle', timeout: 45000 });
      await page.evaluate(() => document.getElementById('pwi-cookie-banner')?.remove());

      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const header = document.querySelector('.site-header');
        const headerInner = document.querySelector('.site-header-inner');
        const mobileBtn = document.getElementById('mobile-menu-button');
        const desktopNav = document.querySelector('.site-header nav.md\\:flex');
        const spacer = document.querySelector('.site-header-spacer');
        const main = document.getElementById('main-content');
        const h1 = document.querySelector('main h1, main .product-title, main .about-display');

        const headerRect = header?.getBoundingClientRect();
        const h1Rect = h1?.getBoundingClientRect();
        const spacerH = spacer?.getBoundingClientRect().height || 0;
        const headerH = headerRect?.height || 0;

        const desktopNavVisible =
          desktopNav &&
          getComputedStyle(desktopNav).display !== 'none' &&
          desktopNav.getBoundingClientRect().width > 0;

        const mobileBtnVisible =
          mobileBtn &&
          getComputedStyle(mobileBtn).display !== 'none' &&
          mobileBtn.getBoundingClientRect().width > 0;

        const h1UnderHeader =
          h1Rect && headerRect ? h1Rect.top < headerRect.bottom - 2 : null;

        return {
          horizontalOverflow: doc.scrollWidth > doc.clientWidth + 1,
          overflowPx: doc.scrollWidth - doc.clientWidth,
          headerHeight: Math.round(headerH),
          spacerHeight: Math.round(spacerH),
          headerSpacerMismatch: Math.abs(spacerH - headerH) > 4 && spacerH > 0,
          desktopNavVisible,
          mobileBtnVisible,
          h1UnderHeader,
          h1Top: h1Rect ? Math.round(h1Rect.top) : null,
          mainExists: !!main,
        };
      });

      // Open mobile menu on phone widths
      let mobileMenuOk = null;
      if (vp.width < 768) {
        await page.locator('#mobile-menu-button').click();
        await page.waitForTimeout(350);
        mobileMenuOk = await page.evaluate(() => {
          const panel = document.getElementById('mobile-menu-panel');
          const toggle = document.getElementById('mobile-menu-toggle');
          const style = panel ? getComputedStyle(panel) : null;
          const opacity = style ? parseFloat(style.opacity) : 0;
          return {
            toggleChecked: toggle?.checked || false,
            panelVisible: opacity > 0.5,
            linkCount: document.querySelectorAll('#mobile-nav a[href]').length,
          };
        });
        await page.screenshot({
          path: join(outDir, `${slug}-${vp.name}-menu.png`),
          fullPage: false,
        });
        await page.locator('#mobile-menu-button').click();
        await page.waitForTimeout(200);
      }

      await page.screenshot({
        path: join(outDir, `${slug}-${vp.name}.png`),
        fullPage: true,
      });

      const issues = [];
      if (metrics.horizontalOverflow) issues.push(`horizontal overflow +${metrics.overflowPx}px`);
      if (metrics.headerSpacerMismatch) {
        issues.push(`header/spacer height mismatch (header ${metrics.headerHeight}px, spacer ${metrics.spacerHeight}px)`);
      }
      if (vp.width < 768 && metrics.desktopNavVisible) issues.push('desktop nav visible on mobile');
      if (vp.width < 768 && !metrics.mobileBtnVisible) issues.push('mobile menu button hidden on mobile');
      if (vp.width >= 768 && vp.width < 1024 && metrics.desktopNavVisible) {
        issues.push('desktop nav visible on tablet (expected mobile nav 768-1023)');
      }
      if (metrics.h1UnderHeader) issues.push(`h1 hidden under header (top ${metrics.h1Top}px)`);
      if (mobileMenuOk && (!mobileMenuOk.panelVisible || mobileMenuOk.linkCount < 5)) {
        issues.push('mobile menu did not open properly');
      }
      if (failedAssets.length) issues.push(`failed assets: ${failedAssets.slice(0, 3).join(', ')}`);
      if (jsErrors.length) issues.push(`js: ${jsErrors.slice(0, 2).join(' | ')}`);

      results.push({
        page: pagePath,
        viewport: vp.name,
        width: vp.width,
        issues,
        metrics,
        mobileMenuOk,
      });
    } catch (err) {
      loadError = String(err);
      results.push({ page: pagePath, viewport: vp.name, width: vp.width, loadError });
    }

    await page.close();
  }
}

await browser.close();
server.close();

const summary = {
  tested: results.length,
  withIssues: results.filter((r) => r.issues?.length || r.loadError).length,
  results,
};

writeFileSync(join(outDir, 'report.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
