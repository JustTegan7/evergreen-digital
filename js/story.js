/**
 * story.js, scroll-driven before/after, section progress dots, sticky CTA
 * Evergreen Digital · evergreendigitalco.com
 *
 * Before/after: sets the CSS variable --p (0 = old site, 1 = new site) from
 * how far the visitor has scrolled through the tall .ba section. The range
 * slider drives the same variable, so keyboard and reduced-motion visitors
 * get the same comparison without scroll tricks.
 */

"use strict";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function initBeforeAfter() {
  const root = document.querySelector("[data-ba]");
  if (!root) return;
  const slider = root.querySelector(".ba__slider");
  const state = root.querySelector(".ba__state");
  const chips = [...root.querySelectorAll(".ba__chip")];
  const still = reduceMotion();

  const set = (v) => {
    const p = clamp(v);
    root.style.setProperty("--p", p.toFixed(3));
    if (slider) slider.value = String(Math.round(p * 100));
    if (state) state.textContent = p < 0.12 ? "Before" : p > 0.88 ? "After" : "Fixing it";
    chips.forEach((c) => c.classList.toggle("is-on", p >= parseFloat(c.dataset.at)));
  };

  if (still) {
    root.classList.add("ba--still");
    set(1);
  } else {
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = root.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      set(span > 0 ? -(r.top - 88) / span : 1);
    };
    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  if (slider) slider.addEventListener("input", () => set(Number(slider.value) / 100));
}

function initDots() {
  const nav = document.querySelector("[data-dots]");
  if (!nav) return;
  const items = [
    ["story", "The difference"],
    ["how", "How it works"],
    ["audit", "Free site check"],
    ["work", "Our work"],
    ["showcase", "Demos"],
    ["services", "Plans"],
    ["addons", "Add-ons"],
    ["about", "About"],
    ["contact", "Contact"],
  ].filter(([id]) => document.getElementById(id));

  nav.innerHTML = items
    .map(([id, label]) => `<a href="#${id}" class="dots__dot" data-dot="${id}" aria-label="${label}"><span>${label}</span></a>`)
    .join("");

  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) {
        nav.querySelectorAll(".dots__dot").forEach((d) => d.classList.toggle("is-on", d.dataset.dot === e.target.id));
      }
    }),
    { rootMargin: "-45% 0px -50% 0px" }
  );
  items.forEach(([id]) => io.observe(document.getElementById(id)));
}

function initStickyCta() {
  const bar = document.querySelector("[data-sticky-cta]");
  const hero = document.querySelector(".hero");
  const contact = document.getElementById("contact");
  const story = document.querySelector("[data-ba]");
  if (!bar || !hero) return;
  const btn = bar.querySelector("button");
  let pastHero = false;
  let atContact = false;
  let inStory = false;
  const apply = () => {
    const show = pastHero && !atContact && !inStory;
    bar.classList.toggle("is-on", show);
    bar.setAttribute("aria-hidden", String(!show));
    if (btn) btn.tabIndex = show ? 0 : -1;
  };
  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; apply(); }).observe(hero);
  if (story) new IntersectionObserver(([e]) => { inStory = e.isIntersecting; apply(); }).observe(story);
  if (contact) new IntersectionObserver(([e]) => { atContact = e.isIntersecting; apply(); }, { threshold: 0.15 }).observe(contact);
}

export function initStory() {
  initBeforeAfter();
  initDots();
  initStickyCta();
}
