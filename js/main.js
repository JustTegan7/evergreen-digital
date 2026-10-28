/**
 * main.js — Application Entry Point
 * Evergreen Digital · evergreendigitalco.com
 *
 * This file is the single entry point for all JavaScript.
 * It imports and initialises each module in the correct order.
 *
 * Module map
 * ──────────
 *   nav.js         → Navigation scroll shadow
 *   animations.js  → Scroll reveal + animated counters
 *   modal.js       → 2-step booking modal (lead form + Calendly embed)
 *   audit.js       → Free website check widget ([data-audit-widget])
 *   showcase.js    → "Choose your business" demo showcase
 *   industry.js    → Add-on recommender (self-initialising)
 *
 * Why ES modules?
 * ───────────────
 * Using `type="module"` in the <script> tag gives us:
 *   - Native import/export without a bundler
 *   - Deferred execution by default (no need for DOMContentLoaded wrapper)
 *   - Strict mode in all modules automatically
 *   - Scoped variables (no global namespace pollution)
 *
 * This file is loaded in index.html as:
 *   <script type="module" src="js/main.js"></script>
 */

import { initNavShadow }               from './nav.js';
import { initScrollReveal, initCounters } from './animations.js';
import { initBookingModal }            from './modal.js';
import { initAuditWidgets }            from './audit.js';
import { initShowcase }                from './showcase.js';
import './industry.js';               // self-initialising; was never loaded before

// ─── Initialise all modules ───────────────────────────────────────────────────
// Modules execute after DOM parsing is complete (ES module default behaviour).

initNavShadow();      // Attach nav scroll shadow listener
initScrollReveal();   // Observe + reveal elements as they enter viewport
initCounters();       // Animate numeric stats on first viewport entry
initBookingModal();   // Wire up the 2-step booking modal funnel
initAuditWidgets();   // Free website check (homepage + landing pages)
initShowcase();       // "Choose your business" demo showcase
