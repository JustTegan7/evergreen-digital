/* =============================================================================
   audit-core.js, the website audit engine
   Evergreen Digital · evergreendigitalco.com
   =============================================================================

   runAudit(url) fetches one homepage plus a few supporting files and returns
   a scored checklist. The checks were approved in Oct 2026:

     First impression   mobile speed, mobile layout, CTA near the top,
                        click-to-call phone
     Trust              HTTPS, reviews/testimonials, current copyright year
     Findability        title tag, meta description, one H1, not blocked
                        from Google, local business schema
     Local presence     Google Business Profile with reviews,
                        name/address/phone visible and consistent
     Behind the scenes  broken links, image alt text, analytics, sitemap
     Freshness          when the site was last meaningfully updated

   Optional environment variables (Vercel > Settings > Environment Variables):
     PAGESPEED_API_KEY       Google PageSpeed Insights key. Works without one,
                             but Google's shared anonymous quota runs out fast.
     GOOGLE_PLACES_API_KEY   Places API (New) key. Without it the Google
                             Business Profile check is skipped (not scored).

   Copy shown to visitors avoids em dashes to match the rest of the site.
   ============================================================================= */

import { safeFetch, tryFetch, normaliseUrl, UserError } from "./safe-fetch.js";
import {
  findTags,
  findElements,
  metaContent,
  textOf,
  stripNonContent,
  jsonLdObjects,
  schemaTypes,
} from "./html.js";

export { UserError };

export const CATEGORIES = [
  "First impression",
  "Trust",
  "Findability",
  "Local presence",
  "Behind the scenes",
  "Freshness",
];

const STATUS_FACTOR = { pass: 1, warn: 0.5, fail: 0 };

/* ── Small helpers ────────────────────────────────────────────────────────── */

const check = (id, category, label, weight, status, detail, fix = "") => ({
  id,
  category,
  label,
  weight,
  status,
  detail,
  fix,
});

const hostKey = (h) => h.toLowerCase().replace(/^www\./, "");
const digits = (s) => String(s || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtMonth = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\b[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;
const STREET_RE =
  /\b\d{1,6}\s+(?:[NSEW]\.?\s+|North\s+|South\s+|East\s+|West\s+)?(?:[A-Za-z0-9.'-]+\s){0,4}(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Hwy|Highway|Pl|Place|Ct|Court|Pkwy|Parkway|Cir|Circle|Ter|Terrace|Loop|Sq)\b\.?/i;
const CTA_RE =
  /\b(call|book|schedule|appointment|reserve|contact|get (a |your )?(free )?(quote|estimate|started)|request|order|shop|visit|donate|give|join|sign up|free estimate|get in touch|menu)\b/i;
const REVIEW_RE = /\b(testimonials?|reviews?|what (our )?(customers|clients|people) (say|are saying)|rated \d|5[- ]star|★★★)/i;

/* ── External services ────────────────────────────────────────────────────── */

async function pageSpeed(url) {
  const params = new URLSearchParams({ url, strategy: "mobile", category: "performance" });
  if (process.env.PAGESPEED_API_KEY) params.set("key", process.env.PAGESPEED_API_KEY);
  try {
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`, {
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const lh = data.lighthouseResult;
    if (!lh?.categories?.performance) return null;
    const audits = lh.audits || {};
    return {
      score: Math.round(lh.categories.performance.score * 100),
      lcp: audits["largest-contentful-paint"]?.displayValue || null,
      lcpMs: audits["largest-contentful-paint"]?.numericValue || null,
      viewportOk: audits.viewport ? audits.viewport.score === 1 : null,
    };
  } catch {
    return null;
  }
}

async function findBusinessProfile(name, siteHost, city) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !name) return { checked: false };
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: {
        "content-type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "places.displayName,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.formattedAddress,places.googleMapsUri",
      },
      body: JSON.stringify({ textQuery: [name, city].filter(Boolean).join(" "), pageSize: 10 }),
    });
    if (!res.ok) return { checked: false };
    const data = await res.json();
    const places = data.places || [];
    const match = places.find((p) => {
      try {
        return p.websiteUri && hostKey(new URL(p.websiteUri).hostname) === hostKey(siteHost);
      } catch {
        return false;
      }
    });
    return { checked: true, place: match || null };
  } catch {
    return { checked: false };
  }
}

/* ── Page signal extraction ───────────────────────────────────────────────── */

function guessBusinessName(html, schema) {
  const fromSchema = schema.find((o) => o.name && o["@type"] && !/^(WebSite|WebPage)$/.test(o["@type"]))?.name;
  if (fromSchema) return String(fromSchema);
  const og = metaContent(html, "og:site_name");
  if (og) return og;
  const title = textOf(findElements(html, "title")[0]?.inner || "");
  const parts = title.split(/\s[|\-–—:·]\s/).map((s) => s.trim()).filter(Boolean);
  const generic = /^(home|homepage|welcome|index)$/i;
  return parts.filter((p) => !generic.test(p)).sort((a, b) => a.length - b.length)[0] || null;
}

/* ── The audit ────────────────────────────────────────────────────────────── */

export async function runAudit(rawUrl) {
  const startUrl = normaliseUrl(rawUrl);
  const started = Date.now();

  // Kick off PageSpeed immediately, it is the slowest piece by far.
  const speedPromise = pageSpeed(startUrl.href);

  const page = await safeFetch(startUrl, { timeoutMs: 12000 });
  if (!page.ok) {
    throw new UserError(`That website answered with an error (${page.status}). Check the address and try again.`);
  }
  const contentType = page.headers.get("content-type") || "";
  if (!/html/i.test(contentType) && !/<html|<body/i.test(page.text)) {
    throw new UserError("That address didn't return a web page.");
  }

  const finalUrl = new URL(page.url);
  const origin = finalUrl.origin;
  const html = page.text;
  const body = (html.match(/<body\b[\s\S]*$/i) || [html])[0];
  const visibleText = textOf(body);
  const schema = jsonLdObjects(html);
  const types = schemaTypes(schema);
  const businessName = guessBusinessName(html, schema);
  const now = new Date();
  const year = now.getUTCFullYear();

  // Supporting fetches in parallel
  const httpUrl = new URL(finalUrl.href);
  httpUrl.protocol = "http:";
  const [httpProbe, robots] = await Promise.all([
    finalUrl.protocol === "https:" ? tryFetch(httpUrl, { timeoutMs: 6000, readBody: false }) : null,
    tryFetch(new URL("/robots.txt", origin), { timeoutMs: 5000, maxBytes: 100_000 }),
  ]);
  const robotsTxt = robots?.ok && !/<html/i.test(robots.text) ? robots.text : "";

  const sitemapCandidates = [
    ...[...robotsTxt.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]),
    new URL("/sitemap.xml", origin).href,
    new URL("/sitemap_index.xml", origin).href,
    new URL("/wp-sitemap.xml", origin).href,
  ];
  let sitemap = null;
  for (const candidate of [...new Set(sitemapCandidates)].slice(0, 4)) {
    let u;
    try {
      u = new URL(candidate, origin);
    } catch {
      continue;
    }
    const res = await tryFetch(u, { timeoutMs: 5000, maxBytes: 1_000_000 });
    if (res?.ok && /<(urlset|sitemapindex)\b/i.test(res.text)) {
      sitemap = { url: u.href, text: res.text };
      break;
    }
  }

  // Links for the broken-link sample
  const anchors = findElements(body, "a");
  const linkTargets = [];
  const seen = new Set();
  for (const a of anchors) {
    const href = (a.attrs.href || "").trim();
    if (!href || /^(#|mailto:|tel:|sms:|javascript:|data:)/i.test(href)) continue;
    let u;
    try {
      u = new URL(href, finalUrl);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(u.protocol)) continue;
    u.hash = "";
    if (seen.has(u.href) || u.href === finalUrl.href) continue;
    seen.add(u.href);
    linkTargets.push({ url: u, internal: hostKey(u.hostname) === hostKey(finalUrl.hostname), text: textOf(a.inner).slice(0, 60) });
  }
  const sample = [
    ...linkTargets.filter((l) => l.internal).slice(0, 15),
    ...linkTargets.filter((l) => !l.internal && !/facebook|instagram|twitter|x\.com|linkedin|tiktok|youtube/i.test(l.url.hostname)).slice(0, 5),
  ];
  const linkResultsPromise = mapLimit(sample, 6, async (l) => {
    let res = await tryFetch(l.url, { method: "HEAD", timeoutMs: 6000, readBody: false });
    if (!res || res.status === 405 || res.status === 403 || res.status === 501) {
      res = await tryFetch(l.url, { timeoutMs: 6000, maxBytes: 20_000 });
    }
    return { ...l, status: res ? res.status : 0 };
  });

  const city = schema.find((o) => o.address?.addressLocality)?.address?.addressLocality || null;
  const gbpPromise = findBusinessProfile(businessName, finalUrl.hostname, city);

  const [speed, linkResults, gbp] = await Promise.all([speedPromise, linkResultsPromise, gbpPromise]);

  const checks = [];

  /* ── First impression ── */

  if (speed) {
    const s = speed.score;
    checks.push(
      check(
        "speed",
        "First impression",
        "Mobile loading speed",
        12,
        s >= 90 ? "pass" : s >= 50 ? "warn" : "fail",
        `Google scores your mobile speed ${s} out of 100${speed.lcp ? `, and the main content takes ${speed.lcp} to appear` : ""}.`,
        s >= 90
          ? ""
          : "Most visitors are on phones, and many leave if a page takes more than about 3 seconds. Compressing images, trimming plugins and scripts, and better hosting usually fix this."
      )
    );
  } else {
    checks.push(
      check("speed", "First impression", "Mobile loading speed", 12, "skip", "Google's speed test didn't respond this time, so speed isn't counted in your score.", "We can run a full speed test for you on a free call.")
    );
  }

  const viewport = metaContent(html, "viewport") || "";
  const mobileOk = speed?.viewportOk ?? /width\s*=\s*device-width/i.test(viewport);
  checks.push(
    check(
      "mobile",
      "First impression",
      "Mobile-friendly layout",
      10,
      mobileOk ? "pass" : "fail",
      mobileOk ? "Your site is set up to resize for phones." : "Your site isn't set up to resize for phones, so visitors have to pinch and zoom.",
      mobileOk ? "" : "A responsive layout (with a proper viewport setting) makes the site fit any screen. This is the single biggest fix for most older sites."
    )
  );

  // CTA near the top: look at the first ~25% of the page's links and buttons.
  const clickables = [...findElements(body, "a"), ...findElements(body, "button")].sort((a, b) => a.index - b.index);
  const topCut = Math.max(8, Math.ceil(clickables.length * 0.25));
  const navEnd = body.search(/<\/(nav|header)>/i);
  const topClickables = clickables.slice(0, topCut + (navEnd > 0 ? clickables.filter((c) => c.index < navEnd).length : 0));
  const topCta = topClickables.find((c) => CTA_RE.test(textOf(c.inner)) || /^tel:/i.test(c.attrs.href || ""));
  checks.push(
    check(
      "cta",
      "First impression",
      "Clear call to action near the top",
      8,
      topCta ? "pass" : "fail",
      topCta ? `Visitors see a clear next step right away ("${textOf(topCta.inner).slice(0, 40) || "Call"}").` : "We couldn't find a clear next step (like Call, Book, or Get a Quote) near the top of your homepage.",
      topCta ? "" : "Put one obvious button in the first screen people see, for example \"Call Now\" or \"Book Online\". Visitors who have to hunt for it usually don't."
    )
  );

  const hasTel = /href\s*=\s*["']?tel:/i.test(body);
  const phoneOnPage = (visibleText.match(PHONE_RE) || [null])[0];
  checks.push(
    check(
      "click-to-call",
      "First impression",
      "Tap-to-call phone number",
      7,
      hasTel ? "pass" : phoneOnPage ? "warn" : "fail",
      hasTel
        ? "Phone visitors can tap your number to call you."
        : phoneOnPage
          ? "Your phone number is on the page, but tapping it on a phone doesn't start a call."
          : "We couldn't find a phone number on your homepage.",
      hasTel ? "" : "Make your phone number a tap-to-call link. For local businesses it's often the most-used button on the whole site."
    )
  );

  /* ── Trust ── */

  const isHttps = finalUrl.protocol === "https:";
  const httpRedirects = httpProbe ? httpProbe.url.startsWith("https:") : null;
  checks.push(
    check(
      "https",
      "Trust",
      "Secure connection (HTTPS)",
      10,
      !isHttps ? "fail" : httpRedirects === false ? "warn" : "pass",
      !isHttps
        ? "Your site isn't secure. Chrome shows visitors a \"Not secure\" warning."
        : httpRedirects === false
          ? "Your site has HTTPS, but the plain http:// version doesn't redirect to it."
          : "Your site loads securely over HTTPS.",
      !isHttps
        ? "Add an SSL certificate (often free) and redirect all traffic to https://. Browsers and Google both penalize insecure sites."
        : httpRedirects === false
          ? "Redirect http:// to https:// so every visitor gets the secure version."
          : ""
    )
  );

  const hasReviewSchema = types.some((t) => /^(Review|AggregateRating)$/.test(t)) || schema.some((o) => o.aggregateRating || o.review);
  const hasReviews = hasReviewSchema || REVIEW_RE.test(visibleText) || /elfsight|trustindex|birdeye|podium|yotpo|google-reviews/i.test(html);
  checks.push(
    check(
      "reviews",
      "Trust",
      "Reviews or testimonials",
      7,
      hasReviews ? "pass" : "fail",
      hasReviews ? "Your homepage shows reviews or testimonials." : "We didn't see any reviews or testimonials on your homepage.",
      hasReviews ? "" : "Show a few real customer reviews (your Google reviews work great). People trust other customers more than anything a business says about itself."
    )
  );

  const copyrightYears = [...visibleText.matchAll(/(?:©|&copy;|\(c\)|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)].map((m) => Number(m[1]));
  const dynamicYear = /new Date\(\)\.getFullYear\(\)|getFullYear/.test(html) && /©|copyright/i.test(visibleText);
  const latestCopyright = copyrightYears.length ? Math.max(...copyrightYears) : null;
  let copyStatus, copyDetail;
  if (latestCopyright && latestCopyright >= year) {
    copyStatus = "pass";
    copyDetail = `Your copyright year is current (${latestCopyright}).`;
  } else if (dynamicYear && !latestCopyright) {
    copyStatus = "pass";
    copyDetail = "Your copyright year updates automatically.";
  } else if (latestCopyright === year - 1) {
    copyStatus = "warn";
    copyDetail = `Your footer still says ${latestCopyright}.`;
  } else if (latestCopyright) {
    copyStatus = "fail";
    copyDetail = `Your footer says ${latestCopyright}, which tells visitors the site hasn't been touched in a while.`;
  } else {
    copyStatus = "warn";
    copyDetail = "We couldn't find a copyright line with a year in your footer.";
  }
  checks.push(
    check("copyright", "Trust", "Current copyright year", 4, copyStatus, copyDetail, copyStatus === "pass" ? "" : "A small fix, but an old year makes people wonder if the business is still open. Set it to update automatically.")
  );

  /* ── Findability ── */

  const title = textOf(findElements(html, "title")[0]?.inner || "");
  const genericTitle = /^(home|homepage|welcome|index|untitled)$/i.test(title);
  checks.push(
    check(
      "title",
      "Findability",
      "Page title",
      6,
      !title ? "fail" : genericTitle || title.length < 15 || title.length > 70 ? "warn" : "pass",
      !title
        ? "Your homepage has no title, which is the headline Google shows in search results."
        : genericTitle || title.length < 15
          ? `Your page title ("${title}") is too short to tell Google what you do.`
          : title.length > 70
            ? `Your page title is ${title.length} characters, so Google will cut it off.`
            : `Your page title looks good: "${title}".`,
      !title || genericTitle || title.length < 15 || title.length > 70
        ? "Use about 50 to 60 characters with what you do and where, for example \"Mobile Auto Detailing in Everett, WA | Joe's Detailing\"."
        : ""
    )
  );

  const desc = metaContent(html, "description");
  checks.push(
    check(
      "meta-description",
      "Findability",
      "Search result description",
      5,
      !desc ? "fail" : desc.length < 50 || desc.length > 165 ? "warn" : "pass",
      !desc
        ? "Your homepage has no description, so Google picks random text for your search listing."
        : desc.length < 50
          ? "Your search description is very short."
          : desc.length > 165
            ? "Your search description is long enough that Google will cut it off."
            : "Your homepage has a good search description.",
      !desc || desc.length < 50 || desc.length > 165 ? "Write a 120 to 155 character description that says what you do, where, and why to pick you. It's your ad copy in Google." : ""
    )
  );

  const h1s = findElements(body, "h1").filter((h) => textOf(h.inner));
  checks.push(
    check(
      "h1",
      "Findability",
      "One main heading",
      5,
      h1s.length === 1 ? "pass" : h1s.length === 0 ? "fail" : "warn",
      h1s.length === 1
        ? "Your homepage has one clear main heading."
        : h1s.length === 0
          ? "Your homepage has no main heading (H1), so Google has to guess what the page is about."
          : `Your homepage has ${h1s.length} main headings (H1s), which muddies what the page is about.`,
      h1s.length === 1 ? "" : "Use exactly one main heading that says what you do, then smaller headings for each section."
    )
  );

  const robotsMeta = (metaContent(html, "robots") || "") + " " + (page.headers.get("x-robots-tag") || "");
  let blocked = /noindex/i.test(robotsMeta);
  if (!blocked && robotsTxt) {
    // Disallow: / inside the "User-agent: *" or Googlebot group
    const groups = robotsTxt.split(/(?=^\s*user-agent:)/gim);
    blocked = groups.some((g) => /user-agent:\s*(\*|googlebot)\s*$/im.test(g) && /^\s*disallow:\s*\/\s*$/im.test(g));
  }
  checks.push(
    check(
      "indexable",
      "Findability",
      "Visible to Google",
      8,
      blocked ? "fail" : "pass",
      blocked ? "Your site is telling Google not to list it in search results." : "Nothing on your site is blocking Google from listing it.",
      blocked ? "Remove the \"noindex\" setting or the robots.txt block. This is often left on by accident after a site launches, and it's an easy fix." : ""
    )
  );

  const LOCAL_TYPES =
    /LocalBusiness|Store|Restaurant|CafeOrCoffeeShop|BarOrPub|Bakery|FoodEstablishment|AutomotiveBusiness|AutoRepair|AutoWash|AutoDealer|HealthAndBeautyBusiness|HairSalon|BeautySalon|DaySpa|NailSalon|HomeAndConstructionBusiness|Plumber|Electrician|HVACBusiness|RoofingContractor|GeneralContractor|HousePainter|Locksmith|MovingCompany|ProfessionalService|LegalService|Attorney|AccountingService|Dentist|MedicalBusiness|ExerciseGym|SportsActivityLocation|PlaceOfWorship|Church|LodgingBusiness|EntertainmentBusiness|ChildCare|AnimalShelter|FinancialService|RealEstateAgent|InsuranceAgency|TravelAgency|EmploymentAgency|DryCleaningOrLaundry|SelfStorage|TattooParlor|ArtGallery/;
  const hasLocalSchema = types.some((t) => LOCAL_TYPES.test(t));
  const hasOrgSchema = types.some((t) => /Organization|Corporation|NGO/.test(t));
  checks.push(
    check(
      "local-schema",
      "Findability",
      "Local business info for Google",
      5,
      hasLocalSchema ? "pass" : hasOrgSchema ? "warn" : "fail",
      hasLocalSchema
        ? "Your site includes behind-the-scenes business info (schema) Google uses for local results."
        : hasOrgSchema
          ? "Your site has some business info for Google, but not the local business kind that helps in map results."
          : "Your site doesn't include behind-the-scenes business info (schema) for Google.",
      hasLocalSchema ? "" : "Add LocalBusiness schema with your name, address, phone, hours, and service area. It's invisible to visitors but helps you show up in local searches."
    )
  );

  /* ── Local presence ── */

  const schemaPhone = schema.find((o) => o.telephone)?.telephone;
  const sitePhone = schemaPhone || (body.match(/href\s*=\s*["']?tel:([^"'\s>]+)/i) || [])[1] || phoneOnPage;
  const hasAddress = STREET_RE.test(visibleText) || schema.some((o) => o.address?.streetAddress);
  const serviceArea = /\b(serving|service area|we serve|areas? we serve)\b/i.test(visibleText) || schema.some((o) => o.areaServed);

  if (gbp.checked) {
    const p = gbp.place;
    const count = p?.userRatingCount || 0;
    checks.push(
      check(
        "gbp",
        "Local presence",
        "Google Business Profile with reviews",
        8,
        !p ? "fail" : count >= 10 ? "pass" : "warn",
        !p
          ? "We couldn't find a Google Business Profile that links to this website."
          : count >= 10
            ? `Your Google Business Profile has ${count} reviews${p.rating ? ` (${p.rating} stars)` : ""}.`
            : `Your Google Business Profile only has ${count} review${count === 1 ? "" : "s"}.`,
        !p
          ? "Claim or update your free Google Business Profile and add this website to it. It's how most people find local businesses on Google Maps."
          : count >= 10
            ? ""
            : "Ask happy customers for reviews. Businesses with more recent reviews show up higher on Google Maps."
      )
    );
  } else {
    checks.push(
      check("gbp", "Local presence", "Google Business Profile with reviews", 8, "skip", "We check your Google Business Profile by hand, so this one isn't counted in your score.", "We'll review your profile, reviews, and photos with you on a free call.")
    );
  }

  let napStatus, napDetail, napFix = "";
  const gbpPhone = gbp.place?.nationalPhoneNumber;
  if (gbpPhone && sitePhone && digits(gbpPhone) !== digits(sitePhone)) {
    napStatus = "fail";
    napDetail = `The phone number on your site doesn't match your Google Business Profile (${gbpPhone}).`;
    napFix = "Use the exact same business name, address, and phone everywhere. Mismatches confuse Google and cost you map rankings.";
  } else if (sitePhone && (hasAddress || serviceArea)) {
    napStatus = "pass";
    napDetail = gbpPhone ? "Your phone number matches your Google Business Profile, and your location or service area is listed." : "Your phone number and location or service area are on the page.";
  } else if (sitePhone || hasAddress || serviceArea) {
    napStatus = "warn";
    napDetail = !sitePhone ? "Your location is listed, but we couldn't find a phone number." : "Your phone is listed, but not your address or the area you serve.";
    napFix = "List your business name, phone, and address (or the cities you serve) on every page, usually in the footer. Keep it identical to your Google profile.";
  } else {
    napStatus = "fail";
    napDetail = "We couldn't find your phone number or location on the homepage.";
    napFix = "List your business name, phone, and address (or the cities you serve) on every page, usually in the footer. Keep it identical to your Google profile.";
  }
  checks.push(check("nap", "Local presence", "Name, address and phone listed consistently", 6, napStatus, napDetail, napFix));

  /* ── Behind the scenes ── */

  const broken = linkResults.filter((l) => l.status === 404 || l.status === 410 || l.status >= 500 || l.status === 0);
  // Treat unreachable (0) external links leniently; many sites block bots.
  const brokenCounted = broken.filter((l) => l.internal || l.status !== 0);
  checks.push(
    check(
      "broken-links",
      "Behind the scenes",
      "Broken links",
      6,
      brokenCounted.length === 0 ? "pass" : brokenCounted.length <= 2 ? "warn" : "fail",
      sample.length === 0
        ? "We didn't find links to test on your homepage."
        : brokenCounted.length === 0
          ? `We tested ${sample.length} links from your homepage and they all work.`
          : `${brokenCounted.length} of the ${sample.length} links we tested are broken: ${brokenCounted
              .slice(0, 4)
              .map((l) => `"${l.text || l.url.pathname}"`)
              .join(", ")}.`,
      brokenCounted.length ? "Fix or remove broken links. They frustrate visitors and signal to Google that the site isn't maintained." : ""
    )
  );

  const imgs = findTags(stripNonContent(body), "img").filter((i) => !/^data:image\/(gif|svg)/.test(i.attrs.src || ""));
  const missingAlt = imgs.filter((i) => !("alt" in i.attrs));
  const altRatio = imgs.length ? missingAlt.length / imgs.length : 0;
  checks.push(
    check(
      "alt-text",
      "Behind the scenes",
      "Image descriptions (alt text)",
      4,
      missingAlt.length === 0 ? "pass" : altRatio <= 0.2 ? "warn" : "fail",
      imgs.length === 0
        ? "No images to check on your homepage."
        : missingAlt.length === 0
          ? `All ${imgs.length} images have descriptions.`
          : `${missingAlt.length} of ${imgs.length} images are missing descriptions.`,
      missingAlt.length ? "Add short descriptions to images. They help visually impaired visitors and help your photos show up in Google Images." : ""
    )
  );

  const analytics = [
    [/googletagmanager\.com|google-analytics\.com|gtag\(|\bga\(/i, "Google Analytics"],
    [/plausible\.io/i, "Plausible"],
    [/usefathom\.com/i, "Fathom"],
    [/connect\.facebook\.net|fbq\(/i, "Meta Pixel"],
    [/static\.hotjar\.com/i, "Hotjar"],
    [/clarity\.ms/i, "Microsoft Clarity"],
    [/matomo|piwik/i, "Matomo"],
    [/squarespace|wix\.com|shopify|weebly|godaddy/i, null], // built-in analytics, unknown
  ];
  const found = analytics.filter(([re, name]) => name && re.test(html)).map(([, name]) => name);
  const builder = analytics[analytics.length - 1][0].test(html);
  checks.push(
    check(
      "analytics",
      "Behind the scenes",
      "Visitor tracking (analytics)",
      5,
      found.length ? "pass" : builder ? "warn" : "fail",
      found.length
        ? `You're tracking visitors with ${found.join(" and ")}.`
        : builder
          ? "Your site builder may have basic stats, but we didn't find a full analytics tool."
          : "We didn't find any visitor tracking, so you can't see how many people visit or where they come from.",
      found.length ? "" : "Add Google Analytics (free) so you can see what's working and where your customers come from."
    )
  );

  checks.push(
    check(
      "sitemap",
      "Behind the scenes",
      "Sitemap for Google",
      4,
      sitemap ? "pass" : "fail",
      sitemap ? "Your site has a sitemap that helps Google find every page." : "We couldn't find a sitemap, the file that helps Google find all your pages.",
      sitemap ? "" : "Add a sitemap.xml and submit it in Google Search Console. Most site builders can generate one automatically."
    )
  );

  /* ── Freshness ── */

  const dates = [];
  if (sitemap) {
    for (const m of sitemap.text.matchAll(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/gi)) {
      const d = new Date(m[1]);
      if (!Number.isNaN(d.getTime()) && d <= now) dates.push(d);
    }
  }
  const lastModHeader = page.headers.get("last-modified");
  if (lastModHeader) {
    const d = new Date(lastModHeader);
    // Many servers stamp "now" on every response, which tells us nothing.
    if (!Number.isNaN(d.getTime()) && now - d > 5 * 60 * 1000) dates.push(d);
  }
  const metaModified = metaContent(html, "article:modified_time") || metaContent(html, "og:updated_time");
  if (metaModified) {
    const d = new Date(metaModified);
    if (!Number.isNaN(d.getTime()) && d <= now) dates.push(d);
  }
  let freshest = dates.length ? new Date(Math.max(...dates)) : null;
  let freshnessSource = "page data";
  if (!freshest && latestCopyright) {
    freshest = new Date(Date.UTC(latestCopyright, 11, 31));
    freshnessSource = "copyright year";
  }
  if (freshest) {
    const months = (now - freshest) / (1000 * 60 * 60 * 24 * 30.4);
    const when = freshnessSource === "copyright year" ? String(latestCopyright) : fmtMonth(freshest);
    checks.push(
      check(
        "freshness",
        "Freshness",
        "Recently updated",
        6,
        months <= 6 ? "pass" : months <= 18 ? "warn" : "fail",
        months <= 6 ? `Your site looks like it was updated recently (around ${when}).` : `Your site looks like it was last updated around ${when}.`,
        months <= 6 ? "" : "Fresh content (new photos, specials, updated hours, recent work) gives visitors and Google a reason to trust you're active."
      )
    );
  } else {
    checks.push(check("freshness", "Freshness", "Recently updated", 6, "skip", "We couldn't tell when your site was last updated.", ""));
  }

  /* ── Score ── */

  const scored = checks.filter((c) => c.status !== "skip");
  const possible = scored.reduce((s, c) => s + c.weight, 0);
  const earned = scored.reduce((s, c) => s + c.weight * STATUS_FACTOR[c.status], 0);
  const score = possible ? Math.round((earned / possible) * 100) : 0;

  return {
    url: finalUrl.href,
    host: finalUrl.hostname,
    businessName,
    checkedAt: now.toISOString(),
    durationMs: Date.now() - started,
    score,
    grade: score >= 85 ? "Strong" : score >= 65 ? "Needs some work" : score >= 45 ? "Needs work" : "Needs a lot of work",
    counts: {
      pass: checks.filter((c) => c.status === "pass").length,
      warn: checks.filter((c) => c.status === "warn").length,
      fail: checks.filter((c) => c.status === "fail").length,
      skip: checks.filter((c) => c.status === "skip").length,
    },
    checks,
  };
}

/** The free teaser: score plus the top one or two issues. */
export function toTeaser(report) {
  const rank = { fail: 0, warn: 1 };
  const issues = report.checks
    .filter((c) => c.status === "fail" || c.status === "warn")
    .sort((a, b) => rank[a.status] - rank[b.status] || b.weight - a.weight)
    .slice(0, 2)
    .map(({ id, category, label, status, detail }) => ({ id, category, label, status, detail }));
  return {
    url: report.url,
    host: report.host,
    score: report.score,
    grade: report.grade,
    counts: report.counts,
    totalChecks: report.checks.length,
    topIssues: issues,
    categories: CATEGORIES,
  };
}
