/**
 * Apply sitewide CTA label + subtext standards (root HTML only).
 * Run: node _build/apply-cta-standards.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const root = join(import.meta.dirname, '..');
const SKIP = new Set(['deploy', 'node_modules', '.git', '_build', 'archive', 'pgisr-site', 'qr-code-download', '_privacy-review']);

const SUB_REPLACEMENTS = [
  ["Tell us about your aircraft and we'll confirm compatibility and provide a quote.", 'Include aircraft model and serial number for faster pricing.'],
  ["Tell us your aircraft model and serial number and we'll confirm compatibility and pricing.", 'Include aircraft model and serial number for faster pricing.'],
  ['Send us the cabin lighting layout and aircraft serial number, and we will provide a price quote.', 'Include aircraft model, serial number, and cabin layout if available.'],
  ["Tell us about your aircraft and we'll get back to you with options, pricing, and availability.", 'Include aircraft model and serial number for compatibility and options.'],
  ['Your aircraft serial number is the key to receive LED product options, pricing, and availability.', 'Include aircraft model and serial number for compatibility and options.'],
  ['Your aircraft model and serial number gets you product compatibility and pricing.', 'Include aircraft model and serial number for compatibility and options.'],
  ["We're happy to help — let us know your aircraft type and we'll confirm compatibility.", 'Include aircraft model and serial number for compatibility and options.'],
  ["Provide your aircraft model and serial number and we'll confirm availability and pricing.", 'Include aircraft model and serial number for faster pricing.'],
  ["Tell us about your aircraft and requirements and we'll provide options and pricing.", 'Include aircraft model and serial number for compatibility and options.'],
  ["Tell us your aircraft type and requirements and we'll provide options and pricing.", 'Include aircraft model and serial number for compatibility and options.'],
  ["Include aircraft model and serial number — we'll confirm compatibility and pricing.", 'Include aircraft model and serial number for compatibility and options.'],
  ['Include aircraft model and serial number for pricing or approval status.', 'Include aircraft model and serial number for approval or compatibility details.'],
  ['Browse our full LED lighting line or request a quote for your aircraft.', 'Browse the LED catalog or include aircraft model and serial number to get started.'],
  ['Contact PWI if you need product literature, aircraft applicability, or technical details.', 'Include aircraft model, part number, or product name.'],
  ['Contact PWI for help finding the right authorized dealer or distributor.', "We'll help you find the right dealer or distributor for your region."],
  ["Tell us about your aircraft and we'll get back to you with pricing and availability.", "Share your aircraft model and serial number — we'll respond with pricing and availability."],
];

const TEXT_REPLACEMENTS = [
  ['Have questions about pricing or compatibility?', 'Replace your right-angle reading lights'],
  ['Email PWI', 'Email Sales'],
  ['Email Our Engineers', 'Contact Engineering'],
  ['Connect with an Engineer', 'Contact Engineering'],
  ['Email Project Information', 'Discuss Your Project'],
  ['>Contact PWI</a>', '>Contact Us</a>'],
];

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

let changed = 0;
for (const file of walk(root)) {
  let html = readFileSync(file, 'utf8');
  const before = html;
  for (const [from, to] of SUB_REPLACEMENTS) html = html.split(from).join(to);
  for (const [from, to] of TEXT_REPLACEMENTS) html = html.split(from).join(to);
  if (file.endsWith('/contact.html')) {
    html = html.replace(
      '<p class="text-xs uppercase tracking-[0.18em] mb-3">Get Started</p>\n            <h2 class="font-sans text-2xl sm:text-3xl font-semibold mb-3 text-balance">Need pricing for your aircraft?</h2>',
      '<p class="text-xs uppercase tracking-[0.18em] mb-3">Contact</p>\n            <h2 class="font-sans text-2xl sm:text-3xl font-semibold mb-3 text-balance">Need pricing for your aircraft?</h2>',
    );
  }
  if (html !== before) {
    writeFileSync(file, html);
    changed++;
    console.log('updated', file.replace(root + '/', ''));
  }
}
console.log(`Done. ${changed} files updated.`);
