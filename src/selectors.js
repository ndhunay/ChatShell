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

  // ── Header / top nav ─────────────────────────────────────────────────────

  modelSelector: {
    cssSelectors: [
      '[data-testid="model-selector"]',
      'button[data-testid="model-switcher"]',
      'nav button[data-testid*="model"]'
    ],
    ariaMatch: {
      role: 'button',
      labelPattern: /model|Model/
    },
    textMatch: {
      text: 'ChatGPT',
      scopeSelector: 'nav, header, [role="banner"], main > div:first-child',
      maxAncestorDepth: 4,
      maxHeight: 80
    }
  },

  // ── Main content ─────────────────────────────────────────────────────────

  chatArea: {
    cssSelectors: [
      '[role="presentation"]',
      'main .flex.flex-col',
      'main'
    ]
  },

  // ── Sidebar / left nav ───────────────────────────────────────────────────

  sidebar: {
    cssSelectors: [
      'nav[aria-label="Chat history"]',
      'nav',
      '[class*="sidebar"]'
    ]
  },

  /**
   * Sidebar nav items — used by sidebar-hide rules.
   *
   * Each sidebar item selector uses a layered approach:
   *   1. Stable CSS selectors (data-testid, href patterns)
   *   2. ARIA-based matching
   *   3. Text-based fallback scoped strictly to the sidebar nav
   *
   * IMPORTANT: text matching for sidebar items is scoped to `nav` elements only,
   * never the full page, to avoid hiding chat content or unrelated UI.
   */
  sidebarLibrary: {
    cssSelectors: [
      'nav a[href="/library"]',
      'nav a[href^="/library"]',
      'nav a[data-testid="library"]',
      'nav [data-testid*="library"]'
    ],
    textMatch: {
      text: 'Library',
      scopeSelector: 'nav',
      maxAncestorDepth: 3,
      maxHeight: 50
    }
  },

  sidebarApps: {
    cssSelectors: [
      'nav a[href="/apps"]',
      'nav a[href^="/apps"]',
      'nav a[data-testid="apps"]',
      'nav [data-testid*="apps"]'
    ],
    textMatch: {
      text: 'Apps',
      scopeSelector: 'nav',
      maxAncestorDepth: 3,
      maxHeight: 50
    }
  },

  sidebarDeepResearch: {
    cssSelectors: [
      'nav a[href*="deep-research"]',
      'nav a[data-testid*="deep-research"]',
      'nav [data-testid*="deep-research"]'
    ],
    textMatch: {
      text: 'Deep research',
      scopeSelector: 'nav',
      maxAncestorDepth: 4,
      maxHeight: 60
    }
  },

  sidebarGPTs: {
    cssSelectors: [
      'nav a[href="/gpts/discovery"]',
      'nav a[href="/gpts/mine"]',
      'nav a[href^="/gpts"]',
      'nav a[data-testid*="gpt"]',
      'nav [data-testid*="explore"]'
    ],
    ariaMatch: {
      role: 'link',
      labelPattern: /GPTs|Explore GPTs/i
    },
    textMatch: {
      text: 'Explore GPTs',
      scopeSelector: 'nav',
      maxAncestorDepth: 4,
      maxHeight: 60
    }
  },

  /**
   * Footer disclaimer — the "ChatGPT can make mistakes..." text below the composer.
   * Scoped to the main content area, not the sidebar.
   */
  footerDisclaimer: {
    cssSelectors: [
      'main .text-token-text-secondary.text-xs',
      'main .text-xs.text-token-text-secondary',
      'main div.text-center.text-xs',
      'main form ~ div.text-xs'
    ],
    textMatch: {
      text: 'ChatGPT can make mistakes',
      scopeSelector: 'main',
      maxAncestorDepth: 3,
      maxHeight: 50,
      partial: true
    }
  },

  // ── Composer ──────────────────────────────────────────────────────────────

  composer: {
    cssSelectors: [
      '#prompt-textarea',
      '[id="prompt-textarea"]',
      'textarea[data-id="root"]',
      'div[contenteditable="true"][id="prompt-textarea"]',
      'form textarea',
      'div[contenteditable="true"]'
    ]
  },

  // ── Messages ─────────────────────────────────────────────────────────────

  assistantMessages: {
    cssSelectors: [
      '[data-message-author-role="assistant"]',
      'div[data-message-id][data-message-author-role="assistant"]'
    ]
  },

  conversationListItems: {
    cssSelectors: [
      'nav li a[href^="/c/"]',
      'nav a[href^="/c/"]',
      'nav ol li a',
      'nav li a'
    ]
  }
};
