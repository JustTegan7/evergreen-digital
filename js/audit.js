/* =============================================================================
   audit.js, Free Website Check widget
   Evergreen Digital · evergreendigitalco.com
   =============================================================================

   Renders into any element with [data-audit-widget], so the same check can
   sit on the homepage and on every niche landing page.

   Flow
   ----
   1. Visitor enters a URL           → POST /api/audit
   2. Teaser: score + top 1 or 2 issues, the rest of the checklist blurred
   3. Visitor enters email           → POST /api/unlock (emails the lead to us)
   4. Full report, grouped by category, with a book-a-call CTA

   GA4 events: audit_started, audit_completed, generate_lead (lead_source
   "site_audit", same event the booking modal and contact form fire).
   ============================================================================= */

"use strict";

const STATUS = {
  pass: { icon: "✓", label: "Good" },
  warn: { icon: "!", label: "Needs attention" },
  fail: { icon: "✕", label: "Problem" },
  skip: { icon: "·", label: "Not scored" },
};

const LOADING_STEPS = [
  "Loading your homepage",
  "Checking mobile layout and speed",
  "Looking for a clear call to action",
  "Checking security and trust signals",
  "Checking what Google sees",
  "Testing your links",
  "Adding up your score",
];

const esc = (s) => {
  const d = document.createElement("div");
  d.textContent = String(s ?? "");
  return d.innerHTML;
};

const track = (name, params = {}) => {
  if (typeof gtag === "function") gtag("event", name, params);
};

function scoreTone(score) {
  if (score >= 85) return "good";
  if (score >= 65) return "ok";
  return "bad";
}

function ring(score) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  return `
    <div class="audit-ring audit-ring--${scoreTone(score)}" role="img" aria-label="Score ${score} out of 100">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle class="audit-ring__track" cx="60" cy="60" r="${r}" />
        <circle class="audit-ring__value" cx="60" cy="60" r="${r}"
          stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${c.toFixed(1)}"
          data-offset="${offset.toFixed(1)}" />
      </svg>
      <div class="audit-ring__num"><span>${score}</span><small>/100</small></div>
    </div>`;
}

function issueItem(c) {
  return `
    <li class="audit-issue audit-issue--${c.status}">
      <span class="audit-issue__icon" aria-hidden="true">${STATUS[c.status].icon}</span>
      <div>
        <div class="audit-issue__label">${esc(c.label)} <span class="sr-only">(${STATUS[c.status].label})</span></div>
        <div class="audit-issue__detail">${esc(c.detail)}</div>
        ${c.fix ? `<div class="audit-issue__fix">${esc(c.fix)}</div>` : ""}
      </div>
    </li>`;
}

/* ── Views ────────────────────────────────────────────────────────────────── */

function formView(prefill = "", error = "") {
  return `
    <form class="audit-form" novalidate>
      <label class="sr-only" for="audit-url-${uid}">Your website address</label>
      <div class="audit-form__row">
        <input class="audit-form__input" id="audit-url-${uid}" name="url" type="text"
          inputmode="url" autocomplete="url" autocapitalize="off" spellcheck="false"
          placeholder="yourbusiness.com" value="${esc(prefill)}" required />
        <button class="audit-form__btn" type="submit">Check My Site →</button>
      </div>
      <p class="audit-form__error" role="alert">${esc(error)}</p>
      <p class="audit-form__note">Free. Takes about 30 seconds. No email needed to see your score.</p>
    </form>`;
}

function loadingView(host) {
  return `
    <div class="audit-loading" aria-busy="true">
      <div class="audit-loading__spinner" aria-hidden="true"></div>
      <p class="audit-loading__title">Checking <strong>${esc(host)}</strong></p>
      <ol class="audit-loading__steps">
        ${LOADING_STEPS.map((s, i) => `<li data-step="${i}">${esc(s)}</li>`).join("")}
      </ol>
    </div>`;
}

function teaserView(t) {
  const remaining = t.totalChecks - t.topIssues.length;
  const blurred = Array.from({ length: Math.min(6, remaining) }, (_, i) =>
    `<li class="audit-issue audit-issue--locked"><span class="audit-issue__icon" aria-hidden="true">?</span><div><div class="audit-issue__label">${"█".repeat(10 + ((i * 7) % 9))}</div><div class="audit-issue__detail">${"█".repeat(28 + ((i * 11) % 17))}</div></div></li>`
  ).join("");

  return `
    <div class="audit-result">
      <div class="audit-result__head">
        ${ring(t.score)}
        <div>
          <p class="audit-result__eyebrow">${esc(t.host)}</p>
          <h3 class="audit-result__grade">${esc(t.grade)}</h3>
          <p class="audit-result__counts">
            <span class="is-pass">${t.counts.pass} good</span>
            <span class="is-warn">${t.counts.warn} need attention</span>
            <span class="is-fail">${t.counts.fail} problems</span>
          </p>
        </div>
      </div>

      ${
        t.topIssues.length
          ? `<p class="audit-result__sub">Your biggest ${t.topIssues.length === 1 ? "issue" : "issues"}:</p>
             <ul class="audit-issues">${t.topIssues.map(issueItem).join("")}</ul>`
          : `<p class="audit-result__sub">No major problems. Nice work. Your full report still has a few details worth a look.</p>`
      }

      <div class="audit-lock">
        <ul class="audit-issues audit-issues--blurred" aria-hidden="true">${blurred}</ul>
        <form class="audit-unlock" novalidate>
          <p class="audit-unlock__title">See all ${t.totalChecks} checks and how to fix each one</p>
          <p class="audit-unlock__sub">We'll show your full report right here. Plain English, no jargon.</p>
          <div class="audit-unlock__fields">
            <label class="sr-only" for="audit-name-${uid}">First name (optional)</label>
            <input class="audit-form__input" id="audit-name-${uid}" name="name" type="text" autocomplete="given-name" placeholder="First name (optional)" />
            <label class="sr-only" for="audit-email-${uid}">Email</label>
            <input class="audit-form__input" id="audit-email-${uid}" name="email" type="email" autocomplete="email" placeholder="you@yourbusiness.com" required />
            <input class="audit-hp" name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" />
            <button class="audit-form__btn" type="submit">Unlock Full Report →</button>
          </div>
          <p class="audit-form__error" role="alert"></p>
          <p class="audit-form__note">No spam. A real person on our team may follow up once, and that's it.</p>
        </form>
      </div>
      <button class="audit-again" type="button">Check a different site</button>
    </div>`;
}

function fullView(r) {
  const cats = [...new Set(r.checks.map((c) => c.category))];
  const order = { fail: 0, warn: 1, pass: 2, skip: 3 };
  const groups = cats
    .map((cat) => {
      const items = r.checks.filter((c) => c.category === cat).sort((a, b) => order[a.status] - order[b.status]);
      return `<div class="audit-group">
        <h4 class="audit-group__title">${esc(cat)}</h4>
        <ul class="audit-issues">${items.map(issueItem).join("")}</ul>
      </div>`;
    })
    .join("");

  return `
    <div class="audit-result audit-result--full">
      <div class="audit-result__head">
        ${ring(r.score)}
        <div>
          <p class="audit-result__eyebrow">${esc(r.host)}</p>
          <h3 class="audit-result__grade">${esc(r.grade)}</h3>
          <p class="audit-result__counts">
            <span class="is-pass">${r.counts.pass} good</span>
            <span class="is-warn">${r.counts.warn} need attention</span>
            <span class="is-fail">${r.counts.fail} problems</span>
          </p>
        </div>
      </div>
      <div class="audit-groups">${groups}</div>
      <div class="audit-cta">
        <p class="audit-cta__title">Want us to fix these for you?</p>
        <p class="audit-cta__sub">Our care plans are built to fix exactly these things. Book a free 20-minute call and we'll walk through your report together.</p>
        ${
          document.getElementById("booking-modal")
            ? `<button class="btn-primary" data-modal-trigger aria-haspopup="dialog">Book a Free Call →</button>`
            : `<a class="btn-primary" href="/#contact">Book a Free Call →</a>`
        }
        <a class="audit-cta__alt" href="/#services">See plans from $30/mo</a>
      </div>
      <button class="audit-again" type="button">Check a different site</button>
    </div>`;
}

/* ── Controller ───────────────────────────────────────────────────────────── */

let uid = 0;

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) throw new Error(data.error || "Something went wrong. Try again in a minute.");
  return data;
}

function animateRing(root) {
  const v = root.querySelector(".audit-ring__value");
  if (!v) return;
  requestAnimationFrame(() => requestAnimationFrame(() => (v.style.strokeDashoffset = v.dataset.offset)));
}

function mount(root) {
  uid++;
  const state = { url: "", token: null, teaser: null };

  const show = (html) => {
    root.innerHTML = html;
    animateRing(root);
  };

  const showForm = (prefill = "", error = "") => {
    show(formView(prefill, error));
    const form = root.querySelector(".audit-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const url = form.url.value.trim();
      if (!url) {
        form.querySelector(".audit-form__error").textContent = "Enter your website address.";
        form.url.focus();
        return;
      }
      run(url);
    });
  };

  const run = async (url) => {
    state.url = url;
    const host = url.replace(/^https?:\/\//i, "").split("/")[0];
    show(loadingView(host));
    track("audit_started", { site: host });

    const steps = [...root.querySelectorAll(".audit-loading__steps li")];
    let i = 0;
    steps[0]?.classList.add("is-active");
    const timer = setInterval(() => {
      if (i < steps.length - 1) {
        steps[i].classList.replace("is-active", "is-done");
        i++;
        steps[i].classList.add("is-active");
      }
    }, 4000);

    try {
      const data = await postJson("/api/audit", { url });
      state.token = data.token;
      state.teaser = data.teaser;
      track("audit_completed", { site: data.teaser.host, score: data.teaser.score });
      showTeaser();
    } catch (err) {
      showForm(url, err.message);
    } finally {
      clearInterval(timer);
    }
  };

  const showTeaser = () => {
    show(teaserView(state.teaser));
    root.querySelector(".audit-again").addEventListener("click", () => showForm());
    const form = root.querySelector(".audit-unlock");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = form.querySelector(".audit-form__error");
      const email = form.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        err.textContent = "Enter a valid email address.";
        form.email.focus();
        return;
      }
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      btn.textContent = "Unlocking…";
      err.textContent = "";
      try {
        const data = await postJson("/api/unlock", {
          token: state.token,
          email,
          name: form.name.value.trim(),
          website: form.website.value,
        });
        track("generate_lead", {
          event_category: "lead",
          event_label: state.teaser.host,
          lead_source: "site_audit",
          value: 1,
        });
        show(fullView(data.report));
        root.querySelector(".audit-again").addEventListener("click", () => showForm());
        root.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (ex) {
        err.textContent = ex.message;
        btn.disabled = false;
        btn.textContent = "Unlock Full Report →";
      }
    });
  };

  // Allow deep links like /#audit?site=joesdetailing.com from outreach emails
  const m = location.hash.match(/[?&]site=([^&]+)/);
  showForm(m ? decodeURIComponent(m[1]) : "");
  if (m && location.hash.startsWith("#audit?")) {
    requestAnimationFrame(() => document.getElementById("audit")?.scrollIntoView({ block: "start" }));
  }
}

export function initAuditWidgets() {
  document.querySelectorAll("[data-audit-widget]").forEach(mount);
}
