/* =============================================================================
   showcase.js, "Choose your business" demo showcase
   Evergreen Digital · evergreendigitalco.com
   =============================================================================

   Visitor picks a business type and sees:
     - a preview of a demo site for that type (live link when one exists)
     - the plan we'd recommend, with a Basic / Growth / Elite toggle showing
       price, setup fee, and what that tier gets a business like theirs

   GROUPS: entries with group: "individual" (portfolios, artists, photographers)
   show under "For individuals" and recommend Ultra-Lite. Everything else
   shows under "For businesses".

   ADDING / UPDATING DEMOS (Karl)
   ------------------------------
   Edit the BUSINESSES list below. For each type:
     demoUrl     Live demo link. Leave "" until the demo is deployed and the
                 card shows a styled "demo in progress" preview instead.
     image       Optional screenshot (1280×800 works well), e.g.
                 "/assets/images/demos/coffee.webp". Falls back to the
                 styled preview when empty.
     tierParam   true if the demo supports ?tier=basic|growth|elite so the
                 toggle can switch the live demo between tier versions.
     brand       Fictional business name + colors used for the preview card.

   Deep link for outreach: /#showcase?biz=auto-detailing (Canyon can send this
   so a prospect lands on their own business type). GA4 events:
   showcase_select, showcase_tier, showcase_demo_click.

   PRICES: keep TIERS in sync with the Packages section and the pricing
   master sheet (Oct 2026: Ultra-Lite $30 / Basic $50 / Growth $150 / Elite $350, setup $500/$1,000/$1,500/$2,000).
   ============================================================================= */

"use strict";

const TIERS = {
  ultralite: {
    name: "Ultra-Lite",
    price: "$30",
    setup: "$500 setup",
    term: "6-month term",
    pages: 3,
    includes: [
      "1 to 3 pages, built from our proven layouts",
      "Mobile-friendly design + contact form",
      "Hosting, SSL, daily backups, uptime monitoring",
      "Changes billed per request ($60/hr)",
    ],
  },
  basic: {
    name: "Basic",
    price: "$50",
    setup: "$1,000 setup",
    term: "6-month term",
    pages: 5,
    includes: [
      "Custom design, up to 5 pages",
      "Google Business Profile setup",
      "On-page SEO foundations",
      "30 min of edits every month",
    ],
  },
  growth: {
    name: "Growth",
    price: "$150",
    setup: "$1,500 setup",
    term: "Month-to-month",
    pages: 10,
    includes: [
      "Up to 10 pages",
      "Local SEO management",
      "Google profile posts (2/mo) + review requests",
      "1 hr of edits + monthly performance report",
    ],
  },
  elite: {
    name: "Elite",
    price: "$350",
    setup: "$2,000 setup",
    term: "Month-to-month",
    pages: 20,
    includes: [
      "Up to 20 pages",
      "Email marketing (1 campaign/mo)",
      "Reputation + competitor monitoring",
      "2 hrs of edits + quarterly strategy call",
    ],
  },
};

const BUSINESSES = [
  /* ── For individuals (Ultra-Lite) ── */
  {
    key: "portfolio",
    group: "individual",
    label: "Personal Portfolio",
    emoji: "💼",
    recommended: "ultralite",
    why: "A portfolio is the first thing a recruiter, client, or collaborator checks after your name. A fast, clean site at your own domain looks more serious than a social profile, and it stays yours.",
    pages: ["Home", "Work", "Contact", "About", "Resume", "Blog"],
    addon: "Extra edit time when you add new work",
    demoUrl: "", // Optional: Tegan's own portfolio as a real example
    image: "",
    tierParam: false,
    brand: { name: "Jordan Lee", tagline: "Designer & developer", bg: "#f5f5f2", accent: "#2a7a4b", cta: "See My Work", light: true },
  },
  {
    key: "artist",
    group: "individual",
    label: "Artist & Photographer",
    emoji: "📷",
    recommended: "ultralite",
    why: "Your work is the website. A fast gallery that gets out of the way, a short about, and an easy way to inquire or book are all most artists and photographers need to start.",
    pages: ["Gallery", "About", "Contact", "Exhibitions", "Prints", "Blog"],
    addon: "eCommerce Storefront when you're ready to sell prints",
    demoUrl: "", // Dale W Reiger Gallery demo: add URL when ready to show
    image: "",
    tierParam: false,
    brand: { name: "Lumen Studio", tagline: "Photography, Pacific Northwest", bg: "#141414", accent: "#e8e2d4", cta: "View the Gallery" },
  },
  {
    key: "coffee-shop",
    label: "Coffee Shop",
    emoji: "☕",
    recommended: "growth",
    why: "Coffee is a daily habit decided on a phone in the car. You need to show up in \"coffee near me\", have your hours right, and make the menu easy to read one-handed.",
    pages: ["Home", "Menu", "About", "Hours & Location", "Catering", "Contact"],
    addon: "SMS + Email Marketing for punch-card style regulars",
    demoUrl: "",
    image: "",
    tierParam: false,
    brand: { name: "Cedar & Steam Coffee", tagline: "Roasted in Snohomish County", bg: "#3b2a20", accent: "#d9a066", cta: "See the Menu" },
  },
  {
    key: "salon",
    label: "Hair Salon & Barbershop",
    emoji: "💇",
    recommended: "growth",
    why: "People book a stylist with their eyes. Real photos of your work, easy booking, and fresh Google reviews are what fill the chair.",
    pages: ["Home", "Services & Prices", "Stylists", "Gallery", "Reviews", "Book"],
    addon: "SMS reminders to cut no-shows",
    demoUrl: "https://www.barclaysalon.com/",
    image: "/assets/images/before-after/barclay-live-hero.webp",
    tierParam: false,
    clientName: "Barclay's Salon",
    brand: { name: "Barclay's Salon", tagline: "Est. 1977, Everett", bg: "#2b231e", accent: "#c0714f", cta: "Book Now" },
  },
  {
    key: "trades",
    label: "Trades & Home Services",
    emoji: "🔧",
    recommended: "growth",
    why: "When a pipe bursts, people call the first business that looks trustworthy on their phone. Tap-to-call, service areas, and reviews win that call.",
    pages: ["Home", "Services", "Service Areas", "Reviews", "Financing", "Get a Quote"],
    addon: "Lead CRM + Routing so no call goes cold",
    demoUrl: "",
    image: "",
    tierParam: false,
    brand: { name: "Summit Plumbing & Heating", tagline: "Same-day service in Everett", bg: "#0f2a44", accent: "#f2a33a", cta: "Call Now" },
  },
  {
    key: "auto-detailing",
    label: "Auto Detailing",
    emoji: "🚗",
    recommended: "growth",
    why: "Detailing sells on before and after photos. A gallery that loads fast, clear packages, and a quote request that takes 30 seconds turn scrollers into bookings.",
    pages: ["Home", "Packages", "Ceramic Coating", "Gallery", "Reviews", "Book a Detail"],
    addon: "Photo + Video of your best work",
    demoUrl: "",
    image: "",
    tierParam: false,
    brand: { name: "Gloss Mobile Detailing", tagline: "We come to your driveway", bg: "#111111", accent: "#38bdf8", cta: "Get a Quote" },
  },
  {
    key: "church",
    label: "Church & Nonprofit",
    emoji: "⛪",
    recommended: "growth",
    why: "Most first-time visitors check your website before they ever walk in. Service times, what to expect, and an easy way to give matter more than anything else.",
    pages: ["Home", "Plan Your Visit", "Ministries", "Events", "Sermons", "Give"],
    addon: "Email newsletter for events and giving",
    demoUrl: "",
    image: "",
    tierParam: false,
    brand: { name: "Riverside Community Church", tagline: "Sundays at 9 & 11", bg: "#24324a", accent: "#9fc5a8", cta: "Plan Your Visit" },
  },
  {
    key: "boutique",
    label: "Boutique & Gift Shop",
    emoji: "🛍️",
    recommended: "elite",
    why: "A boutique competes with Amazon on feel, not price. A site that looks like your shop, and an online store we manage for 2.5%, keeps sales coming when the doors are closed.",
    pages: ["Home", "Shop", "New Arrivals", "About", "Visit Us", "Gift Cards"],
    addon: "eCommerce Storefront ($79/mo + 2.5%)",
    demoUrl: "",
    image: "",
    tierParam: false,
    brand: { name: "Juniper Gift Co.", tagline: "Local makers, curated", bg: "#4a3b47", accent: "#f0b8b8", cta: "Shop New Arrivals" },
  },
  {
    key: "restaurant",
    label: "Restaurant",
    emoji: "🌮",
    recommended: "growth",
    why: "Hungry people decide in under a minute. A menu that works on a phone, current hours, and one tap to call or order are what get them through the door.",
    pages: ["Home", "Menu", "Catering", "About", "Hours & Location", "Order"],
    addon: "SMS + Email Marketing for specials",
    demoUrl: "", // Tata's demo: add URL once the owner is OK with it being shown publicly
    image: "",
    tierParam: false,
    brand: { name: "Casa Verde Cantina", tagline: "Family recipes since 1998", bg: "#2d3b1f", accent: "#e8b04a", cta: "View the Menu" },
  },
  {
    key: "game-store",
    label: "Game & Hobby Store",
    emoji: "🎲",
    recommended: "growth",
    why: "Hobby stores run on community. An events calendar, what's in stock, and a place to sign up for tournaments keep regulars coming back every week.",
    pages: ["Home", "Events", "Shop", "Leagues", "About", "Visit Us"],
    addon: "SMS + Email Marketing for event nights",
    demoUrl: "", // Moon Dragon Games demo: add URL when ready to show
    image: "",
    tierParam: false,
    brand: { name: "Hoard & Dice Games", tagline: "Board games, cards & minis", bg: "#1d1533", accent: "#a78bfa", cta: "See This Week's Events" },
  },
];

/* ── Rendering ────────────────────────────────────────────────────────────── */

const esc = (s) => {
  const d = document.createElement("div");
  d.textContent = String(s ?? "");
  return d.innerHTML;
};

const track = (name, params = {}) => {
  if (typeof gtag === "function") gtag("event", name, params);
};

function demoHref(biz, tier) {
  if (!biz.demoUrl) return "";
  if (!biz.tierParam) return biz.demoUrl;
  const u = new URL(biz.demoUrl);
  u.searchParams.set("tier", tier);
  return u.href;
}

function preview(biz, tier) {
  const href = demoHref(biz, tier);
  const host = biz.demoUrl ? new URL(biz.demoUrl).host : `${biz.key}.demo.evergreendigitalco.com`;
  const b = biz.brand;
  const pagesShown = biz.pages.slice(0, Math.min(biz.pages.length, TIERS[tier].pages));

  const body = biz.image
    ? `<img class="sc-preview__img" src="${esc(biz.image)}" alt="${esc(biz.clientName || b.name)} website preview" loading="lazy" />`
    : `<div class="sc-mock ${b.light ? "sc-mock--light" : ""}" style="--mock-bg:${b.bg};--mock-accent:${b.accent}">
         <div class="sc-mock__nav">
           <span class="sc-mock__logo">${esc(b.name)}</span>
           <span class="sc-mock__links">${pagesShown.slice(1, 4).map((p) => `<span>${esc(p)}</span>`).join("")}</span>
         </div>
         <div class="sc-mock__hero">
           <span class="sc-mock__tag">${esc(b.tagline)}</span>
           <span class="sc-mock__headline">${esc(b.name)}</span>
           <span class="sc-mock__cta">${esc(b.cta)}</span>
         </div>
         <div class="sc-mock__cards"><span></span><span></span><span></span></div>
       </div>`;

  return `
    <div class="sc-preview">
      <div class="mockup-bar">
        <div class="mockup-bar__dot mockup-bar__dot--red"></div>
        <div class="mockup-bar__dot mockup-bar__dot--yellow"></div>
        <div class="mockup-bar__dot mockup-bar__dot--green"></div>
        <div class="mockup-bar__url">${esc(host)}</div>
      </div>
      ${href ? `<a class="sc-preview__link" href="${esc(href)}" target="_blank" rel="noopener" data-demo-link>${body}</a>` : body}
    </div>
    ${
      href
        ? `<a class="sc-demo-btn" href="${esc(href)}" target="_blank" rel="noopener" data-demo-link>
             ${biz.clientName ? `View ${esc(biz.clientName)}, a real client site` : "Open the live demo"} ↗
           </a>`
        : `<p class="sc-demo-note">Demo site in progress. Want a walkthrough of what yours could look like? <button type="button" class="sc-inline-link" data-modal-trigger aria-haspopup="dialog">Book a free call</button>.</p>`
    }`;
}

function plan(biz, tier) {
  const t = TIERS[tier];
  const recommended = tier === biz.recommended;
  return `
    <div class="sc-plan">
      <div class="sc-toggle" role="radiogroup" aria-label="Choose a plan">
        ${Object.entries(TIERS)
          .map(
            ([k, v]) => `<button type="button" role="radio" class="sc-toggle__btn ${k === tier ? "is-active" : ""}"
              aria-checked="${k === tier}" data-tier="${k}">${esc(v.name)}${k === biz.recommended ? ' <span class="sc-toggle__star" aria-label="recommended">★</span>' : ""}</button>`
          )
          .join("")}
      </div>

      <p class="sc-plan__eyebrow">${recommended ? `Our pick for ${biz.group === "individual" ? "a " : ""}${esc(biz.label.toLowerCase())}` : `${esc(t.name)} plan`}</p>
      <div class="sc-plan__price"><span>${esc(t.price)}</span>/mo</div>
      <p class="sc-plan__terms">+ ${esc(t.setup)} · ${esc(t.term)}</p>

      <ul class="sc-plan__list">${t.includes.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>

      <p class="sc-plan__pages-label">Pages we'd build for you</p>
      <ul class="sc-plan__pages">
        ${biz.pages.map((p, i) => `<li class="${i < t.pages ? "" : "is-off"}">${esc(p)}</li>`).join("")}
      </ul>

      <p class="sc-plan__why">${esc(biz.why)}</p>
      <p class="sc-plan__addon"><strong>Popular add-on:</strong> ${esc(biz.addon)}</p>

      <button class="btn-primary sc-plan__cta" data-modal-trigger aria-haspopup="dialog">
        ${biz.group === "individual" ? "Get My Site →" : "Get a Site Like This →"}
      </button>
    </div>`;
}

/* ── Init ─────────────────────────────────────────────────────────────────── */

export function initShowcase() {
  const root = document.getElementById("showcase");
  if (!root) return;
  const chips = root.querySelector(".sc-chips");
  const panel = root.querySelector(".sc-panel");
  if (!chips || !panel) return;

  const chip = (b) => `<button type="button" class="sc-chip ${b.group === "individual" ? "sc-chip--individual" : ""}" role="tab" id="sc-tab-${b.key}" aria-selected="false"
      aria-controls="sc-panel" data-biz="${b.key}"><span aria-hidden="true">${b.emoji}</span> ${esc(b.label)}</button>`;
  const businesses = BUSINESSES.filter((b) => b.group !== "individual");
  const individuals = BUSINESSES.filter((b) => b.group === "individual");
  chips.innerHTML = `
    <div class="sc-chips__group" role="presentation">
      <span class="sc-chips__label" role="presentation">For businesses</span>
      ${businesses.map(chip).join("")}
    </div>
    <div class="sc-chips__group sc-chips__group--individual" role="presentation">
      <span class="sc-chips__label" role="presentation">For individuals <em>from $30/mo</em></span>
      ${individuals.map(chip).join("")}
    </div>`;

  const state = { biz: null, tier: null };

  const render = () => {
    const biz = BUSINESSES.find((b) => b.key === state.biz);
    panel.innerHTML = `<div class="sc-panel__grid">
        <div class="sc-panel__demo">${preview(biz, state.tier)}</div>
        ${plan(biz, state.tier)}
      </div>`;
    panel.setAttribute("aria-labelledby", `sc-tab-${biz.key}`);
  };

  const select = (key, { tier, silent } = {}) => {
    const biz = BUSINESSES.find((b) => b.key === key) || BUSINESSES.find((b) => b.group !== "individual");
    state.biz = biz.key;
    state.tier = tier && TIERS[tier] ? tier : biz.recommended;
    chips.querySelectorAll(".sc-chip").forEach((c) => {
      const on = c.dataset.biz === biz.key;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-selected", String(on));
      c.tabIndex = on ? 0 : -1;
    });
    render();
    if (!silent) track("showcase_select", { business_type: biz.key });
  };

  chips.addEventListener("click", (e) => {
    const chip = e.target.closest(".sc-chip");
    if (chip) select(chip.dataset.biz);
  });

  chips.addEventListener("keydown", (e) => {
    if (!["ArrowRight", "ArrowLeft"].includes(e.key)) return;
    const all = [...chips.querySelectorAll(".sc-chip")];
    const i = all.findIndex((c) => c.dataset.biz === state.biz);
    const next = all[(i + (e.key === "ArrowRight" ? 1 : -1) + all.length) % all.length];
    e.preventDefault();
    next.focus();
    select(next.dataset.biz);
  });

  panel.addEventListener("click", (e) => {
    const t = e.target.closest("[data-tier]");
    if (t) {
      state.tier = t.dataset.tier;
      render();
      panel.querySelector(`[data-tier="${state.tier}"]`)?.focus();
      track("showcase_tier", { business_type: state.biz, tier: state.tier });
    }
    if (e.target.closest("[data-demo-link]")) {
      track("showcase_demo_click", { business_type: state.biz, tier: state.tier });
    }
  });

  // Deep link: /#showcase?biz=auto-detailing&tier=elite
  const params = new URLSearchParams((location.hash.split("?")[1] || ""));
  select(params.get("biz") || businesses[0].key, { tier: params.get("tier"), silent: true });
  if (location.hash.startsWith("#showcase?")) {
    requestAnimationFrame(() => root.scrollIntoView({ block: "start" }));
  }
}

export { BUSINESSES, TIERS };
