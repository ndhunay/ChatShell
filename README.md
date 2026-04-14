# ChatShell – ChatGPT Power Tools

A lightweight Chrome extension (Manifest V3) that adds power-user features to the ChatGPT web interface: chat organization, rewrite actions, clean exports, and UI declutter toggles.

## What ChatShell Does

ChatShell overlays a non-intrusive customization layer on top of `chatgpt.com`. It does **not** modify any ChatGPT server data — all metadata, settings, and organizational structure are stored locally in your browser.

## Feature Overview

### 📂 Library — Chat Organization
- **Folders**: Create folders to organize conversations by project or topic. Six default folders are seeded on first run.
- **Tags**: Add freeform tags to any chat for cross-cutting categorization.
- **Pins**: Pin important chats so they always sort to the top.
- **Filter & Search**: Browse previously seen chats by folder, tag, pinned state, or search by title/tags.
- **Quick Assign**: Assign folders and tags to the current chat directly from the side panel.

### ✏️ Rewrite — Instruction Templates
A rewrite action bar near the composer lets you prepend an instruction template to your text with one click. The transform is visible and editable before sending.

Built-in rewrite actions:
| Action | What it does |
|---|---|
| Tighten | Tighter, clearer, more concise |
| More executive | Strategic, outcome-oriented |
| Direct Mode | Sharp, actionable, clear |
| Inspirational Leadership | Narrative, motivational, warm |
| Make warmer | Empathetic, human |
| Add structure | Headings, bullets, numbered steps |
| Sharpen critique | Specific, evidence-based |
| Shorten 30% | Reduce length while preserving key points |

### 📤 Export — Clean Output
Per-response export buttons appear on every assistant message:
- **📋 Text** — Copy as clean plain text
- **📝 MD** — Copy as markdown with formatting preserved
- **✉️ Email** — Copy email-ready text (no markdown artifacts)
- **💾 .md** — Download as a `.md` file

Bulk export of all responses is available in the Export panel tab.

### 👁 View — UI Controls
Toggleable rules to declutter the ChatGPT interface:
| Toggle | Description |
|---|---|
| Hide model selector | Remove the "ChatGPT" model picker from the top nav |
| Hide top header clutter | Minimize the top header bar |
| Widen chat area | Expand conversations to use more horizontal space |
| Compact spacing | Reduce vertical padding between messages |
| Reduce left-nav noise | Simplify the sidebar |

All toggles persist across page reloads.

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked**.
5. Select the root project folder (the one containing `manifest.json`).
6. Navigate to [chatgpt.com](https://chatgpt.com) — the ChatShell toggle button (⚡) appears on the right edge.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Persist settings, folders, tags, pins, and chat metadata locally in the browser. No data leaves your machine. |

The extension requires no other permissions. It runs only on `chatgpt.com` via content scripts.

## Architecture

```
manifest.json              Extension manifest — Manifest V3, chatgpt.com only
src/
  selectors.js             Centralized DOM selector configs (CSS, ARIA, text fallback)
  dom-utils.js             Layered element detection, MutationObserver, DOM helpers
  storage.js               chrome.storage.local persistence layer and schema
  rules.js                 Modular UI rule engine with toggle definitions
  library.js               Chat organization: folders, tags, pins, filtering
  rewrite-actions.js       Config-driven rewrite instruction templates
  export-actions.js        Per-response export: text, markdown, email, file
  panel.js                 Collapsible side panel UI with tabbed sections
  content.js               Entry point — orchestrates all modules
  styles.css               All extension styles (chs-* prefix)
```

### Module dependency order

```
selectors.js  →  dom-utils.js  →  storage.js  →  rules.js
                                                    ↓
                  library.js  ←  rewrite-actions.js  ←  export-actions.js
                                                    ↓
                               panel.js  →  content.js
```

### Key patterns

- **Layered detection**: Each DOM target is found via CSS selectors → ARIA matching → scoped text fallback, so the extension survives ChatGPT UI changes.
- **CSS class injection**: Visual rules use `chs-*` classes rather than inline style mutation.
- **Idempotent mounts**: All UI mount functions check for existing elements before creating new ones.
- **MutationObserver**: A debounced observer re-applies all features on DOM changes, handling SPA navigation.
- **Rule engine**: UI toggles are data-driven — each rule is a config object with `apply(enabled)`.

## How to Add a New UI Rule

1. Add a CSS class in `src/styles.css`:
   ```css
   body.chs-focus-mode [data-message-author-role="user"] {
     opacity: 0.5;
   }
   ```

2. Add a rule definition in `src/rules.js`:
   ```js
   {
     id: 'focusMode',
     label: 'Focus mode',
     description: 'Dim user messages to focus on assistant responses.',
     defaultEnabled: false,
     apply(enabled) {
       document.body.classList.toggle('chs-focus-mode', enabled);
     }
   }
   ```

3. Add the default to `STORAGE_DEFAULTS.settings.rules` in `src/storage.js`:
   ```js
   focusMode: false
   ```

The rule automatically appears in the View panel tab with a toggle switch.

## How to Add a New Rewrite Action

Add an entry to `REWRITE_ACTIONS` in `src/rewrite-actions.js`:

```js
{
  id: 'technical',
  label: 'Make technical',
  instruction: 'Rewrite the following in a precise, technical style with specific details and terminology:\n\n'
}
```

The action automatically appears in the rewrite bar and the Rewrite panel tab.

## Debugging

In `src/dom-utils.js`, set:

```js
const DEBUG = true;
```

Then open the browser console on chatgpt.com to see logs prefixed with `[ChatShell]`:
- Extension load / initialization
- DOM mutation observer activity
- Rule application
- Panel mount
- Rewrite action execution
- Export action execution
- Storage load/save events

## Known Limitations

- **ChatGPT DOM changes**: ChatGPT frequently updates its UI markup. If features stop working, update the selectors in `src/selectors.js`. The layered detection strategy provides resilience, but major layout changes may require selector updates.
- **Composer interaction**: Setting text in ChatGPT's ProseMirror editor requires workarounds (execCommand, synthetic events). If ChatGPT changes their editor framework, `setComposerText()` in `rewrite-actions.js` may need updating.
- **No server sync**: All ChatShell data is local to the browser. It does not sync across devices.
- **Chat identity**: Chat metadata is keyed by conversation ID from the URL (`/c/<uuid>`). Chats without a URL ID (e.g., a new unsaved chat) cannot be tracked until they receive one.
- **Export fidelity**: Markdown extraction is heuristic-based. Complex formatting (tables, images, LaTeX) may not convert perfectly.
- **Content script isolation**: The extension runs in the same JS context as the content script world. It cannot directly access ChatGPT's React state.

## Future Enhancements

1. **Options popup** — A browser-action popup for quick access to toggles without opening the full panel.
2. **Keyboard shortcuts** — Chrome commands for common actions (toggle panel, apply rewrite, quick-pin).
3. **Import/export library** — Backup and restore folders, tags, and chat metadata as JSON.
4. **Custom rewrite templates** — Let users create and edit their own rewrite instruction templates.
5. **Theme support** — Light mode panel variant that matches ChatGPT's light theme.
