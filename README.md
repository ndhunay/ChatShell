# ChatShell – ChatGPT UI Customizer

A lightweight Chrome extension (Manifest V3) that overlays UI customizations on the ChatGPT web interface. The first rule hides the "ChatGPT" model selector in the top navigation bar.

## Architecture

```
manifest.json          Extension manifest — runs only on chatgpt.com
src/
  selectors.js         Centralized selector configs (CSS, ARIA, text fallback)
  dom-utils.js         Layered element detection + MutationObserver helper
  styles.css           CSS classes applied by the extension (chatshell-hidden, etc.)
  content.js           Entry point — defines UI rules and applies them
```

## How it works

1. **Layered detection** — Each UI target is defined in `selectors.js` with three fallback strategies:
   - CSS selectors (data-testid, stable attributes)
   - ARIA-based matching (role + aria-label)
   - Scoped text matching (finds "ChatGPT" text only inside nav/header, not in chat messages)

2. **CSS class injection** — Instead of mutating inline styles, the extension adds classes like `chatshell-hidden`. All visual behavior is defined in `styles.css`.

3. **MutationObserver** — A debounced observer watches for DOM changes and re-applies all rules, handling SPA navigation and dynamic re-renders.

4. **Silent failure** — If a target element isn't found, nothing happens. The page continues to work normally.

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked**.
5. Select the root project folder (the one containing `manifest.json`).
6. Navigate to [chatgpt.com](https://chatgpt.com) — the model selector should be hidden.

## Debugging

In `src/dom-utils.js`, set:

```js
const DEBUG = true;
```

Then open the browser console on chatgpt.com to see logs prefixed with `[ChatShell]`:
- Extension load confirmation
- Which detection strategy found the element
- When rules are applied
- When the MutationObserver re-runs

## Updating selectors

When the ChatGPT UI changes:

1. Open DevTools on chatgpt.com and inspect the model selector element.
2. Look for stable attributes: `data-testid`, `aria-label`, unique class names.
3. Update the corresponding entry in `src/selectors.js`:
   - Add new CSS selectors to `cssSelectors` (most stable, tried first).
   - Update `ariaMatch.labelPattern` if the ARIA label changed.
   - Update `textMatch.text` if the display text changed (e.g., "ChatGPT" → "GPT-5").
   - Adjust `textMatch.scopeSelector` if the nav structure changed.

## Adding new UI rules

1. **Define a selector** in `src/selectors.js`:
   ```js
   sidePanel: {
     cssSelectors: ['nav[aria-label="Sidebar"]'],
     textMatch: { text: 'History', scopeSelector: 'nav', maxAncestorDepth: 3, maxHeight: 600 }
   }
   ```

2. **Add CSS** in `src/styles.css`:
   ```css
   .chatshell-sidebar-collapsed { width: 0 !important; overflow: hidden !important; }
   ```

3. **Write a rule function** in `src/content.js`:
   ```js
   function applyCollapseSidebar() {
     const el = findElement('sidePanel');
     if (el && !el.classList.contains('chatshell-sidebar-collapsed')) {
       el.classList.add('chatshell-sidebar-collapsed');
       log('Rule applied: sidebar collapsed');
     }
   }
   ```

4. **Register it** in `applyRules()`:
   ```js
   function applyRules() {
     applyHideModelSelector();
     applyCollapseSidebar(); // new
   }
   ```

## Future Enhancements

1. **Options page** — Let users toggle individual UI rules on/off via a popup or options page, with settings persisted in `chrome.storage.sync`.

2. **Rule presets** — Bundle curated rule sets (e.g., "Minimal mode", "Focus mode", "Presentation mode") that users can switch between with one click.

3. **Custom CSS editor** — Provide a textarea in the popup where users can inject their own CSS, stored per-site and applied alongside the built-in rules.

4. **Keyboard shortcuts** — Register Chrome commands (via `manifest.json` `commands`) to toggle rules or the entire extension without opening the popup.

5. **Auto-update selectors** — Ship a small remote config (JSON hosted on GitHub) that maps ChatGPT DOM versions to working selectors, so the extension can self-heal when the UI changes without requiring a full extension update.
