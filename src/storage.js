/**
 * storage.js — Persistence layer using chrome.storage.local.
 *
 * Storage schema:
 *
 *   settings: {
 *     rules: { hideModelSelector: true, hideHeaderClutter: false, ... },
 *     panelCollapsed: false,
 *     rewritePresets: [ { id, label, instruction, enabled, builtin } ],
 *   }
 *
 *   library: {
 *     folders: [ { id, name, createdAt } ],
 *     tags: [ "tag1", "tag2" ]
 *   }
 *
 *   chatMeta: {
 *     "<conversationId>": {
 *       title: "...",
 *       folderId: "...|null",
 *       tags: ["..."],
 *       pinned: false,
 *       lastSeen: <timestamp>,
 *       url: "..."
 *     }
 *   }
 */

/**
 * Built-in rewrite presets — used as defaults on first run and as fallback
 * if stored presets are missing or corrupted.
 */
const BUILTIN_REWRITE_PRESETS = [
  { id: 'tighten',       label: 'Tighten',                  instruction: 'Rewrite the following to be tighter, clearer, and more concise while preserving intent:\n\n',                                              enabled: true, builtin: true },
  { id: 'executive',     label: 'More executive',           instruction: 'Rewrite the following in an executive communication style: concise, strategic, outcome-oriented, and professional:\n\n',                   enabled: true, builtin: true },
  { id: 'direct',        label: 'Direct Mode',              instruction: 'Rewrite the following in Direct Mode: concise, sharp, actionable, and clear:\n\n',                                                        enabled: true, builtin: true },
  { id: 'inspirational', label: 'Inspirational Leadership', instruction: 'Rewrite the following in an inspirational leadership style: narrative, motivational, warm, and executive-ready:\n\n',                      enabled: true, builtin: true },
  { id: 'warmer',        label: 'Make warmer',              instruction: 'Rewrite the following to be warmer, more empathetic, and more human while keeping the core message:\n\n',                                 enabled: true, builtin: true },
  { id: 'structure',     label: 'Add structure',            instruction: 'Rewrite the following with clear structure: use headings, bullet points, or numbered steps where appropriate:\n\n',                        enabled: true, builtin: true },
  { id: 'critique',      label: 'Sharpen critique',         instruction: 'Rewrite the following to be a sharper, more constructive critique: specific, evidence-based, and direct:\n\n',                             enabled: true, builtin: true },
  { id: 'shorten',       label: 'Shorten 30%',             instruction: 'Rewrite the following to be approximately 30% shorter while preserving all key points:\n\n',                                               enabled: true, builtin: true }
];

const STORAGE_DEFAULTS = {
  settings: {
    rules: {
      hideModelSelector: true,

      widenChatArea: false,
      compactSpacing: false,
      reduceNavNoise: false,
      hideFooterDisclaimer: false,
      hideSidebarLibrary: false,
      hideSidebarApps: false,
      hideSidebarDeepResearch: false,
      hideSidebarGPTs: false
    },
    panelCollapsed: true,
    headerTitle: '',       // custom title shown in the top nav (empty = hidden)
    rewritePresets: null   // null means "use BUILTIN defaults"
  },
  library: {
    folders: [],
    tags: []
  },
  chatMeta: {}
};

const DEFAULT_FOLDERS = [
  { id: 'folder-leadership', name: 'Leadership & Communication' },
  { id: 'folder-architecture', name: 'Architecture' },
  { id: 'folder-eng-effectiveness', name: 'Engineering Effectiveness' },
  { id: 'folder-ai-sdlc', name: 'AI / Agentic SDLC' },
  { id: 'folder-vendor', name: 'Vendor / External' },
  { id: 'folder-personal', name: 'Personal' }
];

/**
 * Load all ChatShell data from storage, merging with defaults.
 * Handles missing or corrupted data gracefully.
 * @returns {Promise<Object>}
 */
async function storageLoad() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings', 'library', 'chatMeta'], (result) => {
      const data = {
        settings: { ...STORAGE_DEFAULTS.settings },
        library: { ...STORAGE_DEFAULTS.library },
        chatMeta: {}
      };

      // Merge settings
      if (result.settings && typeof result.settings === 'object') {
        data.settings = { ...STORAGE_DEFAULTS.settings, ...result.settings };
      }

      // Deep merge rules — always ensure new rule defaults appear
      data.settings.rules = {
        ...STORAGE_DEFAULTS.settings.rules,
        ...(result.settings && result.settings.rules ? result.settings.rules : {})
      };

      // Rewrite presets — use stored if valid, else fall back to builtins
      if (result.settings && Array.isArray(result.settings.rewritePresets)) {
        data.settings.rewritePresets = result.settings.rewritePresets;
      } else {
        data.settings.rewritePresets = BUILTIN_REWRITE_PRESETS.map(p => ({ ...p }));
      }

      // Library
      if (result.library && typeof result.library === 'object') {
        data.library = {
          folders: Array.isArray(result.library.folders) ? result.library.folders : [],
          tags: Array.isArray(result.library.tags) ? result.library.tags : []
        };
      }

      // Chat metadata
      if (result.chatMeta && typeof result.chatMeta === 'object') {
        data.chatMeta = result.chatMeta;
      }

      log('Storage loaded');
      resolve(data);
    });
  });
}

/**
 * Save a specific storage section.
 * @param {string} section — 'settings', 'library', or 'chatMeta'
 * @param {Object} value
 * @returns {Promise<void>}
 */
async function storageSave(section, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [section]: value }, () => {
      log(`Storage saved: ${section}`);
      resolve();
    });
  });
}

/**
 * Seed default folders on first run.
 * @param {Object} library
 * @returns {Promise<Object>}
 */
async function seedDefaultFolders(library) {
  if (library.folders.length === 0) {
    const now = Date.now();
    library.folders = DEFAULT_FOLDERS.map((f, i) => ({
      ...f,
      createdAt: now + i
    }));
    await storageSave('library', library);
    log('Default folders seeded');
  }
  return library;
}

/**
 * Get or create chat metadata for a conversation.
 * @param {Object} chatMeta
 * @param {string} convId
 * @returns {Object|null}
 */
function getChatMeta(chatMeta, convId) {
  if (!convId) return null;
  if (!chatMeta[convId]) {
    chatMeta[convId] = {
      title: getChatTitle(),
      folderId: null,
      tags: [],
      pinned: false,
      lastSeen: Date.now(),
      url: window.location.href
    };
  } else {
    chatMeta[convId].lastSeen = Date.now();
    chatMeta[convId].url = window.location.href;
    const currentTitle = getChatTitle();
    if (currentTitle !== 'Untitled Chat') {
      chatMeta[convId].title = currentTitle;
    }
  }
  return chatMeta[convId];
}

/**
 * Get active (enabled) rewrite presets from settings.
 * @param {Object} settings
 * @returns {Array}
 */
function getActiveRewritePresets(settings) {
  const presets = settings.rewritePresets || BUILTIN_REWRITE_PRESETS;
  return presets.filter(p => p.enabled !== false);
}

/**
 * Reset rewrite presets to built-in defaults.
 * @param {Object} settings
 */
function resetRewritePresets(settings) {
  settings.rewritePresets = BUILTIN_REWRITE_PRESETS.map(p => ({ ...p }));
  storageSave('settings', settings);
}
