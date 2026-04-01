# Evergreen Digital

**Live site:** [evergreendigitalco.com](https://www.evergreendigitalco.com)  
**Developer:** [Tegan Rogers](https://www.teganrogers.net/)  
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

## Third-Party Integrations

| Service | Purpose | Configuration |
|---|---|---|
| [Formspree](https://formspree.io) | Contact form submissions | Form `action` attribute in `index.html` |
| [Google Analytics 4](https://analytics.google.com) | Traffic + conversion tracking | Tracking ID: `G-X0JSYKGG8L` |
| [Calendly](https://calendly.com) | Discovery call scheduling | Inline embed in modal step 2 |

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

---

## Case Study

See [`docs/CASE_STUDY.md`](docs/CASE_STUDY.md) for a full writeup of the Barclay's Salon project — including the problem, design decisions, technical architecture, and measurable results.

---

*Built by [Tegan Rogers](https://www.teganrogers.net/) · Washington, USA*
