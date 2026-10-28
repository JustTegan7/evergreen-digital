/* =============================================================================
   build-landing-pages.mjs, niche + city landing page generator
   Evergreen Digital · evergreendigitalco.com
   =============================================================================

   Usage:   npm run pages        (or: node scripts/build-landing-pages.mjs)

   Writes one page per entry in PAGES to /websites/<slug>/index.html, a hub
   page at /websites/index.html, and refreshes the landing-page block in
   sitemap.xml. The generated HTML is committed, so the live site still has
   no build step. Only re-run this when you add or edit a page here.

   ADDING A PAGE
   -------------
   Copy an entry in PAGES, change the slug/niche/city and write fresh copy.
   Keep each page's copy genuinely different. Google ignores near-duplicate
   "city swap" pages, and so do customers. Never invent stats, clients or
   reviews. No em dashes in copy (site style).
   ============================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://www.evergreendigitalco.com";
const TODAY = new Date().toISOString().slice(0, 10);

const NEARBY = "Everett, Mill Creek, Lynnwood, Bothell, Marysville, Edmonds, Snohomish";

/* ── Shared FAQ answers ───────────────────────────────────────────────────── */

const FAQ_PRICE = {
  q: "How much does a website cost?",
  a: "Our plans run from $30 to $350 a month with a one-time setup fee of $500 to $2,000 depending on the plan. Hosting, security, backups, and updates are included in every plan, so there's no surprise bill later. Growth and Elite are month-to-month.",
};
const FAQ_TIME = {
  q: "How long does it take?",
  a: "Most sites are live within 2 to 3 weeks of signing. We do the writing, setup, and launch. You review it and tell us what to change.",
};
const FAQ_LOCAL = (city) => ({
  q: `Do you meet in person in ${city}?`,
  a: `Yes. We're based in Mill Creek and come to you anywhere in Snohomish County, including ${city}. We're also happy to do everything over the phone or a video call.`,
});

/* ── Pages ────────────────────────────────────────────────────────────────── */

const PAGES = [
  {
    slug: "auto-detailing-websites-everett",
    niche: "Auto Detailers",
    nicheShort: "detailing",
    city: "Everett",
    showcase: "auto-detailing",
    plan: "Growth",
    title: "Websites for Auto Detailers in Everett, WA | Evergreen Digital",
    description:
      "Websites for auto detailing businesses in Everett, WA. Before and after galleries, clear packages, quote requests, and local SEO. Plans from $30/mo.",
    h1: "Websites for auto detailers in Everett",
    intro:
      "Detailing sells on before and after photos and on how fast someone can get a quote. If your best work lives only on Instagram, the people searching \"car detailing near me\" in Everett are finding someone else first.",
    problems: [
      ["Your work isn't where buyers look", "Most detailing customers search Google, compare two or three shops, and pick the one that looks most professional. A gallery buried in a social feed doesn't make that shortlist."],
      ["Pricing is a mystery", "When packages aren't listed, people assume you're expensive and keep scrolling. Clear packages (interior, exterior, full, ceramic) let them choose before they call."],
      ["Getting a quote takes too long", "A quote form that asks for the vehicle, the package, and a photo gets you a ready-to-book lead instead of a back-and-forth text thread."],
    ],
    includes: [
      "Before and after gallery that loads fast on phones",
      "Package and pricing pages written for you",
      "Quote request form with vehicle details",
      "Tap-to-call and text buttons on every page",
      "Google Business Profile setup, with your service area for mobile detailing",
      "Local SEO for Everett and nearby cities",
    ],
    faqs: [
      { q: "I'm a mobile detailer. Do I need an address on the site?", a: "No. We set you up as a service-area business, listing the cities you cover instead of a street address, both on your site and your Google Business Profile." },
      { q: "Can customers book online?", a: "Yes. We can connect the booking tool you already use, or add online booking as part of a custom setup. We'll talk through what fits on your free call." },
      FAQ_PRICE,
      FAQ_LOCAL("Everett"),
    ],
  },
  {
    slug: "church-websites-snohomish-county",
    niche: "Churches",
    nicheShort: "church",
    city: "Snohomish County",
    showcase: "church",
    plan: "Growth",
    title: "Church Websites in Snohomish County, WA | Evergreen Digital",
    description:
      "Church websites for congregations in Snohomish County. Service times, Plan Your Visit, events, sermons, and online giving, kept up to date for you. From $30/mo.",
    h1: "Church websites for Snohomish County congregations",
    intro:
      "Almost every first-time guest visits your website before they visit on Sunday. They want three things: when services are, what to expect, and whether they'll feel welcome. Most church sites make them dig for all three.",
    problems: [
      ["Service times are hard to find", "If a visitor has to scroll past three announcements to find when you meet, some won't. Times and location belong at the top of every page."],
      ["Nobody has time to update it", "Volunteer-run sites drift out of date fast. Old events and last year's sermon series tell visitors the church isn't active, even when it is."],
      ["Giving is clunky", "Online giving that takes five clicks loses gifts. A clear, trusted Give page makes it simple for members and visitors alike."],
    ],
    includes: [
      "Service times and directions on every page",
      "A Plan Your Visit page for first-time guests",
      "Ministries, events, and sermon pages",
      "Connection to your online giving platform",
      "Monthly edits so it stays current without a volunteer",
      "Google Business Profile so you show up in \"church near me\"",
    ],
    faqs: [
      { q: "Can you work with our existing giving platform?", a: "Yes. We link or embed the platform you already use (Tithe.ly, Pushpay, Planning Center, and similar) so nothing changes for your members." },
      { q: "Who updates events and sermons?", a: "We do. Send updates by email and we make the edits, using the monthly edit time included in your plan. Staff can also make simple updates if you'd like." },
      FAQ_PRICE,
      FAQ_TIME,
    ],
  },
  {
    slug: "salon-websites-mill-creek",
    niche: "Salons & Barbershops",
    nicheShort: "salon",
    city: "Mill Creek",
    showcase: "salon",
    plan: "Growth",
    title: "Salon & Barbershop Websites in Mill Creek, WA | Evergreen Digital",
    description:
      "Websites for hair salons and barbershops in Mill Creek and Snohomish County. Service menus, stylist pages, galleries, and online booking. Plans from $30/mo.",
    h1: "Websites for salons and barbershops in Mill Creek",
    intro:
      "People choose a stylist with their eyes, then book with their thumbs. Your site has to show off real work, make prices clear, and get someone into the booking calendar in a few taps. We rebuilt Barclay's Salon around exactly that.",
    problems: [
      ["Stock photos instead of your work", "Clients want to see your cuts and color, not a model from a photo library. A real gallery and stylist pages build trust before the first appointment."],
      ["Booking is a phone call away", "If booking means calling during business hours, the 10pm browsers book somewhere else. Online booking, or a link to the tool you already use, captures them."],
      ["An outdated site that's hard to fix", "Old themes break, plugins conflict, and simple changes turn into projects. With a managed plan, edits are just an email away."],
    ],
    includes: [
      "Service menu with prices",
      "Stylist pages and a photo gallery",
      "Online booking or a link to your booking app",
      "Review highlights from Google",
      "Gift card and specials pages",
      "Local SEO for Mill Creek and nearby cities",
    ],
    faqs: [
      { q: "We already use a booking app. Can we keep it?", a: "Yes. We connect your existing booking tool so your calendar and client history stay exactly where they are. For Barclay's Salon we also built a custom staff portal, which is available as an add-on." },
      { q: "Can you take photos of our work?", a: "Yes. Photo and video is available as an add-on, quoted per shoot. Real photos of your space and work convert far better than stock images." },
      FAQ_PRICE,
      FAQ_LOCAL("Mill Creek"),
    ],
  },
  {
    slug: "contractor-websites-everett",
    niche: "Contractors & Home Services",
    nicheShort: "contractor",
    city: "Everett",
    showcase: "trades",
    plan: "Growth",
    title: "Websites for Contractors & Home Services in Everett, WA | Evergreen Digital",
    description:
      "Websites for plumbers, electricians, HVAC, roofers, and contractors in Everett, WA. Tap-to-call, service area pages, reviews, and quote forms. From $30/mo.",
    h1: "Websites for contractors and home service pros in Everett",
    intro:
      "When a water heater fails at 7am, homeowners call the first company that looks trustworthy on their phone. Plumbers, electricians, HVAC techs, and roofers win that call with a fast site, a big phone button, and reviews right up front.",
    problems: [
      ["The phone number is hard to tap", "On a phone, your number should be one tap away on every page. If it's buried in the footer or not clickable, that call goes to the next listing."],
      ["You don't show up for nearby cities", "Customers search \"plumber Lynnwood\" or \"electrician Marysville\". Without pages for the areas you serve, Google doesn't connect you to those searches."],
      ["Your reviews aren't doing any work", "You've earned good reviews on Google. Showing them on your site, next to the call button, is what turns a comparison shopper into a booked job."],
    ],
    includes: [
      "Tap-to-call button on every page",
      "Service pages for each type of job you do",
      "Service area pages for the cities you cover",
      "Quote request form with photo upload",
      "Your Google reviews displayed on the site",
      "Google Business Profile management on Growth",
    ],
    faqs: [
      { q: "Can leads go straight to my phone?", a: "Yes. Quote requests can come to you by email and text. Our Lead CRM + Routing add-on also sends each lead to the right person and follows up automatically." },
      { q: "Do I need to write the content?", a: "No. We write your service and area pages after a short call about the work you do and the jobs you want more of." },
      FAQ_PRICE,
      FAQ_LOCAL("Everett"),
    ],
  },
  {
    slug: "restaurant-websites-lynnwood",
    niche: "Restaurants",
    nicheShort: "restaurant",
    city: "Lynnwood",
    showcase: "restaurant",
    plan: "Growth",
    title: "Restaurant Websites in Lynnwood, WA | Evergreen Digital",
    description:
      "Restaurant websites in Lynnwood and Snohomish County. Mobile-friendly menus, hours, online ordering links, and catering pages, kept current for you. From $30/mo.",
    h1: "Restaurant websites in Lynnwood",
    intro:
      "Hungry people decide where to eat in under a minute, almost always on a phone. If your menu is a blurry PDF or your hours are out of date, they're already heading somewhere else.",
    problems: [
      ["The menu is a PDF", "PDF menus are tiny on a phone and invisible to Google. A real menu page loads instantly, reads easily, and helps you show up when people search for a dish."],
      ["Hours and specials go stale", "Holiday hours, new specials, and seasonal menus change constantly. With monthly edits included, we keep them current so you're not fielding \"are you open?\" calls."],
      ["Ordering lives somewhere else", "Online ordering, delivery apps, and reservations should be one tap from your homepage, not hidden behind three menus."],
    ],
    includes: [
      "A mobile-friendly menu page (no PDFs)",
      "Hours, location, and tap-to-call up top",
      "Links to your ordering, delivery, and reservation tools",
      "Catering and private events page",
      "Photo gallery of your food and space",
      "Google Business Profile with menu and hours kept in sync",
    ],
    faqs: [
      { q: "Can you update the menu when prices change?", a: "Yes. Send us the changes and we update it, using the edit time included in your plan." },
      { q: "Do you build online ordering?", a: "We connect the ordering platform you already use. If you want your own online ordering without a third-party cut, our eCommerce Storefront add-on can handle it." },
      FAQ_PRICE,
      FAQ_LOCAL("Lynnwood"),
    ],
  },
  {
    slug: "boutique-websites-edmonds",
    niche: "Boutiques & Gift Shops",
    nicheShort: "boutique",
    city: "Edmonds",
    showcase: "boutique",
    plan: "Elite",
    title: "Boutique & Gift Shop Websites in Edmonds, WA | Evergreen Digital",
    description:
      "Websites and online stores for boutiques and gift shops in Edmonds and Snohomish County. Managed storefronts at 2.5% per sale, not 5 to 8%. From $30/mo.",
    h1: "Websites and online stores for Edmonds boutiques",
    intro:
      "A boutique wins on feel, not price. Your site should feel like walking into your shop, and it should keep selling after you lock the door. Most shop owners just don't have time to run an online store on top of a real one.",
    problems: [
      ["The store is open 40 hours a week", "Shoppers browse at night and on weekends. An online store lets them buy, or at least plan a visit, when you're closed."],
      ["Platform fees eat the margin", "Many agencies and platforms take 5 to 8% of every sale. Our managed storefront takes 2.5%, and we run it for you."],
      ["Nobody knows what's new", "New arrivals are why regulars come back. A New Arrivals page and a monthly email bring them in the door."],
    ],
    includes: [
      "A site designed to match the feel of your shop",
      "Managed online store (add-on, $79/mo + 2.5%)",
      "New arrivals and gift guide pages",
      "Visit us page with hours, parking, and directions",
      "Email marketing on Elite (1 campaign/mo)",
      "Gift card page",
    ],
    faqs: [
      { q: "Do I have to sell everything online?", a: "No. Many shops start with a few best sellers and gift cards online, then grow from there. You choose what goes on the store." },
      { q: "Will it work with my point of sale?", a: "Often, yes. We'll look at what you use today on your free call and tell you exactly what connects and what doesn't." },
      FAQ_PRICE,
      FAQ_LOCAL("Edmonds"),
    ],
  },
];

/* ── Templates ────────────────────────────────────────────────────────────── */

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function head({ title, description, url, schema }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:image" content="${SITE}/assets/og-image.png" />
    <meta property="og:site_name" content="Evergreen Digital" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">
${JSON.stringify(schema, null, 2).replace(/^/gm, "      ")}
    </script>
    <link rel="icon" type="image/svg+xml" href="/assets/icons/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/css/styles.css" />
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-X0JSYKGG8L"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag() { dataLayer.push(arguments); }
      gtag("js", new Date());
      gtag("config", "G-X0JSYKGG8L");
    </script>
  </head>`;
}

const nav = `
    <nav class="nav" id="main-nav" aria-label="Main navigation">
      <a href="/" class="nav__logo" aria-label="Evergreen Digital, Home">
        <img src="/assets/brand/logo.svg" alt="Evergreen Digital" width="160" height="36" />
      </a>
      <div class="nav__links">
        <a href="#audit">Free Site Check</a>
        <a href="/#showcase">Demos</a>
        <a href="/#services">Packages</a>
        <a href="/websites/">Industries</a>
      </div>
      <a class="nav__cta" href="/#contact">Book a Free Call →</a>
    </nav>`;

function footer(currentSlug) {
  const links = PAGES.filter((p) => p.slug !== currentSlug)
    .map((p) => `<a href="/websites/${p.slug}/">${esc(p.niche)} in ${esc(p.city)}</a>`)
    .join("\n          ");
  return `
    <section class="lp-related" aria-label="Other industries we build for">
      <div class="section-wrap">
        <p class="lp-related__title">We also build websites for</p>
        <div class="lp-related__links">
          ${links}
        </div>
      </div>
    </section>

    <footer class="footer" role="contentinfo">
      <div class="footer__brand">
        <img src="/assets/brand/logo-light.svg" alt="Evergreen Digital" width="130" height="28" />
      </div>
      <p class="footer__copy">
        © ${new Date().getFullYear()} Evergreen Digital LLC · Built for local business.<br />
        <span class="footer__area">Serving ${NEARBY} &amp; all of Snohomish County, WA</span>
      </p>
      <nav class="footer__links" aria-label="Footer navigation">
        <a href="/#services">Packages</a>
        <a href="/websites/">Industries</a>
        <a href="/#contact">Contact</a>
        <a href="/privacy-policy.html">Privacy Policy</a>
      </nav>
    </footer>

    <script type="module" src="/js/landing.js"></script>
  </body>
</html>
`;
}

function auditBlock(p) {
  return `
    <section class="audit audit--compact" id="audit" aria-label="Free website check">
      <div class="section-wrap audit__grid">
        <div class="audit__intro">
          <p class="section-label">Free Website Check</p>
          <h2>Already have a ${esc(p.nicheShort)} website?</h2>
          <p class="section-sub">
            See how it scores in about 30 seconds: speed on phones, how easy
            it is to call or book, what Google sees, and what's broken.
          </p>
        </div>
        <div class="audit-card">
          <p class="audit-card__title">Check your site, free</p>
          <p class="audit-card__sub">No signup to see your score.</p>
          <div data-audit-widget aria-live="polite"></div>
        </div>
      </div>
    </section>`;
}

function landingPage(p) {
  const url = `${SITE}/websites/${p.slug}/`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: `Website design for ${p.niche.toLowerCase()} in ${p.city}`,
        serviceType: "Website design and monthly website care",
        provider: { "@id": `${SITE}/#business` },
        areaServed: p.city === "Snohomish County"
          ? { "@type": "AdministrativeArea", name: "Snohomish County, Washington" }
          : [{ "@type": "City", name: `${p.city}, WA` }, { "@type": "AdministrativeArea", name: "Snohomish County, Washington" }],
        offers: { "@type": "Offer", priceCurrency: "USD", price: "30", description: "Monthly plans from $30/mo plus one-time setup" },
        url,
      },
      {
        "@type": "FAQPage",
        mainEntity: p.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: "Industries", item: `${SITE}/websites/` },
          { "@type": "ListItem", position: 3, name: `${p.niche} in ${p.city}`, item: url },
        ],
      },
    ],
  };

  return `${head({ title: p.title, description: p.description, url, schema })}
  <body class="lp">
    <!-- GENERATED by scripts/build-landing-pages.mjs. Edit the PAGES data there, then run: npm run pages -->
${nav}

    <header class="lp-hero">
      <div class="section-wrap">
        <nav class="lp-crumbs" aria-label="Breadcrumb">
          <a href="/">Home</a> <span aria-hidden="true">/</span>
          <a href="/websites/">Industries</a> <span aria-hidden="true">/</span>
          <span>${esc(p.niche)} in ${esc(p.city)}</span>
        </nav>
        <p class="hero__tag">${esc(p.niche)} · ${esc(p.city)}, WA</p>
        <h1 class="lp-hero__h1">${esc(p.h1)}</h1>
        <p class="lp-hero__intro">${esc(p.intro)}</p>
        <div class="hero__actions">
          <a class="btn-primary" href="/#contact">Book a Free Discovery Call →</a>
          <a class="btn-ghost" href="/#showcase?biz=${p.showcase}">See a ${esc(p.nicheShort)} demo →</a>
        </div>
        <p class="lp-hero__price">Plans from $30/mo · Most sites live in 2 to 3 weeks · Local to Snohomish County</p>
      </div>
    </header>

    <main>
      <section class="lp-section" aria-labelledby="problems-h">
        <div class="section-wrap">
          <p class="section-label">What we see</p>
          <h2 id="problems-h">Where ${esc(p.nicheShort)} websites lose customers</h2>
          <div class="lp-problems">
            ${p.problems
              .map(([h, t], i) => `<div class="lp-problem"><span class="lp-problem__num">${i + 1}</span><h3>${esc(h)}</h3><p>${esc(t)}</p></div>`)
              .join("\n            ")}
          </div>
        </div>
      </section>

      <section class="lp-section lp-section--tint" aria-labelledby="includes-h">
        <div class="section-wrap lp-split">
          <div>
            <p class="section-label">What you get</p>
            <h2 id="includes-h">Built for ${esc(p.niche.toLowerCase())}, managed every month</h2>
            <p class="section-sub">
              We design it, write it, launch it, and keep it fast, secure, and
              up to date. Most ${esc(p.nicheShort)} clients fit our
              <strong>${esc(p.plan)}</strong> plan.
            </p>
            <a class="btn-primary" href="/#services">Compare Plans →</a>
          </div>
          <ul class="lp-includes">
            ${p.includes.map((i) => `<li>${esc(i)}</li>`).join("\n            ")}
          </ul>
        </div>
      </section>
${auditBlock(p)}

      <section class="lp-section" aria-labelledby="faq-h">
        <div class="section-wrap lp-faq">
          <p class="section-label">Questions</p>
          <h2 id="faq-h">Common questions</h2>
          ${p.faqs.map((f) => `<details class="lp-faq__item"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("\n          ")}
        </div>
      </section>

      <section class="lp-cta" aria-label="Book a call">
        <div class="section-wrap">
          <h2>Let's talk about your ${esc(p.nicheShort)} website.</h2>
          <p>Free 20-minute call. We'll look at what you have now and tell you exactly what we'd change. Based in Mill Creek, serving ${esc(p.city === "Snohomish County" ? NEARBY : p.city + " and all of Snohomish County")}.</p>
          <a class="btn-primary" href="/#contact">Book a Free Call →</a>
        </div>
      </section>
    </main>
${footer(p.slug)}`;
}

function hubPage() {
  const url = `${SITE}/websites/`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Websites by industry",
    url,
    hasPart: PAGES.map((p) => ({ "@type": "WebPage", name: `${p.niche} in ${p.city}`, url: `${SITE}/websites/${p.slug}/` })),
  };
  return `${head({
    title: "Websites by Industry | Evergreen Digital, Snohomish County WA",
    description: "Website design and monthly care plans for local businesses in Snohomish County: detailers, churches, salons, contractors, restaurants, and boutiques.",
    url,
    schema,
  })}
  <body class="lp">
    <!-- GENERATED by scripts/build-landing-pages.mjs. Run: npm run pages -->
${nav}
    <header class="lp-hero">
      <div class="section-wrap">
        <p class="hero__tag">Industries</p>
        <h1 class="lp-hero__h1">Websites built for how your business actually works</h1>
        <p class="lp-hero__intro">Every industry loses customers in different places. Pick yours to see what we focus on.</p>
      </div>
    </header>
    <main>
      <section class="lp-section">
        <div class="section-wrap lp-hub">
          ${PAGES.map(
            (p) => `<a class="lp-hub__card" href="/websites/${p.slug}/"><span class="lp-hub__city">${esc(p.city)}</span><span class="lp-hub__niche">${esc(p.niche)}</span><span class="lp-hub__go">See how we help →</span></a>`
          ).join("\n          ")}
        </div>
      </section>
${auditBlock({ nicheShort: "business" })}
    </main>
${footer(null)}`;
}

/* ── Write files ──────────────────────────────────────────────────────────── */

const outDir = path.join(ROOT, "websites");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "index.html"), hubPage());
for (const p of PAGES) {
  fs.mkdirSync(path.join(outDir, p.slug), { recursive: true });
  fs.writeFileSync(path.join(outDir, p.slug, "index.html"), landingPage(p));
}

// Refresh the generated block in sitemap.xml
const sitemapPath = path.join(ROOT, "sitemap.xml");
let sitemap = fs.readFileSync(sitemapPath, "utf8");
const block =
  "  <!-- landing-pages:start (generated by scripts/build-landing-pages.mjs) -->\n" +
  [`${SITE}/websites/`, ...PAGES.map((p) => `${SITE}/websites/${p.slug}/`)]
    .map((loc) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`)
    .join("\n\n") +
  "\n  <!-- landing-pages:end -->\n";
if (sitemap.includes("<!-- landing-pages:start")) {
  sitemap = sitemap.replace(/  <!-- landing-pages:start[\s\S]*?<!-- landing-pages:end -->\n/, block);
} else {
  sitemap = sitemap.replace("</urlset>", block + "\n</urlset>");
}
fs.writeFileSync(sitemapPath, sitemap);

console.log(`Wrote ${PAGES.length} landing pages + hub to /websites and updated sitemap.xml`);
