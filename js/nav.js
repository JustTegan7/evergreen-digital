/**
 * nav.js — Navigation Scroll Behaviour
 * Evergreen Digital · evergreendigitalco.com
 *
 * Adds an `.is-scrolled` class to the nav element once the user scrolls
 * past a threshold. The class triggers a drop shadow via CSS, giving the
 * nav depth and separating it from the page content beneath.
 *
 * CSS counterpart: .nav.is-scrolled in components.css
 */

'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Scroll depth (px) before the nav shadow activates */
const NAV_SCROLL_THRESHOLD = 40;

// ─── Module ──────────────────────────────────────────────────────────────────

/**
 * initNavShadow
 * Attaches a passive scroll listener to the window. On each scroll event,
 * it toggles `.is-scrolled` on the nav based on the current scroll position.
 *
 * The `passive: true` option tells the browser this listener will never call
 * `preventDefault()`, enabling scroll performance optimisations.
 */
const initNavShadow = () => {
  const nav = document.getElementById('main-nav');

  // Guard: exit silently if nav element doesn't exist on this page
  if (!nav) return;

  const handleScroll = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > NAV_SCROLL_THRESHOLD);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
};

export { initNavShadow };
