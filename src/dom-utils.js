/**
 * dom-utils.js — DOM querying and mutation helpers.
 *
 * Provides a layered element-detection strategy and a MutationObserver wrapper
 * that re-applies UI rules whenever the ChatGPT SPA re-renders.
 */

const DEBUG = false;

function log(...args) {
  if (DEBUG) console.log('[ChatShell]', ...args);
}

// ── Element detection ────────────────────────────────────────────────────────

/**
 * Find a DOM element using the layered strategy defined in SELECTORS.
 *
 * @param {string} key — key in the global SELECTORS object
 * @returns {HTMLElement|null}
 */
function findElement(key) {
  const config = SELECTORS[key];
  if (!config) {
    log(`No selector config for key "${key}"`);
    return null;
  }

  // Layer 1 — CSS selectors
  if (config.cssSelectors) {
    for (const sel of config.cssSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        log(`[${key}] Found via CSS: ${sel}`);
        return el;
      }
    }
  }

  // Layer 2 — ARIA matching
  if (config.ariaMatch) {
    const { role, labelPattern } = config.ariaMatch;
    const candidates = role
      ? document.querySelectorAll(`[role="${role}"]`)
      : document.querySelectorAll('*');
    for (const el of candidates) {
      const label = el.getAttribute('aria-label') || '';
      if (labelPattern && labelPattern.test(label)) {
        log(`[${key}] Found via ARIA label: "${label}"`);
        return el;
      }
    }
  }

  // Layer 3 — text-based fallback (scoped to nav area)
  if (config.textMatch) {
    const found = findByTextMatch(key, config.textMatch);
    if (found) return found;
  }

  log(`[${key}] Element not found by any strategy`);
  return null;
}

/**
 * Text-based element detection, scoped to avoid false positives in chat content.
 */
function findByTextMatch(key, matchConfig) {
  const { text, scopeSelector, maxAncestorDepth = 4, maxHeight = 80 } = matchConfig;

  // Determine scope roots — fall back to document.body if none match.
  const scopes = scopeSelector
    ? Array.from(document.querySelectorAll(scopeSelector))
    : [document.body];

  for (const scope of scopes) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent.trim() !== text) continue;

      // Walk up to find a suitable interactive ancestor (button, link, etc.)
      let candidate = node.parentElement;
      for (let depth = 0; depth < maxAncestorDepth && candidate; depth++) {
        const tag = candidate.tagName.toLowerCase();
        const role = candidate.getAttribute('role');
        const isInteractive =
          tag === 'button' ||
          tag === 'a' ||
          role === 'button' ||
          role === 'menuitem' ||
          candidate.hasAttribute('data-testid');

        if (isInteractive) {
          // Sanity: don't hide something huge
          if (candidate.offsetHeight > maxHeight) {
            log(`[${key}] Text match found but element too tall (${candidate.offsetHeight}px), skipping`);
            candidate = candidate.parentElement;
            continue;
          }
          log(`[${key}] Found via text match ("${text}") on <${tag}>`);
          return candidate;
        }
        candidate = candidate.parentElement;
      }
    }
  }

  return null;
}

// ── Observation ──────────────────────────────────────────────────────────────

/**
 * Start a MutationObserver that calls `callback` whenever the DOM subtree changes.
 * Uses a debounce to avoid thrashing on rapid successive mutations.
 *
 * @param {Function} callback
 * @param {number} debounceMs
 * @returns {MutationObserver}
 */
function observeDOM(callback, debounceMs = 300) {
  let timer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      log('DOM mutation detected — re-applying rules');
      callback();
    }, debounceMs);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  log('MutationObserver installed');
  return observer;
}
