/**
 * modal.js — Booking Modal (2-Step Lead Funnel)
 * Evergreen Digital · evergreendigitalco.com
 *
 * Implements a two-step conversion funnel:
 *
 *   Step 1 — Lead capture form
 *             Collects name, email, business name, service interest, and budget.
 *             Validates required fields with inline error messages.
 *             On valid submit: stores lead in sessionStorage, fires GA4 event.
 *
 *   Step 2 — Inline Calendly embed
 *             The Calendly widget script is loaded on demand (only when the user
 *             reaches step 2), avoiding ~180kb of JS on every page load.
 *
 * Triggers:   Any element with [data-modal-trigger]
 * Closes:     #modal-close button | Escape key | Click on overlay backdrop
 * CSS:        .modal-overlay, .modal, .modal__step in components.css
 */

'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Calendly widget script URL — loaded lazily on step 2 */
const CALENDLY_SCRIPT_URL = 'https://assets.calendly.com/assets/external/widget.js';

/** sessionStorage key for persisting lead data across the booking flow */
const LEAD_STORAGE_KEY = 'evg_lead';

/** Basic email validation pattern */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


// ─── Calendly Lazy Loader ─────────────────────────────────────────────────────

/**
 * loadCalendlyScript
 *
 * Injects the Calendly widget script into <head> exactly once.
 * Subsequent calls are no-ops (checked via element ID).
 * This ensures we only pay the network cost when the user actually
 * advances to step 2.
 */
const loadCalendlyScript = () => {
  if (document.getElementById('calendly-script')) return; // Already loaded

  const script    = document.createElement('script');
  script.id       = 'calendly-script';
  script.src      = CALENDLY_SCRIPT_URL;
  script.async    = true;
  document.head.appendChild(script);
};


// ─── Form Validation ──────────────────────────────────────────────────────────

/**
 * validateForm
 *
 * Validates required fields and surfaces inline error messages.
 * Returns true if the form is valid, false otherwise.
 *
 * Validation rules:
 *   - Full Name:  must not be empty
 *   - Email:      must match EMAIL_PATTERN
 *
 * @param  {HTMLFormElement} form
 * @returns {boolean}
 */
const validateForm = (form) => {
  let isValid = true;

  const nameInput  = form.querySelector('#modal-name');
  const emailInput = form.querySelector('#modal-email');
  const errorName  = form.querySelector('#error-name');
  const errorEmail = form.querySelector('#error-email');

  // Reset previous error state
  [nameInput, emailInput].forEach((el) => el.classList.remove('is-invalid'));
  errorName.textContent  = '';
  errorEmail.textContent = '';

  // Validate: Full Name
  if (!nameInput.value.trim()) {
    nameInput.classList.add('is-invalid');
    errorName.textContent = 'Please enter your full name.';
    isValid = false;
  }

  // Validate: Email format
  if (!emailInput.value.trim()) {
    emailInput.classList.add('is-invalid');
    errorEmail.textContent = 'Please enter your email address.';
    isValid = false;
  } else if (!EMAIL_PATTERN.test(emailInput.value.trim())) {
    emailInput.classList.add('is-invalid');
    errorEmail.textContent = 'Please enter a valid email address.';
    isValid = false;
  }

  return isValid;
};


// ─── Lead Persistence ─────────────────────────────────────────────────────────

/**
 * storeLeadData
 *
 * Saves form data to sessionStorage so it persists through the booking flow.
 * sessionStorage is cleared automatically when the browser tab closes —
 * no backend or database required for this use case.
 *
 * @param  {HTMLFormElement} form
 * @returns {Object} The stored lead data object
 */
const storeLeadData = (form) => {
  const lead = {
    name:      form.querySelector('#modal-name').value.trim(),
    email:     form.querySelector('#modal-email').value.trim(),
    business:  form.querySelector('#modal-business').value.trim(),
    service:   form.querySelector('#modal-service').value,
    budget:    form.querySelector('#modal-budget').value,
    timestamp: new Date().toISOString(),
  };

  try {
    sessionStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(lead));
  } catch (err) {
    // sessionStorage may be unavailable in private browsing — fail gracefully
    console.warn('[Evergreen] Could not store lead data:', err);
  }

  return lead;
};


// ─── Modal Controller ─────────────────────────────────────────────────────────

/**
 * initBookingModal
 *
 * Sets up all event listeners for the booking modal. Should be called once
 * after DOM content has loaded.
 *
 * Open flow:
 *   1. User clicks any [data-modal-trigger] element
 *   2. Modal resets to step 1, removes `hidden`, fades in via CSS
 *   3. Focus is moved to the first input (accessibility)
 *
 * Submit flow:
 *   1. Form validates — if invalid, errors appear inline
 *   2. Lead data saved to sessionStorage
 *   3. GA4 `lead_captured` event fires (if Analytics is present)
 *   4. Step 1 hides, step 2 shows
 *   5. Modal widens for Calendly embed
 *   6. Calendly widget script loads on demand
 *
 * Close flow:
 *   - Close button click
 *   - Escape key press
 *   - Click on overlay backdrop (outside modal card)
 *   - All paths: fade out → set `hidden` after CSS transition
 */
const initBookingModal = () => {

  // ── Element references ──────────────────────────────────────────────────────
  const overlay  = document.getElementById('booking-modal');
  const modalCard = overlay?.querySelector('.modal');
  const closeBtn = document.getElementById('modal-close');
  const step1    = document.getElementById('modal-step-1');
  const step2    = document.getElementById('modal-step-2');
  const form     = document.getElementById('lead-form');
  const triggers = document.querySelectorAll('[data-modal-trigger]');

  // Guard: exit if required elements are missing
  if (!overlay || !triggers.length) return;


  // ── Open ────────────────────────────────────────────────────────────────────

  const openModal = () => {
    // Always reset to step 1 on each open
    step1.hidden = false;
    step2.hidden = true;
    modalCard?.classList.remove('modal--wide');

    // Show the overlay (removes `hidden` so CSS opacity transition can work)
    overlay.hidden = false;
    document.body.style.overflow = 'hidden'; // Prevent background scroll

    // Defer adding the visible class by one frame so the transition fires
    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
    });

    // Move focus to first input for keyboard/screen reader accessibility
    setTimeout(() => {
      step1.querySelector('input')?.focus();
    }, 300);
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', openModal);
  });


  // ── Close ───────────────────────────────────────────────────────────────────

  const closeModal = () => {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';

    // Wait for the CSS opacity transition to finish before hiding the element
    overlay.addEventListener(
      'transitionend',
      () => { overlay.hidden = true; },
      { once: true } // Remove listener after it fires once
    );
  };

  // Close via ✕ button
  closeBtn?.addEventListener('click', closeModal);

  // Close via backdrop click (click must target the overlay, not the modal card)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Close via Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) closeModal();
  });


  // ── Form Submission → Step 2 ────────────────────────────────────────────────

  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    // Abort if validation fails
    if (!validateForm(form)) return;

    // Persist lead and get the data back for analytics
    const lead = storeLeadData(form);

    // Fire GA4 lead event if Google Analytics is loaded
    if (typeof gtag === 'function') {
      gtag('event', 'lead_captured', {
        event_category: 'funnel',
        event_label:    lead.service,
        value:          1,
      });
    }

    // Advance to step 2
    step1.hidden = false; // Keep in DOM briefly for transition
    step1.hidden = true;
    step2.hidden = false;

    // Expand modal width for the Calendly embed
    modalCard?.classList.add('modal--wide');

    // Load Calendly widget script on demand (only fetched once per session)
    loadCalendlyScript();

    // Scroll modal back to top so the heading is visible
    modalCard?.scrollTo({ top: 0, behavior: 'smooth' });
  });

};

export { initBookingModal };
