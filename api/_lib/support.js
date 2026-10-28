/* =============================================================================
   support.js, shared plumbing for the audit endpoints
   =============================================================================

   Report tokens
   -------------
   The full report is gated behind an email address, but the site has no
   database. So /api/audit encrypts the full report (AES-256-GCM, key from
   AUDIT_SECRET) and hands the browser an opaque token. /api/unlock decrypts
   it only after a valid email arrives. The browser never holds a readable
   copy of the full report until the lead is captured.

   Environment variables
   ---------------------
     AUDIT_SECRET        Required in production. Any long random string.
     RESEND_API_KEY      Required to email leads (resend.com, free tier).
     LEAD_NOTIFY_EMAIL   Where lead alerts go. Default hello@evergreendigitalco.com
     AUDIT_FROM_EMAIL    Sender. Must be on a domain verified in Resend, e.g.
                         "Evergreen Site Check <audit@evergreendigitalco.com>".
                         Until the domain is verified, Resend only allows
                         onboarding@resend.dev sending to the Resend account
                         owner's own address.
     AUDIT_EMAIL_LEAD    "true" to also email the prospect a copy of their
                         report (needs the verified sender domain).
   ============================================================================= */

import crypto from "node:crypto";

/* ── Token encryption ─────────────────────────────────────────────────────── */

let warned = false;
function key() {
  let secret = process.env.AUDIT_SECRET;
  if (!secret) {
    if (!warned) {
      console.warn("[audit] AUDIT_SECRET is not set; using an insecure development key.");
      warned = true;
    }
    secret = "evergreen-dev-only-secret-change-me";
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function sealReport(report, ttlMs = 1000 * 60 * 60 * 24) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const payload = JSON.stringify({ exp: Date.now() + ttlMs, report });
  const enc = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64url");
}

export function openReport(token) {
  try {
    const buf = Buffer.from(String(token), "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    const json = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
    const { exp, report } = JSON.parse(json);
    if (Date.now() > exp) return null;
    return report;
  } catch {
    return null;
  }
}

/* ── Best-effort rate limiting ────────────────────────────────────────────── */
// In-memory, so it resets whenever Vercel spins up a fresh instance. It's a
// speed bump against someone hammering the button, not a security boundary.

const hits = new Map();
export function rateLimited(ip, limit, windowMs) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > limit;
}

export function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
}

/* ── Request / response helpers (Vercel Node runtime) ─────────────────────── */

export async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 200_000) break;
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return {};
  }
}

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

export function sameOriginOk(req) {
  // Browsers send Origin on POST. Block other websites from embedding the
  // tool and spending our quota; allow requests with no Origin (curl, tests).
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    const allowed = [req.headers.host, "www.evergreendigitalco.com", "evergreendigitalco.com"];
    return allowed.includes(host) || host.endsWith(".vercel.app") || host.startsWith("localhost") || host.startsWith("127.0.0.1");
  } catch {
    return false;
  }
}

/* ── Email via Resend ─────────────────────────────────────────────────────── */

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const STATUS_LABEL = { pass: "✓ Good", warn: "! Needs attention", fail: "✗ Problem", skip: "· Not scored" };
const STATUS_COLOR = { pass: "#2a7a4b", warn: "#b7791f", fail: "#c53030", skip: "#607568" };

export function reportEmailHtml(report, intro) {
  const rows = report.checks
    .map(
      (c) => `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #dce8e0;vertical-align:top;white-space:nowrap;color:${STATUS_COLOR[c.status]};font-weight:600;font-size:13px">${STATUS_LABEL[c.status]}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #dce8e0;font-size:14px;color:#1e2d24">
          <strong>${esc(c.label)}</strong><br>${esc(c.detail)}${c.fix ? `<br><span style="color:#607568">${esc(c.fix)}</span>` : ""}
        </td></tr>`
    )
    .join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#1e2d24">
    ${intro}
    <h2 style="font-family:Georgia,serif;margin:24px 0 4px">${esc(report.host)}: ${report.score}/100</h2>
    <p style="margin:0 0 16px;color:#607568">${esc(report.grade)} · checked ${esc(new Date(report.checkedAt).toLocaleString("en-US", { timeZone: "America/Los_Angeles" }))} PT</p>
    <table style="border-collapse:collapse;width:100%">${rows}</table>
  </div>`;
}

export async function sendEmail({ to, subject, html, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[audit] RESEND_API_KEY not set; email skipped:", subject);
    return { ok: false, skipped: true };
  }
  const from = process.env.AUDIT_FROM_EMAIL || "Evergreen Site Check <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [].concat(to), subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!res.ok) console.error("[audit] Resend error", res.status, await res.text().catch(() => ""));
    return { ok: res.ok };
  } catch (err) {
    console.error("[audit] Resend request failed", err);
    return { ok: false };
  }
}

export { esc };
