/* =============================================================================
   industry.js — Industry Package Recommender
   Evergreen Digital · evergreendigitalco.com
   =============================================================================

   Renders a recommended plan + add-on bundle for the selected industry.

   IMPORTANT — keep this in sync with the internal pricing master sheet.
   The `total` value is NOT calculated at runtime; it is written by hand so a
   typo here will not silently produce a wrong price on a live page. If you
   change a plan or add-on price, update the matching total below and re-check
   the arithmetic in the comment beside it.

   Reference prices (July 30, 2026):
     Ultra-Lite $50 · Basic $149 · Growth $250 · Elite $450
     SMS + Email $149 · Lead CRM $299 · Google Ads $350 · eCommerce $149 + 2.5%
     Reputation $149 · Business Portal $199–299 · AI Receptionist from $249
     Photo + Video quoted per shoot
   ============================================================================= */

"use strict";

const INDUSTRY_PACKAGES = {
  "home-services": {
    label: "Home Services",
    plan: "Growth",
    addons: ["SMS + Email Marketing", "Lead CRM + Routing"],
    total: "$698", // 250 + 149 + 299
    suffix: "/mo",
    reason:
      "Trades live and die by the schedule. Automated reminders cut no-shows " +
      "by 25–30%, and routed leads mean the 7am call never sits unanswered " +
      "while you\u2019re under a sink.",
  },
  salons: {
    label: "Salons & Spas",
    plan: "Growth",
    addons: ["SMS + Email Marketing", "Photo + Video"],
    total: "$399", // 250 + 149  (+ video quoted per shoot)
    suffix: "/mo + shoots",
    reason:
      "People book a salon with their eyes. Real photography and video of " +
      "your actual work converts far better than stock imagery — and text " +
      "reminders keep the chair full.",
  },
  retail: {
    label: "Retail & eCommerce",
    plan: "Elite",
    addons: ["eCommerce Storefront"],
    total: "$599", // 450 + 149  (+ 2.5% of transactions)
    suffix: "/mo + 2.5%",
    reason:
      "Most agencies take 5–8% of every sale. We take 2.5%. On $50k a month " +
      "in sales that difference is roughly $15,000 a year — which usually " +
      "pays for the entire plan several times over.",
  },
  professional: {
    label: "Professional Services",
    plan: "Growth",
    addons: ["Google Ads Management", "SMS + Email Marketing"],
    total: "$749", // 250 + 350 + 149
    suffix: "/mo",
    reason:
      "When someone searches for a lawyer or an accountant, they are ready " +
      "to hire today. Paid search puts you in front of that moment, and SEO " +
      "keeps you there once the ads pause.",
  },
  gyms: {
    label: "Gyms & Fitness",
    plan: "Growth",
    addons: ["SMS + Email Marketing", "Custom Business Portal"],
    total: "$648", // 250 + 149 + 249
    suffix: "/mo",
    reason:
      "Signing members is the easy part — keeping them is the business. A " +
      "member portal plus consistent check-ins is what turns a January " +
      "signup into a paying member in June.",
  },
  nonprofits: {
    label: "Churches & Nonprofits",
    plan: "Growth",
    addons: ["SMS + Email Marketing", "Reputation Monitoring"],
    total: "$548", // 250 + 149 + 149
    suffix: "/mo",
    reason:
      "Giving follows trust. Being easy to find, easy to contact, and " +
      "visibly well cared for online does more for donations than any " +
      "single campaign.",
  },
};

/* -----------------------------------------------------------------------------
   Rendering
   -------------------------------------------------------------------------- */

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderPanel(key) {
  const data = INDUSTRY_PACKAGES[key];
  if (!data) return "";

  const addonList = data.addons
    .map((a) => `<li class="industry__addon">${escapeHtml(a)}</li>`)
    .join("");

  return `
    <div class="industry__result">
      <p class="industry__eyebrow">Recommended for ${escapeHtml(data.label)}</p>

      <div class="industry__stack">
        <span class="industry__plan">${escapeHtml(data.plan)} Plan</span>
        <ul class="industry__addons">${addonList}</ul>
      </div>

      <div class="industry__total">
        <span class="industry__total-num">${escapeHtml(data.total)}</span>
        <span class="industry__total-suffix">${escapeHtml(data.suffix)}</span>
      </div>

      <p class="industry__reason">${escapeHtml(data.reason)}</p>

      <button class="industry__cta" data-modal-trigger aria-haspopup="dialog">
        Talk Through This Setup →
      </button>
    </div>
  `;
}

/* -----------------------------------------------------------------------------
   Init
   -------------------------------------------------------------------------- */

function initIndustryRecommender() {
  const root = document.getElementById("industry");
  const panel = document.getElementById("industry-panel");
  if (!root || !panel) return;

  const tabs = Array.from(root.querySelectorAll(".industry__tab"));
  if (!tabs.length) return;

  function select(tab) {
    tabs.forEach((t) => {
      const active = t === tab;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
    });
    panel.innerHTML = renderPanel(tab.dataset.industry);
    panel.setAttribute("aria-labelledby", tab.id);
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => select(tab));

    // Arrow-key navigation between tabs (WAI-ARIA tablist pattern)
    tab.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const i = tabs.indexOf(tab);
      const next =
        e.key === "ArrowRight"
          ? tabs[(i + 1) % tabs.length]
          : tabs[(i - 1 + tabs.length) % tabs.length];
      next.focus();
      select(next);
    });
  });

  // Render the default (first) tab on load
  select(tabs.find((t) => t.classList.contains("is-active")) || tabs[0]);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initIndustryRecommender);
} else {
  initIndustryRecommender();
}
