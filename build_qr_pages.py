#!/usr/bin/env python3
"""
PWI Website - QR Page Builder
=============================

Maintains a stable set of QR landing URLs.

Run:
    python3 build_qr_pages.py

This generates:
  - tailwind_theme/qr-data.js
  - qr-*.html landing aliases that redirect into qr-code-download/
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

SITE_DIR = Path(__file__).resolve().parent
QR_DATA_FILE = SITE_DIR / "tailwind_theme" / "qr-data.js"

QR_ITEMS = [
    {
        "slug": "1308-1309-reading-light",
        "title": "1308 / 1309 LED Reading Light",
        "page": "1308-1309-led-reading-light.html",
        "pdf": "PWI Literature Sheets/pwi-led-replacement-reading-lights.pdf",
        "description": "FAA PMA-approved LED replacement reading light for aircraft cabin applications.",
    },
    {
        "slug": "1495-reading-light",
        "title": "1495 LED Reading Light",
        "page": "1495-led-reading-light.html",
        "pdf": "PWI Literature Sheets/pwi-led-replacement-reading-lights.pdf",
        "description": "FAA PMA-approved LED reading light with low power draw and long service life.",
    },
    {
        "slug": "303-reading-light",
        "title": "303 LED Reading Light",
        "page": "303-led-reading-light.html",
        "pdf": "PWI Literature Sheets/pwi-led-replacement-reading-lights.pdf",
        "description": "FAA PMA-approved LED reading light designed for direct aircraft lighting replacement.",
    },
    {
        "slug": "303-right-angle-reading-light",
        "title": "303 Right Angle LED Reading Light",
        "page": "303-right-angle-reading-light.html",
        "pdf": "PWI Literature Sheets/pwi-led-replacement-reading-lights.pdf",
        "description": "90-degree directional LED reading light for aircraft cabin, cockpit, and sign applications.",
    },
    {
        "slug": "beechjet-400-led-cabin",
        "title": "Beechjet 400, 400A, and Hawker 400XP LED Cabin Lighting System",
        "page": "beechjet-400-400a-hawker-400xp-led-cabin-lights.html",
        "pdf": "PWI Literature Sheets/pwi-beechjet-400-led-cabin.pdf",
        "description": "PMA-approved LED cabin lighting upgrade for Beechjet and Hawker 400-series aircraft.",
    },
    {
        "slug": "citation-led-cabin",
        "title": "Citation LED Cabin Light System",
        "page": "citation-led-cabin-light-system.html",
        "pdf": "PWI Literature Sheets/pwi-citation-led-cabin.pdf",
        "description": "PMA-approved Citation cabin LED upgrade using existing aircraft wiring.",
    },
    {
        "slug": "citation-led-step-light",
        "title": "Citation LED Step Light",
        "page": "citation-led-step-light.html",
        "pdf": "PWI Literature Sheets/pwi-led-step-light-citation.pdf",
        "description": "LED step light replacement for Citation aircraft with PMA approval.",
    },
    {
        "slug": "coil-windings-transformers",
        "title": "Coil Winding & Transformers",
        "page": "coil-winding-transformers.html",
        "pdf": "PWI Literature Sheets/pwi-coil-windings-transformers.pdf",
        "description": "Custom coil winding and transformer manufacturing services from PWI.",
    },
    {
        "slug": "contract-manufacturing",
        "title": "Contract Manufacturing",
        "page": "contract-manufacturing.html",
        "pdf": "PWI Literature Sheets/pwi-contract-manufacturing.pdf",
        "description": "Electronics and manufacturing support from prototype through production.",
    },
    {
        "slug": "custom-engineering-services",
        "title": "Custom Engineering Services",
        "page": "engineering.html",
        "pdf": "PWI Literature Sheets/pwi-custom-engineering-services.pdf",
        "description": "Engineering support for aviation, electronics, and specialty product development.",
    },
    {
        "slug": "falcon-900b-led-cabin",
        "title": "Falcon 900B LED Cabin Lighting System",
        "page": "falcon-900b-led-cabin-system.html",
        "pdf": "PWI Literature Sheets/pwi-falcon-900b-led-cabin.pdf",
        "description": "LED cabin lighting upgrade for Falcon 900B aircraft with PMA approval.",
    },
    {
        "slug": "fluorescent-lighting-upgrade",
        "title": "Fluorescent Lighting Upgrade",
        "page": "fluorescent-lighting.html",
        "pdf": "PWI Literature Sheets/pwi-fluorescent-lighting-upgrade.pdf",
        "description": "Replacement solutions for legacy fluorescent aircraft lighting systems.",
    },
    {
        "slug": "fluxgate-magnetometers",
        "title": "Fluxgate Magnetometers",
        "page": "fluxgate-magnetometers.html",
        "pdf": "PWI Literature Sheets/pwi-fluxgate-magnetometers.pdf",
        "description": "Precision fluxgate magnetometers manufactured by PWI.",
    },
    {
        "slug": "king-air-90-100-200-led-cabin",
        "title": "King Air 90, 100, 200, B200/250 LED Cabin Lighting System",
        "page": "king-air-90-100-200.html",
        "pdf": "PWI Literature Sheets/pwi-king-air-90-100-200-led-cabin.pdf",
        "description": "LED cabin lighting upgrade for King Air 90, 100, 200, B200/250 series aircraft.",
    },
    {
        "slug": "king-air-300-led-cabin",
        "title": "King Air 300, B300/350 LED Cabin Lighting System",
        "page": "king-air-300.html",
        "pdf": "PWI Literature Sheets/pwi-king-air-300-led-cabin.pdf",
        "description": "LED cabin lighting system for King Air 300, B300/350 aircraft.",
    },
    {
        "slug": "king-air-ice-light-windows",
        "title": "King Air Ice Light Windows",
        "page": "king-air-ice-light-windows.html",
        "pdf": "PWI Literature Sheets/pwi-king-air-ice-light-windows.pdf",
        "description": "Replacement windows for King Air and Beechcraft 1900 ice light applications.",
    },
    {
        "slug": "learjet-led-cabin",
        "title": "Learjet LED Cabin Lighting System",
        "page": "learjet-led-cabin-lights.html",
        "pdf": "PWI Literature Sheets/pwi-learjet-led-cabin.pdf",
        "description": "PMA-approved Learjet LED cabin lighting system with low maintenance operation.",
    },
    {
        "slug": "led-dimming-control",
        "title": "LED Dimming Control",
        "page": "led-dimming-control-system.html",
        "pdf": "",
        "description": "Aircraft LED dimming control compatible with PWI reading lights and cabin lighting systems.",
    },
    {
        "slug": "led-entry-door-underwing-light",
        "title": "LED Entry Door Underwing Light",
        "page": "led-entry-door-underwing-light.html",
        "pdf": "PWI Literature Sheets/pwi-led-entry-door-underwing-light.pdf",
        "description": "FAA PMA-approved LED entry and underwing light replacement.",
    },
    {
        "slug": "led-ice-light",
        "title": "LED Ice Light",
        "page": "led-ice-light.html",
        "pdf": "PWI Literature Sheets/pwi-led-ice-light.pdf",
        "description": "LED aircraft ice light with improved visibility, low power draw, and long life.",
    },
    {
        "slug": "led-linear-lights",
        "title": "LED Linear Light",
        "page": "led-linear-lights.html",
        "pdf": "PWI Literature Sheets/pwi-led-linear-lights.pdf",
        "description": "LED linear aircraft lighting designed to replace fluorescent fixtures.",
    },
    {
        "slug": "led-logo-light",
        "title": "LED Logo Light",
        "page": "led-logo-light.html",
        "pdf": "PWI Literature Sheets/pwi-led-logo-light.pdf",
        "description": "LED logo and wing inspection lighting replacement for aircraft applications.",
    },
    {
        "slug": "led-reading-lights",
        "title": "LED Replacement Reading Lights",
        "page": "led-lighting.html",
        "pdf": "PWI Literature Sheets/pwi-led-replacement-reading-lights.pdf",
        "description": "Overview of PWI LED replacement reading lights for multiple aircraft platforms.",
    },
    {
        "slug": "led-seat-belt-smoking-sign-backlight",
        "title": "Seat Belt / Smoking Sign LED Backlight",
        "page": "led-no-smoking-seat-belt-sign.html",
        "pdf": "PWI Literature Sheets/pwi-led-no-smoking-seat-belt-sign.pdf",
        "description": "LED backlight replacement for seat belt and smoking sign assemblies.",
    },
    {
        "slug": "led-wingtip-light-assemblies",
        "title": "LED Wingtip Light Assemblies",
        "page": "led-wingtip-light-assemblies.html",
        "pdf": "PWI Literature Sheets/pwi-led-wingtip-light-assembly.pdf",
        "description": "PMA-approved LED wingtip lighting assemblies for aircraft exterior lighting upgrades.",
    },
    {
        "slug": "no-smoking-seat-belt-sign-graphic",
        "title": "No Smoking / Seat Belt Sign Graphic",
        "page": "smoking-fasten-seat-belt-sign-graphic.html",
        "pdf": "PWI Literature Sheets/pwi-no-smoking-seat-belt-sign-graphic.pdf",
        "description": "Replacement sign graphic for no smoking and seat belt illuminated sign assemblies.",
    },
    {
        "slug": "pilatus-pc-12-led-cabin",
        "title": "Pilatus PC-12 LED Cabin Lighting System",
        "page": "pilatus-pc-12.html",
        "pdf": "PWI Literature Sheets/pwi-pilatus-pc12-led-cabin.pdf",
        "description": "LED cabin lighting upgrade for Pilatus PC-12 aircraft.",
    },
]


def infer_image(page_name: str) -> str:
    page_path = SITE_DIR / page_name
    if not page_path.exists():
        return ""

    text = page_path.read_text(encoding="utf-8", errors="ignore")

    for meta_match in re.finditer(r"<meta[^>]+>", text, re.IGNORECASE):
        tag = meta_match.group(0)
        if 'og:image' not in tag.lower():
            continue
        content_match = re.search(r'content="([^"]+)"', tag, re.IGNORECASE)
        if content_match:
            return content_match.group(1).replace("https://pwi-e.com/", "").replace("http://pwi-e.com/", "")

    img_match = re.search(r'<img[^>]+src="([^"]+)"', text, re.IGNORECASE)
    if img_match:
        return img_match.group(1)

    return ""


def build_qr_data() -> None:
    enriched = []
    for item in QR_ITEMS:
        entry = dict(item)
        entry["image"] = infer_image(entry["page"]) if entry.get("page") else ""
        enriched.append(entry)

    data = {item["slug"]: item for item in enriched}
    payload = json.dumps(data, indent=2)
    QR_DATA_FILE.write_text(
        "window.PWI_QR_DATA = " + payload + ";\n",
        encoding="utf-8",
    )


def build_alias_pages() -> None:
    template = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>{title} QR Landing</title>
    <meta name="robots" content="noindex"/>
    <meta http-equiv="refresh" content="0; url=qr-code-download/?item={slug}"/>
    <script>
      window.location.replace("qr-code-download/?item={slug}");
    </script>
  </head>
  <body>
    <p>Redirecting to the QR landing page for <a href="qr-code-download/?item={slug}">{title}</a>.</p>
  </body>
</html>
"""
    for item in QR_ITEMS:
        target = SITE_DIR / f"qr-{item['slug']}.html"
        target.write_text(
            template.format(title=item["title"], slug=item["slug"]),
            encoding="utf-8",
        )


def main() -> None:
    build_qr_data()
    build_alias_pages()
    print(f"Built {len(QR_ITEMS)} QR aliases and qr-data.js")


if __name__ == "__main__":
    main()
