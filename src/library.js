/**
 * library.js — Chat organization layer.
 *
 * Manages folders, tags, pins, and filtering for the Library panel section.
 * All data is stored locally via chrome.storage.local — no server mutations.
 */

/**
 * @typedef {Object} ChatShellState
 * @property {Object} settings
 * @property {Object} library
 * @property {Object} chatMeta
 */

/** Module-level reference to state, set from content.js */
let _libraryState = null;

function setLibraryState(state) {
  _libraryState = state;
}

// ── Folder management ────────────────────────────────────────────────────────

function createFolder(name) {
  if (!_libraryState) return null;
  const id = 'folder-' + Date.now().toString(36);
  const folder = { id, name, createdAt: Date.now() };
  _libraryState.library.folders.push(folder);
  storageSave('library', _libraryState.library);
  log(`Folder created: ${name}`);
  return folder;
}

function deleteFolder(folderId) {
  if (!_libraryState) return;
  _libraryState.library.folders = _libraryState.library.folders.filter(f => f.id !== folderId);
  // Unassign chats from this folder
  for (const meta of Object.values(_libraryState.chatMeta)) {
    if (meta.folderId === folderId) meta.folderId = null;
  }
  storageSave('library', _libraryState.library);
  storageSave('chatMeta', _libraryState.chatMeta);
  log(`Folder deleted: ${folderId}`);
}

function renameFolder(folderId, newName) {
  if (!_libraryState) return;
  const folder = _libraryState.library.folders.find(f => f.id === folderId);
  if (folder) {
    folder.name = newName;
    storageSave('library', _libraryState.library);
  }
}

// ── Tag management ───────────────────────────────────────────────────────────

function addGlobalTag(tag) {
  if (!_libraryState) return;
  const t = tag.trim().toLowerCase();
  if (t && !_libraryState.library.tags.includes(t)) {
    _libraryState.library.tags.push(t);
    storageSave('library', _libraryState.library);
  }
}

// ── Chat metadata operations ─────────────────────────────────────────────────

function assignFolder(convId, folderId) {
  if (!_libraryState || !convId) return;
  const meta = getChatMeta(_libraryState.chatMeta, convId);
  if (meta) {
    meta.folderId = folderId;
    storageSave('chatMeta', _libraryState.chatMeta);
    log(`Chat ${convId} assigned to folder ${folderId}`);
  }
}

function togglePin(convId) {
  if (!_libraryState || !convId) return false;
  const meta = getChatMeta(_libraryState.chatMeta, convId);
  if (meta) {
    meta.pinned = !meta.pinned;
    storageSave('chatMeta', _libraryState.chatMeta);
    log(`Chat ${convId} pinned: ${meta.pinned}`);
    return meta.pinned;
  }
  return false;
}

function addTagToChat(convId, tag) {
  if (!_libraryState || !convId) return;
  const meta = getChatMeta(_libraryState.chatMeta, convId);
  const t = tag.trim().toLowerCase();
  if (meta && t && !meta.tags.includes(t)) {
    meta.tags.push(t);
    addGlobalTag(t);
    storageSave('chatMeta', _libraryState.chatMeta);
  }
}

function removeTagFromChat(convId, tag) {
  if (!_libraryState || !convId) return;
  const meta = getChatMeta(_libraryState.chatMeta, convId);
  if (meta) {
    meta.tags = meta.tags.filter(t => t !== tag);
    storageSave('chatMeta', _libraryState.chatMeta);
  }
}

// ── Filtering & search ───────────────────────────────────────────────────────

/**
 * Filter chat metadata entries.
 * @param {Object} filters — { folderId?, tag?, pinned?, search? }
 * @returns {Array<{convId: string, meta: Object}>}
 */
function filterChats(filters = {}) {
  if (!_libraryState) return [];

  return Object.entries(_libraryState.chatMeta)
    .filter(([, meta]) => {
      if (filters.folderId && meta.folderId !== filters.folderId) return false;
      if (filters.tag && !meta.tags.includes(filters.tag)) return false;
      if (filters.pinned && !meta.pinned) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const inTitle = (meta.title || '').toLowerCase().includes(q);
        const inTags = meta.tags.some(t => t.includes(q));
        if (!inTitle && !inTags) return false;
      }
      return true;
    })
    .map(([convId, meta]) => ({ convId, meta }))
    .sort((a, b) => {
      // Pinned first, then by lastSeen
      if (a.meta.pinned !== b.meta.pinned) return b.meta.pinned ? 1 : -1;
      return (b.meta.lastSeen || 0) - (a.meta.lastSeen || 0);
    });
}
