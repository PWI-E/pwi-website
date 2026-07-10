#!/usr/bin/env python3
"""Standardize pre-footer bottom CTAs to match led-lighting.html."""

from __future__ import annotations

import re
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString

ROOT = Path(__file__).resolve().parents[1]
SKIP = {
    "footer.html",
    "nav.html",
    "mobile-nav-review-frame.html",
}

ARROW_SVG = (
    '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" '
    'viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" '
    'stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>'
)
PHONE_SVG = (
    '<svg class="led-cta-icon" viewBox="0 0 24 24" aria-hidden="true"><path '
    'd="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 '
    "013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96"
    ".361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 "
    "012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z\"/></svg>"
)
MAIL_SVG = (
    '<svg class="led-cta-icon" viewBox="0 0 24 24" aria-hidden="true"><path '
    'd="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 '
    '2-2z"/><polyline points="22,6 12,13 2,6"/></svg>'
)

EYEBROW_CLASSES = {
    "product-site-cta-eyebrow",
    "about-cta-eyebrow",
    "contact-cta-eyebrow",
    "dealer-cta-eyebrow",
}
LEDE_CLASSES = {
    "site-cta-lede",
    "about-cta-lede",
    "contact-cta-lede",
    "dealer-cta-lede",
}
NOTE_CLASSES = {"dealer-cta-note"}
ACTION_CLASSES = {
    "led-cta-actions",
    "product-site-cta-actions",
    "pdf-cta-actions",
}


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def class_set(tag) -> set[str]:
    classes = tag.get("class") or []
    return set(classes)



def extract_eyebrow(section) -> str:
    for cls in EYEBROW_CLASSES:
        node = section.find(class_=cls)
        if node:
            return clean_text(node.get_text())
    for p in section.find_all("p", recursive=True):
        classes = class_set(p)
        style = p.get("style", "")
        if "text-xs" in classes or "uppercase" in style:
            return clean_text(p.get_text())
    first_p = section.find("p")
    return clean_text(first_p.get_text()) if first_p else "Get Started"


def extract_title(section) -> str:
    h2 = section.find("h2")
    return clean_text(h2.get_text()) if h2 else ""


def extract_lede(section) -> str:
    for cls in LEDE_CLASSES:
        node = section.find(class_=cls)
        if node:
            return clean_text(node.get_text())
    h2 = section.find("h2")
    if not h2:
        return ""
    for sib in h2.find_next_siblings():
        if getattr(sib, "name", None) == "p" and not class_set(sib) & NOTE_CLASSES:
            classes = class_set(sib)
            style = sib.get("style", "")
            if "text-xs" in classes or "uppercase" in style:
                continue
            return clean_text(sib.get_text())
    return ""


def extract_note(section) -> str | None:
    note = section.find(class_=lambda c: c and "dealer-cta-note" in c.split())
    if not note:
        return None
    return str(note)


def is_button_link(tag) -> bool:
    if tag.name != "a":
        return False
    classes = class_set(tag)
    href = tag.get("href", "")
    if not href or href == "#":
        return False
    if classes & {
        "btn-primary",
        "btn-secondary",
        "btn-ghost",
        "about-cta-btn",
        "contact-cta-btn",
        "dealer-cta-btn",
        "led-cta-btn-secondary",
        "pdf-cta-btn-secondary",
    }:
        return True
    if "request-quote" in href or href.startswith("tel:") or href.startswith("mailto:"):
        return True
    if href.endswith("contact.html"):
        return True
    return False


def extract_buttons(section) -> list:
    action = None
    for cls in ACTION_CLASSES:
        action = section.find(class_=cls)
        if action:
            break
    scope = action if action else section
    buttons = []
    for tag in scope.find_all("a"):
        if tag.find_parent(class_=lambda c: c and NOTE_CLASSES.intersection(set(c))):
            continue
        if is_button_link(tag):
            buttons.append(tag)
    if not buttons:
        for tag in section.find_all("a", class_=lambda c: c and "btn-primary" in c.split()):
            buttons.append(tag)
    return buttons


def button_label(tag) -> str:
    clone = BeautifulSoup(str(tag), "html.parser").find("a")
    for svg in clone.find_all("svg"):
        svg.decompose()
    return clean_text(clone.get_text())


def render_button(tag) -> str:
    href = tag.get("href", "")
    label = button_label(tag)
    onclick = tag.get("onclick", "")
    onclick_attr = f' onclick="{onclick}"' if onclick else ""

    if href.startswith("tel:"):
        return (
            f'<a href="{href}" class="pdf-cta-btn-secondary"{onclick_attr}>\n'
            f"                {PHONE_SVG}\n"
            f"                {label}\n"
            f"              </a>"
        )

    if href.startswith("mailto:"):
        return (
            f'<a href="{href}" class="btn-primary gap-2"{onclick_attr}>\n'
            f"                {MAIL_SVG}\n"
            f"                {label}\n"
            f"              </a>"
        )

    classes = "btn-primary gap-2"
    if "btn-secondary" in class_set(tag) and "request-quote" not in href:
        return (
            f'<a href="{href}" class="pdf-cta-btn-secondary"{onclick_attr}>\n'
            f"                {label}\n"
            f"              </a>"
        )

    return (
        f'<a href="{href}" class="{classes}"{onclick_attr}>\n'
        f"                {label}\n"
        f"                {ARROW_SVG}\n"
        f"              </a>"
    )


def build_cta(section) -> str | None:
    eyebrow = extract_eyebrow(section)
    title = extract_title(section)
    lede = extract_lede(section)
    note = extract_note(section)
    buttons = extract_buttons(section)

    if not title:
        return None

    button_html = "\n              ".join(render_button(btn) for btn in buttons)
    note_html = f"\n            {note}" if note else ""

    return f"""<section class="site-cta led-cta">
          <div class="max-w-3xl mx-auto px-6">
            <p class="text-xs uppercase tracking-[0.18em] mb-3">{eyebrow}</p>
            <h2 class="font-sans text-2xl sm:text-3xl font-semibold mb-3 text-balance">{title}</h2>
            <p class="text-sm sm:text-base mb-5 sm:mb-7">{lede}</p>
            <div class="led-cta-actions">
              {button_html}
            </div>{note_html}
          </div>
        </section>"""


def process_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "pwi-site-bottom" not in text or "site-cta" not in text:
        return False

    pattern = re.compile(
        r"(<div class=\"pwi-site-bottom\">\s*)"
        r"(<section class=\"site-cta.*?</section>)"
        r"(\s*<!-- FOOTER:START -->)",
        re.DOTALL,
    )
    match = pattern.search(text)
    if not match:
        return False

    section = BeautifulSoup(match.group(2), "html.parser").find("section")
    if not section:
        return False

    new_block = build_cta(section)
    if not new_block:
        return False

    if match.group(2) == new_block:
        return False

    path.write_text(text[: match.start(2)] + new_block + text[match.end(2) :], encoding="utf-8")
    return True


def main() -> None:
    updated = []
    for path in sorted(ROOT.glob("*.html")):
        if path.name in SKIP:
            continue
        if process_file(path):
            updated.append(path.name)

    print(f"Updated {len(updated)} pages:")
    for name in updated:
        print(f"  - {name}")


if __name__ == "__main__":
    main()
