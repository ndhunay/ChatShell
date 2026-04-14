/**
 * content.js — Entry point for the ChatShell content script.
 *
 * Responsibilities:
 *   1. Define UI customization rules.
 *   2. Apply all rules on load.
 *   3. Re-apply rules whenever the SPA re-renders.
 *
 * ADDING A NEW RULE:
 *   1. Write a function like applyHideModelSelector() below.
 *   2. Add a corresponding selector config in selectors.js.
 *   3. Add any needed CSS classes in styles.css.
 *   4. Register the function inside applyRules().
 */

// ── UI Rules ─────────────────────────────────────────────────────────────────

/**
 * Rule: Hide the "ChatGPT" model selector in the top navigation bar.
 */
function applyHideModelSelector() {
  const el = findElement('modelSelector');
  if (!el) return;

  if (!el.classList.contains('chatshell-hidden')) {
    el.classList.add('chatshell-hidden');
    log('Rule applied: model selector hidden');
  }
}

// ── Future rule examples ─────────────────────────────────────────────────────
//
// function applyHideSidebar() {
//   const el = findElement('sidePanel');
//   if (!el) return;
//   el.classList.add('chatshell-hidden');
//   log('Rule applied: sidebar hidden');
// }
//
// function applyCustomToolbar() {
//   if (document.getElementById('chatshell-toolbar')) return; // already injected
//   const toolbar = document.createElement('div');
//   toolbar.id = 'chatshell-toolbar';
//   toolbar.classList.add('chatshell-toolbar');
//   toolbar.textContent = 'ChatShell';
//   document.body.appendChild(toolbar);
//   log('Rule applied: custom toolbar injected');
// }

// ── Rule runner ──────────────────────────────────────────────────────────────

/**
 * Apply all registered UI rules.
 * Called on initial load and on every observed DOM mutation.
 */
function applyRules() {
  applyHideModelSelector();

  // ── Register future rules here ──
  // applyHideSidebar();
  // applyCustomToolbar();
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

(function init() {
  log('ChatShell extension loaded');

  // Initial application
  applyRules();

  // Re-apply on SPA navigation and DOM re-renders
  observeDOM(applyRules);
})();
