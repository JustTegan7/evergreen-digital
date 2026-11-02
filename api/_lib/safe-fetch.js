/* =============================================================================
   safe-fetch.js, outbound fetching for the website audit
   Evergreen Digital · evergreendigitalco.com
   =============================================================================

   The audit fetches URLs that visitors type in, so every request goes through
   here to keep the function from being pointed at private infrastructure
   (SSRF). Each hop of a redirect chain is re-checked, response bodies are
   capped, and every request has a hard timeout.

   Files under api/_lib are not deployed as endpoints by Vercel.
   ============================================================================= */

import dns from "node:dns/promises";
import net from "node:net";

// Local testing only: lets the audit hit fixture sites on localhost. Ignored
// when NODE_ENV is "production", which Vercel always sets.
const ALLOW_PRIVATE = process.env.AUDIT_ALLOW_PRIVATE === "1" && process.env.NODE_ENV !== "production";

const USER_AGENT =
  "Mozilla/5.0 (compatible; EvergreenSiteCheck/1.0; +https://www.evergreendigitalco.com/#audit)";

/* ── Private / reserved address detection ─────────────────────────────────── */

function isPrivateIPv4(ip) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast + reserved
  );
}

/** Expands an IPv6 address to 8 groups of 16-bit numbers. */
function ipv6Groups(ip) {
  let v = ip.toLowerCase().split("%")[0];
  // Trailing dotted IPv4 (::ffff:1.2.3.4) -> two hex groups
  const dotted = v.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const p = dotted[1].split(".").map(Number);
    v = v.slice(0, -dotted[1].length) + ((p[0] << 8) | p[1]).toString(16) + ":" + ((p[2] << 8) | p[3]).toString(16);
  }
  const [head, tail] = v.includes("::") ? v.split("::") : [v, null];
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  const fill = tail === null ? [] : Array(8 - h.length - t.length).fill("0");
  return [...h, ...fill, ...t].map((x) => parseInt(x || "0", 16));
}

const v4From = (hi, lo) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;

function isPrivateIPv6(ip) {
  const g = ipv6Groups(ip);
  if (g.length !== 8 || g.some((n) => Number.isNaN(n))) return true;
  const [a, b] = g;
  if (g.every((n) => n === 0)) return true; // ::
  if (g.slice(0, 7).every((n) => n === 0) && g[7] === 1) return true; // ::1
  if ((a & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((a & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((a & 0xff00) === 0xff00) return true; // multicast
  if (a === 0x2001 && b === 0x0db8) return true; // documentation
  // Addresses that carry an IPv4 address inside: check that address too.
  if (g.slice(0, 5).every((n) => n === 0) && (g[5] === 0xffff || g[5] === 0)) return isPrivateIPv4(v4From(g[6], g[7])); // ::ffff:a.b.c.d, ::a.b.c.d
  if (a === 0x64 && b === 0xff9b) return isPrivateIPv4(v4From(g[6], g[7])); // NAT64
  if (a === 0x2002) return isPrivateIPv4(v4From(g[1], g[2])); // 6to4
  return false;
}

export function isPrivateAddress(ip) {
  const family = net.isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) return isPrivateIPv6(ip);
  return true;
}

/* ── URL normalisation ────────────────────────────────────────────────────── */

/**
 * Turns whatever the visitor typed ("joesdetailing.com", "www.x.com/",
 * "https://x.com") into a URL object, or throws a friendly error.
 */
export function normaliseUrl(input) {
  let raw = String(input || "").trim();
  if (!raw) throw new UserError("Enter your website address.");
  if (raw.length > 500) throw new UserError("That address is too long.");
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new UserError("That doesn't look like a website address.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new UserError("Only regular web addresses (http or https) can be checked.");
  }
  if (url.username || url.password) {
    throw new UserError("That doesn't look like a website address.");
  }
  if (ALLOW_PRIVATE) return url;
  if (url.port && !["80", "443"].includes(url.port)) {
    throw new UserError("Only standard web ports can be checked.");
  }
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || host.endsWith(".local") || host.endsWith(".internal") || host === "localhost") {
    throw new UserError("That doesn't look like a public website address.");
  }
  url.hash = "";
  return url;
}

export class UserError extends Error {}


async function assertPublicHost(hostname) {
  if (ALLOW_PRIVATE) return;
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new UserError("That address can't be checked.");
    return;
  }
  let records;
  try {
    records = await dns.lookup(hostname, { all: true });
  } catch {
    throw new UserError("We couldn't find that website. Check the spelling and try again.");
  }
  if (!records.length || records.some((r) => isPrivateAddress(r.address))) {
    throw new UserError("That address can't be checked.");
  }
}

/* ── Fetch with manual, re-validated redirects ────────────────────────────── */

/**
 * @returns {Promise<{ok, status, url, headers, text, redirects, ms}>}
 *   `text` is only read when `readBody` is true, and is capped at `maxBytes`.
 */
export async function safeFetch(
  input,
  { method = "GET", timeoutMs = 10000, maxRedirects = 5, readBody = true, maxBytes = 2_000_000 } = {}
) {
  let url = typeof input === "string" ? new URL(input) : input;
  const redirects = [];
  const started = Date.now();
  const deadline = started + timeoutMs;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new UserError("That site redirected somewhere we can't follow.");
    }
    if (!ALLOW_PRIVATE && url.port && !["80", "443"].includes(url.port)) {
      // Checked on every hop, not just the first, so a redirect can't send us
      // to an internal service on another port.
      throw new UserError("That site redirected somewhere we can't follow.");
    }
    if (url.username || url.password) throw new UserError("That site redirected somewhere we can't follow.");
    await assertPublicHost(url.hostname);

    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new UserError("That website took too long to respond.");

    let res;
    try {
      res = await fetch(url, {
        method,
        redirect: "manual",
        signal: AbortSignal.timeout(remaining),
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9",
        },
      });
    } catch (err) {
      if (err?.name === "TimeoutError" || err?.name === "AbortError") {
        throw new UserError("That website took too long to respond.");
      }
      throw new UserError("We couldn't reach that website. Check the address and try again.");
    }

    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      redirects.push({ from: url.href, status: res.status });
      res.body?.cancel().catch(() => {});
      url = new URL(res.headers.get("location"), url);
      continue;
    }

    let text = "";
    if (readBody && res.body) {
      text = await readCapped(res, maxBytes);
    } else {
      res.body?.cancel().catch(() => {});
    }

    return {
      ok: res.ok,
      status: res.status,
      url: url.href,
      headers: res.headers,
      text,
      redirects,
      ms: Date.now() - started,
    };
  }
  throw new UserError("That website redirects too many times.");
}

async function readCapped(res, maxBytes) {
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      chunks.push(value.subarray(0, value.byteLength - (total - maxBytes)));
      reader.cancel().catch(() => {});
      break;
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
}

/** Same as safeFetch but never throws; returns null on any failure. */
export async function tryFetch(input, opts) {
  try {
    return await safeFetch(input, opts);
  } catch {
    return null;
  }
}
