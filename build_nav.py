#!/usr/bin/env python3
"""
PWI Website - Shared Nav Builder
=================================
Edit nav.html to change the site navigation.
Edit footer.html to change the site footer.
Then run: python3 build_nav.py

This stamps nav.html into every HTML page between
<!-- NAV:START --> and <!-- NAV:END --> markers,
and stamps footer.html between
<!-- FOOTER:START --> and <!-- FOOTER:END --> markers.

It also generates the embedded shared-layout nav/footer from nav.html
and footer.html, so those files stay the single editable sources.
"""
import glob, json, os, re

SITE_DIR = os.path.dirname(os.path.abspath(__file__))
NAV_FILE = os.path.join(SITE_DIR, 'nav.html')
FOOTER_FILE = os.path.join(SITE_DIR, 'footer.html')
SHARED_LAYOUT_FILES = (
    os.path.join(SITE_DIR, 'tailwind_theme', 'shared-layout.js'),
    os.path.join(SITE_DIR, 'tailwind_theme', 'shared-layout.min.js'),
)
SIDEBAR_LAYOUT_FILE = os.path.join(SITE_DIR, 'tailwind_theme', 'shared-layout-sidebar.min.js')

FOOTER_MARKUP_RE = re.compile(
    r'const footerMarkup = (?:"(?:\\.|[^"\\])*"|`[\s\S]*?`);',
    re.MULTILINE,
)
NAV_MARKUP_RE = re.compile(
    r'const navMarkup = (?:"(?:\\.|[^"\\])*"|`[\s\S]*?`);',
    re.MULTILINE,
)

def replace_nav_markup(js_content, nav_html):
    replacement = 'const navMarkup = ' + json.dumps(nav_html) + ';'
    new_content, count = NAV_MARKUP_RE.subn(lambda _match: replacement, js_content, count=1)
    return new_content, count

def replace_footer_markup(js_content, footer_html):
    replacement = 'const footerMarkup = ' + json.dumps(footer_html) + ';'
    new_content, count = FOOTER_MARKUP_RE.subn(lambda _match: replacement, js_content, count=1)
    return new_content, count

def update_shared_layout_navs(nav_html):
    updated = errors = missing = 0

    for f in SHARED_LAYOUT_FILES:
        if not os.path.exists(f):
            missing += 1
            continue
        content = open(f).read()
        new_content, count = replace_nav_markup(content, nav_html)
        if count != 1:
            print(f"  ERROR {os.path.relpath(f, SITE_DIR)}: navMarkup not found")
            errors += 1
            continue
        if new_content != content:
            open(f, 'w').write(new_content)
            updated += 1

    return updated, missing, errors

def update_shared_layout_footers(footer_html):
    updated = errors = missing = 0

    for f in SHARED_LAYOUT_FILES:
        if not os.path.exists(f):
            missing += 1
            continue
        content = open(f).read()
        new_content, count = replace_footer_markup(content, footer_html)
        if count != 1:
            print(f"  ERROR {os.path.relpath(f, SITE_DIR)}: footerMarkup not found")
            errors += 1
            continue
        if new_content != content:
            open(f, 'w').write(new_content)
            updated += 1

    if os.path.exists(SIDEBAR_LAYOUT_FILE):
        content = open(SIDEBAR_LAYOUT_FILE).read()
        sidebar_footer_html = footer_html.replace(
            '<footer ',
            '<footer style="margin-left:260px" ',
            1,
        )
        new_content, count = replace_footer_markup(content, sidebar_footer_html)
        if count != 1:
            print(f"  ERROR {os.path.relpath(SIDEBAR_LAYOUT_FILE, SITE_DIR)}: footerMarkup not found")
            errors += 1
        elif new_content != content:
            open(SIDEBAR_LAYOUT_FILE, 'w').write(new_content)
            updated += 1
    else:
        missing += 1

    return updated, missing, errors

def build():
    if not os.path.exists(NAV_FILE):
        print("ERROR: nav.html not found.")
        return
    if not os.path.exists(FOOTER_FILE):
        print("ERROR: footer.html not found.")
        return

    nav_html = open(NAV_FILE).read()
    replacement = '<!-- NAV:START -->\n' + nav_html + '\n<!-- NAV:END -->'
    shared_nav_updated, shared_nav_missing, shared_nav_errors = update_shared_layout_navs(nav_html)

    footer_html = open(FOOTER_FILE).read()
    footer_replacement = '<!-- FOOTER:START -->\n' + footer_html + '\n<!-- FOOTER:END -->'
    shared_footer_updated, shared_footer_missing, shared_footer_errors = update_shared_layout_footers(footer_html)

    files = [f for f in glob.glob(os.path.join(SITE_DIR, '*.html'))
             if os.path.basename(f) not in ('nav.html', 'footer.html')]

    processed_nav = processed_footer = changed = up_to_date = skipped = errors = 0
    for f in sorted(files):
        content = open(f).read()
        try:
            has_nav = '<!-- NAV:START -->' in content and '<!-- NAV:END -->' in content
            has_footer = '<!-- FOOTER:START -->' in content and '<!-- FOOTER:END -->' in content

            if not has_nav and not has_footer:
                print(f"  SKIP (no marker): {os.path.basename(f)}")
                skipped += 1
                continue

            new_content = content

            if has_nav:
                start = new_content.index('<!-- NAV:START -->')
                end = new_content.index('<!-- NAV:END -->') + len('<!-- NAV:END -->')
                new_content = new_content[:start] + replacement + new_content[end:]
                processed_nav += 1

            if has_footer:
                start = new_content.index('<!-- FOOTER:START -->')
                end = new_content.index('<!-- FOOTER:END -->') + len('<!-- FOOTER:END -->')
                new_content = new_content[:start] + footer_replacement + new_content[end:]
                processed_footer += 1

            if new_content != content:
                open(f, 'w').write(new_content)
                changed += 1
            else:
                up_to_date += 1
        except Exception as e:
            print(f"  ERROR {os.path.basename(f)}: {e}")
            errors += 1

    print(
        f"\nDone. Processed nav: {processed_nav} | Processed footer: {processed_footer} | "
        f"Changed: {changed} | Up-to-date: {up_to_date} | Skipped: {skipped} | Errors: {errors}"
    )
    print(
        f"Shared layout footers updated: {shared_footer_updated} | "
        f"Missing: {shared_footer_missing} | Errors: {shared_footer_errors}"
    )
    print(
        f"Shared layout navs updated: {shared_nav_updated} | "
        f"Missing: {shared_nav_missing} | Errors: {shared_nav_errors}"
    )
    if processed_nav:
        print("Nav has been stamped into pages from nav.html.")
    if processed_footer:
        print("Footer has been stamped into pages from footer.html.")
    if shared_nav_updated or shared_nav_errors == 0:
        print("Shared layout nav has been generated from nav.html.")
    if shared_footer_updated or shared_footer_errors == 0:
        print("Shared layout footer has been generated from footer.html.")

if __name__ == '__main__':
    build()
