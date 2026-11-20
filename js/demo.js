/* demo.js, tiny behavior for the in-site demo pages (/demos/*).
   Reveal on scroll, menu tabs, mobile nav, and a friendly "this is a demo" toast. */
"use strict";

document.documentElement.classList.add("js");

// Reveal on scroll (skipped for reduced motion, CSS already shows everything)
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const items = document.querySelectorAll(".reveal");
if (reduce || !("IntersectionObserver" in window)) {
  items.forEach((el) => el.classList.add("is-in"));
} else {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }),
    { threshold: 0.12 }
  );
  items.forEach((el) => io.observe(el));
}

// Tabs that filter menu or service rows
document.querySelectorAll("[data-tabs]").forEach((group) => {
  const target = document.querySelector(group.dataset.tabs);
  if (!target) return;
  group.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    group.querySelectorAll(".d-tab").forEach((t) => t.classList.toggle("is-on", t === btn));
    target.querySelectorAll("[data-cat]").forEach((row) => {
      row.hidden = btn.dataset.filter !== "all" && row.dataset.cat !== btn.dataset.filter;
    });
  });
});

// Mobile nav
const menuBtn = document.querySelector(".d-menu-btn");
const nav = document.querySelector(".d-nav");
if (menuBtn && nav) {
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) nav.classList.remove("is-open"); });
}

// Demo actions: buttons and forms explain what would happen on a real site
const toast = document.querySelector(".d-toast");
let timer;
function say(msg) {
  if (!toast) return;
  toast.innerHTML = msg + ' <a href="/#contact" target="_top">Get a site like this</a>';
  toast.classList.add("is-on");
  clearTimeout(timer);
  timer = setTimeout(() => toast.classList.remove("is-on"), 4200);
}
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-demo]");
  if (!el) return;
  e.preventDefault();
  say(el.dataset.demo);
});
document.querySelectorAll("form[data-demo-form]").forEach((f) =>
  f.addEventListener("submit", (e) => { e.preventDefault(); say(f.dataset.demoForm); })
);

// Count-up numbers in the trust strip
document.querySelectorAll(".d-strip__item strong").forEach((el) => {
  const m = el.textContent.match(/^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/);
  if (!m || reduce || !("IntersectionObserver" in window)) return;
  const end = parseFloat(m[2].replace(/,/g, ""));
  const dec = (m[2].split(".")[1] || "").length;
  const run = () => {
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 1100);
      const v = end * (1 - Math.pow(1 - k, 3));
      el.textContent = m[1] + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-US")) + m[3];
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io2 = new IntersectionObserver(([e]) => { if (e.isIntersecting) { run(); io2.disconnect(); } }, { threshold: 0.6 });
  io2.observe(el);
});

// Little cart counter on shop demos
const cart = document.querySelector(".d-cart b");
if (cart) {
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".d-tile__foot .d-mini")) return;
    cart.textContent = String(Number(cart.textContent) + 1);
    const c = cart.parentElement;
    c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump");
  });
}
