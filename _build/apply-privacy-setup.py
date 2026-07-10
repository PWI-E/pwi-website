#!/usr/bin/env python3
"""Apply privacy infrastructure updates across HTML pages."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {".git", "node_modules", "archive", "_pgbackup", "Eric's Edits 060326", "Eric - LED Dimming Controller Page"}

GTAG_OLD = re.compile(
    r"<script async src=\"https://www\.googletagmanager\.com/gtag/js\?id=G-PFX0VN5076\"></script>\s*"
    r"<script>\s*"
    r"window\.dataLayer = window\.dataLayer \|\| \[\];\s*"
    r"function gtag\(\)\{dataLayer\.push\(arguments\);\}\s*"
    r"gtag\('js', new Date\(\)\);\s*"
    r"gtag\('consent', 'default', \{ analytics_storage: 'denied' \}\);\s*"
    r"gtag\('config', 'G-PFX0VN5076'\);\s*"
    r"</script>",
    re.MULTILINE,
)

GTAG_NEW = (
    '<script src="tailwind_theme/gtag-consent.js?v=20260627"></script>\n'
    '<script async src="https://www.googletagmanager.com/gtag/js?id=G-PFX0VN5076"></script>\n'
    "<script>\n"
    "  gtag('config', 'G-PFX0VN5076');\n"
    "</script>"
)

COOKIE_BANNER_OLD = re.compile(
    r'<script src="tailwind_theme/cookie-banner\.js\?v=[^"]+" defer></script>'
)
COOKIE_BANNER_DEFER_FIRST = re.compile(
    r'<script defer src="tailwind_theme/cookie-banner\.js\?v=[^"]+"></script>'
)
COOKIE_BANNER_NEW = (
    '<script src="tailwind_theme/privacy-config.js?v=20260627" defer></script>\n'
    '<script src="tailwind_theme/cookie-banner.js?v=20260630" defer></script>'
)

COOKIE_BANNER_OLD2 = re.compile(
    r'<script src="tailwind_theme/cookie-banner\.js\?v=[^"]+" defer></script>\n'
    r'<script src="tailwind_theme/privacy-config\.js\?v=[^"]+" defer></script>'
)

QR_INLINE_ANALYTICS = re.compile(
    r"\s*<script>\s*"
    r"\(function\(\)\{\s*"
    r"try \{\s*"
    r"var c = JSON\.parse\(localStorage\.getItem\('pwi_cookie_consent'\)\);\s*"
    r"if \(c && c\.analytics\) \{\s*"
    r"gtag\('consent', 'update', \{ analytics_storage: 'granted' \}\);\s*"
    r"gtag\('event', 'qr_scan',[^}]+\}\);\s*"
    r"\}\s*"
    r"\} catch\(e\) \{\}\s*"
    r"\}\)\(\);\s*"
    r"</script>",
    re.MULTILINE | re.DOTALL,
)


def should_skip(path: Path) -> bool:
    return any(part in SKIP_DIRS for part in path.parts)


def iter_html() -> list[Path]:
    files: list[Path] = []
    for path in ROOT.rglob("*.html"):
        if should_skip(path):
            continue
        files.append(path)
    return files


def update_gtag(content: str) -> str:
    return GTAG_OLD.sub(GTAG_NEW, content)


def update_cookie_scripts(content: str) -> str:
    replacement = COOKIE_BANNER_NEW
    if 'privacy-config.js?v=20260627' in content:
        return content
    content = COOKIE_BANNER_OLD.sub(replacement, content)
    content = COOKIE_BANNER_DEFER_FIRST.sub(replacement, content)
    return content


def update_qr_page(path: Path, content: str) -> str:
    if not path.name.startswith("qr-") or path.name == "qr-code-download":
        return content
    m = re.search(r"data-qr-product|qr_scan|'product': '([^']+)'", content)
    product = None
    pm = re.search(r"'product': '([^']+)'", content)
    if pm:
        product = pm.group(1)
    else:
        item = re.search(r"item=([^\"&]+)", content)
        if item:
            product = item.group(1)
    content = QR_INLINE_ANALYTICS.sub("", content)
    if product and "qr-analytics.js" not in content:
        content = content.replace(
            "<html lang=\"en\">",
            f'<html lang="en" data-qr-product="{product}">',
            1,
        )
        insert = (
            '  <script src="tailwind_theme/privacy-config.js?v=20260627"></script>\n'
            '  <script src="tailwind_theme/cookie-banner.js?v=20260630" defer></script>\n'
            '  <script src="tailwind_theme/qr-analytics.js?v=20260627" defer></script>\n'
        )
        if "</body>" in content and "cookie-banner.js" not in content:
            content = content.replace("</body>", insert + "</body>", 1)
    return content


def main() -> None:
    changed = 0
    for path in iter_html():
        original = path.read_text(encoding="utf-8")
        updated = update_gtag(original)
        if "cookie-banner.js" in updated:
            updated = update_cookie_scripts(updated)
        updated = update_qr_page(path, updated)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            changed += 1
            print(f"updated {path.relative_to(ROOT)}")
    print(f"done — {changed} files changed")


if __name__ == "__main__":
    main()
