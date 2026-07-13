# PGISR Homepage Template Guide

Use this site as a presentation framework until verified product content and assets are available.

## Where to replace content

- Edit homepage marketing copy in `js/template-content.js` first.
- Edit interactive sensor-node details in the `nodes` object near the bottom of `index.html`.
- Edit detection-feed event types in the feed configuration near the bottom of `index.html`.
- Replace contact and company information in the footer and contact page.
- Treat every performance figure, certification, deployment result, and integration claim as unverified until approved.

## Recommended copy limits

| Content | Recommended maximum |
| --- | ---: |
| Hero description | 260 characters |
| CTA label | 28 characters |
| Section title | 64 characters |
| Sector name | 34 characters |
| Sector description | 180 characters |
| Final CTA headline | 110 characters |

The browser console reports a warning when configured homepage copy exceeds these limits. Content is never automatically truncated.

## Asset specifications

| Asset | Recommended format and size |
| --- | --- |
| Social sharing image | WebP or PNG, 1200 × 630 |
| Product hero image | WebP or AVIF, at least 1600px wide, transparent background when appropriate |
| Deployment photography | WebP or AVIF, 3:2 landscape, at least 1800px wide |
| Sector illustrations | SVG using the existing `viewBox="0 0 280 100"` |
| Certification marks | SVG with a monochrome fallback |
| Partner/customer logos | SVG, optically normalized to a common visual height |

Keep important subjects away from the outer 15% of photographic assets so phone crops remain usable.

## Before publishing

1. Replace all simulated operational data or clearly label it as illustrative.
2. Confirm certifications, performance numbers, encryption terminology, and compliance claims.
3. Obtain permission for customer names, logos, testimonials, and deployment photography.
4. Test the longest final copy at 320px, 375px, 430px, 768px, 1024px, and 1440px.
5. Test keyboard navigation, reduced motion, Safari on iPhone, and Android Chrome.
6. Compress imagery and run accessibility and performance audits.
7. Replace the social preview image and verify all contact destinations.

## Optional sections

The live detection feed and interactive deployment map are presentation components. They may be removed when authentic photography, field results, or a customer case study provides stronger evidence.
