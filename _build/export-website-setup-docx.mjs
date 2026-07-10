/**
 * Export website setup checklist to a properly formatted Word (.docx).
 * Run: node _build/export-website-setup-docx.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  convertInchesToTwip,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const docxPath = path.join(root, 'docs/website-setup-checklist.docx');

const FONT = 'Calibri';
const BODY_SIZE = 22; // 11pt
const TITLE_SIZE = 32; // 16pt
const H1_SIZE = 28; // 14pt
const H2_SIZE = 24; // 12pt

function body(text, opts = {}) {
  return new TextRun({ font: FONT, size: BODY_SIZE, text, ...opts });
}

function bold(text) {
  return body(text, { bold: true });
}

function code(text) {
  return new TextRun({ font: 'Consolas', size: 20, text });
}

function para(children, spacing = { after: 160 }) {
  return new Paragraph({ children, spacing });
}

function bullet(children) {
  return new Paragraph({
    children,
    bullet: { level: 0 },
    spacing: { after: 80 },
  });
}

function numbered(children, level = 0) {
  return new Paragraph({
    children,
    numbering: { reference: 'checklist-numbers', level },
    spacing: { after: 80 },
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ font: FONT, size: H1_SIZE, bold: true, text })],
    spacing: { before: 320, after: 160 },
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ font: FONT, size: H2_SIZE, bold: true, text })],
    spacing: { before: 240, after: 120 },
  });
}

function callout(children) {
  return new Paragraph({
    children,
    spacing: { before: 120, after: 160 },
    indent: { left: convertInchesToTwip(0.15), right: convertInchesToTwip(0.15) },
    border: {
      left: { style: BorderStyle.SINGLE, size: 18, color: '1E4ED8' },
    },
    shading: { type: ShadingType.CLEAR, fill: 'F3F6FB' },
  });
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: FONT, size: BODY_SIZE },
      },
    },
  },
  numbering: {
    config: [
      {
        reference: 'checklist-numbers',
        levels: [
          {
            level: 0,
            format: 'decimal',
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: { indent: { left: convertInchesToTwip(0.35), hanging: convertInchesToTwip(0.2) } },
            },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
          },
        },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 240 },
          children: [
            new TextRun({ font: FONT, size: TITLE_SIZE, bold: true, text: 'PWI Website — Setup Checklist' }),
          ],
        }),

        callout([
          bold('Quick summary: '),
          body("The website pages are ready. What's left is mostly connecting a few services on the live site. Nothing is broken — a few pieces just aren't hooked up yet."),
        ]),

        h1("What's already done"),
        bullet([body('Website pages, product info, contact/quote/newsletter form '), bold('pages')]),
        bullet([body('Cookie banner and privacy pages')]),
        bullet([body('Google Analytics on the site ('), code('G-PFX0VN5076'), body(')')]),
        bullet([body('Sitemap and SEO basics for Google')]),

        h1('What still needs to be set up'),

        h2('1. Put the latest site live (GoDaddy)'),
        para([body('Someone needs to upload the newest website files to GoDaddy.')]),
        bullet([bold('Build: '), code('npm run build:deploy')]),
        bullet([bold('Upload: '), body('everything inside the '), code('deploy/'), body(' folder to '), code('public_html')]),

        h2('2. Google Search Console'),
        bullet([body('Add/confirm '), code('pwi-e.com')]),
        bullet([body('Verify ownership (if not done already)')]),
        bullet([body('Submit sitemap: '), code('https://pwi-e.com/sitemap.xml')]),
        bullet([body('Optionally link Analytics property '), code('G-PFX0VN5076')]),

        h2('3. Website forms — not working yet'),
        para([
          body('The form '),
          bold('pages'),
          body(" exist, but submissions don't go anywhere yet."),
        ]),
        para([
          bold('Plan: '),
          body('use '),
          bold('Google Sheets'),
          body(' as the backend (not GoDaddy server setup).'),
        ]),
        para([body('When someone submits:')]),
        bullet([body('Contact form → row in a Google Sheet')]),
        bullet([body('Quote form → row in a Google Sheet')]),
        bullet([body('Newsletter signup → row in a Google Sheet')]),
        para([
          body('We can also set it to '),
          bold('email'),
          body(' '),
          code('sales@pwi-e.com'),
          body(' on each submission.'),
        ]),
        para([bold("What's needed:")]),
        numbered([body('Create a Google Sheet (PWI-owned)')]),
        numbered([body('Set up a small Google Apps Script that receives form data and writes to the Sheet')]),
        numbered([body("Paste that script's Web App URL into the website")]),
        numbered([body('Redeploy the site')]),
        numbered([body('Test all three forms on the live site')]),
        callout([
          bold("Until that's done, forms will not work on the live site. "),
          body('Visitors should use '),
          code('sales@pwi-e.com'),
          body(' for now.'),
        ]),

        h2('4. Email addresses'),
        para([body('Please confirm these are active and someone checks them:')]),
        bullet([code('sales@pwi-e.com')]),
        bullet([code('privacy@pwi-e.com')]),

        h2('5. Google Analytics access'),
        para([
          body('Confirm whoever needs reporting has access to GA property '),
          code('G-PFX0VN5076'),
          body('.'),
        ]),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(docxPath, buffer);
console.log(`Wrote ${docxPath}`);
