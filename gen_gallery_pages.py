import re

BASE = "/Users/francisong/Documents/PWI WEBSITE 110725/"

# Read the reference page to extract nav+head and footer
with open(BASE + "falcon-900b-led-cabin-system.html", 'r', encoding='utf-8') as f:
    ref_lines = f.readlines()

# Extract head+nav (lines 1-374, indices 0-373)
head_nav_raw = "".join(ref_lines[0:374])

# Find the footer line
footer_start = None
for i, l in enumerate(ref_lines):
    if '<footer' in l:
        footer_start = i
        break

footer_raw = "".join(ref_lines[footer_start:])

# --- Product definitions ---
products = [
    {
        "page_file": "falcon-900b-photos.html",
        "product_file": "falcon-900b-led-cabin-system.html",
        "title": "Falcon 900B LED Cabin Lighting — Photo Gallery",
        "h1_line1": "Falcon 900B",
        "h1_line2": "LED Cabin Lighting",
        "pill": "Cabin LED Systems",
        "back_href": "falcon-900b-led-cabin-system.html",
        "back_label": "← Falcon 900B LED Cabin Lighting",
        "og_image": "images/products/pwi-0003-led-cabin-lights-falcon-900b.jpg",
        "canonical": "https://pwi-e.com/falcon-900b-photos.html",
        "images": [
            {"src": "images/products/pwi-0002-led-cabin-lights-falcon-900b.jpg", "alt": "PWI LED cabin lights installed in Falcon 900B — overhead view"},
            {"src": "images/products/pwi-0003-led-cabin-lights-falcon-900b.jpg", "alt": "Falcon 900B cabin LED lighting by PWI — interior detail"},
        ],
        "total_slots": 9,
    },
    {
        "page_file": "king-air-90-100-200-photos.html",
        "product_file": "king-air-90-100-200.html",
        "title": "King Air 90, 100, 200, B200/250 LED Cabin Lighting — Photo Gallery",
        "h1_line1": "King Air 90, 100, 200, B200/250",
        "h1_line2": "LED Cabin Lighting",
        "pill": "Cabin LED Systems",
        "back_href": "king-air-90-100-200.html",
        "back_label": "← King Air 90, 100, 200, B200/250 LED Cabin Lighting",
        "og_image": "images/products/pwi-0103-king-air-90-200-b200-250-led-cabin-overhead.jpg",
        "canonical": "https://pwi-e.com/king-air-90-100-200-photos.html",
        "images": [
            {"src": "images/products/king-air-90-200-cabin-led.jpg", "alt": "King Air 90/200 cabin with PWI LED lighting upgrade"},
            {"src": "images/products/pwi-0099-king-air-90-200-led-cabin-overhead.jpg", "alt": "King Air 90/200 overhead LED panel — PWI installation"},
            {"src": "images/products/pwi-0103-king-air-90-200-b200-250-led-cabin-overhead.jpg", "alt": "King Air B200/250 LED overhead cabin lights by PWI"},
            {"src": "images/products/pwi-0111-king-air-cockpit-interior.jpg", "alt": "King Air cockpit interior with PWI LED lighting"},
        ],
        "total_slots": 9,
    },
    {
        "page_file": "king-air-300-photos.html",
        "product_file": "king-air-300.html",
        "title": "King Air 300, B300/350 LED Cabin Lighting — Photo Gallery",
        "h1_line1": "King Air 300, B300/350",
        "h1_line2": "LED Cabin Lighting",
        "pill": "Cabin LED Systems",
        "back_href": "king-air-300.html",
        "back_label": "← King Air 300, B300/350 LED Cabin Lighting",
        "og_image": "images/products/pwi-0089-king-air-300-b300-350-led-cabin-overhead.jpg",
        "canonical": "https://pwi-e.com/king-air-300-photos.html",
        "images": [
            {"src": "images/products/pwi-0089-king-air-300-b300-350-led-cabin-overhead.jpg", "alt": "King Air 300, B300/350 LED cabin overhead lights — PWI"},
            {"src": "images/products/pwi-0092-king-air-300-b300-350-led-cabin-overhead.jpg", "alt": "PWI LED overhead panels installed in King Air 350"},
            {"src": "images/products/pwi-0095-king-air-300-b300-350-led-cabin-overhead.jpg", "alt": "King Air 300 series cabin LED lighting by PWI — detail"},
        ],
        "total_slots": 9,
    },
    {
        "page_file": "led-ice-light-photos.html",
        "product_file": "led-ice-light.html",
        "title": "LED Ice Light — Photo Gallery",
        "h1_line1": "LED Ice Light",
        "h1_line2": "Exterior Aviation Light",
        "pill": "Exterior LED Lighting",
        "back_href": "led-ice-light.html",
        "back_label": "← LED Ice Light",
        "og_image": "images/products/pwi-0073-led-ice-light.jpg",
        "canonical": "https://pwi-e.com/led-ice-light-photos.html",
        "images": [
            {"src": "images/products/pwi-0073-led-ice-light.jpg", "alt": "PWI LED ice light — exterior aircraft installation"},
            {"src": "images/products/pwi-0079-led-ice-light.jpg", "alt": "LED ice detection light by PWI — close-up view"},
            {"src": "images/products/ice-light-2022-v02.jpg", "alt": "PWI LED ice light product — 2022 version"},
        ],
        "total_slots": 9,
    },
    {
        "page_file": "led-entry-door-photos.html",
        "product_file": "led-entry-door-underwing-light.html",
        "title": "LED Entry Door / Underwing Light — Photo Gallery",
        "h1_line1": "LED Entry Door",
        "h1_line2": "Underwing Light",
        "pill": "Exterior LED Lighting",
        "back_href": "led-entry-door-underwing-light.html",
        "back_label": "← LED Entry Door / Underwing Light",
        "og_image": "images/products/pwi-0010-led-entry-door-underwing-light.jpg",
        "canonical": "https://pwi-e.com/led-entry-door-photos.html",
        "images": [
            {"src": "images/products/pwi-0010-led-entry-door-underwing-light.jpg", "alt": "PWI LED entry door underwing light — aircraft installation"},
            {"src": "images/products/pwi-0014-led-entry-door-underwing-light.jpg", "alt": "LED underwing entry door light by PWI — detail view"},
            {"src": "images/products/PWI-Entry-Door.Underwing-LED-v06.jpg", "alt": "PWI LED entry door light — product image"},
        ],
        "total_slots": 9,
    },
    {
        "page_file": "led-logo-light-photos.html",
        "product_file": "led-logo-light.html",
        "title": "LED Logo Light — Photo Gallery",
        "h1_line1": "LED Logo Light",
        "h1_line2": "Tail / Fuselage Illumination",
        "pill": "Exterior LED Lighting",
        "back_href": "led-logo-light.html",
        "back_label": "← LED Logo Light",
        "og_image": "images/products/pwi-0019-led-logo-light.jpg",
        "canonical": "https://pwi-e.com/led-logo-light-photos.html",
        "images": [
            {"src": "images/products/pwi-0019-led-logo-light.jpg", "alt": "PWI LED logo light — installed on aircraft tail"},
            {"src": "images/products/pwi-0022-led-logo-light.jpg", "alt": "LED logo / fuselage light by PWI — detail"},
        ],
        "total_slots": 9,
    },
    {
        "page_file": "led-wingtip-photos.html",
        "product_file": "led-wingtip-light-assemblies.html",
        "title": "LED Wingtip Light Assemblies — Photo Gallery",
        "h1_line1": "LED Wingtip",
        "h1_line2": "Light Assemblies",
        "pill": "Exterior LED Lighting",
        "back_href": "led-wingtip-light-assemblies.html",
        "back_label": "← LED Wingtip Light Assemblies",
        "og_image": "images/products/pwi-0031-led-wingtip-light-assemblies.jpg",
        "canonical": "https://pwi-e.com/led-wingtip-photos.html",
        "images": [
            {"src": "images/products/pwi-0031-led-wingtip-light-assemblies.jpg", "alt": "PWI LED wingtip light assembly — installed view"},
            {"src": "images/products/pwi-0033-led-wingtip-light-assemblies.jpg", "alt": "LED wingtip light assembly by PWI — product detail"},
        ],
        "total_slots": 9,
    },
    {
        "page_file": "led-no-smoking-photos.html",
        "product_file": "led-no-smoking-seat-belt-sign.html",
        "title": "LED No Smoking / Seat Belt Sign — Photo Gallery",
        "h1_line1": "LED No Smoking /",
        "h1_line2": "Seat Belt Sign",
        "pill": "Reading Lights & Signs",
        "back_href": "led-no-smoking-seat-belt-sign.html",
        "back_label": "← LED No Smoking / Seat Belt Sign",
        "og_image": "images/products/pwi-0039-led-no-smoking-seat-belt-sign.jpg",
        "canonical": "https://pwi-e.com/led-no-smoking-photos.html",
        "images": [
            {"src": "images/products/pwi-0039-led-no-smoking-seat-belt-sign.jpg", "alt": "PWI LED no smoking / seat belt sign — installed in aircraft"},
            {"src": "images/products/pwi-0045-led-no-smoking-seat-belt-sign.jpg", "alt": "LED fasten seat belt no smoking sign by PWI — detail"},
        ],
        "total_slots": 9,
    },
    {
        "page_file": "led-dimming-control-photos.html",
        "product_file": "led-dimming-control-system.html",
        "title": "LED Dimming Control System — Photo Gallery",
        "h1_line1": "LED Dimming",
        "h1_line2": "Control System",
        "pill": "Reading Lights & Signs",
        "back_href": "led-dimming-control-system.html",
        "back_label": "← LED Dimming Control System",
        "og_image": "images/products/pwi-0083-led-dimming-control-system.jpg",
        "canonical": "https://pwi-e.com/led-dimming-control-photos.html",
        "images": [
            {"src": "images/products/pwi-0083-led-dimming-control-system.jpg", "alt": "PWI LED dimming control system — installed view"},
            {"src": "images/products/pwi-0087-led-dimming-control-system.jpg", "alt": "LED dimming control unit by PWI — detail"},
            {"src": "images/products/PWI-Reading-Light-dimming-Module-v01.jpg", "alt": "PWI reading light dimming module"},
            {"src": "images/products/PWI-Reading-Light-dimming-Module-combo-v02.jpg", "alt": "PWI reading light and dimming module combo"},
        ],
        "total_slots": 9,
    },
    {
        "page_file": "citation-step-light-photos.html",
        "product_file": "citation-led-step-light.html",
        "title": "Citation LED Step Light — Photo Gallery",
        "h1_line1": "Citation",
        "h1_line2": "LED Step Light",
        "pill": "Reading Lights & Signs",
        "back_href": "citation-led-step-light.html",
        "back_label": "← Citation LED Step Light",
        "og_image": "images/products/pwi-0115-citation-step-light.jpg",
        "canonical": "https://pwi-e.com/citation-step-light-photos.html",
        "images": [
            {"src": "images/products/pwi-0115-citation-step-light.jpg", "alt": "PWI Citation LED step light — installed view"},
            {"src": "images/products/pwi-0117-citation-step-light.jpg", "alt": "Citation LED step light by PWI — detail"},
        ],
        "total_slots": 9,
    },
]


def build_gallery_items(images, total_slots, title_line1, title_line2):
    items_html = []
    for i in range(total_slots):
        num = "#" + str(i + 1).zfill(4)
        if i < len(images):
            img = images[i]
            img_html = (
                '<div class="overflow-hidden bg-slate-100">\n'
                '                <img src="' + img['src'] + '" alt="' + img['alt'] + '" '
                'class="w-full h-full object-cover" loading="lazy" style="min-height:320px;">\n'
                '              </div>'
            )
        else:
            img_html = (
                '<div class="flex items-center justify-center bg-slate-100" style="min-height:320px;">\n'
                '                <span class="text-slate-400 text-xs font-sans uppercase tracking-[0.14em]">Photo Coming Soon</span>\n'
                '              </div>'
            )

        row = (
            '          <div class="bg-surface rounded-xl overflow-hidden border border-line">\n'
            '            <div class="grid grid-cols-1 lg:grid-cols-[3fr_2fr]">\n'
            '              ' + img_html + '\n'
            '              <div class="p-8 sm:p-10 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-line">\n'
            '                <div>\n'
            '                  <p class="font-sans text-[11px] uppercase tracking-[0.16em] text-[#1E4ED8] mb-3">PWI, Inc.</p>\n'
            '                  <h2 class="font-sans text-xl sm:text-2xl font-light uppercase tracking-tight text-ink leading-snug">'
            + title_line1 + '<br>' + title_line2 + '</h2>\n'
            '                </div>\n'
            '                <div class="mt-8">\n'
            '                  <span class="inline-block bg-[#0d1e40] text-white font-sans text-base font-semibold px-5 py-3 rounded-lg tracking-wide">'
            + num + ' Image</span>\n'
            '                </div>\n'
            '              </div>\n'
            '            </div>\n'
            '          </div>'
        )
        items_html.append(row)
    return "\n".join(items_html)


def build_gallery_page(p, head_nav_raw, footer_raw):
    head_nav = head_nav_raw

    # Replace head metadata
    head_nav = head_nav.replace(
        '<title>Falcon 900B LED Cabin Lighting — PWI, Inc.</title>',
        '<title>' + p["title"] + ' — PWI, Inc.</title>'
    )
    head_nav = re.sub(
        r'<meta name="description" content="[^"]*"/>',
        '<meta name="description" content="Product photos for PWI ' + p["h1_line1"] + ' ' + p["h1_line2"] + '. FAA PMA-approved aviation LED lighting by PWI, Inc."/>',
        head_nav
    )
    head_nav = head_nav.replace(
        'href="https://pwi-e.com/falcon-900b-led-cabin-system.html"',
        'href="' + p["canonical"] + '"'
    )
    # og tags
    head_nav = re.sub(
        r'property="og:title" content="[^"]*"',
        'property="og:title" content="' + p["title"] + ' — PWI, Inc."',
        head_nav
    )
    head_nav = re.sub(
        r'property="og:description" content="[^"]*"',
        'property="og:description" content="Product photos for PWI ' + p["h1_line1"] + ' ' + p["h1_line2"] + '."',
        head_nav
    )
    head_nav = re.sub(
        r'property="og:url" content="[^"]*"',
        'property="og:url" content="' + p["canonical"] + '"',
        head_nav
    )
    head_nav = re.sub(
        r'property="og:image" content="[^"]*"',
        'property="og:image" content="https://pwi-e.com/' + p["og_image"] + '"',
        head_nav
    )
    # twitter tags
    head_nav = re.sub(
        r'name="twitter:title" content="[^"]*"',
        'name="twitter:title" content="' + p["title"] + ' — PWI, Inc."',
        head_nav
    )
    head_nav = re.sub(
        r'name="twitter:description" content="[^"]*"',
        'name="twitter:description" content="Product photos for PWI ' + p["h1_line1"] + ' ' + p["h1_line2"] + '."',
        head_nav
    )
    head_nav = re.sub(
        r'name="twitter:image" content="[^"]*"',
        'name="twitter:image" content="https://pwi-e.com/' + p["og_image"] + '"',
        head_nav
    )
    # Remove JSON-LD product schema (not needed for gallery pages)
    head_nav = re.sub(r'<script type="application/ld\+json">.*?</script>\n', '', head_nav, flags=re.DOTALL)

    gallery_items = build_gallery_items(p["images"], p["total_slots"], p["h1_line1"], p["h1_line2"])

    main_content = (
        '\n        <main id="main-content">\n'
        '          <!-- ================= PHOTO GALLERY HEADER ================= -->\n'
        '          <section class="hero-dark" style="padding-top:4rem; padding-bottom:2.5rem;">\n'
        '            <div class="max-w-5xl mx-auto px-6 pt-10">\n'
        '              <a href="' + p["back_href"] + '" class="inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.15em] text-slate-300/70 hover:text-white transition mb-6">' + p["back_label"] + '</a>\n'
        '              <p class="font-sans text-[11px] uppercase tracking-[0.16em] text-[#7C9DF7] mb-2">' + p["pill"] + '</p>\n'
        '              <h1 class="font-sans text-3xl sm:text-4xl font-light uppercase tracking-tight text-white leading-snug">' + p["h1_line1"] + '<br><span class="text-slate-300">' + p["h1_line2"] + '</span></h1>\n'
        '              <p class="mt-3 font-sans text-sm text-slate-300/70">Photo gallery &middot; ' + str(p["total_slots"]) + ' images</p>\n'
        '            </div>\n'
        '          </section>\n'
        '\n'
        '          <!-- ================= GALLERY ================= -->\n'
        '          <section class="bg-canvas py-10 sm:py-14" aria-label="Product photo gallery">\n'
        '            <div class="max-w-5xl mx-auto px-6 space-y-4">\n'
        + gallery_items + '\n'
        '            </div>\n'
        '            <div class="max-w-5xl mx-auto px-6 mt-10 pt-8 border-t border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">\n'
        '              <a href="' + p["back_href"] + '" class="inline-flex items-center gap-2 font-sans text-[11px] uppercase tracking-[0.15em] text-[#1E4ED8] hover:text-[#1b46c4] transition">' + p["back_label"] + '</a>\n'
        '              <a href="request-quote.html" class="inline-flex items-center justify-center rounded-full border border-[#1E4ED8] bg-[#1E4ED8] px-5 py-2.5 font-sans text-[11px] uppercase tracking-widest text-white transition-colors duration-200 hover:bg-[#1B46C4] hover:border-[#1B46C4]">Request a Quote</a>\n'
        '            </div>\n'
        '          </section>\n'
        '        </main>\n'
    )

    return head_nav + main_content + footer_raw


# Generate all pages
for p in products:
    html = build_gallery_page(p, head_nav_raw, footer_raw)
    out_path = BASE + p["page_file"]
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("Created: " + p["page_file"])

print("\nDone - " + str(len(products)) + " gallery pages created")
