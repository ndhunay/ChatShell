/**
 * rules.js — Modular UI rule engine.
 *
 * Each rule has:
 *   - id:             unique string key matching settings.rules[id]
 *   - label:          human-readable toggle label
 *   - description:    tooltip/help text
 *   - scope:          category — 'header' | 'layout' | 'sidebar' | 'composer' | 'response'
 *   - defaultEnabled: initial state
 *   - apply(enabled): function called to apply or remove the rule (must be reversible)
 *
 * ADDING A NEW RULE:
 * 1. Define a rule object with the properties above.
 * 2. Push it into RULE_DEFINITIONS.
 * 3. Add a matching default in STORAGE_DEFAULTS.settings.rules (storage.js).
 * 4. Add any needed CSS classes in styles.css.
 * 5. The rule engine handles: toggle UI, persistence, re-application, grouping by scope.
 */

// eslint-disable-next-line no-var
var RULE_DEFINITIONS = [

  // ── Header rules ─────────────────────────────────────────────────────────

  {
    id: 'hideModelSelector',
    label: 'Hide model selector',
    description: 'Remove the "ChatGPT" model picker from the top nav.',
    scope: 'header',
    defaultEnabled: true,
    apply(enabled) {
      const el = findElement('modelSelector');
      if (!el) return;
      el.classList.toggle('chs-hidden', enabled);
    }
  },
  // ── Layout rules ─────────────────────────────────────────────────────────

  {
    id: 'widenChatArea',
    label: 'Widen chat area',
    description: 'Expand the conversation to use more horizontal space.',
    scope: 'layout',
    defaultEnabled: false,
    apply(enabled) {
      document.body.classList.toggle('chs-wide-chat', enabled);
    }
  },
  {
    id: 'compactSpacing',
    label: 'Compact spacing',
    description: 'Reduce vertical padding between messages.',
    scope: 'layout',
    defaultEnabled: false,
    apply(enabled) {
      document.body.classList.toggle('chs-compact', enabled);
    }
  },
  {
    id: 'reduceNavNoise',
    label: 'Reduce left-nav noise',
    description: 'Simplify the sidebar by hiding decorative elements.',
    scope: 'layout',
    defaultEnabled: false,
    apply(enabled) {
      document.body.classList.toggle('chs-nav-quiet', enabled);
    }
  },

  // ── Footer rules ─────────────────────────────────────────────────────────

  {
    id: 'hideFooterDisclaimer',
    label: 'Hide footer disclaimer',
    description: 'Hides the ChatGPT disclaimer and cookie preferences footer text.',
    scope: 'layout',
    defaultEnabled: false,
    apply(enabled) {
      // The disclaimer is a small text element below the composer.
      // Use the dedicated selector which is scoped to main only.
      const el = findElement('footerDisclaimer');
      if (!el) return;
      el.classList.toggle('chs-hidden', enabled);
    }
  },

  // ── Sidebar visibility rules ─────────────────────────────────────────────
  //
  // Each sidebar rule hides a specific navigational item.
  // Detection uses the layered strategy from selectors.js — text matching
  // is scoped to `nav` elements only, never the full page.

  {
    id: 'hideSidebarLibrary',
    label: 'Hide Library',
    description: 'Hide the Library link in the left sidebar.',
    scope: 'sidebar',
    defaultEnabled: false,
    apply(enabled) {
      applySidebarHideRule('sidebarLibrary', enabled);
    }
  },
  {
    id: 'hideSidebarApps',
    label: 'Hide Apps',
    description: 'Hide the Apps link in the left sidebar.',
    scope: 'sidebar',
    defaultEnabled: false,
    apply(enabled) {
      applySidebarHideRule('sidebarApps', enabled);
    }
  },
  {
    id: 'hideSidebarDeepResearch',
    label: 'Hide Deep research',
    description: 'Hide the Deep research link in the left sidebar.',
    scope: 'sidebar',
    defaultEnabled: false,
    apply(enabled) {
      applySidebarHideRule('sidebarDeepResearch', enabled);
    }
  },
  {
    id: 'hideSidebarGPTs',
    label: 'Hide GPTs / Explore GPTs',
    description: 'Hide the GPTs or Explore GPTs section in the left sidebar.',
    scope: 'sidebar',
    defaultEnabled: false,
    apply(enabled) {
      applySidebarHideRule('sidebarGPTs', enabled);
    }
  }
];

// ── Header title injection ──────────────────────────────────────────────────

/**
 * Show or update a custom header title in place of the model selector.
 * Only visible when hideModelSelector is ON and headerTitle is non-empty.
 *
 * @param {string} titleText — the title to display (empty = remove)
 * @param {boolean} selectorHidden — whether hideModelSelector is currently ON
 */
function applyHeaderTitle(titleText, selectorHidden) {
  const existing = document.getElementById('chs-header-title');

  // Remove title if either condition is unmet
  if (!titleText || !selectorHidden) {
    if (existing) existing.remove();
    return;
  }

  // Update text if already mounted
  if (existing) {
    if (existing.textContent !== titleText) {
      existing.textContent = titleText;
    }
    return;
  }

  // Find the model selector to place the title in its position
  const modelEl = findElement('modelSelector');
  if (!modelEl) return;

  const titleEl = createElement('div', {
    id: 'chs-header-title',
    className: 'chs-header-title',
    textContent: titleText
  });

  // Insert as a sibling right where the model selector sits
  modelEl.parentElement.insertBefore(titleEl, modelEl);
  log('Header title mounted (replacing model selector)');
}

/**
 * Helper: apply a sidebar hide/show rule.
 * Walks up from the detected element to its closest `li` or direct `nav` child
 * so we hide the full row cleanly.
 * @param {string} selectorKey — key in SELECTORS
 * @param {boolean} enabled — true to hide, false to show
 */
function applySidebarHideRule(selectorKey, enabled) {
  const el = findElement(selectorKey);
  if (!el) return;

  // Hide the containing list item for clean layout collapse
  const hideTarget = el.closest('li') || el.closest('[role="listitem"]') || el;

  hideTarget.classList.toggle('chs-hidden', enabled);
}

/**
 * Get all unique scopes from registered rules.
 * @returns {string[]}
 */
function getRuleScopes() {
  const scopes = [];
  for (const rule of RULE_DEFINITIONS) {
    if (rule.scope && !scopes.includes(rule.scope)) {
      scopes.push(rule.scope);
    }
  }
  return scopes;
}

/**
 * Get rules filtered by scope.
 * @param {string} scope
 * @returns {Array}
 */
function getRulesByScope(scope) {
  return RULE_DEFINITIONS.filter(r => r.scope === scope);
}

/**
 * Apply all UI rules based on current settings.
 * @param {Object} rulesSettings — settings.rules object from storage
 */
function applyUiRules(rulesSettings) {
  for (const rule of RULE_DEFINITIONS) {
    const enabled = rulesSettings[rule.id] !== undefined
      ? rulesSettings[rule.id]
      : rule.defaultEnabled;
    try {
      rule.apply(enabled);
    } catch (e) {
      log(`Rule "${rule.id}" error:`, e);
    }
  }
  log('UI rules applied');
}

/**
 * Register a new rule definition at runtime.
 * @param {Object} ruleDefinition
 */
function registerRule(ruleDefinition) {
  if (RULE_DEFINITIONS.find(r => r.id === ruleDefinition.id)) {
    log(`Rule "${ruleDefinition.id}" already registered, skipping`);
    return;
  }
  RULE_DEFINITIONS.push(ruleDefinition);
  log(`Rule registered: ${ruleDefinition.id}`);
}
