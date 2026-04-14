/**
 * dom-utils.js — DOM querying, mutation helpers, and utility functions.
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
 * Find a single DOM element using the layered strategy defined in SELECTORS.
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
 * Find all matching DOM elements using CSS selectors from SELECTORS config.
 * @param {string} key — key in the global SELECTORS object
 * @returns {HTMLElement[]}
 */
function findAllElements(key) {
  const config = SELECTORS[key];
  if (!config || !config.cssSelectors) return [];

  for (const sel of config.cssSelectors) {
    const els = document.querySelectorAll(sel);
    if (els.length > 0) {
      log(`[${key}] Found ${els.length} via CSS: ${sel}`);
      return Array.from(els);
    }
  }
  return [];
}

/**
 * Text-based element detection, scoped to avoid false positives in chat content.
 */
function findByTextMatch(key, matchConfig) {
  const { text, scopeSelector, maxAncestorDepth = 4, maxHeight = 80, partial = false } = matchConfig;

  const scopes = scopeSelector
    ? Array.from(document.querySelectorAll(scopeSelector))
    : [document.body];

  for (const scope of scopes) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const trimmed = node.textContent.trim();
      const matches = partial ? trimmed.includes(text) : trimmed === text;
      if (!matches) continue;

      let candidate = node.parentElement;
      for (let depth = 0; depth < maxAncestorDepth && candidate; depth++) {
        const tag = candidate.tagName.toLowerCase();
        const role = candidate.getAttribute('role');
        const isInteractive =
          tag === 'button' || tag === 'a' ||
          role === 'button' || role === 'menuitem' ||
          candidate.hasAttribute('data-testid');

        if (isInteractive) {
          if (candidate.offsetHeight > maxHeight) {
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

// ── URL / Chat ID utilities ──────────────────────────────────────────────────

/**
 * Extract conversation ID from the current URL.
 * ChatGPT URLs look like: https://chatgpt.com/c/<uuid>
 * @returns {string|null}
 */
function getConversationId() {
  const match = window.location.pathname.match(/\/c\/([a-f0-9-]+)/);
  return match ? match[1] : null;
}

/**
 * Get a human-readable chat title from the page.
 * Falls back to the document title or a truncated URL.
 * @returns {string}
 */
function getChatTitle() {
  // Try the document title, which ChatGPT usually sets to the conversation title
  const title = document.title || '';
  // Strip " | ChatGPT" suffix if present
  const cleaned = title.replace(/\s*[\|–—]\s*ChatGPT\s*$/i, '').trim();
  return cleaned || 'Untitled Chat';
}

// ── DOM helpers ──────────────────────────────────────────────────────────────

/**
 * Create an element with attributes and children in one call.
 * @param {string} tag
 * @param {Object} attrs — { className, id, textContent, innerHTML, ...htmlAttrs }
 * @param {(HTMLElement|string)[]} children
 * @returns {HTMLElement}
 */
function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') el.className = v;
    else if (k === 'textContent') el.textContent = v;
    else if (k === 'innerHTML') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  }
  for (const child of children) {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child) el.appendChild(child);
  }
  return el;
}

/**
 * Copy text to clipboard using the Clipboard API with fallback.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / restricted contexts
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    document.body.removeChild(ta);
    return ok;
  }
}

/**
 * Trigger a file download in the browser.
 * @param {string} filename
 * @param {string} content
 * @param {string} mimeType
 */
function downloadFile(filename, content, mimeType = 'text/markdown') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = createElement('a', { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Show a brief toast notification.
 * @param {string} message
 * @param {number} durationMs
 */
function showToast(message, durationMs = 2000) {
  // Remove any existing toast
  const existing = document.getElementById('chs-toast');
  if (existing) existing.remove();

  const toast = createElement('div', {
    id: 'chs-toast',
    className: 'chs-toast',
    textContent: message
  });
  document.body.appendChild(toast);
  // Force reflow then add visible class for animation
  toast.offsetHeight;
  toast.classList.add('chs-toast-visible');

  setTimeout(() => {
    toast.classList.remove('chs-toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, durationMs);
}
