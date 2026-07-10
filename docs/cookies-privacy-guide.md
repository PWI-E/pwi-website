# Cookies & Privacy (pwi-e.com)

Plain-English summary. Last updated: July 1, 2026.

## In 30 seconds

- **Cookies** are small browser notes (e.g. “already answered the popup,” language choice).
- **Privacy** covers form data (quotes, contact, newsletter) plus basic server logs when people browse.
- We **do not sell** visitor data.
- **Analytics** runs only if the visitor accepts optional cookies.
- **X on the popup = Reject all cookies** (optional tracking stays off; choice is saved).

## The cookie popup

First visit (or after clearing browser data), a banner appears bottom-left:

| Action | Result |
|--------|--------|
| **Accept all cookies** | Analytics (+ marketing category) enabled; Google Analytics can collect aggregated usage stats. |
| **Reject all cookies** | Only essential cookies; no analytics tracking. Site works normally. |
| **Cookie settings** | Pick categories individually, then **Save my choices**. |
| **X (close)** | Same as reject — optional cookies off, choice remembered. |

**Note:** Reject = no optional tracking; essential storage (remembering their choice) and server logs still apply.

This is **cookie consent only**, not agreement to Terms & Conditions.

## Cookie types

| Type | When it runs |
|------|----------------|
| **Necessary** | Always — remembers cookie choice, core site function. |
| **Analytics** | Only if accepted — pages visited, session length, traffic sources (aggregated). |
| **Marketing** | Listed for future use; **not active today**. |
| **Functional** | Only if visitor uses the **language picker** (Google Translate cookies). |

Until analytics is accepted, Google Consent Mode keeps analytics storage **disabled**.

## Deep dive: what gets stored and tracked

### 1. Cookie choice — visitor’s browser

**Where:** `localStorage` key `pwi_cookie_consent` (browser storage, not a cookie file). Stays until the visitor clears site data or we change the policy version.

**Fields saved:**

| Field | Example | Notes |
|-------|---------|-------|
| `version` | `1.1` | Policy version; banner reappears if this changes |
| `timestamp` | ISO date/time | When they clicked Accept, Reject, X, or Save |
| `necessary` | `true` | Always true — essential cookies stay on |
| `analytics` | `true` / `false` | Google Analytics allowed or blocked |
| `marketing` | `true` / `false` | Ad-related consent flag (no active marketing cookies today) |

**No name, email, or phone** — only yes/no flags.

**Written when:** Accept all, Reject all, X close, Save my choices, or Reject all in settings.

### 2. Google Analytics (only if analytics accepted)

**Service:** Google Analytics property `G-PFX0VN5076`. Data lives in Google’s systems (aggregated reports).

**Before accept:** Analytics/ad storage is **denied** on every page. GA script loads but should not set persistent analytics cookies until consent is granted.

**After accept:** Browser may get Google cookies (`_ga`, `_gid`, etc.). Google may record pages viewed, session length, rough location (city/region), device/browser type, and referral source. This is **statistical** — not linked to form submissions in our site code.

**Marketing flag:** If marketing is also accepted, ad-related consent flags go to Google — but no marketing cookies are in active use today.

### 3. QR product pages (only if analytics accepted)

**When:** Visitor lands on a `qr-*.html` page (from a product QR code) and `analytics` is `true` in `pwi_cookie_consent`.

**What’s sent:** One GA event `qr_scan` with the product name (e.g. `pilatus-pc-12-led-cabin`) from the page’s `data-qr-product` attribute.

**Purpose:** See which QR-linked products get scans — aggregated in GA, not tied to identity unless they also submit a form.

### 4. Internal consent log (optional — OFF today)

**Where:** Would be a **Google Sheet** owned by PWI, via Apps Script web app URL in `tailwind_theme/privacy-config.js` (`logEndpoint`).

**Status:** `logEndpoint` is **empty** — nothing is logged to a sheet right now.

**If enabled**, each consent action would append one row:

| Column | Content |
|--------|---------|
| Timestamp | When they clicked |
| Page | Full URL they were on |
| Analytics | `true` / `false` |
| Marketing | `true` / `false` |

Still **no name or email** — compliance audit trail only.

### 5. Web server logs (every visit)

**Where:** PWI hosting server.

**Typical log entry:** IP address, date/time, page requested, browser/OS (User-Agent), referrer if sent.

**Search:** Queries appear in the URL (`search.html?q=…`) and may appear in server logs. Search runs **in the browser** (Fuse.js + local index) — PWI does not run a separate search database.

### 6. Newsletter shortcut (homepage only)

**Where:** `sessionStorage` — temporary, same browser tab only.

**Keys:** `pwi_newsletter_email`, `pwi_newsletter_from`

**Flow:** Homepage email field → brief storage → redirect to newsletter signup → signup page reads and **removes** keys. Cleared when the tab closes. Not long-term storage like cookie consent.

### 7. Language picker (optional)

**Where:** Google Translate cookies (e.g. `googtrans`) in the visitor’s browser.

**When:** Only if they use the **language** menu. Google may process page text to translate. Using English only avoids this.

### 8. Forms (separate from cookies)

**Where:** PWI server/backend on submit — **not** stored by the cookie banner.

| Form | Server endpoint | Data submitted |
|------|-----------------|----------------|
| General inquiry | `/general-inquiry-request` | Name, email, phone, company, inquiry type, product, message, how they heard about us |
| Quote request | `/aviation-lighting-information-request` | Same plus aircraft/model and part details |
| Newsletter | `/signup-request` | Name, email, phone (optional), product interests |

This is **real personal information** for sales, support, and newsletters. Cookie consent and form submission are separate.

## Who can see what?

| Example… | From… |
|----------------------|--------|
| “120 visits to quote page last week” | Google Analytics (if visitor accepted) |
| “15 QR scans for Pilatus product” | GA `qr_scan` events (if accepted) |
| “Visitor rejected cookies at 2pm on /contact” | Google Sheet (only if logging enabled) |
| “IP requested /search.html?q=king+air” | Server logs |
| “Name, email, and quote details from a form” | Form submission / email / CRM |

## Also know: visitor rights & contacts

Covered in the [Privacy Statement](https://pwi-e.com/privacy-statement.html), not the cookie banner:

- **Privacy requests:** Email `privacy@pwi-e.com` for access, correction, or deletion. Footer link **Privacy Request** goes to the same process.
- **Response times:** Generally within **30 days**; California (CCPA) requests within **45 days**.
- **Not everything can be deleted:** Aviation/order and transaction records must be kept for legal, regulatory, and warranty reasons even if someone requests deletion.
- **Newsletter opt-out:** Unsubscribe link in emails, or contact `sales@pwi-e.com` — separate from cookie settings.
- **Children:** B2B site; we do not knowingly collect data from children under 13.
- **Data breaches:** Privacy Statement describes investigation, notification, and regulatory reporting (including GDPR 72-hour reporting where applicable).

## Also know: legal & browser signals

- **Do Not Track (DNT):** Some browsers send a “don’t track me” signal. The site **does not change** data collection based on DNT — only the cookie banner and browser cookie settings matter.
- **International visitors:** The site is operated from the **United States**. Google Analytics and Google Translate may involve data processed outside the visitor’s country under Google’s policies (EU-U.S. Data Privacy Framework, etc.).

## Also know: other third parties

| Service | When | Notes |
|---------|------|-------|
| **jsDelivr** | Search page loads Fuse.js library | Network request only; does not set PWI cookies |
| **Google Maps** | Footer address link | **Outbound click** to Google — not an embedded map on our site |
| **Email marketing provider** | Newsletter sign-ups | Holds mailing-list data (see Privacy Statement service providers) |
| **Hosting provider** | Every visit and form POST | Server logs and form handling |

**Not on the site:** No Facebook/Meta pixel, Hotjar, Microsoft Clarity, HubSpot tracking, embedded YouTube, embedded maps, or payment processing on the website.

## Also know: technical nuances

- **GA loads on every page** before consent, but analytics **storage stays denied** until accept (Google Consent Mode). The browser still connects to Google’s servers.
- **Consent Mode defaults:** `functionality_storage` and `security_storage` are **granted** by default (Google’s own categories — separate from the analytics toggle).
- **Policy version `1.1`:** If we bump the version in code, the banner **reappears** and old consent is **not applied** to analytics. The old browser record may remain until overwritten.
- **Form honeypot:** Inquiry, quote, and newsletter forms include a hidden `website` field — spam bots that fill it are flagged server-side; not visitor tracking.
- **Search page:** Marked `noindex` (not meant for Google indexing). Search terms still appear in the URL and may appear in server logs.

## Also know: operations

1. **Consent audit log is OFF** — `logEndpoint` in `tailwind_theme/privacy-config.js` is empty. Enable via `consent-logger.gs` + Google Sheet if you want a compliance trail.
2. **Marketing toggle** is in settings but **no marketing cookies run today** — “Accept all” enables analytics and sets marketing consent flags in Google (no marketing cookies active yet).
3. **Form backends** (`/general-inquiry-request`, etc.) run on the **live server** — who sees submissions, CRM, and retention depend on that setup (not in this website repo).
4. **Forms only submit on the live site** — local `file://` preview shows a warning and blocks submit.

## Privacy summary

We do **not** sell or rent personal information for third-party marketing. No payment cards on the website.

## Changing a choice later

Footer link **Cookie Settings** reopens preferences anytime.

Full policies: [Cookie Policy](https://pwi-e.com/cookie-policy.html) · [Privacy Statement](https://pwi-e.com/privacy-statement.html)

## One-liner summary

Essential cookies always; analytics only with consent; no data sales; form data used for business follow-up only.
