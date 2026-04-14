/**
 * selectors.js — Centralized selector definitions for ChatGPT DOM targeting.
 *
 * All selectors and detection heuristics live here so they can be updated in
 * one place when the ChatGPT UI changes.
 *
 * ADDING NEW SELECTORS:
 * 1. Add a new key to SELECTORS with a descriptive name.
 * 2. Provide `cssSelectors` (array of CSS selectors tried in order),
 *    `ariaMatch` (object with role/label to match), and/or
 *    `textMatch` (object with text + scopeSelector for text-based fallback).
 * 3. Use `findElement()` from dom-utils.js with the new key.
 */

// eslint-disable-next-line no-var
var SELECTORS = {
  /**
   * Model selector — the button/element in the top nav that displays "ChatGPT"
   * and opens the model picker dropdown.
   *
   * Detection strategy (layered, first match wins):
   *  1. CSS: data-testid attribute (most stable if present)
   *  2. Aria: button with an aria-label containing "Model" or "model"
   *  3. Text: element inside the top nav whose trimmed text is exactly "ChatGPT"
   */
  modelSelector: {
    // Layer 1 — stable attributes / test IDs (update these when ChatGPT ships new markup)
    cssSelectors: [
      '[data-testid="model-selector"]',
      'button[data-testid="model-switcher"]',
      'nav button[data-testid*="model"]'
    ],

    // Layer 2 — ARIA-based matching
    ariaMatch: {
      role: 'button',
      labelPattern: /model|Model/
    },

    // Layer 3 — cautious text fallback
    textMatch: {
      text: 'ChatGPT',
      // Only search inside the top nav / header area to avoid hiding chat content.
      scopeSelector: 'nav, header, [role="banner"], main > div:first-child',
      // Must be a direct-ish container (button, div with role, anchor) — not a
      // giant wrapper. Max depth from the text node to the element we hide.
      maxAncestorDepth: 4,
      // Minimum selector specificity: the matched element should be "small"
      // (i.e. not the whole page). We check offsetHeight as a sanity bound.
      maxHeight: 80
    }
  }

  // ── Future selectors ──────────────────────────────────────────────────
  // sidePanel: { cssSelectors: [...], ariaMatch: {...}, textMatch: {...} },
  // headerActions: { ... },
};
