/* =============================================================================
   audit-core.js, the website audit engine
   Evergreen Digital · evergreendigitalco.com
   =============================================================================

   runAudit(url) fetches one homepage plus a few supporting files and returns
   a scored checklist. The checks were approved in Oct 2026:

     First impression   mobile speed (Google's test, or our own quick check
                        when Google is unavailable), mobile layout and zoom,
                        link preview when shared, CTA near the top,
                        click-to-call phone, a way to reach you without calling
     Trust              HTTPS, everything loads securely, reviews,
                        current copyright year, site icon, privacy policy,
                        business email on its own domain
     Findability        title tag, meta description, one H1, one consistent
                        address (www, canonical, sitemap), content
                        readable without JavaScript, not blocked from
                        Google, local business (or product) schema
     Local presence     Google Business Profile with reviews,
                        name/address/phone visible and consistent,
                        business hours listed
     Behind the scenes  broken links, image alt text, analytics, sitemap,
                        domain renewal date (RDAP), security certificate
                        expiry, email protection (SPF + DMARC)
     Freshness          when the site was last meaningfully updated

   Online products (software, apps, online-only shops) are detected from their
   schema or from app-style wording with no phone or address. For those the
   local checks (tap-to-call, Business Profile, NAP) are "not scored" instead
   of failing, and the schema check accepts product/organization schema.

   Optional environment variables (Vercel > Settings > Environment Variables):
     PAGESPEED_API_KEY       Google PageSpeed Insights key. Works without one,
                             but Google's shared anonymous quota runs out fast.
     GOOGLE_PLACES_API_KEY   Places API (New) key. Without it the Google
                             Business Profile check is skipped (not scored).

   Copy shown to visitors avoids em dashes to match the rest of the site.
   ============================================================================= */

import dns from "node:dns/promises";
import tls from "node:tls";
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

const net_isIp = (h) => /^[\d.]+$|:/.test(h);
const hostKey = (h) => h.toLowerCase().replace(/^www\./, "");
const digits = (s) => String(s || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
// Signs the homepage is for an online product (software, app, online-only shop)
// rather than a local business. Counted as distinct cues, see siteProfile().
const APP_CUES = [
  /\blog ?in\b|\bsign ?in\b/i,
  /\bsign ?up\b|\bcreate (an |your )?account\b/i,
  /\bfree trial\b|\bstart (for )?free\b/i,
  /\bwait ?list\b|\bearly access\b/i,
  /\b(download|get) (the|our) app\b|\bapp store\b|\bgoogle play\b/i,
  /\bper (user|seat)\b|\bSaaS\b|\bintegrations?\b|\bdashboard\b/i,
];
const ONLINE_TYPES = /^(SoftwareApplication|WebApplication|MobileApplication|VideoGame|OnlineBusiness|OnlineStore)$/;

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
// Case-sensitive on purpose: real street names are capitalized ("123 Main St",
// "11419 19th Ave SE"). Case-insensitive matching flagged ordinary sentences
// like "1 day late. Tap a circle" as an address.
const STREET_RE =
  /\b\d{1,6}\s+(?:[NSEW]\.?\s+|North\s+|South\s+|East\s+|West\s+)?(?:(?:[A-Z][A-Za-z.'-]*|\d+(?:st|nd|rd|th)?)\s){1,4}(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Hwy|Highway|Pl|Place|Ct|Court|Pkwy|Parkway|Cir|Circle|Ter|Terrace|Loop|Sq)\b\.?/;
const CTA_RE =
  /\b(call|book|schedule|appointment|reserve|contact|get (a |your )?(free )?(quote|estimate|started)|request|order|shop|visit|donate|give|join|sign up|free estimate|get in touch|menu)\b/i;
// Review words only count in a heading, or as a phrase that only shows up next to
// real reviews. A bare "reviews" anywhere in body copy ("reviewed texts are on
// the roadmap") was passing pages that show no reviews at all.
const REVIEW_HEADING_RE = /\b(testimonials?|reviews?|what (our )?(customers|clients|people|guests|members) (say|are saying)|kind words|happy (customers|clients))\b/i;
const REVIEW_PHRASE_RE = /\b(what (our )?(customers|clients|people|guests|members) (say|are saying)|rated \d(\.\d)? (out of 5|stars?)|\d(\.\d)? stars? on google|5[- ]star (reviews?|rating)|\d+\+? (google |5[- ]star )?reviews)\b|★★★/i;

/* ── External services ────────────────────────────────────────────────────── */

async function pageSpeed(url) {
  const params = new URLSearchParams({ url, strategy: "mobile", category: "performance" });
  if (process.env.PAGESPEED_API_KEY) params.set("key", process.env.PAGESPEED_API_KEY);
  const deadline = Date.now() + 45000;
  try {
    let res;
    for (let attempt = 0; attempt < 2; attempt++) {
      res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`, {
        signal: AbortSignal.timeout(Math.max(1000, deadline - Date.now())),
      });
      // Google's test sometimes fails with a 500 on the first try; one retry is
      // worth it if there's time left. 4xx (quota, bad key) won't fix itself.
      if (res.status < 500 || deadline - Date.now() < 15000) break;
    }
    if (!res.ok) {
      // 429 almost always means PAGESPEED_API_KEY is missing and the shared
      // anonymous quota is used up. Logged so it shows in Vercel's function logs.
      console.warn(`[audit] PageSpeed returned ${res.status}${process.env.PAGESPEED_API_KEY ? "" : " (no PAGESPEED_API_KEY set)"}`);
      return null;
    }
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
  } catch (err) {
    console.warn(`[audit] PageSpeed failed: ${err?.name || err}`);
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

/**
 * Our own quick speed check, used when Google's test is unavailable. Measures
 * how fast the server answered and how heavy the page is, from sizes the
 * server reports for a sample of images, scripts and stylesheets.
 */
async function quickWeight(body, html, baseUrl) {
  const pick = (tags, attr) =>
    tags
      .map((t) => t.attrs[attr])
      .filter((v) => v && !/^data:/i.test(v))
      .map((v) => {
        try {
          return new URL(v, baseUrl);
        } catch {
          return null;
        }
      })
      .filter((u) => u && /^https?:$/.test(u.protocol));
  const imgs = pick(findTags(stripNonContent(body), "img"), "src").slice(0, 10);
  const scripts = pick(findTags(html, "script"), "src").slice(0, 8);
  const styles = pick(findTags(html, "link").filter((l) => /stylesheet/i.test(l.attrs.rel || "")), "href").slice(0, 4);
  const size = async (u) => {
    const res = await tryFetch(u, { method: "HEAD", timeoutMs: 5000, readBody: false });
    const n = Number(res?.headers?.get("content-length"));
    return res?.ok && n > 0 ? n : 0;
  };
  const [imgSizes, codeSizes] = await Promise.all([mapLimit(imgs, 6, size), mapLimit([...scripts, ...styles], 6, size)]);
  return {
    imgBytes: imgSizes.reduce((a, b) => a + b, 0),
    biggestImg: Math.max(0, ...imgSizes),
    codeBytes: codeSizes.reduce((a, b) => a + b, 0),
    scriptCount: findTags(html, "script").filter((t) => t.attrs.src).length,
  };
}

/* ── Domain, certificate and email lookups ───────────────────────────────── */

// Second-level labels that sit under a country code, e.g. joes.co.uk
const SLD = /^(co|com|net|org|gov|edu|ac|ltd|plc|me|biz|info)$/;

/** "www.shop.joes.co.uk" -> "joes.co.uk". Good enough for small-business sites. */
export function registrableDomain(host) {
  const parts = host.toLowerCase().replace(/\.$/, "").split(".");
  if (parts.length <= 2) return parts.join(".");
  const tld = parts[parts.length - 1];
  const sld = parts[parts.length - 2];
  const take = tld.length === 2 && SLD.test(sld) ? 3 : 2;
  return parts.slice(-take).join(".");
}

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);

/** Expiration date from an RDAP domain record, or null. */
export function rdapExpiry(json) {
  const ev = (json?.events || []).find((e) => /expiration/i.test(e.eventAction || ""));
  const d = ev ? new Date(ev.eventDate) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

async function domainExpiry(domain) {
  // rdap.org redirects to the right registry (Verisign for .com, PIR for .org...)
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      headers: { accept: "application/rdap+json, application/json" },
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return rdapExpiry(await res.json());
  } catch {
    return null;
  }
}

/** When the site's security certificate expires, and who issued it. */
export function certInfo(host, port = 443) {
  return withTimeout(
    new Promise((resolve) => {
      const socket = tls.connect({ host, port, servername: net_isIp(host) ? undefined : host, rejectUnauthorized: false, timeout: 6000 }, () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        const validTo = cert?.valid_to ? new Date(cert.valid_to) : null;
        resolve(validTo && !Number.isNaN(validTo.getTime()) ? { validTo, issuer: cert.issuer?.O || cert.issuer?.CN || "" } : null);
      });
      socket.on("error", () => resolve(null));
      socket.on("timeout", () => {
        socket.destroy();
        resolve(null);
      });
    }),
    7000
  );
}

/** Parses SPF and DMARC TXT records into a simple summary. */
export function emailAuthSummary(rootTxt, dmarcTxt) {
  const flat = (rows) => (rows || []).map((r) => (Array.isArray(r) ? r.join("") : String(r)));
  const spf = flat(rootTxt).find((t) => /^v=spf1\b/i.test(t.trim())) || null;
  const dmarc = flat(dmarcTxt).find((t) => /^v=DMARC1\b/i.test(t.trim())) || null;
  const policy = dmarc ? ((dmarc.match(/\bp\s*=\s*(none|quarantine|reject)/i) || [])[1] || "none").toLowerCase() : null;
  return { spf, dmarc, policy };
}

async function emailAuth(domain) {
  const txt = (name) => withTimeout(dns.resolveTxt(name).catch((e) => (e?.code === "ENODATA" || e?.code === "ENOTFOUND" ? [] : null)), 5000);
  const [mx, root, dmarc] = await Promise.all([
    withTimeout(dns.resolveMx(domain).catch((e) => (e?.code === "ENODATA" || e?.code === "ENOTFOUND" ? [] : null)), 5000),
    txt(domain),
    txt(`_dmarc.${domain}`),
  ]);
  if (mx === null || root === null || dmarc === null) return null; // lookup failed, don't guess
  return { hasMx: mx.length > 0, ...emailAuthSummary(root, dmarc) };
}

const FREE_MAIL = /@(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|aol|icloud|me|mac|comcast|att|sbcglobal|verizon|frontier|charter|centurylink|proton|protonmail)\.[a-z.]+$/i;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const DAY_RE = /\b(mon(day)?|tue(s(day)?)?|wed(nesday)?|thu(r(s(day)?)?)?|fri(day)?|sat(urday)?|sun(day)?)\b/gi;
const TIME_RE = /\b\d{1,2}(:\d{2})?\s*(am|pm|a\.m\.|p\.m\.)|\b([01]?\d|2[0-3]):[0-5]\d\b|\b(noon|midnight)\b/i;
const BOOKING_RE =
  /calendly\.com|acuityscheduling|squareup\.com\/appointments|square\.site|book\.squareup|vagaro|booksy|fresha|setmore|schedulicity|mindbodyonline|glossgenius|opentable|resy\.com|tock\.com|toasttab|doordash|ubereats|grubhub|jobber|housecallpro|servicetitan|getjobber|tidycal|youcanbook|simplybook|zocdoc|hsforms|jotform|typeform|formspree|tally\.so|wufoo|cognitoforms|google\.com\/forms|forms\.gle/i;

/** True when the page lists opening hours, in text or schema. */
export function hasBusinessHours(text, schema) {
  if (schema.some((o) => o.openingHours || o.openingHoursSpecification)) return true;
  if (/\b(open 24 hours|open 24\/7|24\/7|by appointment( only)?|hours of operation|business hours|opening hours|store hours|office hours|service times)\b/i.test(text)) return true;
  // A day name with a time within a short distance, e.g. "Mon - Fri 9am - 5pm"
  for (const m of text.matchAll(DAY_RE)) {
    if (TIME_RE.test(text.slice(m.index, m.index + 60))) return true;
  }
  return false;
}

const daysUntil = (d, now) => Math.floor((d - now) / 86_400_000);
const fmtDay = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;

const kb = (n) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.round(n / 1000)} KB`);

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

  // Contact details, needed early to tell local businesses from online products
  const hasTel = /href\s*=\s*["']?tel:/i.test(body);
  const phoneOnPage = (visibleText.match(PHONE_RE) || [null])[0];
  const hasAddress = STREET_RE.test(visibleText) || schema.some((o) => o.address?.streetAddress);
  const appCues = APP_CUES.filter((re) => re.test(visibleText)).length;
  const onlineSchema = types.some((t) => ONLINE_TYPES.test(t));
  // Conservative: a local business with no phone and no address should still be
  // told about it, so the text-only path needs two separate app-style cues.
  const isOnlineProduct = onlineSchema || (!hasTel && !phoneOnPage && !hasAddress && appCues >= 2);

  // Pages built entirely in the browser (plain React/Vite) send Google an
  // almost empty shell. Measured on the raw HTML, before any JavaScript runs.
  const jsShell =
    visibleText.length < 150 &&
    /<div[^>]+id=["'](root|app|__next|__nuxt|svelte)["'][^>]*>\s*<\/div>/i.test(body) &&
    /<script\b[^>]*\bsrc=/i.test(html);

  // Domain, certificate and email lookups run alongside everything else
  const siteDomain = net_isIp(finalUrl.hostname) ? null : registrableDomain(finalUrl.hostname);
  const domainPromise = siteDomain ? domainExpiry(siteDomain) : Promise.resolve(null);
  const certPromise = finalUrl.protocol === "https:" && !net_isIp(finalUrl.hostname) ? certInfo(finalUrl.hostname) : Promise.resolve(null);
  const emailAuthPromise = siteDomain ? emailAuth(siteDomain).catch(() => null) : Promise.resolve(null);

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
  const gbpPromise = isOnlineProduct ? Promise.resolve({ checked: false }) : findBusinessProfile(businessName, finalUrl.hostname, city);

  const weightPromise = quickWeight(body, html, finalUrl).catch(() => null);

  // Does the other version of the domain (www vs no www) end up on the same site?
  const altHost = finalUrl.hostname.startsWith("www.") ? finalUrl.hostname.slice(4) : "www." + finalUrl.hostname;
  const altUrl = new URL(finalUrl.href);
  altUrl.hostname = altHost;
  altUrl.pathname = "/";
  const altPromise = net_isIp(finalUrl.hostname) ? Promise.resolve(null) : tryFetch(altUrl, { timeoutMs: 6000, readBody: false });

  const faviconPromise = findTags(html, "link").some((l) => /\bicon\b/i.test(l.attrs.rel || "") && l.attrs.href)
    ? Promise.resolve(true)
    : tryFetch(new URL("/favicon.ico", origin), { timeoutMs: 5000, readBody: false }).then((r) => !!r?.ok);

  const ogImage = metaContent(html, "og:image");
  const ogImagePromise = ogImage
    ? (async () => {
        try {
          const r = await tryFetch(new URL(ogImage, finalUrl), { method: "HEAD", timeoutMs: 5000, readBody: false });
          return !!r?.ok;
        } catch {
          return false;
        }
      })()
    : Promise.resolve(false);

  const [speed, linkResults, gbp, weight, altRes, hasFavicon, ogImageOk, domainExp, cert, mailAuth] = await Promise.all([
    speedPromise,
    linkResultsPromise,
    gbpPromise,
    weightPromise,
    altPromise,
    faviconPromise,
    ogImagePromise,
    domainPromise,
    certPromise,
    emailAuthPromise,
  ]);

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
  } else if (weight) {
    // Google's test was unavailable, so score our own lighter measurements.
    const serverMs = page.ms;
    const problems = [];
    if (serverMs > 2500) problems.push(["fail", `your server took ${(serverMs / 1000).toFixed(1)} seconds just to deliver the page`]);
    else if (serverMs > 1200) problems.push(["warn", `your server took ${(serverMs / 1000).toFixed(1)} seconds to deliver the page`]);
    if (weight.imgBytes > 4_000_000) problems.push(["fail", `the images we sampled add up to ${kb(weight.imgBytes)}`]);
    else if (weight.biggestImg > 800_000) problems.push(["warn", `one image alone is ${kb(weight.biggestImg)}`]);
    else if (weight.imgBytes > 2_000_000) problems.push(["warn", `the images we sampled add up to ${kb(weight.imgBytes)}`]);
    if (weight.scriptCount > 30) problems.push(["warn", `the page loads ${weight.scriptCount} separate scripts`]);
    else if (weight.codeBytes > 1_500_000) problems.push(["warn", `the page's code files add up to ${kb(weight.codeBytes)}`]);
    const status = problems.some((p) => p[0] === "fail") ? "fail" : problems.length ? "warn" : "pass";
    checks.push(
      check(
        "speed",
        "First impression",
        "Mobile loading speed",
        8,
        status,
        status === "pass"
          ? `Your page loaded in ${serverMs < 1000 ? "under a second" : `${(serverMs / 1000).toFixed(1)} seconds`} and isn't weighed down by heavy images or code. (Quick check, Google's full test was unavailable.)`
          : `In our quick check, ${problems.map((p) => p[1]).join(", and ")}. (Google's full test was unavailable.)`,
        status === "pass" ? "" : "Most visitors are on phones, and many leave if a page takes more than about 3 seconds. Compressing images, trimming plugins and scripts, and better hosting usually fix this."
      )
    );
  } else {
    checks.push(
      check("speed", "First impression", "Mobile loading speed", 12, "skip", "Google's speed test didn't respond this time, so speed isn't counted in your score.", "We can run a full speed test for you on a free call.")
    );
  }

  const viewport = metaContent(html, "viewport") || "";
  const mobileOk = speed?.viewportOk ?? /width\s*=\s*device-width/i.test(viewport);
  const zoomBlocked = /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/i.test(viewport);
  checks.push(
    check(
      "mobile",
      "First impression",
      "Mobile-friendly layout",
      10,
      !mobileOk ? "fail" : zoomBlocked ? "warn" : "pass",
      !mobileOk
        ? "Your site isn't set up to resize for phones, so visitors have to pinch and zoom."
        : zoomBlocked
          ? "Your site resizes for phones, but it stops visitors from zooming in, which makes small text hard to read."
          : "Your site is set up to resize for phones.",
      !mobileOk
        ? "A responsive layout (with a proper viewport setting) makes the site fit any screen. This is the single biggest fix for most older sites."
        : zoomBlocked
          ? "Remove \"user-scalable=no\" and \"maximum-scale=1\" from the viewport setting so people can zoom. It's also an accessibility requirement."
          : ""
    )
  );

  const ogTitle = metaContent(html, "og:title");
  checks.push(
    check(
      "share-preview",
      "First impression",
      "Link preview when shared",
      3,
      ogTitle && ogImageOk ? "pass" : ogTitle || ogImage ? "warn" : "fail",
      ogTitle && ogImageOk
        ? "Your link shows a title and image when it's shared in texts or on social media."
        : ogImage && !ogImageOk
          ? "Your share image is set, but it didn't load, so shared links show up without a picture."
          : ogTitle
            ? "Shared links show a title but no image."
            : "Your site has no preview set, so links shared in texts or on Facebook show up plain or with a random image.",
      ogTitle && ogImageOk ? "" : "Add a share title and image (Open Graph tags). Links with a picture get noticeably more clicks when people share them."
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

  if (isOnlineProduct && !hasTel && !phoneOnPage) {
    checks.push(
      check("click-to-call", "First impression", "Tap-to-call phone number", 7, "skip", "Your site looks like an online product, so a tap-to-call number isn't expected.", "")
    );
  } else checks.push(
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

  // A way to reach the business without calling (form, email, booking or ordering)
  const forms = findElements(body, "form").filter((f) => /<(input|textarea|select)\b/i.test(f.inner) && !/type=["']?search/i.test(f.inner));
  const hasMailto = /href\s*=\s*["']?mailto:/i.test(body);
  const bookingLink = anchors.find((a) => BOOKING_RE.test(a.attrs.href || ""));
  const hasBookingEmbed = BOOKING_RE.test(html);
  // Online products are reached by signing up or joining a waitlist, not by phone
  const appEntry = isOnlineProduct && anchors.some((a) => /\b(sign ?up|log ?in|get started|start free|free trial|join|wait ?list|request (a )?demo|contact)\b/i.test(textOf(a.inner)));
  const contactWays = [
    forms.length && "a form",
    hasMailto && "an email link",
    (bookingLink || hasBookingEmbed) && "online booking or ordering",
    appEntry && "sign-up or contact links",
  ].filter(Boolean);
  checks.push(
    check(
      "contact",
      "First impression",
      "A way to reach you without calling",
      5,
      contactWays.length ? "pass" : "fail",
      contactWays.length
        ? isOnlineProduct
          ? `Visitors can get started or reach you right from the homepage (${contactWays.join(" and ")}).`
          : `Visitors who don't want to call can reach you through ${contactWays.join(" and ")}.`
        : isOnlineProduct
          ? "We couldn't find a way for visitors to sign up or get in touch from the homepage."
          : "The only way to reach you from the homepage seems to be a phone call, and many people (especially younger customers) won't call.",
      contactWays.length ? "" : "Add a short contact form, online booking, or at least a tap-to-email link so people can reach you on their own time, even after hours."
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
  const headingText = ["h1", "h2", "h3", "h4"].flatMap((t) => findElements(body, t)).map((h) => textOf(h.inner)).join(" | ");
  const hasReviewWidget = /elfsight|trustindex|birdeye|podium\.com|yotpo|google-reviews|reviewsonmywebsite|embedsocial|trustpilot\.com\/|widget\.reviews/i.test(html);
  const hasReviews =
    hasReviewSchema || hasReviewWidget || REVIEW_HEADING_RE.test(headingText) || REVIEW_PHRASE_RE.test(visibleText) || findElements(body, "blockquote").some((b) => textOf(b.inner).length > 40);
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

  checks.push(
    check(
      "favicon",
      "Trust",
      "Site icon in the browser tab",
      2,
      hasFavicon ? "pass" : "warn",
      hasFavicon ? "Your site has its own icon in browser tabs and bookmarks." : "Your site has no icon, so browser tabs and bookmarks show a blank page symbol.",
      hasFavicon ? "" : "Add a small version of your logo as the site icon (favicon). It's a quick fix that makes the site look finished."
    )
  );

  if (isHttps) {
    const insecure = [
      ...findTags(body, "img").map((t) => t.attrs.src),
      ...findTags(html, "script").map((t) => t.attrs.src),
      ...findTags(html, "iframe").map((t) => t.attrs.src),
      ...findTags(html, "link").filter((l) => /stylesheet/i.test(l.attrs.rel || "")).map((t) => t.attrs.href),
    ].filter((u) => /^http:\/\//i.test(u || ""));
    checks.push(
      check(
        "mixed-content",
        "Trust",
        "Everything loads securely",
        4,
        insecure.length ? "warn" : "pass",
        insecure.length
          ? `${insecure.length} image${insecure.length === 1 ? "" : "s"} or file${insecure.length === 1 ? "" : "s"} still load over insecure http://, which browsers may block or flag.`
          : "Every image and file on your homepage loads over a secure connection.",
        insecure.length ? "Switch those links from http:// to https://. Browsers block some insecure files, which can leave broken images or missing features." : ""
      )
    );
  }

  const collectsInfo = findElements(body, "form").some((f) => /type=["']?(email|tel)|<textarea|name=["']?(email|phone)/i.test(f.inner)) ||
    /calendly|acuityscheduling|squareup\.com\/appointments|vagaro|booksy|fresha|setmore|formspree|hsforms|jotform|typeform/i.test(html);
  const hasPrivacy = anchors.some((a) => /privacy/i.test(a.attrs.href || "") || /privacy/i.test(textOf(a.inner)));
  if (collectsInfo || hasPrivacy) {
    checks.push(
      check(
        "privacy",
        "Trust",
        "Privacy policy",
        2,
        hasPrivacy ? "pass" : "warn",
        hasPrivacy ? "Your site links to a privacy policy." : "Your site collects names, emails, or phone numbers, but we didn't see a privacy policy link.",
        hasPrivacy ? "" : "Add a short privacy policy page and link it in the footer. Anyone filling out a form expects one, and Google requires it for ads."
      )
    );
  }

  // Business email on its own domain vs a free Gmail/Yahoo address
  const emails = [
    ...[...body.matchAll(/href\s*=\s*["']?mailto:([^"'?\s>]+)/gi)].map((m) => decodeURIComponent(m[1])),
    ...(visibleText.match(EMAIL_RE) || []),
  ]
    .map((e) => e.toLowerCase())
    .filter((e) => !/\.(png|jpe?g|gif|webp|svg)$/.test(e) && !/example\.com|sentry|wixpress|domain\.com/.test(e));
  if (emails.length) {
    const freeOnes = [...new Set(emails.filter((e) => FREE_MAIL.test(e)))];
    checks.push(
      check(
        "own-email",
        "Trust",
        "Business email on your own domain",
        3,
        freeOnes.length ? "warn" : "pass",
        freeOnes.length
          ? `Your site lists ${freeOnes[0]}. A free email address makes a business look smaller and less established than it is.`
          : "Your site lists an email address on your own domain, which looks professional.",
        freeOnes.length ? "Use an address like info@yourbusiness.com. It costs a few dollars a month and can forward to the inbox you already use." : ""
      )
    );
  }

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

  checks.push(
    check(
      "crawlable",
      "Findability",
      "Content Google can read",
      8,
      jsShell ? "warn" : "pass",
      jsShell
        ? "Your homepage arrives almost empty and builds itself with JavaScript. Google can usually still read it, but more slowly, and link previews and some search tools see a blank page."
        : "Your homepage text is in the page itself, so Google can read it right away.",
      jsShell ? "Pre-render or server-render the homepage (most frameworks have a setting for it) so the words and links are there before any JavaScript runs." : ""
    )
  );

  const finalKey = finalUrl.hostname.toLowerCase();
  const hostIssues = [];
  if (altRes && altRes.ok) {
    try {
      if (new URL(altRes.url).hostname.toLowerCase() !== finalKey) hostIssues.push(`${altHost} shows a separate copy of the site instead of redirecting to ${finalKey}`);
    } catch {}
  }
  const canonical = findTags(html, "link").find((l) => /\bcanonical\b/i.test(l.attrs.rel || ""))?.attrs.href;
  if (canonical) {
    try {
      const c = new URL(canonical, finalUrl);
      if (c.hostname.toLowerCase() !== finalKey) hostIssues.push(`your page tells Google its main address is ${c.hostname}, but visitors end up on ${finalKey}`);
    } catch {}
  }
  if (sitemap) {
    const locHosts = [...sitemap.text.matchAll(/<loc>\s*([^<\s]+)/gi)]
      .map((m) => {
        try {
          return new URL(m[1]).hostname.toLowerCase();
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    const other = locHosts.find((h) => h !== finalKey);
    if (other) hostIssues.push(`your sitemap lists pages on ${other}, but visitors end up on ${finalKey}`);
  }
  checks.push(
    check(
      "one-address",
      "Findability",
      "One consistent web address",
      4,
      hostIssues.length ? "warn" : "pass",
      hostIssues.length
        ? `Google sees mixed signals about your main address: ${hostIssues.join("; ")}.`
        : "Your site uses one consistent address, so Google isn't splitting your ranking between versions.",
      hostIssues.length
        ? "Pick one version (with or without www), redirect the other to it, and use that exact version in your sitemap and canonical tag."
        : ""
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
  if (isOnlineProduct) {
    const hasProductSchema = onlineSchema || hasOrgSchema || types.some((t) => /^(Product|Service|WebSite)$/.test(t));
    checks.push(
      check(
        "local-schema",
        "Findability",
        "Business info for Google",
        5,
        hasProductSchema ? "pass" : "warn",
        hasProductSchema
          ? "Your site includes behind-the-scenes info (schema) that tells Google what your product is."
          : "Your site doesn't include behind-the-scenes info (schema) describing your product for Google.",
        hasProductSchema ? "" : "Add Organization and SoftwareApplication (or Product) schema with your name, logo, and what you offer. It helps Google show a richer search listing."
      )
    );
  } else checks.push(
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
  const serviceArea = /\b(serving|service area|we serve|areas? we serve)\b/i.test(visibleText) || schema.some((o) => o.areaServed);

  if (isOnlineProduct) {
    checks.push(
      check("gbp", "Local presence", "Google Business Profile with reviews", 8, "skip", "Your site looks like an online product rather than a local business, so a Google Business Profile isn't scored.", "")
    );
  } else if (gbp.checked) {
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
  if (isOnlineProduct) {
    napStatus = "skip";
    napDetail = "Your site looks like an online product, so a street address and local phone aren't expected.";
  } else if (gbpPhone && sitePhone && digits(gbpPhone) !== digits(sitePhone)) {
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

  if (isOnlineProduct) {
    checks.push(check("hours", "Local presence", "Business hours listed", 4, "skip", "Your site looks like an online product, so business hours aren't expected.", ""));
  } else {
    const hoursOk = hasBusinessHours(visibleText, schema);
    checks.push(
      check(
        "hours",
        "Local presence",
        "Business hours listed",
        4,
        hoursOk ? "pass" : "warn",
        hoursOk ? "Your hours are on the homepage, so people know when they can reach you." : "We couldn't find your business hours on the homepage.",
        hoursOk ? "" : "Show your hours (or \"by appointment\") on the homepage or in the footer. \"Are they open?\" is one of the top reasons people look up a local business."
      )
    );
  }

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
    [/googletagmanager\.com\/gtag|google-analytics\.com|gtag\(|\bga\(|\bG-[A-Z0-9]{6,}\b/i, "Google Analytics"],
    [/googletagmanager\.com\/gtm\.js|\bGTM-[A-Z0-9]{4,}\b/i, "Google Tag Manager"],
    // Vercel serves its script from a random first-party path, so match the SDK tag too
    [/@vercel\/analytics|\/_vercel\/insights|va\.vercel-scripts\.com/i, "Vercel Analytics"],
    [/static\.cloudflareinsights\.com|cf-beacon/i, "Cloudflare Web Analytics"],
    [/posthog/i, "PostHog"],
    [/umami/i, "Umami"],
    [/scripts\.simpleanalyticscdn\.com/i, "Simple Analytics"],
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

  if (domainExp) {
    const left = daysUntil(domainExp, now);
    checks.push(
      check(
        "domain-expiry",
        "Behind the scenes",
        "Domain name renewal",
        6,
        left < 0 ? "fail" : left <= 14 ? "fail" : left <= 45 ? "warn" : "pass",
        left < 0
          ? `Your domain name (${siteDomain}) shows as expired on ${fmtDay(domainExp)}.`
          : left <= 45
            ? `Your domain name (${siteDomain}) expires in ${left} day${left === 1 ? "" : "s"}, on ${fmtDay(domainExp)}.`
            : `Your domain name (${siteDomain}) is registered until ${fmtDay(domainExp)}.`,
        left <= 45
          ? "Renew it now or confirm auto-renew is on with a current card. If a domain lapses, the website and any email on it stop working, and someone else can buy the name."
          : ""
      )
    );
  } else if (siteDomain) {
    checks.push(check("domain-expiry", "Behind the scenes", "Domain name renewal", 6, "skip", "The domain registry didn't answer, so we couldn't check when your domain renews.", ""));
  }

  if (cert) {
    const left = daysUntil(cert.validTo, now);
    // Free automated certificates (Vercel, Netlify, most hosts) renew themselves
    // in the last month, so only flag those when they're nearly out.
    const autoRenews = /let's encrypt|google trust|zerossl|amazon/i.test(cert.issuer);
    checks.push(
      check(
        "cert-expiry",
        "Behind the scenes",
        "Security certificate up to date",
        5,
        left < 0 ? "fail" : left <= (autoRenews ? 7 : 21) ? "warn" : "pass",
        left < 0
          ? `Your security certificate expired on ${fmtDay(cert.validTo)}, so browsers show visitors a full-page warning.`
          : left <= (autoRenews ? 7 : 21)
            ? `Your security certificate expires in ${left} day${left === 1 ? "" : "s"}${autoRenews ? " and should renew on its own, but it's cutting it close" : ""}.`
            : `Your security certificate is valid until ${fmtDay(cert.validTo)}.`,
        left <= (autoRenews ? 7 : 21) ? "Renew the certificate (or check that automatic renewal is working). When it lapses, browsers block visitors with a scary warning page." : ""
      )
    );
  }

  if (mailAuth && mailAuth.hasMx) {
    const { spf, dmarc, policy } = mailAuth;
    const status = !spf && !dmarc ? "fail" : !spf || !dmarc || policy === "none" ? "warn" : "pass";
    const missing = [!spf && "SPF", !dmarc && "DMARC"].filter(Boolean);
    checks.push(
      check(
        "email-auth",
        "Behind the scenes",
        "Email protected from spoofing",
        4,
        status,
        status === "pass"
          ? "Your business email has SPF and DMARC set up, so your emails are less likely to land in spam and harder for scammers to fake."
          : missing.length
            ? `Your email domain is missing ${missing.join(" and ")}, so your emails are more likely to land in spam and scammers can send emails that look like they're from you.`
            : "Your email domain has SPF and DMARC, but DMARC is only set to monitor, so fake emails using your name still get delivered.",
        status === "pass"
          ? ""
          : "These are a few free settings in your domain's DNS. Google and Yahoo now expect them from businesses, and they take about 15 minutes to set up."
      )
    );
  }

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
  if (freshest && freshnessSource === "copyright year" && latestCopyright >= year) {
    // A current footer year is a weak signal: it is often printed automatically.
    checks.push(
      check("freshness", "Freshness", "Recently updated", 6, "skip", `We couldn't find an update date. Your footer shows ${latestCopyright}, but that doesn't prove the content itself is recent.`, "")
    );
  } else if (freshest) {
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

  // On a JavaScript-only page we can't see the visible content, so content checks
  // would report things as missing that visitors can actually see. Don't score them.
  if (jsShell) {
    const CONTENT_CHECKS = new Set(["cta", "click-to-call", "contact", "reviews", "copyright", "h1", "nap", "hours", "alt-text", "broken-links"]);
    for (const c of checks) {
      if (CONTENT_CHECKS.has(c.id)) {
        c.status = "skip";
        c.detail = "Your page builds itself with JavaScript, so we couldn't check this automatically. We'll look at it with you on a free call.";
        c.fix = "";
      }
    }
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
