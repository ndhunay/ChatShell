# ChatShell – ChatGPT Power Tools

A lightweight Chrome extension (Manifest V3) that adds power-user features to the ChatGPT web interface: chat organization, rewrite actions, clean exports, UI declutter toggles, and an in-panel settings editor.

## What ChatShell Does

ChatShell overlays a non-intrusive customization layer on `chatgpt.com`. It does **not** modify any ChatGPT server data — all metadata, settings, and organizational structure are stored locally in your browser via `chrome.storage.local`.

## Feature Overview

### Library — Chat Organization
- **Folders**: Organize conversations by project or topic. Six default folders seeded on first run.
- **Tags**: Freeform tags for cross-cutting categorization.
- **Pins**: Pin important chats to sort them to the top.
- **Filter & Search**: Browse by folder, tag, pinned state, or search title/tags.
- **Quick Assign**: Assign folders and tags from the side panel.

### Rewrite — Instruction Templates
A rewrite action bar near the composer prepends instruction templates with one click. 8 built-in presets; fully customizable via Settings.

Built-in presets: Tighten, More executive, Direct Mode, Inspirational Leadership, Make warmer, Add structure, Sharpen critique, Shorten 30%.

### Export — Clean Output
Per-response export buttons on every assistant message:
- **Text** — Clean plain text
- **MD** — Markdown with formatting
- **Email** — Email-ready text (no markdown artifacts)
- **.md** — Download as file

Bulk export of all responses available in the Export tab.

### View — UI Controls
Toggleable rules grouped by scope:

**Header & Top Nav**
| Toggle | Description |
|---|---|
| Hide model selector | Remove the model picker from the top nav |
| Hide top header clutter | Minimize the top header bar |

**Layout & Spacing**
| Toggle | Description |
|---|---|
| Widen chat area | Expand conversations horizontally |
| Compact spacing | Reduce padding between messages |
| Reduce left-nav noise | Simplify the sidebar |
| Hide footer disclaimer | Hide the "ChatGPT can make mistakes" disclaimer |

**Left Navigation**
| Toggle | Description |
|---|---|
| Hide Library | Hide the Library link |
| Hide Apps | Hide the Apps link |
| Hide Deep research | Hide the Deep research link |
| Hide GPTs / Explore GPTs | Hide the GPTs section |

All toggles persist across reloads.

### Settings — Configuration
In-panel settings editor for power users:

**Rewrite Presets**
- View, edit, add, remove, reorder, and enable/disable presets
- Inline label and instruction editing
- Reset to defaults with one click

**Folder Management**
- Add, rename, reorder, and delete folders
- Inline editing — changes save automatically

## Installation

1. Clone or download this repository.
2. Open Chrome → `chrome://extensions/`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** → select the project folder.
5. Navigate to [chatgpt.com](https://chatgpt.com).

## Permissions

| Permission | Why |
|---|---|
| `storage` | Persist settings, folders, tags, pins, and chat metadata locally. No data leaves your machine. |

## Architecture

```
manifest.json              Manifest V3, chatgpt.com only
src/
  selectors.js             DOM selector configs (CSS, ARIA, scoped text fallback)
  dom-utils.js             Element detection, MutationObserver, DOM helpers
  storage.js               chrome.storage.local persistence, schema, defaults
  rules.js                 UI rule engine with scoped toggle definitions
  library.js               Folders, tags, pins, filtering
  rewrite-actions.js       Config-driven rewrite instruction templates
  export-actions.js        Per-response export: text, markdown, email, file
  panel.js                 Side panel UI with 5 tabs (Library/Rewrite/Export/View/Settings)
  content.js               Entry point — orchestrates all modules
  styles.css               All styles (chs-* prefix)
```

### Key patterns

- **Layered detection**: CSS selectors → ARIA matching → scoped text fallback. Text matching for sidebar items is scoped to `nav` elements only, never full-page.
- **CSS class injection**: Rules use `chs-*` classes, not inline styles.
- **Idempotent mounts**: All UI mount functions check before creating.
- **Debounced MutationObserver**: Re-applies features on DOM changes.
- **Scoped rule engine**: Rules have a `scope` field (header, layout, sidebar, composer, response) for grouped display and future extensibility.
- **Config-driven presets**: Rewrite actions are stored in settings, not hardcoded.

## How to Add a New UI Rule

1. Add a CSS class in `src/styles.css`:
   ```css
   body.chs-focus-mode [data-message-author-role="user"] { opacity: 0.5; }
   ```

2. Add a rule definition in `src/rules.js`:
   ```js
   {
     id: 'focusMode',
     label: 'Focus mode',
     description: 'Dim user messages to focus on responses.',
     scope: 'layout',
     defaultEnabled: false,
     apply(enabled) { document.body.classList.toggle('chs-focus-mode', enabled); }
   }
   ```

3. Add the default to `STORAGE_DEFAULTS.settings.rules` in `src/storage.js`:
   ```js
   focusMode: false
   ```

The rule appears automatically in the View tab under its scope group.

### Adding a sidebar hide rule

1. Add a selector in `src/selectors.js`:
   ```js
   sidebarProjects: {
     cssSelectors: ['nav a[href*="projects"]'],
     textMatch: { text: 'Projects', scopeSelector: 'nav', maxAncestorDepth: 4, maxHeight: 60 }
   }
   ```

2. Add a rule in `src/rules.js`:
   ```js
   {
     id: 'hideSidebarProjects', label: 'Hide Projects', description: '...', scope: 'sidebar', defaultEnabled: false,
     apply(enabled) { applySidebarHideRule('sidebarProjects', enabled); }
   }
   ```

3. Add default in storage.js: `hideSidebarProjects: false`

## How Settings Management Works

All settings are stored in `chrome.storage.local` under the `settings` key. The Settings tab provides inline editors for:

- **Rewrite presets**: Each preset has a label, instruction, enabled flag, and builtin marker. Custom presets can be added or removed. Built-in presets can be disabled or edited but not deleted. Changes save automatically and immediately rebuild the rewrite bar.
- **Folder management**: Folders can be added, renamed, reordered, or deleted. Deleting a folder unassigns all chats from it.

If stored settings are missing or corrupted, the extension falls back to `STORAGE_DEFAULTS` and `BUILTIN_REWRITE_PRESETS` defined in `storage.js`.

## How Sidebar Hide Rules Work

Each sidebar item (Library, Apps, Deep research, GPTs) has:
1. A selector config in `selectors.js` with CSS selectors, optional ARIA matching, and text-based fallback **scoped strictly to `nav` elements**.
2. A rule in `rules.js` with `scope: 'sidebar'` that calls `applySidebarHideRule()`.
3. The helper finds the element, walks up to its containing `<li>`, and toggles `chs-hidden`.

This ensures:
- Only sidebar navigation items are affected, never chat content.
- Layout collapses cleanly when items are hidden.
- The rule is reversible — toggling OFF removes the class.

## Debugging

Set `const DEBUG = true;` in `src/dom-utils.js`, then check the console for `[ChatShell]` logs.

## Known Limitations

- **ChatGPT DOM changes**: Selectors may need updating when ChatGPT changes its markup. The layered strategy provides resilience, but major layout changes require selector updates in `selectors.js`.
- **Sidebar label changes**: If ChatGPT renames sidebar items (e.g., "Library" → "My Stuff"), the text-based fallback in the corresponding selector config needs updating. CSS and ARIA strategies are tried first and may continue to work.
- **Composer interaction**: ChatGPT's ProseMirror editor requires workarounds for text insertion. Editor framework changes may require updating `setComposerText()`.
- **No server sync**: All data is local to the browser.
- **Chat identity**: Keyed by conversation ID from `/c/<uuid>` URLs. New unsaved chats can't be tracked until they get a URL.
- **Export fidelity**: Markdown extraction is heuristic. Complex formatting (tables, images, LaTeX) may not convert perfectly.

## Future Enhancements

1. **Options popup** — Browser-action popup for quick toggle access.
2. **Keyboard shortcuts** — Chrome commands for common actions.
3. **Import/export library** — Backup and restore as JSON.
4. **Custom rewrite templates** — User-created templates beyond the preset editor.
5. **Theme support** — Light mode panel variant.
