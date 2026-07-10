#!/usr/bin/env bash
# Build a curated production upload folder for GoDaddy (public_html).
# Excludes dev files, node_modules, archives, and the unused 2022 photo library.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${ROOT}/deploy"
EXCLUDES="${ROOT}/_build/deploy-excludes.txt"
PHOTOS_SRC="${ROOT}/images/2022 PWI Material 2022 Photos"
PHOTOS_DEST="${DEST}/images/2022 PWI Material 2022 Photos"

# Assets referenced on live pages (see about-us.html, tailwind_theme/qr-data.js)
PHOTOS_KEEP=(
  "PWI File 48 Media package.jpg"
  "PWI File 09 Media package.webp"
)

echo "PWI deploy build"
echo "  Source: ${ROOT}"
echo "  Output: ${DEST}"
echo ""

node "${ROOT}/_build/update-sitemap-lastmod.mjs"

mkdir -p "${DEST}"

rsync -a --delete \
  --exclude-from="${EXCLUDES}" \
  "${ROOT}/" "${DEST}/"

mkdir -p "${PHOTOS_DEST}"
for file in "${PHOTOS_KEEP[@]}"; do
  src="${PHOTOS_SRC}/${file}"
  if [[ ! -f "${src}" ]]; then
    echo "ERROR: missing referenced photo: ${src}" >&2
    exit 1
  fi
  cp "${src}" "${PHOTOS_DEST}/"
done

# Summary
file_count="$(find "${DEST}" -type f | wc -l | tr -d ' ')"
size_bytes="$(du -sk "${DEST}" | awk '{print $1}')"
size_mb=$((size_bytes / 1024))

echo "Done."
echo "  Files: ${file_count}"
echo "  Size:  ~${size_mb} MB"
echo ""
echo "Upload everything inside deploy/ to GoDaddy public_html."
echo "Do not upload the deploy folder itself as a subdirectory."
