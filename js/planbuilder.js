/**
 * planbuilder.js, interactive plan and add-on price estimate
 * Evergreen Digital · evergreendigitalco.com
 *
 * KEEP IN SYNC with the contract (Schedule A) and the Packages and Add-Ons
 * sections. Prices here are hand-written on purpose, like industry.js.
 *   Plans:   Ultra-Lite $30 / Basic $50 / Growth $150 / Elite $350
 *   Setup:   $500 / $1,000 / $1,500 / $2,000
 *   Prepay:  12 months for the price of 10 (plan fee only)
 *   ACH:     2% off the plan setup fee and the annual prepay, not monthly bills
 *   Juniper and Grove are included with Growth and Elite. Reputation Monitoring
 *   is included with Growth and Elite. POS is Growth and Elite only.
 */

"use strict";

const PLANS = {
  ultralite: { name: "Ultra-Lite", fee: 30, setup: 500 },
  basic: { name: "Basic", fee: 50, setup: 1000 },
  growth: { name: "Growth", fee: 150, setup: 1500 },
  elite: { name: "Elite", fee: 350, setup: 2000 },
};

// included: plan keys where the add-on costs nothing extra
const ADDONS = [
  { id: "sms", name: "SMS + Email Marketing", fee: 149, setup: 300, note: "Email is included with Elite" },
  { id: "rep", name: "Reputation Monitoring", fee: 99, setup: 150, included: ["growth", "elite"] },
  { id: "social", name: "Social Media Management (2 platforms)", fee: 399, setup: 300, note: "+$100/mo per extra platform" },
  { id: "ads", name: "Google Ads Management", fee: 350, setup: 500, note: "Ad spend billed by Google" },
  { id: "shop", name: "eCommerce Storefront", fee: 149, setup: 500, note: "Plus 1% of sales" },
  { id: "portal", name: "Custom Business Portal (from)", fee: 199, setup: 500, note: "Final price quoted by scope" },
  { id: "juniper", name: "Juniper (booking, storefront, staff)", fee: 69, included: ["growth", "elite"] },
  { id: "grove", name: "Grove (CRM)", fee: 39, included: ["growth", "elite"] },
];
const POS = { reader: 20, terminal: 30 };

const money = (n) => "$" + Math.round(n).toLocaleString("en-US");

export function initPlanBuilder() {
  const controls = document.querySelector("[data-builder-controls]");
  const summary = document.querySelector("[data-builder-summary]");
  if (!controls || !summary) return;

  const state = { plan: "growth", addons: new Set(), readers: 0, terminals: 0, annual: false, ach: false };

  controls.innerHTML = `
    <fieldset class="builder__group">
      <legend>1. Pick a plan</legend>
      <div class="builder__plans">
        ${Object.entries(PLANS).map(([k, p]) => `
          <label class="builder__plan">
            <input type="radio" name="plan" value="${k}" ${k === state.plan ? "checked" : ""} />
            <span><b>${p.name}</b><small>${money(p.fee)}/mo</small></span>
          </label>`).join("")}
      </div>
    </fieldset>
    <fieldset class="builder__group">
      <legend>2. Add what you need</legend>
      <div class="builder__addons" data-addon-list></div>
      <div class="builder__pos" data-pos>
        <p><b>Card terminals</b> <small data-pos-note></small></p>
        <label>Card readers <small>$${POS.reader}/mo each</small>
          <input type="number" min="0" max="10" value="0" data-pos-input="readers" /></label>
        <label>Smart terminals <small>$${POS.terminal}/mo each</small>
          <input type="number" min="0" max="10" value="0" data-pos-input="terminals" /></label>
      </div>
    </fieldset>
    <fieldset class="builder__group">
      <legend>3. How you would like to pay</legend>
      <label class="builder__check"><input type="checkbox" data-pay="annual" /> <span>Prepay a year, get 12 months for the price of 10 <small>(plan fee only)</small></span></label>
      <label class="builder__check"><input type="checkbox" data-pay="ach" /> <span>Pay setup and prepay by bank transfer, save 2%</span></label>
    </fieldset>`;

  const list = controls.querySelector("[data-addon-list]");
  const posBox = controls.querySelector("[data-pos]");
  const posNote = controls.querySelector("[data-pos-note]");

  function renderAddons() {
    list.innerHTML = ADDONS.map((a) => {
      const free = a.included && a.included.includes(state.plan);
      const checked = free || state.addons.has(a.id);
      const price = free ? "Included" : `${money(a.fee)}/mo`;
      const extra = a.note ? `<small>${a.note}</small>` : "";
      return `<label class="builder__addon ${free ? "is-free" : ""}">
        <input type="checkbox" value="${a.id}" ${checked ? "checked" : ""} ${free ? "disabled" : ""} />
        <span class="builder__addon-name">${a.name}${extra}</span>
        <span class="builder__addon-price">${price}</span>
      </label>`;
    }).join("");
    const posOk = state.plan === "growth" || state.plan === "elite";
    posBox.classList.toggle("is-off", !posOk);
    posBox.querySelectorAll("input").forEach((i) => (i.disabled = !posOk));
    posNote.textContent = posOk ? "Growth and Elite only. Processing fees are billed by Helcim." : "Available on Growth and Elite.";
    if (!posOk) { state.readers = 0; state.terminals = 0; posBox.querySelectorAll("input").forEach((i) => (i.value = "0")); }
  }

  function render() {
    const plan = PLANS[state.plan];
    let addonMonthly = 0;
    let addonSetup = 0;
    const lines = [];
    ADDONS.forEach((a) => {
      const free = a.included && a.included.includes(state.plan);
      if (free || !state.addons.has(a.id)) return;
      addonMonthly += a.fee;
      addonSetup += a.setup || 0;
      lines.push([a.name, `${money(a.fee)}/mo`]);
    });
    const posMonthly = state.readers * POS.reader + state.terminals * POS.terminal;
    if (posMonthly) lines.push(["Card terminals", `${money(posMonthly)}/mo`]);

    const discount = state.ach ? 0.02 : 0;
    const setupPlan = plan.setup * (1 - discount);
    const prepay = state.annual ? plan.fee * 10 * (1 - discount) : 0;
    const monthly = (state.annual ? 0 : plan.fee) + addonMonthly + posMonthly;
    const dueToday = setupPlan + addonSetup + prepay;
    const yearOne = dueToday + monthly * 12;
    const saved = (plan.setup * discount) + (state.annual ? plan.fee * 10 * discount + plan.fee * 2 : 0);

    summary.innerHTML = `
      <p class="builder__eyebrow">Your estimate</p>
      <div class="builder__total"><span>${money(monthly)}</span><small>/month${state.annual ? " after prepay" : ""}</small></div>
      <ul class="builder__lines">
        <li><span>${plan.name} plan ${state.annual ? "(prepaid, 10 months for 12)" : ""}</span><span>${state.annual ? money(prepay) : money(plan.fee) + "/mo"}</span></li>
        ${lines.map(([n, v]) => `<li><span>${n}</span><span>${v}</span></li>`).join("")}
        ${["growth", "elite"].includes(state.plan) ? "<li class=\"is-free\"><span>Juniper or Grove, Reputation Monitoring</span><span>Included</span></li>" : ""}
      </ul>
      <div class="builder__due">
        <div><span>Due at signing</span><b>${money(dueToday)}</b></div>
        <p>${money(setupPlan)} setup${addonSetup ? ` + ${money(addonSetup)} add-on setup` : ""}${state.annual ? ` + ${money(prepay)} prepaid plan fee` : ""}. Split the plan setup fee over 3, 6, or 12 months if you prefer.</p>
      </div>
      <p class="builder__year">First year, all in: about <b>${money(yearOne)}</b>${saved ? ` <span class="builder__save">You save about ${money(saved)}</span>` : ""}</p>
      <button class="builder__cta" data-modal-trigger aria-haspopup="dialog">Talk through this plan →</button>
      <p class="builder__fine">Estimate only. Portal pricing, ad spend, store sales fees, and card processing fees are billed separately where noted. Your agreement confirms the final numbers.</p>`;
  }

  controls.addEventListener("change", (e) => {
    const t = e.target;
    if (t.name === "plan") { state.plan = t.value; renderAddons(); }
    else if (t.closest("[data-addon-list]")) { t.checked ? state.addons.add(t.value) : state.addons.delete(t.value); }
    else if (t.dataset.pay === "annual") state.annual = t.checked;
    else if (t.dataset.pay === "ach") state.ach = t.checked;
    render();
  });
  controls.addEventListener("input", (e) => {
    const k = e.target.dataset.posInput;
    if (!k) return;
    state[k] = Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0));
    render();
  });

  renderAddons();
  render();
}
