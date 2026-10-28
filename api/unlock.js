/* =============================================================================
   POST /api/unlock   { "token": "...", "email": "owner@biz.com", "name": "", "website": "" }
   =============================================================================
   Exchanges the sealed report for the full report once an email is given,
   and emails the lead (with their full report) to the Evergreen inbox so the
   team can follow up. `website` is a honeypot: real visitors never fill it.
   ============================================================================= */

import {
  openReport,
  rateLimited,
  clientIp,
  readJson,
  send,
  sameOriginOk,
  sendEmail,
  reportEmailHtml,
  esc,
} from "./_lib/support.js";

// Timeout is set in vercel.json ("functions").

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST." });
  if (!sameOriginOk(req)) return send(res, 403, { error: "Not allowed." });
  if (rateLimited("unlock:" + clientIp(req), 10, 10 * 60 * 1000)) {
    return send(res, 429, { error: "Too many requests. Try again in a few minutes." });
  }

  const body = await readJson(req);
  const email = String(body.email || "").trim().slice(0, 200);
  const name = String(body.name || "").trim().slice(0, 100);

  if (!EMAIL_RE.test(email)) return send(res, 422, { error: "Enter a valid email address." });

  const report = openReport(body.token);
  if (!report) return send(res, 410, { error: "This check has expired. Run it again to see your report." });

  // Honeypot tripped: act normal, but don't notify the team.
  if (body.website) return send(res, 200, { report });

  const top = report.checks.filter((c) => c.status === "fail").map((c) => c.label);
  const notify = process.env.LEAD_NOTIFY_EMAIL || "hello@evergreendigitalco.com";
  const intro = `<p style="font-size:15px">New lead from the <strong>free website check</strong>.</p>
    <p style="font-size:15px;line-height:1.6">
      <strong>Name:</strong> ${esc(name || "(not given)")}<br>
      <strong>Email:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a><br>
      <strong>Website:</strong> <a href="${esc(report.url)}">${esc(report.url)}</a><br>
      <strong>Business (best guess):</strong> ${esc(report.businessName || "unknown")}<br>
      <strong>Biggest problems:</strong> ${esc(top.slice(0, 4).join(", ") || "none, solid site")}
    </p>
    <p style="font-size:13px;color:#607568">Reply to this email to reach them directly.</p>`;

  const jobs = [
    sendEmail({
      to: notify,
      replyTo: email,
      subject: `Site check lead: ${report.host} scored ${report.score}/100`,
      html: reportEmailHtml(report, intro),
    }),
  ];

  if (process.env.AUDIT_EMAIL_LEAD === "true") {
    jobs.push(
      sendEmail({
        to: email,
        replyTo: notify,
        subject: `Your website check: ${report.host} scored ${report.score}/100`,
        html: reportEmailHtml(
          report,
          `<p style="font-size:15px;line-height:1.6">Hi${name ? " " + esc(name.split(" ")[0]) : ""},</p>
           <p style="font-size:15px;line-height:1.6">Here's the full report from your free website check. Want help with any of it? Just reply, or book a free 20-minute call at <a href="https://www.evergreendigitalco.com/#contact">evergreendigitalco.com</a>.</p>
           <p style="font-size:15px">Evergreen Digital<br>Mill Creek, WA</p>`
        ),
      })
    );
  }

  await Promise.all(jobs);
  return send(res, 200, { report });
}
