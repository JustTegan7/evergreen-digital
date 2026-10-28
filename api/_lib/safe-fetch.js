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

function isPrivateIPv6(ip) {
  const v = ip.toLowerCase();
  if (v === "::" || v === "::1") return true;
  if (v.startsWith("fc") || v.startsWith("fd")) return true; // unique local
  if (v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb")) return true;
  const mapped = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
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
