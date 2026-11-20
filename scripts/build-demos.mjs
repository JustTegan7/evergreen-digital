/* =============================================================================
   build-demos.mjs, generates the in-site demo pages in /demos/<type>/index.html
   Run: npm run demos
   -----------------------------------------------------------------------------
   Each demo is a one-page sample site for a business type. They are shown in a
   frame inside the "Choose your business" picker, and are not meant to be
   separate live sites. Edit the DEMOS data below, then re-run this script.
   Images are original SVG illustrations. To use a real photo instead, put it
   in /assets/images/demos/ and swap the tile/scene for an <img>.
   ============================================================================= */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HERO_ART, TILE_EMOJI, EXTRAS } from "./demo-art.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const an = (t) => (/^[aeiou]/i.test(t) ? "an " : "a ") + t;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ── Icons (64 x 64, stroke only) ─────────────────────────────────────────── */
const ICONS = {
  coffee: '<path d="M12 24h32v14a13 13 0 0 1-13 13h-6a13 13 0 0 1-13-13z"/><path d="M44 28h3a7 7 0 0 1 0 14h-3"/><path d="M22 8c-3 4 3 6 0 11M32 8c-3 4 3 6 0 11"/>',
  scissors: '<circle cx="15" cy="46" r="7"/><circle cx="15" cy="18" r="7"/><path d="M21 42 54 14M21 22l33 28"/>',
  house: '<path d="M6 32 32 9l26 23"/><path d="M13 27v28h38V27"/><path d="M26 55V40h12v15"/>',
  car: '<path d="M5 42h54v-9l-9-12H21l-9 12-7 2z"/><circle cx="18" cy="44" r="6"/><circle cx="46" cy="44" r="6"/><path d="M22 33h20"/>',
  church: '<path d="M32 4v12M26 9h12"/><path d="M13 58V32l19-15 19 15v26z"/><path d="M25 58V44a7 7 0 0 1 14 0v14"/>',
  bag: '<path d="M12 22h40l3 36H9z"/><path d="M23 22v-5a9 9 0 0 1 18 0v5"/>',
  dice: '<rect x="9" y="9" width="46" height="46" rx="10"/><circle cx="23" cy="23" r="3"/><circle cx="41" cy="23" r="3"/><circle cx="32" cy="32" r="3"/><circle cx="23" cy="41" r="3"/><circle cx="41" cy="41" r="3"/>',
  plate: '<circle cx="36" cy="32" r="22"/><circle cx="36" cy="32" r="13"/><path d="M8 8v18a5 5 0 0 0 10 0V8M13 8v48"/>',
  leaf: '<path d="M10 54C10 28 28 10 54 10c0 26-18 44-44 44z"/><path d="M10 54 38 26"/>',
  star: '<path d="m32 6 7.6 16.2 17.7 2.1-13.1 12.2 3.5 17.5L32 45.2 16.3 54l3.5-17.5L6.7 24.3l17.7-2.1z"/>',
  clock: '<circle cx="32" cy="32" r="24"/><path d="M32 18v15l10 6"/>',
  shield: '<path d="M32 6 10 14v16c0 14 9 24 22 28 13-4 22-14 22-28V14z"/><path d="m22 32 7 7 13-14"/>',
  heart: '<path d="M32 54S8 40 8 23a12 12 0 0 1 24-3 12 12 0 0 1 24 3c0 17-24 31-24 31z"/>',
  drop: '<path d="M32 6C20 22 14 31 14 40a18 18 0 0 0 36 0c0-9-6-18-18-34z"/>',
  bolt: '<path d="M36 4 14 36h16l-4 24 24-34H34z"/>',
  gamepad: '<rect x="6" y="18" width="52" height="30" rx="14"/><path d="M20 27v12M14 33h12"/><circle cx="42" cy="30" r="2.5"/><circle cx="49" cy="36" r="2.5"/>',
  cup: '<path d="M14 14h36l-4 40H18z"/><path d="M12 22h40"/>',
};
const ico = (n, w = 2) => `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

/* ── Seeded art so every tile looks different but stays on theme ──────────── */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function tile(seed, icon) {
  const r = rng(seed * 977 + 13);
  const ang = Math.floor(r() * 360);
  let shapes = "";
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(r() * 300), y = Math.floor(r() * 246), s = 24 + Math.floor(r() * 70);
    shapes += `<circle cx="${x}" cy="${y}" r="${s}" fill="${i % 2 ? "var(--accent)" : "var(--ink)"}" opacity="${(0.08 + r() * 0.14).toFixed(2)}"/>`;
  }
  return `<svg viewBox="0 0 300 246" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="g${seed}" gradientTransform="rotate(${ang} .5 .5)"><stop offset="0" stop-color="var(--accent)" stop-opacity=".34"/><stop offset="1" stop-color="var(--surface)"/></linearGradient></defs>
    <rect width="300" height="246" fill="url(#g${seed})"/>${shapes}
    <g transform="translate(105 78) scale(1.5)" style="color:var(--accent)">${ico(icon, 1.7).replace("<svg", '<svg x="0" y="0" width="64" height="64"')}</g></svg>`;
}
function scene(icon, seed) {
  const r = rng(seed * 31 + 7);
  let dots = "";
  for (let i = 0; i < 26; i++) dots += `<circle cx="${Math.floor(r() * 480)}" cy="${Math.floor(r() * 456)}" r="${2 + Math.floor(r() * 4)}" fill="var(--accent)" opacity="${(0.1 + r() * 0.25).toFixed(2)}"/>`;
  return `<svg class="scene" viewBox="0 0 480 456" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><radialGradient id="rg${seed}" cx=".5" cy=".42" r=".7"><stop offset="0" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="1" stop-color="var(--surface)" stop-opacity="0"/></radialGradient></defs>
    <rect width="480" height="456" fill="url(#rg${seed})"/>${dots}
    <circle cx="240" cy="220" r="150" fill="var(--bg)" opacity=".75"/><circle cx="240" cy="220" r="150" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 10" opacity=".55"/>
    <g transform="translate(120 100) scale(3.75)" style="color:var(--accent)">${ico(icon, 1.35).replace("<svg", '<svg width="64" height="64"')}</g></svg>`;
}

/* ── Block renderers ──────────────────────────────────────────────────────── */
const head = (eyebrow, title, sub) => `<p class="d-eyebrow">${esc(eyebrow)}</p><h2 class="d-title">${esc(title)}</h2>${sub ? `<p class="d-sub">${esc(sub)}</p>` : ""}`;
let tileSeed = 1;
let curKey = "";
function emojiTile(seed, emoji) {
  const r = rng(seed * 61 + 5);
  return `<div class="d-emo" style="--ang:${Math.floor(r() * 360)}deg;--x:${20 + Math.floor(r() * 60)}%;--y:${20 + Math.floor(r() * 50)}%"><span>${emoji}</span><i></i><i></i></div>`;
}
const initials = (n) => n.split(" ").map((w) => w[0]).join("").slice(0, 2);

const BLOCKS = {
  strip: (b) => `<div class="d-strip reveal"><div class="d-wrap d-strip__in">${b.items.map(([a, c]) => `<div class="d-strip__item"><strong>${esc(a)}</strong><span>${esc(c)}</span></div>`).join("")}</div></div>`,

  rows: (b, alt) => {
    const cats = [...new Set(b.rows.map((r) => r[0]))];
    return `<section class="d-section ${alt ? "d-section--alt" : ""}" id="${b.id}"><div class="d-wrap">
      <div class="reveal">${head(b.eyebrow, b.title, b.sub)}</div>
      <div class="d-tabs reveal" data-tabs="#list-${b.id}" role="tablist"><button class="d-tab is-on" data-filter="all">All</button>${cats.map((c) => `<button class="d-tab" data-filter="${esc(c)}">${esc(c)}</button>`).join("")}</div>
      <div class="d-list reveal" id="list-${b.id}">${b.rows.map(([c, n, d, p]) => `<div class="d-row" data-cat="${esc(c)}"><div><h3>${esc(n)}</h3><p>${esc(d)}</p></div><div class="price">${esc(p)}</div></div>`).join("")}</div>
      ${b.note ? `<p class="d-sub" style="margin:28px 0 0;font-size:14px">${esc(b.note)}</p>` : ""}
    </div></section>`;
  },

  cards: (b, alt) => `<section class="d-section ${alt ? "d-section--alt" : ""}" id="${b.id}"><div class="d-wrap">
      <div class="reveal">${head(b.eyebrow, b.title, b.sub)}</div>
      <div class="d-grid">${b.cards.map((c) => `<article class="d-card reveal ${c.feat ? "d-card--featured" : ""}"><div class="ic">${ico(c.ic, 2).replace("<svg", '<svg width="24" height="24"')}</div><h3>${esc(c.name)}</h3><p>${esc(c.desc)}</p>${c.list ? `<ul>${c.list.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}${c.meta ? `<div class="meta"><span>${esc(c.meta[0])}</span><button class="d-mini" data-demo="${esc(c.demo || "On your site this opens booking or a quote form.")}">${esc(c.meta[1] || "Choose")}</button></div>` : ""}</article>`).join("")}</div>
    </div></section>`,

  tiles: (b, alt) => `<section class="d-section ${alt ? "d-section--alt" : ""}" id="${b.id}"><div class="d-wrap">
      <div class="reveal">${head(b.eyebrow, b.title, b.sub)}</div>
      <div class="d-grid" style="grid-template-columns:repeat(auto-fit,minmax(${b.min || 210}px,1fr))">${b.tiles.map((t, i) => { const em = t.emoji || (TILE_EMOJI[`${curKey}.${b.id}`] || [])[i % ((TILE_EMOJI[`${curKey}.${b.id}`] || [1]).length)]; return `<article class="d-tile reveal"><div class="d-tile__art">${em ? emojiTile(tileSeed++, em) : tile(tileSeed++, t.icon || b.icon)}</div><div class="d-tile__body"><h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p>${t.price ? `<div class="d-tile__foot"><span class="price">${esc(t.price)}</span><button class="d-mini" data-demo="${esc(t.demo || "On your site this adds to a cart or opens the booking flow.")}">${esc(t.btn || "Add")}</button></div>` : ""}</div></article>`; }).join("")}</div>
    </div></section>`,

  split: (b, alt) => `<section class="d-section ${alt ? "d-section--alt" : ""}" id="${b.id}"><div class="d-wrap d-split">
      <div class="reveal">${head(b.eyebrow, b.title, b.sub)}${b.steps ? `<div class="d-steps">${b.steps.map(([h, p]) => `<div class="d-step"><div><h3>${esc(h)}</h3><p>${esc(p)}</p></div></div>`).join("")}</div>` : ""}</div>
      <div class="reveal">${b.hours ? `<div class="d-card"><h3 style="margin-bottom:14px">${esc(b.hoursTitle || "Hours")}</h3><table class="d-hours">${b.hours.map(([d, h]) => `<tr><td>${esc(d)}</td><td>${esc(h)}</td></tr>`).join("")}</table>${b.address ? `<p style="margin-top:16px;color:var(--muted);font-size:14.5px">${esc(b.address)}</p>` : ""}</div>` : `<div class="d-art">${scene(b.icon, 5)}</div>`}</div>
    </div></section>`,

  quotes: (b, alt) => `<section class="d-section ${alt ? "d-section--alt" : ""}" id="${b.id}"><div class="d-wrap">
      <div class="reveal">${head(b.eyebrow, b.title, "")}</div>
      <div class="d-grid">${b.quotes.map(([t, n, s]) => `<figure class="d-quote reveal" style="margin:0"><div class="d-stars" aria-label="5 stars">★★★★★</div><p>${esc(t)}</p><b>${esc(n)}</b><small>${esc(s)}</small></figure>`).join("")}</div>
      <p class="d-sub" style="margin:22px 0 0;font-size:12.5px">Sample reviews for this demo. Your real Google reviews can display here automatically.</p>
    </div></section>`,

  banner: (b) => `<div class="d-banner reveal"><div class="d-wrap d-banner__in"><span class="d-live"><i></i>${esc(b.label)}</span><p>${esc(b.text)}</p></div></div>`,

  ticker: (b) => `<div class="d-ticker" role="presentation"><div class="d-ticker__track">${[0, 1].map((k) => b.items.map((i) => `<span${k ? ' aria-hidden="true"' : ""}>${esc(i)}</span>`).join("")).join("")}</div></div>`,

  story: (b, alt) => `<section class="d-section ${alt ? "d-section--alt" : ""}" id="${b.id}"><div class="d-wrap d-story">
      <div class="d-story__who reveal"><div class="d-avatar d-avatar--lg">${esc(b.initials)}</div><b>${esc(b.name)}</b><span>${esc(b.role)}</span></div>
      <div class="reveal">${head(b.eyebrow, b.title, "")}<blockquote class="d-story__quote">${esc(b.quote)}</blockquote><p class="d-sign">${esc(b.name.replace(/^Pastor /, ""))}</p>
      <ul class="d-facts">${b.facts.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></div>
    </div></section>`,

  team: (b, alt) => `<section class="d-section ${alt ? "d-section--alt" : ""}"><div class="d-wrap">
      <div class="reveal">${head(b.eyebrow, b.title, "")}</div>
      <div class="d-grid">${b.members.map(([n, r, q], i) => `<article class="d-card d-member reveal"><div class="d-avatar" style="--rot:${i * 47}deg">${esc(initials(n))}</div><h3>${esc(n)}</h3><small>${esc(r)}</small><p>${esc(q)}</p></article>`).join("")}</div>
    </div></section>`,

  faq: (b, alt) => `<section class="d-section ${alt ? "d-section--alt" : ""}"><div class="d-wrap d-faqwrap">
      <div class="reveal">${head(b.eyebrow, b.title, "")}</div>
      <div class="d-faq reveal">${b.items.map(([q, a], i) => `<details${i === 0 ? " open" : ""}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>
    </div></section>`,

  cta: (b) => `<section class="d-section" id="${b.id}"><div class="d-wrap"><div class="d-cta reveal">
      <div><h2>${esc(b.title)}</h2><p>${esc(b.sub)}</p></div>
      <form class="d-form" data-demo-form="${esc(b.done)}">${b.fields.map((f) => f.options ? `<select aria-label="${esc(f.label)}">${f.options.map((o) => `<option>${esc(o)}</option>`).join("")}</select>` : f.area ? `<textarea rows="3" placeholder="${esc(f.label)}" aria-label="${esc(f.label)}"></textarea>` : `<input type="${f.type || "text"}" placeholder="${esc(f.label)}" aria-label="${esc(f.label)}" />`).join("")}<button class="d-btn" type="submit">${esc(b.button)}</button></form>
    </div></div></section>`,
};

/* ── Page shell ───────────────────────────────────────────────────────────── */
function page(d) {
  const t = d.theme;
  const fontHead = { serif: 'Georgia, "Times New Roman", serif', sans: '"Avenir Next", "Segoe UI", system-ui, sans-serif', slab: '"Rockwell", "Roboto Slab", Georgia, serif', condensed: '"Arial Narrow", "Helvetica Neue", Arial, sans-serif' }[t.font];
  const vars = `--bg:${t.bg};--surface:${t.surface};--ink:${t.ink};--muted:${t.muted};--accent:${t.accent};--accent-ink:${t.accentInk};--line:${t.line};--font-head:${fontHead};--font-body:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif${t.dark ? `;--cta-bg:${t.accent};--cta-ink:${t.accentInk};--cta-btn:${t.accentInk};--cta-btn-ink:#fff` : ""}`;
  curKey = d.key;
  const extras = EXTRAS[d.key] || [];
  const woven = [];
  const emit = (fn) => extras.filter(fn).forEach((x) => { x.__used = true; woven.push(x); });
  d.blocks.forEach((b) => {
    emit((x) => x.before && x.before === b.id);
    woven.push(b);
    emit((x) => x.after && (x.after === b.id || (x.after === "strip" && b.t === "strip")));
  });
  extras.filter((x) => !x.__used).forEach((x) => woven.splice(woven.length - 1, 0, x));
  let alt = false;
  const body = woven.map((b) => { const html = BLOCKS[b.t](b, alt); if (["rows", "cards", "tiles", "split", "quotes", "story", "team", "faq"].includes(b.t)) alt = !alt; return html; }).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(d.name)} | Demo site by Evergreen Digital</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="description" content="Sample website for ${esc(an(d.type))}, built by Evergreen Digital. Not a real business." />
  <link rel="icon" href="/assets/icons/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/css/demo.css" />
</head>
<body style="${vars}">
  <div class="d-bar">Sample site for ${esc(an(d.type))}. Not a real business.<a href="/#contact" target="_top">Get a site like this →</a></div>
  <header class="d-head"><div class="d-wrap d-head__in">
    <a class="d-logo" href="#top">${ico(d.icon, 2.4)}${esc(d.name)}</a>
    <nav class="d-nav" aria-label="Main">${d.nav.map(([l, a]) => `<a href="#${a}">${esc(l)}</a>`).join("")}</nav>
    ${["boutique", "game-store"].includes(d.key) ? '<span class="d-cart" aria-label="Cart">🛍 <b>0</b></span>' : ""}
    <button class="d-btn" data-demo="${esc(d.heroCta[1])}">${esc(d.heroCta[0])}</button>
    <button class="d-menu-btn" aria-label="Menu" aria-expanded="false">☰</button>
  </div></header>
  <main id="top">
    <section class="d-hero"><div class="d-wrap d-hero__grid">
      <div class="reveal">
        <h1>${esc(d.headline)}</h1>
        <p class="lead">${esc(d.lead)}</p>
        <div class="d-hero__ctas"><button class="d-btn" data-demo="${esc(d.heroCta[1])}">${esc(d.heroCta[0])}</button><a class="d-btn d-btn--ghost" href="#${d.nav[0][1]}">${esc(d.secondary)}</a></div>
        <div class="d-badges">${d.badges.map((b) => `<span>${esc(b)}</span>`).join("")}</div>
      </div>
      <div class="d-art reveal">${HERO_ART[d.key] || scene(d.icon, d.seed)}<div class="float float--a">${esc(d.float[0][0])}<small>${esc(d.float[0][1])}</small></div><div class="float float--b">${esc(d.float[1][0])}<small>${esc(d.float[1][1])}</small></div></div>
    </div></section>
${body}
  </main>
  <footer class="d-foot"><div class="d-wrap d-foot__in"><span>© ${esc(d.name)}. ${esc(d.address)}</span><span>Sample site built by <a href="/#contact" target="_top">Evergreen Digital</a></span></div></footer>
  <div class="d-toast" role="status" aria-live="polite"></div>
  <script src="/js/demo.js" defer></script>
</body>
</html>
`;
}

/* ── The demos ────────────────────────────────────────────────────────────── */
const DEMOS = [
  {
    key: "coffee-shop", type: "coffee shop", name: "Cedar & Steam Coffee", icon: "coffee", seed: 1,
    theme: { font: "serif", bg: "#fbf6ef", surface: "#f2e8da", ink: "#2b1d14", muted: "#7a6657", accent: "#b9702f", accentInk: "#fff", line: "#e4d6c3" },
    nav: [["Menu", "menu"], ["Why us", "why"], ["Visit", "visit"], ["Order", "order"]],
    headline: "Roasted small. Poured slow. Down the road from you.",
    lead: "Single-origin espresso, fresh pastries, and a corner table with your name on it. Order ahead and skip the line.",
    heroCta: ["Order Ahead", "On your site this opens your online ordering."], secondary: "See the menu",
    badges: ["Roasted in Snohomish County", "Oat and almond milk", "Free Wi-Fi"],
    float: [["Order ready in 6 min", "Oat latte, no sugar"], ["4.9 on Google", "From 210 reviews"]],
    address: "412 Example Ave, Everett, WA",
    blocks: [
      { t: "strip", items: [["6am", "Doors open"], ["12", "Single-origin beans"], ["4.9", "Google rating"], ["0", "Lines with order ahead"]] },
      { t: "rows", id: "menu", eyebrow: "The menu", title: "Everything made this morning", sub: "Tap a category. Prices stay current because you update them yourself in a minute.", rows: [
        ["Espresso", "Cortado", "Double shot cut with warm milk, small and strong.", "$4.25"],
        ["Espresso", "House Latte", "Cedar syrup, steamed milk, a little cinnamon.", "$5.50"],
        ["Espresso", "Americano", "Long pour over a double shot.", "$3.75"],
        ["Espresso", "Flat White", "Velvet microfoam over a ristretto.", "$4.75"],
        ["Drinks", "Cold Brew", "Steeped 18 hours, served over ice.", "$4.50"],
        ["Drinks", "Chai Latte", "Spiced and slow-simmered, not from a mix.", "$5.00"],
        ["Drinks", "Matcha", "Ceremonial grade, whisked to order.", "$5.75"],
        ["Drinks", "Hot Chocolate", "Dark chocolate, whole milk, whipped cream.", "$4.50"],
        ["Bakery", "Almond Croissant", "Baked at 5am by a neighbor.", "$4.25"],
        ["Bakery", "Blueberry Scone", "Local berries when in season.", "$3.75"],
        ["Bakery", "Breakfast Sandwich", "Egg, cheddar, and a house sauce.", "$7.25"],
        ["Bakery", "Banana Bread", "Thick slice, toasted with butter.", "$3.95"],
      ] },
      { t: "cards", id: "why", eyebrow: "Why people stay", title: "A third place between home and work", cards: [
        { ic: "leaf", name: "Ethically sourced", desc: "We buy direct from three small farms and tell you exactly which one is in your cup." },
        { ic: "clock", name: "Order ahead", desc: "Pay on your phone, walk in, and grab your drink from the counter.", meta: ["Skip the line", "Try it"], demo: "On your site, customers order and pay here." },
        { ic: "heart", name: "Rewards", desc: "Every tenth drink is on us. Customers join with a phone number, no app needed." },
      ] },
      { t: "split", id: "visit", eyebrow: "Visit", title: "Come say hi", sub: "Parking out back, and the dog bowl is always full.", hoursTitle: "Hours", hours: [["Mon to Fri", "6am to 6pm"], ["Saturday", "7am to 6pm"], ["Sunday", "7am to 3pm"]], address: "412 Example Ave, Everett, WA" },
      { t: "quotes", id: "reviews", eyebrow: "Kind words", title: "Regulars say it best", quotes: [["Best cortado north of Seattle, and they remember my order.", "Dana R.", "Regular since 2023"], ["Order ahead is a lifesaver on my commute.", "Marcus T.", "Weekday regular"], ["Cozy, quiet, and the scones are unreal.", "Priya S.", "Weekend visitor"]] },
      { t: "cta", id: "order", title: "Your morning, sorted.", sub: "Order ahead or ask about catering for your next meeting.", button: "Send", done: "On a real site this reaches the shop's inbox and phone.", fields: [{ label: "Your name" }, { label: "Email", type: "email" }, { label: "Order or catering request", area: true }] },
    ],
  },
  {
    key: "salon", type: "hair salon", name: "Fern & Fade Salon", icon: "scissors", seed: 2,
    theme: { font: "serif", bg: "#f6f3ee", surface: "#ebe5da", ink: "#1f2a24", muted: "#66726b", accent: "#4d7a58", accentInk: "#fff", line: "#ddd5c6" },
    nav: [["Services", "services"], ["Stylists", "stylists"], ["Gallery", "gallery"], ["Visit", "visit"]],
    headline: "Hair that feels like you, only better.",
    lead: "Cuts, color, and barbering by stylists who listen first. Book online in under a minute.",
    heroCta: ["Book Online", "On your site this opens your booking calendar."], secondary: "See services",
    badges: ["Online booking 24/7", "Text reminders", "Walk-ins welcome"],
    float: [["Thu 2:30 open", "Cut and style, 60 min"], ["5.0 on Google", "From 180 reviews"]],
    address: "88 Example Way, Mill Creek, WA",
    blocks: [
      { t: "strip", items: [["12 yrs", "In the neighborhood"], ["4", "Stylists and barbers"], ["5.0", "Google rating"], ["24/7", "Online booking"]] },
      { t: "rows", id: "services", eyebrow: "Services and prices", title: "Clear prices, up front", sub: "No surprises at the chair. Add-ons are listed so you can plan your visit.", rows: [
        ["Cuts", "Women's Cut and Style", "Consult, wash, cut, and blowout.", "from $68"],
        ["Cuts", "Men's Cut", "Scissor or clipper, finished with a hot towel.", "from $38"],
        ["Cuts", "Kids' Cut", "Ages 12 and under, patience included.", "$28"],
        ["Cuts", "Fade and Beard Trim", "Skin fade, line-up, and beard shaping.", "from $52"],
        ["Color", "All-Over Color", "Root to end, glossed and styled.", "from $95"],
        ["Color", "Balayage", "Hand-painted, soft and low maintenance.", "from $210"],
        ["Color", "Color Correction", "Priced after a free in-person consult.", "quote"],
        ["Care", "Deep Conditioning", "Add to any service.", "$25"],
        ["Care", "Scalp Treatment", "Exfoliate and massage.", "$35"],
        ["Care", "Special Occasion Updo", "Weddings, proms, and photos.", "from $85"],
      ] },
      { t: "cards", id: "stylists", eyebrow: "Meet the team", title: "Book with the stylist you love", cards: [
        { ic: "scissors", name: "Maya", desc: "Cuts, balayage, and curls. Twelve years behind the chair.", meta: ["Tue to Sat", "Book Maya"], demo: "On your site each stylist has a Book With Me button into the calendar." },
        { ic: "star", name: "Jordan", desc: "Fades, beards, and classic barbering with a hot towel finish.", meta: ["Wed to Sun", "Book Jordan"], demo: "On your site each stylist has a Book With Me button into the calendar." },
        { ic: "heart", name: "Ellie", desc: "Color specialist for blondes, vivids, and corrections.", meta: ["Mon to Fri", "Book Ellie"], demo: "On your site each stylist has a Book With Me button into the calendar." },
      ] },
      { t: "tiles", id: "gallery", eyebrow: "Recent work", title: "Real clients, real results", sub: "Your own before and after photos go here, sortable by style.", icon: "scissors", min: 200, tiles: [
        { name: "Soft balayage", desc: "Maya", icon: "drop" }, { name: "Textured crop", desc: "Jordan", icon: "scissors" }, { name: "Copper gloss", desc: "Ellie", icon: "heart" }, { name: "Skin fade", desc: "Jordan", icon: "star" },
      ] },
      { t: "split", id: "visit", eyebrow: "Visit", title: "Find us in Mill Creek", sub: "Free parking in the lot behind the building.", hours: [["Tue to Fri", "9am to 7pm"], ["Saturday", "8am to 5pm"], ["Sun and Mon", "Closed"]], address: "88 Example Way, Mill Creek, WA" },
      { t: "quotes", id: "reviews", eyebrow: "Reviews", title: "People keep coming back", quotes: [["Finally a stylist who listens. Best color I have ever had.", "Jess L.", "Balayage client"], ["Booked online at 10pm and was in the chair Thursday.", "Tom H.", "Fade client"], ["My daughter's first cut and Maya was wonderful with her.", "Anna K.", "Family client"]] },
      { t: "cta", id: "book", title: "Ready for a fresh look?", sub: "Pick a service and we will confirm by text.", button: "Request Appointment", done: "On a real site this books straight into your calendar.", fields: [{ label: "Your name" }, { label: "Mobile number", type: "tel" }, { label: "Service", options: ["Women's Cut", "Men's Cut", "Color", "Balayage", "Not sure"] }] },
    ],
  },
  {
    key: "trades", type: "plumbing and heating company", name: "Summit Plumbing & Heating", icon: "house", seed: 3,
    theme: { font: "sans", bg: "#f4f7fb", surface: "#e8eef6", ink: "#0f2a44", muted: "#566a80", accent: "#e08a14", accentInk: "#fff", line: "#d4deea" },
    nav: [["Services", "services"], ["How it works", "how"], ["Areas", "areas"], ["Quote", "quote"]],
    headline: "Same-day plumbing and heating, done right the first time.",
    lead: "Licensed, insured, and on time. Tap to call or request a quote with photos in under a minute.",
    heroCta: ["Call Now", "On your site this dials your business line with one tap."], secondary: "See services",
    badges: ["Licensed and insured", "Upfront pricing", "Same-day service"],
    float: [["Tech arriving 2:15", "Water heater swap"], ["4.9 on Google", "From 260 reviews"]],
    address: "Serving Everett, Lynnwood, Mill Creek, and Snohomish County",
    blocks: [
      { t: "strip", items: [["Same day", "Emergency service"], ["20 yrs", "In business"], ["4.9", "Google rating"], ["$0", "Estimate fee"]] },
      { t: "cards", id: "services", eyebrow: "What we fix", title: "One call covers the whole house", cards: [
        { ic: "drop", name: "Leaks and repairs", desc: "Burst pipes, running toilets, and slow drains fixed fast.", list: ["Camera drain inspection", "Fixture repair"] },
        { ic: "bolt", name: "Water heaters", desc: "Tank and tankless installs with old unit haul-away.", list: ["Same-day replacement", "10-year labor warranty"], feat: true },
        { ic: "house", name: "Heating and furnaces", desc: "Tune-ups, repairs, and full system replacement.", list: ["Seasonal tune-ups", "Financing available"] },
        { ic: "shield", name: "Remodel plumbing", desc: "Kitchens, baths, and new construction rough-in." },
      ] },
      { t: "split", id: "how", eyebrow: "How it works", title: "Fixed in three simple steps", steps: [["Call or send photos", "Tell us what is wrong. We reply within 15 minutes during business hours."], ["Get an upfront price", "A flat quote before we start. No surprise charges."], ["We fix it and clean up", "Our tech finishes the job and leaves your space spotless."]], icon: "house" },
      { t: "tiles", id: "areas", eyebrow: "Service areas", title: "Local to your neighborhood", sub: "Each city gets its own page so you show up when people search nearby.", icon: "house", min: 200, tiles: [{ name: "Everett", desc: "Same-day service", icon: "house" }, { name: "Lynnwood", desc: "Same-day service", icon: "house" }, { name: "Mill Creek", desc: "Same-day service", icon: "house" }, { name: "Snohomish", desc: "Next-day service", icon: "house" }] },
      { t: "quotes", id: "reviews", eyebrow: "Reviews", title: "Trusted by your neighbors", quotes: [["Showed up in two hours and replaced our water heater the same day.", "Carlos M.", "Everett"], ["Honest price, clean work, zero upsell.", "Beth A.", "Lynnwood"], ["Fixed a leak three other companies missed.", "Greg W.", "Mill Creek"]] },
      { t: "cta", id: "quote", title: "Get a free quote", sub: "Describe the problem and attach a photo. We will call you back fast.", button: "Request Quote", done: "On a real site this texts and emails you the request with the photo.", fields: [{ label: "Your name" }, { label: "Phone", type: "tel" }, { label: "What is going on?", area: true }] },
    ],
  },
  {
    key: "auto-detailing", type: "auto detailing business", name: "Gloss Mobile Detailing", icon: "car", seed: 4,
    theme: { font: "condensed", bg: "#0f1114", surface: "#181b20", ink: "#f2f5f8", muted: "#9aa4af", dark: true, accent: "#38bdf8", accentInk: "#06222f", line: "#2a2f37" },
    nav: [["Packages", "packages"], ["Results", "results"], ["Process", "process"], ["Book", "book"]],
    headline: "Showroom shine, in your driveway.",
    lead: "Mobile detailing and ceramic coating. We bring the water, power, and the patience. You bring the car.",
    heroCta: ["Get a Quote", "On your site this opens a 30-second quote form."], secondary: "See packages",
    badges: ["We come to you", "Ceramic coatings", "Insured"],
    float: [["Booked Saturday 9am", "Full detail"], ["5.0 on Google", "From 95 reviews"]],
    address: "Mobile service across Snohomish County",
    blocks: [
      { t: "strip", items: [["500+", "Cars detailed"], ["5 yr", "Ceramic warranty"], ["5.0", "Google rating"], ["0", "Trips to a shop"]] },
      { t: "cards", id: "packages", eyebrow: "Packages", title: "Pick a detail that fits your car", cards: [
        { ic: "drop", name: "Express", desc: "Hand wash, wheels, and interior wipe-down.", list: ["Foam hand wash", "Vacuum and dash wipe", "Tire shine"], meta: ["$99", "Book"], demo: "On your site this opens booking for this package." },
        { ic: "star", name: "Full Detail", desc: "Our most popular, inside and out.", list: ["Clay bar and wax", "Deep interior clean", "Leather conditioning"], meta: ["$249", "Book"], feat: true, demo: "On your site this opens booking for this package." },
        { ic: "shield", name: "Ceramic Coating", desc: "Years of gloss and protection.", list: ["Paint correction", "5-year coating", "Annual inspection"], meta: ["from $899", "Quote"], demo: "On your site this opens a quote form for this package." },
      ] },
      { t: "tiles", id: "results", eyebrow: "Results", title: "Before and after, no filters", sub: "Your real before and after photos go here.", icon: "car", min: 220, tiles: [{ name: "Black SUV", desc: "Paint correction" }, { name: "White truck", desc: "Full detail" }, { name: "Red coupe", desc: "Ceramic coat" }, { name: "Family van", desc: "Interior rescue" }] },
      { t: "split", id: "process", eyebrow: "The process", title: "Simple from first text to final wipe", steps: [["Request a quote", "Tell us the car and the mess. Quote in minutes."], ["Pick a time", "We schedule at your home or work."], ["Enjoy the shine", "We finish, walk you through it, and take payment on the spot."]], icon: "car" },
      { t: "quotes", id: "reviews", eyebrow: "Reviews", title: "Cars come back looking new", quotes: [["My truck looks better than the day I bought it.", "Ryan P.", "Full detail"], ["The ceramic coat beads water like crazy.", "Alicia N.", "Ceramic coating"], ["Showed up on time and worked in the rain tent.", "Dev S.", "Express"]] },
      { t: "cta", id: "book", title: "Book your detail", sub: "Tell us about your car and we will send a quote.", button: "Get My Quote", done: "On a real site this sends the request with photos to your phone.", fields: [{ label: "Your name" }, { label: "Phone", type: "tel" }, { label: "Package", options: ["Express", "Full Detail", "Ceramic Coating", "Not sure"] }] },
    ],
  },
  {
    key: "church", type: "church", name: "Riverside Community Church", icon: "church", seed: 5,
    theme: { font: "serif", bg: "#f8f6f1", surface: "#ece8de", ink: "#24324a", muted: "#667388", accent: "#5f8d70", accentInk: "#fff", line: "#dcd7ca" },
    nav: [["Visit", "visit"], ["Ministries", "ministries"], ["Events", "events"], ["Give", "give"]],
    headline: "You are welcome here, just as you are.",
    lead: "A warm, family-friendly church in the heart of town. Join us this Sunday and see what to expect before you arrive.",
    heroCta: ["Plan Your Visit", "On your site this opens a short Plan Your Visit form."], secondary: "Service times",
    badges: ["Kids' programs", "Coffee and fellowship", "Live stream"],
    float: [["Sunday 9 and 11", "Sermon: Starting Again"], ["300 neighbors", "Join us each week"]],
    address: "1200 Example Rd, Everett, WA",
    blocks: [
      { t: "strip", items: [["9 & 11", "Sunday services"], ["Wed 7pm", "Community groups"], ["Kids", "Nursery to grade 5"], ["Live", "Stream every week"]] },
      { t: "split", id: "visit", eyebrow: "Plan your visit", title: "What to expect on Sunday", steps: [["Easy parking and a greeter", "Friendly faces meet you at the door and point you to kids' check-in."], ["Come as you are", "Dress casually. Coffee is on us."], ["About 75 minutes", "Music, a short message, and time to connect afterward."]], hoursTitle: "Service times", hours: [["Sunday", "9:00am and 11:00am"], ["Wednesday", "Community groups, 7pm"], ["Youth", "Fridays, 6:30pm"]], address: "1200 Example Rd, Everett, WA" },
      { t: "cards", id: "ministries", eyebrow: "Ministries", title: "A place for every age", cards: [
        { ic: "heart", name: "Kids", desc: "Safe, fun teaching for nursery through grade 5." }, { ic: "star", name: "Youth", desc: "Friday nights for grades 6 to 12." }, { ic: "leaf", name: "Community groups", desc: "Small groups that meet in homes around the county." }, { ic: "shield", name: "Serve", desc: "Food pantry, outreach, and volunteer teams." },
      ] },
      { t: "rows", id: "events", eyebrow: "Upcoming", title: "What is happening", sub: "Your events calendar updates itself from a simple list you manage.", rows: [
        ["Sundays", "Worship Service", "In person and live stream.", "9 & 11am"], ["Midweek", "Community Groups", "Dinner and discussion.", "Wed 7pm"], ["Special", "Food Drive", "Bring non-perishables to the lobby.", "Dec 7"], ["Special", "Christmas Eve Service", "Candlelight and carols.", "Dec 24"], ["Youth", "Winter Retreat", "Two days in the mountains.", "Jan 17"],
      ] },
      { t: "cta", id: "give", title: "Give online, safely", sub: "Support the mission with a one-time or recurring gift. Fast, secure, and tax-receipted.", button: "Give Now", done: "On your site this opens your giving page.", fields: [{ label: "Amount", type: "number" }, { label: "Fund", options: ["General", "Missions", "Building", "Food pantry"] }, { label: "Email", type: "email" }] },
    ],
  },
  {
    key: "boutique", type: "boutique and gift shop", name: "Willow & Wren", icon: "bag", seed: 6,
    theme: { font: "serif", bg: "#fbf7f6", surface: "#f1e6e4", ink: "#3a2a33", muted: "#85727b", accent: "#b4566a", accentInk: "#fff", line: "#ead9d8" },
    nav: [["New", "new"], ["Gifts", "gifts"], ["About", "about"], ["Visit", "visit"]],
    headline: "Local makers, curated for the people you love.",
    lead: "Home goods, jewelry, and gifts you will not find in a big box store. Shop online, pick up in store.",
    heroCta: ["Shop New Arrivals", "On your site this opens your online shop."], secondary: "Gift guide",
    badges: ["Free local pickup", "Gift wrapping", "Small batch"],
    float: [["Just in", "Handmade candles"], ["Free pickup", "Ready in 2 hours"]],
    address: "55 Example St, Edmonds, WA",
    blocks: [
      { t: "strip", items: [["60+", "Local makers"], ["Free", "Gift wrapping"], ["2 hr", "Pickup ready"], ["4.9", "Google rating"]] },
      { t: "tiles", id: "new", eyebrow: "New arrivals", title: "Fresh on the shelves", icon: "bag", min: 210, tiles: [
        { name: "Soy Candle, Cedar", desc: "Poured in Washington", price: "$24", icon: "drop" }, { name: "Linen Tea Towel", desc: "Block-printed", price: "$18", icon: "leaf" }, { name: "Brass Earrings", desc: "Hand-forged", price: "$38", icon: "star" }, { name: "Ceramic Mug", desc: "Small-batch glaze", price: "$32", icon: "cup" }, { name: "Wool Throw", desc: "Pacific Northwest", price: "$96", icon: "heart" }, { name: "Gift Card", desc: "Any amount", price: "$25+", icon: "bag" },
      ] },
      { t: "cards", id: "gifts", eyebrow: "Gift guide", title: "Find the right gift fast", cards: [
        { ic: "heart", name: "Under $25", desc: "Small treats and stocking stuffers.", meta: ["12 items", "Browse"], demo: "On your site this filters the shop by price." }, { ic: "star", name: "For the host", desc: "Candles, linens, and kitchen goods.", meta: ["18 items", "Browse"], demo: "On your site this filters the shop by category." }, { ic: "bag", name: "Corporate gifts", desc: "Custom sets for clients and teams.", meta: ["Quote", "Ask us"], demo: "On your site this opens a corporate gifting form." },
      ] },
      { t: "split", id: "about", eyebrow: "Our story", title: "We started with one table at the market", sub: "Willow & Wren is a family shop that partners with over sixty local makers. Every product has a story and a maker you can meet.", icon: "bag" },
      { t: "split", id: "visit", eyebrow: "Visit the shop", title: "Come browse", sub: "Parking behind the building. Dogs welcome.", hours: [["Mon to Sat", "10am to 6pm"], ["Sunday", "11am to 4pm"]], address: "55 Example St, Edmonds, WA" },
      { t: "cta", id: "news", title: "Be first to see new arrivals", sub: "One short email a month, with pictures and a coupon.", button: "Sign Me Up", done: "On a real site this adds the email to your list automatically.", fields: [{ label: "Your name" }, { label: "Email", type: "email" }] },
    ],
  },
  {
    key: "restaurant", type: "restaurant", name: "Casa Verde Cantina", icon: "plate", seed: 7,
    theme: { font: "serif", bg: "#222b17", surface: "#2c3720", ink: "#f6efdc", muted: "#b9c0a4", dark: true, accent: "#e8b04a", accentInk: "#2a2008", line: "#3c4a2d" },
    nav: [["Menu", "menu"], ["Specials", "specials"], ["Catering", "catering"], ["Visit", "visit"]],
    headline: "Family recipes, fresh every day.",
    lead: "Hand-pressed tortillas, slow-braised birria, and salsas made in-house. Dine in, take out, or order online.",
    heroCta: ["Order Online", "On your site this opens your online ordering."], secondary: "See the menu",
    badges: ["Dine in and take out", "Catering", "Vegetarian options"],
    float: [["Taco Tuesday", "3 for $9"], ["4.8 on Google", "From 340 reviews"]],
    address: "301 Example Blvd, Lynnwood, WA",
    blocks: [
      { t: "strip", items: [["1998", "Family owned"], ["Daily", "Fresh tortillas"], ["4.8", "Google rating"], ["200", "Guests for catering"]] },
      { t: "rows", id: "menu", eyebrow: "The menu", title: "Made from scratch", sub: "Tap a category. Your menu stays current because you edit it yourself.", rows: [
        ["Starters", "Chips and Salsa Trio", "Roja, verde, and pico, made daily.", "$8"], ["Starters", "Queso Fundido", "Melted cheese with chorizo.", "$12"], ["Starters", "Elote", "Street corn, cotija, lime, chili.", "$7"],
        ["Tacos", "Birria Tacos", "Slow-braised beef, consome for dipping.", "$16"], ["Tacos", "Al Pastor", "Marinated pork, pineapple, cilantro.", "$14"], ["Tacos", "Baja Fish", "Crisp fish, cabbage, chipotle crema.", "$15"],
        ["Plates", "Enchiladas Verdes", "Chicken, tomatillo sauce, rice and beans.", "$17"], ["Plates", "Carne Asada", "Grilled steak, peppers, and tortillas.", "$24"], ["Plates", "Veggie Fajitas", "Seasonal vegetables, warm tortillas.", "$16"],
        ["Drinks", "House Margarita", "Lime, agave, and a salted rim.", "$11"], ["Drinks", "Horchata", "Cinnamon rice milk, made daily.", "$5"],
      ] },
      { t: "cards", id: "specials", eyebrow: "This week", title: "Specials worth the trip", cards: [
        { ic: "star", name: "Taco Tuesday", desc: "Three tacos for $9, all day.", feat: true }, { ic: "clock", name: "Happy Hour", desc: "Half-price apps and $6 margaritas, Mon to Fri 3 to 6pm." }, { ic: "heart", name: "Sunday Family Feast", desc: "Feeds four for $59, with sides and dessert." },
      ] },
      { t: "split", id: "catering", eyebrow: "Catering", title: "Feed the whole team", sub: "Trays for 10 to 200 guests, delivered hot. Tell us your date and headcount and we will send a quote.", icon: "plate" },
      { t: "split", id: "visit", eyebrow: "Visit", title: "Pull up a chair", sub: "Reservations for parties of six or more.", hours: [["Mon to Thu", "11am to 9pm"], ["Fri and Sat", "11am to 10pm"], ["Sunday", "10am to 8pm"]], address: "301 Example Blvd, Lynnwood, WA" },
      { t: "cta", id: "order", title: "Hungry? Order now.", sub: "Pickup in about 20 minutes, or ask about catering.", button: "Send", done: "On a real site this connects to your ordering and catering inbox.", fields: [{ label: "Your name" }, { label: "Phone", type: "tel" }, { label: "Order or catering details", area: true }] },
    ],
  },
  {
    key: "game-store", type: "game and hobby store", name: "Level Up Game Exchange", icon: "gamepad", seed: 8,
    theme: { font: "slab", bg: "#0e1230", surface: "#171c45", ink: "#eef0ff", muted: "#a5abd6", dark: true, accent: "#8b6bff", accentInk: "#fff", line: "#272d63" },
    nav: [["Shop", "shop"], ["Trade-ins", "trade"], ["Events", "events"], ["Repairs", "repairs"]],
    headline: "Buy it. Trade it. Play it. Repeat.",
    lead: "Retro and modern games, consoles, and collectibles. We buy, sell, trade, and repair, and we host the best game nights around.",
    heroCta: ["Get a Trade-In Quote", "On your site this opens your trade-in quote form."], secondary: "Shop now",
    badges: ["30-day warranty", "Fair trade-in values", "Weekly events"],
    float: [["New in stock", "Retro consoles"], ["Friday night", "Card tournament"]],
    address: "700 Example Pkwy, Seattle, WA",
    blocks: [
      { t: "strip", items: [["10,000+", "Games in stock"], ["30 day", "Warranty"], ["Weekly", "Game nights"], ["Same day", "Most repairs"]] },
      { t: "tiles", id: "shop", eyebrow: "Shop", title: "Fresh in the case", icon: "gamepad", min: 210, tiles: [
        { name: "Retro Console Bundle", desc: "Tested, with 2 controllers", price: "$129", icon: "gamepad" }, { name: "Handheld, Refurbished", desc: "Like new, 64GB", price: "$219", icon: "gamepad" }, { name: "Boxed Classic Game", desc: "Complete in box", price: "$39", icon: "dice" }, { name: "Collector Card Pack", desc: "Sealed", price: "$5", icon: "star" }, { name: "Wireless Controller", desc: "Brand new", price: "$59", icon: "gamepad" }, { name: "Board Game, Strategy", desc: "Open box, complete", price: "$34", icon: "dice" },
      ] },
      { t: "split", id: "trade", eyebrow: "Trade-ins", title: "Turn old games into new ones", steps: [["Tell us what you have", "List your games and consoles in the quote form."], ["Get an instant estimate", "See a fair value range before you leave the house."], ["Bring them in", "We confirm the condition and pay cash or store credit."]], icon: "gamepad" },
      { t: "rows", id: "events", eyebrow: "Events", title: "Play with the community", sub: "Your calendar updates from a simple list you manage.", rows: [
        ["Weekly", "Friday Night Cards", "Casual tournament, prizes for top three.", "Fri 6pm"], ["Weekly", "Retro Saturday", "Free play on the old consoles.", "Sat 1pm"], ["Monthly", "Board Game Night", "Bring a friend, learn something new.", "1st Thu"], ["Special", "Holiday Trade Fair", "Buy, sell, and swap with other collectors.", "Dec 14"],
      ] },
      { t: "cards", id: "repairs", eyebrow: "Repairs", title: "We fix what you love", cards: [
        { ic: "bolt", name: "Console repair", desc: "HDMI ports, overheating, and disc drives.", meta: ["from $49", "Quote"], demo: "On your site this opens a repair request form." }, { ic: "shield", name: "Controller repair", desc: "Stick drift, buttons, and shells.", meta: ["from $25", "Quote"], demo: "On your site this opens a repair request form." }, { ic: "heart", name: "Cleaning and restore", desc: "Yellowed shells, dusty cartridges, and more.", meta: ["from $15", "Quote"], demo: "On your site this opens a repair request form." },
      ] },
      { t: "cta", id: "quote", title: "Get your trade-in quote", sub: "List what you have and we will email a fair estimate.", button: "Send Quote Request", done: "On a real site this emails the shop and texts you a confirmation.", fields: [{ label: "Your name" }, { label: "Email", type: "email" }, { label: "What are you trading in?", area: true }] },
    ],
  },
];

for (const d of DEMOS) {
  const dir = join(ROOT, "demos", d.key);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), page(d));
}
console.log(`Wrote ${DEMOS.length} demo pages to /demos`);
