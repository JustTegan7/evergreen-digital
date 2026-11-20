/**
 * story.js, scroll-through of a real sample site, section progress dots, sticky CTA
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
  const frame = root.querySelector("[data-ba-frame]");
  const bar = root.querySelector(".ba__bar i");
  const chips = [...root.querySelectorAll(".ba__chip")];
  const still = reduceMotion();

  // Reduced motion: let the visitor scroll the sample site themselves.
  if (still) {
    root.classList.add("ba--still");
    chips.forEach((c) => c.classList.add("is-on"));
    if (frame) frame.removeAttribute("tabindex");
    return;
  }

  let ready = false;
  const scrollFrame = (p) => {
    if (!ready) return;
    try {
      const doc = frame.contentDocument;
      const max = doc.documentElement.scrollHeight - frame.clientHeight;
      frame.contentWindow.scrollTo(0, Math.max(0, max) * p);
    } catch (e) { /* cross-origin or not ready: ignore */ }
  };

  const set = (v) => {
    const p = clamp(v);
    root.style.setProperty("--p", p.toFixed(3));
    if (bar) bar.style.transform = `scaleX(${p.toFixed(3)})`;
    chips.forEach((c) => c.classList.toggle("is-on", p >= parseFloat(c.dataset.at)));
    scrollFrame(p);
  };

  let ticking = false;
  const update = () => {
    ticking = false;
    const r = root.getBoundingClientRect();
    const span = r.height - window.innerHeight;
    set(span > 0 ? -(r.top - 88) / span : 0);
  };
  const onScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  const onLoad = () => {
    try { frame.contentDocument.documentElement.style.scrollBehavior = "auto"; } catch (e) { return; }
    ready = true;
    update();
  };
  if (frame) {
    frame.addEventListener("load", onLoad);
    if (frame.contentDocument && frame.contentDocument.readyState === "complete") onLoad();
  }
  update();
}

function initDots() {
  const nav = document.querySelector("[data-dots]");
  if (!nav) return;
  const items = [
    ["story", "A real site"],
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
  let overBtn = false;
  const apply = () => {
    const show = pastHero && !atContact && !inStory && !overBtn;
    bar.classList.toggle("is-on", show);
    bar.setAttribute("aria-hidden", String(!show));
    if (btn) btn.tabIndex = show ? 0 : -1;
  };
  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; apply(); }).observe(hero);
  if (story) new IntersectionObserver(([e]) => { inStory = e.isIntersecting; apply(); }).observe(story);
  if (contact) new IntersectionObserver(([e]) => { atContact = e.isIntersecting; apply(); }, { threshold: 0.15 }).observe(contact);

  // Step aside while a plan or pricing button is near the bottom of the screen,
  // so the bar never covers a button the visitor is about to tap.
  const SELECTOR = ".sc-plan__cta, .pkg-card__cta, [data-builder-summary] a, [data-builder-summary] button";
  let ticking = false;
  const check = () => {
    ticking = false;
    const zone = window.innerHeight - 120;
    const next = [...document.querySelectorAll(SELECTOR)].some((el) => {
      const r = el.getBoundingClientRect();
      return r.bottom > zone && r.top < window.innerHeight;
    });
    if (next !== overBtn) { overBtn = next; apply(); }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(check); } };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
}

export function initStory() {
  initBeforeAfter();
  initDots();
  initStickyCta();
}
