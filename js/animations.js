/**
 * animations.js — Scroll Reveal & Animated Counters
 * Evergreen Digital · evergreendigitalco.com
 *
 * Exports two modules:
 *
 *   initScrollReveal  — Uses IntersectionObserver to add `.is-visible`
 *                       to elements with .reveal / .reveal-left / .reveal-right
 *                       as they enter the viewport.
 *
 *   initCounters      — Finds elements with [data-count] and animates their
 *                       numeric value from 0 to the target on first viewport entry.
 *
 * CSS counterpart: .reveal, .reveal-left, .reveal-right in animations.css
 */

'use strict';

// ─── Scroll Reveal ────────────────────────────────────────────────────────────

/**
 * initScrollReveal
 *
 * Observes all elements that carry a reveal class. Once an element crosses
 * the viewport threshold, `.is-visible` is added — triggering the CSS
 * opacity and transform transitions defined in animations.css.
 *
 * The observer is not disconnected after elements become visible. This allows
 * elements to re-animate if the user navigates back to them (e.g. in a SPA),
 * but is also intentional for simplicity in a static site context.
 */
const initScrollReveal = () => {
  const revealSelectors = '.reveal, .reveal-left, .reveal-right';
  const elements = document.querySelectorAll(revealSelectors);

  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    },
    {
      threshold: 0.12, // Trigger when 12% of element is visible
    }
  );

  elements.forEach((el) => observer.observe(el));
};


// ─── Animated Counters ────────────────────────────────────────────────────────

/**
 * animateCounter
 * Runs a single counter animation on one element.
 *
 * Expected HTML attributes:
 *   data-count="100"     — The target numeric value
 *   data-prefix="$"      — Optional prefix (e.g. currency symbol)
 *   data-suffix=" min"   — Optional suffix (e.g. unit of measure)
 *
 * Example:
 *   <span data-count="100" data-prefix="$">$100</span>
 *   <span data-count="20"  data-suffix=" min">20 min</span>
 *
 * @param {HTMLElement} el — The element to animate
 */
const animateCounter = (el) => {
  const target   = parseInt(el.dataset.count, 10);
  const prefix   = el.dataset.prefix || '';
  const suffix   = el.dataset.suffix || '';
  const duration = 1200; // Total animation duration in ms

  const startTime = performance.now();

  /**
   * update — called on each animation frame.
   * Uses an ease-out cubic curve so the counter decelerates as it approaches
   * the target, giving it a natural, satisfying feel.
   *
   * @param {number} currentTime — DOMHighResTimeStamp from requestAnimationFrame
   */
  const update = (currentTime) => {
    const elapsed  = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1); // Clamp to [0, 1]

    // Ease-out cubic: f(t) = 1 - (1 - t)³
    const eased  = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);

    el.textContent = `${prefix}${current}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  };

  requestAnimationFrame(update);
};

/**
 * initCounters
 *
 * Finds all [data-count] elements and attaches an IntersectionObserver.
 * Each counter animates once — when it first enters the viewport — and
 * then the observer stops watching it (unobserve) to avoid re-triggering.
 */
const initCounters = () => {
  const counters = document.querySelectorAll('[data-count]');

  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target); // Animate once only
        }
      });
    },
    { threshold: 0.5 } // Counter starts when 50% visible
  );

  counters.forEach((el) => observer.observe(el));
};

export { initScrollReveal, initCounters };
