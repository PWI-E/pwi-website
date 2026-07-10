import glob, re, os

files = sorted(glob.glob("*.html"))
skip_files = {"nav.html", "footer.html"}

needs_fix = []
already_ok = []
no_marker = []
other_issue = []

for f in files:
    if f in skip_files:
        continue
    with open(f, "r", encoding="utf-8", errors="ignore") as fh:
        content = fh.read()

    body_m = re.search(r"<body[^>]*>", content)
    nav_start = content.find("<!-- NAV:START -->")
    nav_end = content.find("<!-- NAV:END -->")
    main_m = re.search(r"<main\b", content)
    footer_start = content.find("<!-- FOOTER:START -->")
    body_end = content.rfind("</body")

    if not body_m or nav_start == -1 or nav_end == -1:
        no_marker.append(f)
        continue

    body_pos = body_m.end()

    if main_m is None:
        # has nav marker but no main - treat as fragment, but still check footer order maybe
        no_marker.append(f)
        continue

    main_pos = main_m.start()

    # Correct order: body_pos <= nav_start < nav_end <= main_pos
    if nav_start > main_pos:
        needs_fix.append(f)
    elif nav_start < body_pos:
        other_issue.append((f, "nav before body?"))
    else:
        already_ok.append(f)

print("=== NEEDS FIX (nav after main) ===")
for f in needs_fix:
    print(f)
print(f"\nTotal needs fix: {len(needs_fix)}")

print("\n=== NO MARKER / SKIP (fragment, no nav or no main) ===")
for f in no_marker:
    print(f)
print(f"\nTotal skipped: {len(no_marker)}")

print("\n=== ALREADY OK ===")
print(f"Total ok: {len(already_ok)}")

print("\n=== OTHER ISSUES ===")
for f, reason in other_issue:
    print(f, reason)
