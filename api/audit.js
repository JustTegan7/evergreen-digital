/* =============================================================================
   POST /api/audit   { "url": "joesdetailing.com" }
   =============================================================================
   Runs the website check and returns the free teaser plus an encrypted token
   holding the full report. The token is exchanged for the full report at
   /api/unlock once the visitor gives an email address.
   ============================================================================= */

import { runAudit, toTeaser, UserError } from "./_lib/audit-core.js";
import { sealReport, rateLimited, clientIp, readJson, send, sameOriginOk } from "./_lib/support.js";

// Timeout is set in vercel.json ("functions").

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST." });
  if (!sameOriginOk(req)) return send(res, 403, { error: "Not allowed." });
  if (rateLimited(clientIp(req), 8, 10 * 60 * 1000)) {
    return send(res, 429, { error: "You've run a lot of checks in a short time. Give it a few minutes and try again." });
  }

  const { url } = await readJson(req);
  try {
    const report = await runAudit(url);
    return send(res, 200, { teaser: toTeaser(report), token: sealReport(report) });
  } catch (err) {
    if (err instanceof UserError) return send(res, 422, { error: err.message });
    console.error("[audit] unexpected error", err);
    return send(res, 500, { error: "Something went wrong on our end. Try again in a minute." });
  }
}
