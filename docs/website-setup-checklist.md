# PWI Website — Setup Checklist

**Quick summary:** The website pages are ready. What's left is mostly connecting a few services on the live site. Nothing is broken — a few pieces just aren't hooked up yet.

---

## What's already done

- Website pages, product info, contact/quote/newsletter form **pages**
- Cookie banner and privacy pages
- Google Analytics on the site (`G-PFX0VN5076`)
- Sitemap and SEO basics for Google

---

## What still needs to be set up

### 1. Put the latest site live (GoDaddy)

Someone needs to upload the newest website files to GoDaddy.

- Build: `npm run build:deploy`
- Upload everything inside the `deploy/` folder to `public_html`

### 2. Google Search Console

- Add/confirm `pwi-e.com`
- Verify ownership (if not done already)
- Submit sitemap: `https://pwi-e.com/sitemap.xml`
- Optionally link Analytics property `G-PFX0VN5076`

### 3. Website forms — not working yet

The form **pages** exist, but submissions don't go anywhere yet.

**Plan:** use **Google Sheets** as the backend (not GoDaddy server setup).

When someone submits:

- Contact form → row in a Google Sheet
- Quote form → row in a Google Sheet
- Newsletter signup → row in a Google Sheet

We can also set it to **email** `sales@pwi-e.com` on each submission.

**What's needed:**

1. Create a Google Sheet (PWI-owned)
2. Set up a small Google Apps Script that receives form data and writes to the Sheet
3. Paste that script's Web App URL into the website
4. Redeploy the site
5. Test all three forms on the live site

**Until that's done, forms will not work on the live site.** Visitors should use `sales@pwi-e.com` for now.

### 4. Email addresses

Please confirm these are active and someone checks them:

- `sales@pwi-e.com`
- `privacy@pwi-e.com`

### 5. Google Analytics access

Confirm whoever needs reporting has access to GA property `G-PFX0VN5076`.
