/**
 * content.js — Entry point for the ChatShell content script.
 *
 * Orchestrates all modules:
 *   1. Load settings from storage
 *   2. Seed default data on first run
 *   3. Initialize rewrite presets from settings
 *   4. Apply UI rules
 *   5. Mount panel, rewrite bar, and export buttons
 *   6. Observe DOM mutations to keep everything in sync
 */

let appState = null;

(async function init() {
  log('ChatShell extension loaded');

  // Load persisted state
  appState = await storageLoad();

  // Seed default folders on first run
  appState.library = await seedDefaultFolders(appState.library);

  // Initialize rewrite presets from settings
  refreshRewriteActions(appState.settings);

  // Track current chat
  const convId = getConversationId();
  if (convId) {
    getChatMeta(appState.chatMeta, convId);
    await storageSave('chatMeta', appState.chatMeta);
  }

  // Share state with modules
  setLibraryState(appState);
  setPanelState(appState, onSettingsChange);

  // Initial application
  applyAll();

  // Watch for DOM changes (SPA navigation, re-renders)
  observeDOM(applyAll);

  // Watch for URL changes (SPA navigation without full page reload)
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      log('URL changed \u2014 re-applying');
      const newConvId = getConversationId();
      if (newConvId) {
        getChatMeta(appState.chatMeta, newConvId);
        storageSave('chatMeta', appState.chatMeta);
      }
      applyAll();
    }
  });
  urlObserver.observe(document.body, { childList: true, subtree: true });

  log('ChatShell fully initialized');
})();

/**
 * Apply all ChatShell features. Called on load and on DOM mutations.
 * Must be idempotent.
 */
function applyAll() {
  if (!appState) return;

  // 1. UI rules (toggles)
  applyUiRules(appState.settings.rules);

  // 2. Header title (only shows when model selector is hidden)
  const selectorHidden = appState.settings.rules.hideModelSelector !== false;
  applyHeaderTitle(appState.settings.headerTitle || '', selectorHidden);

  // 3. Panel
  mountPanel();

  // 4. Rewrite bar
  mountRewriteBar();

  // 5. Export buttons
  mountAllExportButtons();
}

/**
 * Called when settings change from the panel.
 */
function onSettingsChange() {
  if (!appState) return;
  applyUiRules(appState.settings.rules);
}
