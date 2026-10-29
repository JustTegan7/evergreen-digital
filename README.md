# Evergreen Digital

**Live site:** [evergreendigitalco.com](https://www.evergreendigitalco.com)  
**Developer:** [Tegan Rogers](https://www.teganrogers.org/)  
**Stack:** HTML5 · CSS3 · Vanilla JavaScript (ES Modules)  
**Build tooling:** None — zero dependencies, no bundler required

---

## Overview

Evergreen Digital is a local web agency offering monthly website care plans for small businesses. This repository contains the complete marketing site, built from scratch with a focus on performance, SEO, and conversion optimisation.

The site demonstrates a production-quality frontend architecture without framework overhead — a deliberate choice to maximise portability and performance for the target client segment (local small businesses on shared hosting).

---

## Project Structure

```
evergreen-digital/
│
├── index.html                        ← Main landing page
├── thank-you.html                    ← Form submission confirmation
├── privacy-policy.html               ← Legal / privacy page
│
├── assets/
│   ├── brand/
│   │   ├── logo.svg                  ← Full wordmark logo (light backgrounds)
│   │   └── logo-light.svg            ← Full wordmark logo (dark backgrounds)
│   ├── icons/
│   │   └── favicon.svg               ← Site favicon (SVG, scalable)
│   └── images/
│       └── before-after/             ← Client site transformation screenshots
│           ├── barclay-before-booking.png
│           ├── barclay-before-contact.png
│           ├── barclay-after-about.png
│           ├── barclay-after-contact.png
│           └── barclay-after-dashboard.png
│
├── css/
│   ├── styles.css                    ← Master entry point (@import all partials)
│   ├── base.css                      ← Design tokens, CSS reset, typography
│   ├── animations.css                ← Keyframes, scroll reveal, reduced motion
│   ├── components.css                ← Reusable UI (nav, buttons, cards, modal)
│   └── layout.css                    ← Section layout, grids, responsive rules
│
├── js/
│   ├── main.js                       ← Entry point — imports and initialises modules
│   ├── nav.js                        ← Navigation scroll shadow
│   ├── animations.js                 ← Scroll reveal + animated counters
│   └── modal.js                      ← 2-step booking modal (lead form + Calendly)
│
├── docs/
│   └── CASE_STUDY.md                 ← Portfolio writeup (problem, approach, results)
│
└── README.md
```

---

## Local Development

No installation required. Open with VS Code Live Server:

1. Install the **Live Server** extension (Ritwick Dey)
2. Open the project folder in VS Code
3. Right-click `index.html` → **Open with Live Server**
4. Site runs at `http://127.0.0.1:5500`

Live Server auto-reloads on file save.

---

## Architecture Decisions

### Why no framework?

React/Vue would add ~150kb of runtime JavaScript to a site that has no dynamic state requirements beyond a modal and scroll animations. The vanilla approach:

- First Contentful Paint under 1 second on shared hosting
- Zero npm dependencies — no supply chain risk
- Every developer can read and maintain it without knowing a specific framework
- Trivially portable to any hosting provider

### CSS Architecture

Styles are split into four partials imported via `styles.css`:

| File | Responsibility |
|---|---|
| `base.css` | CSS custom properties (design tokens), reset, base typography |
| `animations.css` | All keyframes and scroll reveal utilities |
| `components.css` | Self-contained UI components — nav, buttons, cards, modal, form |
| `layout.css` | Section-level layout, grid systems, responsive breakpoints |

This separation makes it easy to locate and modify any aspect of the design without scrolling through a monolithic stylesheet.

### JavaScript Architecture

Four ES modules, each with a single responsibility:

| File | Responsibility |
|---|---|
| `nav.js` | Scroll-triggered nav shadow via passive event listener |
| `animations.js` | IntersectionObserver scroll reveal + cubic ease-out counters |
| `modal.js` | 2-step funnel: form validation → sessionStorage → Calendly embed |
| `main.js` | Imports all modules and calls their `init` functions |

Using `type="module"` on the script tag gives native `import/export`, deferred execution, and strict mode — without a bundler.

### Performance Optimisations

- **Lazy Calendly loading** — The ~180kb Calendly widget script is injected into `<head>` only when the user advances to step 2 of the modal. Saves the script load for ~70% of visitors who never open the modal.
- **SVG assets** — Logo and favicon are SVG, scaling perfectly at any resolution with near-zero file size.
- **`loading="lazy"`** on all images — Browser defers off-screen image loads.
- **CSS custom properties** — Design tokens defined once, used everywhere. Changing the brand green is a single-line edit.
- **IntersectionObserver** — Scroll detection runs off the main thread, unlike scroll event listeners.
- **Passive event listeners** — `{ passive: true }` on scroll handlers so the browser can optimise scrolling independently.

---

## Lead Generation Features (Oct 2026)

### Free Website Check (`#audit`)
Homepage lead magnet. A visitor enters their URL, sees a score plus their top one or two issues, then enters an email to unlock the full 19-check report. The lead (with their full report) is emailed to `LEAD_NOTIFY_EMAIL`.

| File | Role |
|---|---|
| `api/audit.js` | `POST /api/audit` runs the check, returns teaser + encrypted report token |
| `api/unlock.js` | `POST /api/unlock` validates email, emails the lead, returns full report |
| `api/_lib/audit-core.js` | All checks and scoring (edit copy and weights here) |
| `api/_lib/safe-fetch.js` | Outbound fetching with private-network blocking, timeouts, size caps |
| `js/audit.js` / `css/audit.css` | The widget. Renders into any `[data-audit-widget]` element |

Setup: add the environment variables from `.env.example` in Vercel. `AUDIT_SECRET` and `RESEND_API_KEY` are required; `PAGESPEED_API_KEY` is strongly recommended; `GOOGLE_PLACES_API_KEY` turns on the Google Business Profile check.

Deep link for outreach: `https://www.evergreendigitalco.com/#audit?site=theirsite.com` pre-fills the box.

### "Choose Your Business" Showcase (`#showcase`)
Business-type chips, a demo preview, and a Basic / Growth / Elite toggle with prices and pages. All data lives in `js/showcase.js` (`BUSINESSES` and `TIERS`). Add a `demoUrl` (and optional screenshot) when each demo goes live. Deep link: `/#showcase?biz=auto-detailing`.

### Niche + City Landing Pages (`/websites/`)
Generated by `scripts/build-landing-pages.mjs` from the `PAGES` list. To add or edit a page, change the data and run `npm run pages`. This rewrites `/websites/**` and the landing-page block in `sitemap.xml`. Commit the output; the live site still has no build step.

### Footer Credit (`/credit/`)
"Site by Evergreen Digital" with the minimal tree mark, for every client site we build and host. See `credit/README.md`.

### Local testing with the API
Live Server can't run `/api`. Use `npm run dev` (Node 20+) and open http://localhost:3000. Put env vars in `.env.local`.

---

## Third-Party Integrations

| Service | Purpose | Configuration |
|---|---|---|
| [Formspree](https://formspree.io) | Contact form submissions | Form `action` attribute in `index.html` |
| [Google Analytics 4](https://analytics.google.com) | Traffic + conversion tracking | Tracking ID: `G-X0JSYKGG8L` |
| [Calendly](https://calendly.com) | Discovery call scheduling | Inline embed in modal step 2 |
| [Resend](https://resend.com) | Emails website-check leads | `RESEND_API_KEY` env var |
| [PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started) | Mobile speed score in the website check | `PAGESPEED_API_KEY` env var |
| [Places API (New)](https://developers.google.com/maps/documentation/places/web-service/text-search) | Google Business Profile check (optional) | `GOOGLE_PLACES_API_KEY` env var |

---

## SEO Implementation

- Semantic HTML5 structure (`<nav>`, `<section>`, `<footer>`, `aria-label`)
- One `<h1>` per page with proper heading hierarchy (`h2`, `h3`)
- JSON-LD schema markup for `LocalBusiness`
- Open Graph and Twitter Card meta tags
- Geo tags for local search targeting (Washington state)
- `alt` text on all images
- Canonical URL
- `noindex` on utility pages (`thank-you`, `privacy-policy`)

---

## Pre-Launch Checklist

- [ ] Replace `YOUR_GOOGLE_PLACE_ID` in `index.html` (Reviews section)
- [ ] Add `assets/og-image.png` (1200×630px social preview image)
- [ ] Verify Formspree form submissions reaching `hello@evergreendigitalco.com`
- [ ] Claim and verify Google Business Profile
- [ ] Submit sitemap to Google Search Console
- [ ] Add website-check env vars in Vercel (see `.env.example`)
- [ ] Verify evergreendigitalco.com in Resend so the check can email prospects

---

## Case Study

See [`docs/CASE_STUDY.md`](docs/CASE_STUDY.md) for a full writeup of the Barclay's Salon project — including the problem, design decisions, technical architecture, and measurable results.

---

*Built by [Tegan Rogers](https://www.teganrogers.org/) · Washington, USA*
