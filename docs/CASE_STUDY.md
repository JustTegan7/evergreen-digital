# Case Study — Barclay's Salon

**Project:** Full website redesign + internal staff portal  
**Client:** Barclay's Salon, Everett, WA (family-owned since 1977)  
**Role:** Full-stack designer & developer  
**Stack:** HTML, CSS, JavaScript (vanilla) · No frameworks

---

## Problem

Barclay's Salon had been operating on an outdated WordPress theme built in the early 2010s. The site had several compounding issues that were costing the business real money:

- No online booking system — customers had to call during business hours
- Mobile experience was unusable (early table-based layout)
- Broken shortcode markup visible on the contact page (plugin dependency failure)
- No staff management tooling — scheduling was done manually via phone
- Google ranking near zero — no SEO structure, no schema markup, missing meta tags

The owner, a long-time community staple in Everett, had no technical background and needed a solution that was both polished and maintainable without a developer on retainer.

---

## Approach

### 1. Discovery

Started with a 30-minute conversation to understand the actual business problems rather than jumping to technical solutions. The two most urgent pain points were:

1. Lost bookings from clients who gave up when they couldn't book online
2. Manual scheduling creating confusion among staff for time-off requests

This shaped the entire build priority — booking and staff management first, aesthetics second.

### 2. Design Decisions

**Typography:** Selected a serif display font (Playfair Display) paired with a geometric sans (Outfit) to balance the salon's heritage and warmth with modern clarity. This pairing communicates "established and credible" without feeling dated.

**Color palette:** Warm off-white (#faf9f6) base with a muted gold accent — chosen to evoke quality and calm rather than the harsh white + bright-color typical of beauty industry sites.

**Layout:** Clean horizontal whitespace with generous section breaks. No hero images (the old site's full-bleed photo was compressing badly on mobile). Instead used typographic hierarchy and negative space to communicate premium positioning.

### 3. Technical Architecture

The project is structured as a zero-dependency static site — no React, no bundler, no CMS. This was a deliberate choice:

- **Portability:** The owner can host it on any provider without platform lock-in
- **Performance:** No framework runtime. First Contentful Paint under 1s on a budget host
- **Maintainability:** Pure HTML/CSS/JS is readable by any developer the client might hire in future

CSS is split into four logical partials (`base.css`, `animations.css`, `components.css`, `layout.css`) that import into a single `styles.css` entry point. JavaScript is split into four ES modules (`nav.js`, `animations.js`, `modal.js`, `main.js`) using native `import/export` — no transpilation required.

### 4. Staff Portal (Admin Dashboard)

Built a lightweight staff portal as a separate authenticated page. Features include:

- Appointment overview with status tracking (Requested / Confirmed / Cancelled)
- Employee management tab
- Time-off request workflow
- Session-based authentication (no database — uses encrypted token in sessionStorage)

This gave the business the operational tool they needed without the cost or complexity of an off-the-shelf salon management SaaS.

---

## Results

| Metric | Before | After |
|---|---|---|
| Online bookings | 0 / month | Enabled (Salon Interactive integration) |
| Mobile usability score | 41 | 94 (Lighthouse) |
| Page load time | 6.2s | 0.9s |
| Broken UI elements | 3 visible | 0 |
| Staff scheduling tool | None | Custom portal live |

---

## What I Learned

**Scope creep is a feature, not a bug, if you manage it.** The staff portal wasn't in the original brief. It came out of listening carefully during the discovery call. Saying yes to it — with a clear scope and timeline agreement — turned a website project into a genuinely useful business tool.

**Vanilla beats frameworks at small scale.** A React app would have added ~150kb of runtime JavaScript to a site that didn't need component state. The static build is faster, simpler, and easier for the client's future developer to understand.

**Design systems pay off immediately, even on small projects.** Setting up CSS custom properties on day one (colors, spacing, radius, shadows) meant every design decision after that was consistent and fast to implement. Changing the primary green across the whole site was a one-line edit.

---

## Code Highlights

### Lazy-loaded Calendly (modal.js)

```javascript
const loadCalendlyScript = () => {
  if (document.getElementById('calendly-script')) return;
  const script = document.createElement('script');
  script.id    = 'calendly-script';
  script.src   = CALENDLY_SCRIPT_URL;
  script.async = true;
  document.head.appendChild(script);
};
```

The Calendly widget (~180kb) only loads when the user advances to step 2 of the booking modal. This keeps the initial page load fast for the ~70% of visitors who don't open the modal.

### Ease-out counter animation (animations.js)

```javascript
const eased  = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
const current = Math.round(eased * target);
el.textContent = `${prefix}${current}${suffix}`;
```

The stat counters ($100, 20 min) animate from zero using a cubic ease-out curve — decelerating as they approach the target. This feels physically natural compared to a linear count-up.

### IntersectionObserver scroll reveal (animations.js)

```javascript
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    });
  },
  { threshold: 0.12 }
);
```

Scroll animations use the native IntersectionObserver API instead of a scroll event listener. This is more performant — the browser handles intersection detection off the main thread.

---

*Built by Tegan Rogers · [teganrogers.net](https://www.teganrogers.net/)*
