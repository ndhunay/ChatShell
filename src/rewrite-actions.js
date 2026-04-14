/**
 * rewrite-actions.js — Config-driven rewrite action bar.
 *
 * Rewrite presets are stored in settings.rewritePresets and managed via the
 * Settings tab. The bar and panel only show enabled presets.
 *
 * ADDING A NEW REWRITE ACTION:
 *   In the Settings tab, click "+ Add preset" — no code changes needed.
 *   Or edit BUILTIN_REWRITE_PRESETS in storage.js for new defaults.
 */

// Legacy compat — REWRITE_ACTIONS is now dynamically populated from settings
// eslint-disable-next-line no-var
var REWRITE_ACTIONS = [];

/**
 * Refresh the REWRITE_ACTIONS array from current settings.
 * Called after settings load and after any preset changes.
 * @param {Object} settings
 */
function refreshRewriteActions(settings) {
  REWRITE_ACTIONS = getActiveRewritePresets(settings);
  log(`Rewrite actions refreshed: ${REWRITE_ACTIONS.length} active`);
}

/**
 * Get the composer element and read its text.
 */
function getComposerText() {
  const el = findElement('composer');
  if (!el) return { el: null, text: '' };

  let text = '';
  if (el.tagName === 'TEXTAREA') {
    text = el.value;
  } else {
    text = el.innerText || el.textContent || '';
  }
  return { el, text: text.trim() };
}

/**
 * Set text in the composer, triggering React's input handling.
 * @param {HTMLElement} el
 * @param {string} newText
 */
function setComposerText(el, newText) {
  if (!el) return;

  if (el.tagName === 'TEXTAREA') {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype, 'value'
    ).set;
    nativeSetter.call(el, newText);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    el.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand('insertText', false, newText);
  }

  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  log('Composer text updated');
}

/**
 * Apply a rewrite action: prepend instruction to current composer text.
 * @param {Object} action
 */
function applyRewriteAction(action) {
  const { el, text } = getComposerText();

  if (!el) {
    showToast('Composer not found');
    return;
  }

  if (!text) {
    showToast('Type something first, then apply a rewrite');
    return;
  }

  const newText = action.instruction + text;
  setComposerText(el, newText);
  showToast(`Applied: ${action.label}`);
  log(`Rewrite action applied: ${action.id}`);
}

/**
 * Mount the rewrite bar near the composer.
 * Rebuilds if presets have changed (checks button count).
 */
function mountRewriteBar() {
  const existing = document.getElementById('chs-rewrite-bar');
  const activePresets = REWRITE_ACTIONS.filter(a => a.enabled !== false);

  // If bar exists, check if it needs rebuild (preset count/order changed)
  if (existing) {
    const currentBtnCount = existing.querySelectorAll('.chs-rewrite-btn').length;
    if (currentBtnCount === activePresets.length) return;
    // Preset count changed — tear down and rebuild
    existing.remove();
  }

  if (activePresets.length === 0) return;

  const composer = findElement('composer');
  if (!composer) return;

  const anchor = composer.closest('form') || composer.parentElement;
  if (!anchor) return;

  const bar = createElement('div', {
    id: 'chs-rewrite-bar',
    className: 'chs-rewrite-bar'
  });

  bar.appendChild(createElement('span', {
    className: 'chs-rewrite-label',
    textContent: 'Rewrite:'
  }));

  for (const action of activePresets) {
    const btn = createElement('button', {
      className: 'chs-rewrite-btn',
      textContent: action.label,
      title: action.instruction.trim(),
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        applyRewriteAction(action);
      }
    });
    bar.appendChild(btn);
  }

  anchor.parentElement.insertBefore(bar, anchor);
  log('Rewrite bar mounted');
}
