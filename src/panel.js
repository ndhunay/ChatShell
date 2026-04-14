/**
 * panel.js — ChatShell collapsible side panel.
 *
 * Renders a compact right-side dock with five tabs:
 *   - Library:  folders, tags, pins, filtering
 *   - Rewrite:  rewrite action buttons
 *   - Export:   export help and bulk export
 *   - View:     UI declutter toggles (grouped by scope)
 *   - Settings: rewrite preset editor, folder management
 */

let _panelState = null;
let _panelOnSettingsChange = null;

function setPanelState(state, onSettingsChange) {
  _panelState = state;
  _panelOnSettingsChange = onSettingsChange;
}

// ── Panel mount ──────────────────────────────────────────────────────────────

function mountPanel() {
  if (document.getElementById('chs-panel')) return;

  const isCollapsed = _panelState && _panelState.settings.panelCollapsed;

  const toggle = createElement('button', {
    id: 'chs-panel-toggle',
    className: 'chs-panel-toggle',
    textContent: '\u26A1',
    title: 'Toggle ChatShell panel',
    onClick: () => togglePanel()
  });

  const panel = createElement('div', {
    id: 'chs-panel',
    className: 'chs-panel' + (isCollapsed ? ' chs-panel-collapsed' : '')
  });

  // Header with settings gear
  const header = createElement('div', { className: 'chs-panel-header' }, [
    createElement('span', { className: 'chs-panel-title', textContent: 'ChatShell' }),
    createElement('div', { className: 'chs-panel-header-actions' }, [
      createElement('button', {
        className: 'chs-panel-close',
        textContent: '\u00D7',
        title: 'Collapse panel',
        onClick: () => togglePanel()
      })
    ])
  ]);
  panel.appendChild(header);

  // Tab bar
  const tabs = createElement('div', { className: 'chs-tabs' });
  const tabDefs = [
    { id: 'library',  label: '\uD83D\uDCC2' , title: 'Library'  },
    { id: 'rewrite',  label: '\u270F\uFE0F'  , title: 'Rewrite'  },
    { id: 'export',   label: '\uD83D\uDCE4'  , title: 'Export'   },
    { id: 'view',     label: '\uD83D\uDC41'  , title: 'View'     },
    { id: 'settings', label: '\u2699\uFE0F'  , title: 'Settings' }
  ];
  for (const td of tabDefs) {
    const btn = createElement('button', {
      className: 'chs-tab' + (td.id === 'library' ? ' chs-tab-active' : ''),
      'data-tab': td.id,
      textContent: td.label,
      title: td.title,
      onClick: () => switchTab(td.id)
    });
    tabs.appendChild(btn);
  }
  panel.appendChild(tabs);

  const content = createElement('div', { id: 'chs-tab-content', className: 'chs-tab-content' });
  panel.appendChild(content);

  document.body.appendChild(toggle);
  document.body.appendChild(panel);

  switchTab('library');
  log('Panel mounted');
}

function togglePanel() {
  const panel = document.getElementById('chs-panel');
  if (!panel) return;
  const collapsed = panel.classList.toggle('chs-panel-collapsed');
  if (_panelState) {
    _panelState.settings.panelCollapsed = collapsed;
    storageSave('settings', _panelState.settings);
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.chs-tab').forEach(t => {
    t.classList.toggle('chs-tab-active', t.dataset.tab === tabId);
  });

  const content = document.getElementById('chs-tab-content');
  if (!content) return;
  content.innerHTML = '';

  switch (tabId) {
    case 'library':  renderLibraryTab(content);  break;
    case 'rewrite':  renderRewriteTab(content);  break;
    case 'export':   renderExportTab(content);   break;
    case 'view':     renderViewTab(content);     break;
    case 'settings': renderSettingsTab(content); break;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIBRARY TAB
// ═══════════════════════════════════════════════════════════════════════════════

function renderLibraryTab(container) {
  if (!_panelState) return;
  const convId = getConversationId();

  // Current chat quick-assign
  if (convId) {
    const meta = getChatMeta(_panelState.chatMeta, convId);
    storageSave('chatMeta', _panelState.chatMeta);

    const section = createElement('div', { className: 'chs-section' });
    section.appendChild(createElement('div', { className: 'chs-section-title', textContent: 'Current Chat' }));
    section.appendChild(createElement('div', { className: 'chs-chat-title', textContent: meta.title || 'Untitled' }));

    // Pin
    section.appendChild(createElement('button', {
      className: 'chs-btn chs-btn-sm' + (meta.pinned ? ' chs-btn-active' : ''),
      textContent: meta.pinned ? '\uD83D\uDCCC Pinned' : '\uD83D\uDCCC Pin',
      onClick: () => { togglePin(convId); renderLibraryTab(container); }
    }));

    // Folder
    const folderRow = createElement('div', { className: 'chs-row' });
    folderRow.appendChild(createElement('span', { className: 'chs-label', textContent: 'Folder:' }));
    const folderSelect = createElement('select', {
      className: 'chs-select',
      onChange: (e) => { assignFolder(convId, e.target.value || null); renderLibraryTab(container); }
    });
    folderSelect.appendChild(createElement('option', { value: '', textContent: '\u2014 None \u2014' }));
    for (const f of _panelState.library.folders) {
      const opt = createElement('option', { value: f.id, textContent: f.name });
      if (meta.folderId === f.id) opt.selected = true;
      folderSelect.appendChild(opt);
    }
    folderRow.appendChild(folderSelect);
    section.appendChild(folderRow);

    // Tags
    const tagRow = createElement('div', { className: 'chs-row chs-row-wrap' });
    tagRow.appendChild(createElement('span', { className: 'chs-label', textContent: 'Tags:' }));
    for (const tag of (meta.tags || [])) {
      tagRow.appendChild(createElement('span', { className: 'chs-tag' }, [
        document.createTextNode(tag),
        createElement('button', {
          className: 'chs-tag-remove', textContent: '\u00D7',
          onClick: () => { removeTagFromChat(convId, tag); renderLibraryTab(container); }
        })
      ]));
    }
    tagRow.appendChild(createElement('input', {
      className: 'chs-input chs-input-sm', placeholder: '+ tag',
      onKeydown: (e) => { if (e.key === 'Enter' && e.target.value.trim()) { addTagToChat(convId, e.target.value); renderLibraryTab(container); } }
    }));
    section.appendChild(tagRow);
    container.appendChild(section);
  }

  container.appendChild(createElement('hr', { className: 'chs-divider' }));

  // Browse / filter
  const browseSection = createElement('div', { className: 'chs-section' });
  browseSection.appendChild(createElement('div', { className: 'chs-section-title', textContent: 'Browse Chats' }));

  const listContainer = createElement('div', { className: 'chs-chat-list' });

  browseSection.appendChild(createElement('input', {
    className: 'chs-input', placeholder: 'Search chats...',
    onInput: (e) => renderChatList(listContainer, { search: e.target.value })
  }));

  const filterRow = createElement('div', { className: 'chs-row chs-row-wrap' });
  filterRow.appendChild(createElement('button', { className: 'chs-btn chs-btn-sm', textContent: '\uD83D\uDCCC Pinned', onClick: () => renderChatList(listContainer, { pinned: true }) }));
  filterRow.appendChild(createElement('button', { className: 'chs-btn chs-btn-sm', textContent: 'All', onClick: () => renderChatList(listContainer, {}) }));
  browseSection.appendChild(filterRow);

  const folderFilterRow = createElement('div', { className: 'chs-row chs-row-wrap' });
  for (const f of _panelState.library.folders) {
    folderFilterRow.appendChild(createElement('button', {
      className: 'chs-btn chs-btn-xs', textContent: f.name,
      onClick: () => renderChatList(listContainer, { folderId: f.id })
    }));
  }
  browseSection.appendChild(folderFilterRow);

  renderChatList(listContainer, {});
  browseSection.appendChild(listContainer);
  container.appendChild(browseSection);
}

function renderChatList(container, filters) {
  container.innerHTML = '';
  const results = filterChats(filters);
  if (results.length === 0) {
    container.appendChild(createElement('div', { className: 'chs-empty', textContent: 'No chats found' }));
    return;
  }
  for (const { convId, meta } of results.slice(0, 50)) {
    container.appendChild(createElement('a', {
      className: 'chs-chat-item', href: meta.url || `/c/${convId}`, title: meta.title
    }, [
      createElement('span', { className: 'chs-chat-item-title', textContent: (meta.pinned ? '\uD83D\uDCCC ' : '') + (meta.title || 'Untitled') }),
      createElement('span', {
        className: 'chs-chat-item-meta',
        textContent: [meta.folderId ? (_panelState.library.folders.find(f => f.id === meta.folderId) || {}).name : null, ...meta.tags].filter(Boolean).join(' \u00B7 ') || ''
      })
    ]));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REWRITE TAB
// ═══════════════════════════════════════════════════════════════════════════════

function renderRewriteTab(container) {
  const section = createElement('div', { className: 'chs-section' });
  section.appendChild(createElement('div', { className: 'chs-section-title', textContent: 'Rewrite Actions' }));
  section.appendChild(createElement('p', {
    className: 'chs-help-text',
    textContent: 'Click a button to prepend an instruction to your composer text. Edit presets in Settings.'
  }));

  const activePresets = getActiveRewritePresets(_panelState.settings);
  for (const action of activePresets) {
    section.appendChild(createElement('button', {
      className: 'chs-btn chs-btn-full', textContent: action.label,
      title: action.instruction.trim(),
      onClick: () => applyRewriteAction(action)
    }));
  }
  container.appendChild(section);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT TAB
// ═══════════════════════════════════════════════════════════════════════════════

function renderExportTab(container) {
  const section = createElement('div', { className: 'chs-section' });
  section.appendChild(createElement('div', { className: 'chs-section-title', textContent: 'Export Tools' }));
  section.appendChild(createElement('p', { className: 'chs-help-text', textContent: 'Export buttons appear on each assistant response:' }));

  const list = createElement('ul', { className: 'chs-help-list' });
  ['\uD83D\uDCCB Text \u2014 Copy plain text', '\uD83D\uDCDD MD \u2014 Copy markdown', '\u2709\uFE0F Email \u2014 Email-ready text', '\uD83D\uDCBE .md \u2014 Download file'].forEach(t => list.appendChild(createElement('li', { textContent: t })));
  section.appendChild(list);

  section.appendChild(createElement('button', {
    className: 'chs-btn chs-btn-full', textContent: '\uD83D\uDCBE Export all responses to .md',
    onClick: () => {
      const messages = findAllElements('assistantMessages');
      if (messages.length === 0) { showToast('No assistant responses found'); return; }
      const parts = messages.map((m, i) => `## Response ${i + 1}\n\n` + extractMarkdown(m));
      const title = getChatTitle().replace(/[^a-zA-Z0-9 _-]/g, '');
      const date = new Date().toISOString().split('T')[0];
      downloadFile(`${title}-full-${date}.md`, `# ${getChatTitle()}\n\n` + parts.join('\n\n---\n\n'));
      showToast('Full conversation exported');
    }
  }));
  container.appendChild(section);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW TAB — grouped by scope
// ═══════════════════════════════════════════════════════════════════════════════

const SCOPE_LABELS = {
  header:   'Header & Top Nav',
  layout:   'Layout & Spacing',
  sidebar:  'Left Navigation',
  composer: 'Composer',
  response: 'Responses'
};

function renderViewTab(container) {
  container.innerHTML = '';
  const scopes = getRuleScopes();

  for (const scope of scopes) {
    const rules = getRulesByScope(scope);
    if (rules.length === 0) continue;

    const section = createElement('div', { className: 'chs-section' });
    section.appendChild(createElement('div', {
      className: 'chs-section-title',
      textContent: SCOPE_LABELS[scope] || scope
    }));

    for (const rule of rules) {
      const isEnabled = _panelState
        ? (_panelState.settings.rules[rule.id] !== undefined ? _panelState.settings.rules[rule.id] : rule.defaultEnabled)
        : rule.defaultEnabled;

      const row = createElement('div', { className: 'chs-toggle-row' });
      row.appendChild(createElement('label', { className: 'chs-toggle-label' }, [
        createElement('span', { textContent: rule.label }),
        createElement('span', { className: 'chs-toggle-desc', textContent: rule.description })
      ]));
      row.appendChild(createElement('button', {
        className: 'chs-toggle-switch' + (isEnabled ? ' chs-toggle-on' : ''),
        textContent: isEnabled ? 'ON' : 'OFF',
        'aria-pressed': isEnabled.toString(),
        onClick: () => {
          const newVal = !isEnabled;
          if (_panelState) {
            _panelState.settings.rules[rule.id] = newVal;
            storageSave('settings', _panelState.settings);
            rule.apply(newVal);
          }
          renderViewTab(container);
          if (_panelOnSettingsChange) _panelOnSettingsChange();
        }
      }));
      section.appendChild(row);
    }
    container.appendChild(section);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function renderSettingsTab(container) {
  container.innerHTML = '';
  renderHeaderTitleSettings(container);
  container.appendChild(createElement('hr', { className: 'chs-divider' }));
  renderRewritePresetSettings(container);
  container.appendChild(createElement('hr', { className: 'chs-divider' }));
  renderFolderSettings(container);
}

// ── Header Title Settings ────────────────────────────────────────────────────

function renderHeaderTitleSettings(container) {
  const section = createElement('div', { className: 'chs-section' });
  section.appendChild(createElement('div', { className: 'chs-section-title', textContent: 'Header Title' }));

  const isHidden = _panelState.settings.rules.hideModelSelector !== false;

  section.appendChild(createElement('p', {
    className: 'chs-help-text',
    textContent: isHidden
      ? 'Replaces the model selector in the top nav. Leave empty to show nothing.'
      : 'Enable "Hide model selector" in the View tab first. The title appears in its place.'
  }));

  const currentTitle = _panelState.settings.headerTitle || '';

  const row = createElement('div', { className: 'chs-row' });
  const input = createElement('input', {
    className: 'chs-input chs-input-sm',
    value: currentTitle,
    placeholder: 'e.g. My AI Workspace',
    disabled: !isHidden ? 'disabled' : undefined,
    onInput: (e) => {
      _panelState.settings.headerTitle = e.target.value;
      storageSave('settings', _panelState.settings);
      applyHeaderTitle(e.target.value, true);
    }
  });
  row.appendChild(input);

  if (currentTitle && isHidden) {
    row.appendChild(createElement('button', {
      className: 'chs-btn-danger', textContent: '\u2715', title: 'Clear title',
      onClick: () => {
        _panelState.settings.headerTitle = '';
        storageSave('settings', _panelState.settings);
        applyHeaderTitle('', true);
        renderSettingsTab(container);
      }
    }));
  }

  section.appendChild(row);
  container.appendChild(section);
}

// ── Rewrite Preset Editor ────────────────────────────────────────────────────

function renderRewritePresetSettings(container) {
  const section = createElement('div', { className: 'chs-section' });
  section.appendChild(createElement('div', { className: 'chs-section-title', textContent: 'Rewrite Presets' }));
  section.appendChild(createElement('p', { className: 'chs-help-text', textContent: 'Edit, reorder, or add rewrite instruction presets. Disabled presets are hidden from the rewrite bar.' }));

  const presets = _panelState.settings.rewritePresets || [];

  for (let i = 0; i < presets.length; i++) {
    const preset = presets[i];
    const card = createElement('div', { className: 'chs-preset-card' + (preset.enabled === false ? ' chs-preset-disabled' : '') });

    // Top row: label + controls
    const topRow = createElement('div', { className: 'chs-row chs-row-between' });

    // Reorder arrows
    const arrows = createElement('div', { className: 'chs-preset-arrows' });
    if (i > 0) {
      arrows.appendChild(createElement('button', {
        className: 'chs-btn-icon', textContent: '\u25B2', title: 'Move up',
        onClick: () => { swapPresets(i, i - 1); renderSettingsTab(container); }
      }));
    }
    if (i < presets.length - 1) {
      arrows.appendChild(createElement('button', {
        className: 'chs-btn-icon', textContent: '\u25BC', title: 'Move down',
        onClick: () => { swapPresets(i, i + 1); renderSettingsTab(container); }
      }));
    }
    topRow.appendChild(arrows);

    // Label — inline editable
    const labelInput = createElement('input', {
      className: 'chs-input chs-input-sm chs-preset-label-input',
      value: preset.label,
      onChange: (e) => {
        preset.label = e.target.value.trim() || preset.label;
        savePresets();
      }
    });
    topRow.appendChild(labelInput);

    // Enable/disable toggle
    topRow.appendChild(createElement('button', {
      className: 'chs-toggle-switch chs-toggle-sm' + (preset.enabled !== false ? ' chs-toggle-on' : ''),
      textContent: preset.enabled !== false ? 'ON' : 'OFF',
      onClick: () => {
        preset.enabled = preset.enabled === false ? true : false;
        savePresets();
        renderSettingsTab(container);
      }
    }));

    // Delete (only custom presets)
    if (!preset.builtin) {
      topRow.appendChild(createElement('button', {
        className: 'chs-btn-danger', textContent: '\u2715', title: 'Remove preset',
        onClick: () => {
          presets.splice(i, 1);
          savePresets();
          renderSettingsTab(container);
        }
      }));
    }

    card.appendChild(topRow);

    // Instruction textarea
    const textarea = createElement('textarea', {
      className: 'chs-textarea',
      value: preset.instruction,
      rows: '2',
      onChange: (e) => {
        preset.instruction = e.target.value;
        savePresets();
      }
    });
    textarea.value = preset.instruction;
    card.appendChild(textarea);

    section.appendChild(card);
  }

  // Add new preset
  section.appendChild(createElement('button', {
    className: 'chs-btn chs-btn-full chs-btn-add',
    textContent: '+ Add preset',
    onClick: () => {
      presets.push({
        id: 'custom-' + Date.now().toString(36),
        label: 'New Preset',
        instruction: 'Rewrite the following:\n\n',
        enabled: true,
        builtin: false
      });
      savePresets();
      renderSettingsTab(container);
    }
  }));

  // Reset to defaults
  section.appendChild(createElement('button', {
    className: 'chs-btn chs-btn-full chs-btn-muted',
    textContent: 'Reset to defaults',
    onClick: () => {
      resetRewritePresets(_panelState.settings);
      refreshRewriteActions(_panelState.settings);
      forceRewriteBarRebuild();
      renderSettingsTab(container);
      showToast('Presets reset to defaults');
    }
  }));

  container.appendChild(section);
}

function swapPresets(i, j) {
  const presets = _panelState.settings.rewritePresets;
  if (!presets || i < 0 || j < 0 || i >= presets.length || j >= presets.length) return;
  const temp = presets[i];
  presets[i] = presets[j];
  presets[j] = temp;
  savePresets();
}

function savePresets() {
  storageSave('settings', _panelState.settings);
  refreshRewriteActions(_panelState.settings);
  forceRewriteBarRebuild();
  log('Presets saved');
}

/**
 * Force the rewrite bar to rebuild with current presets.
 */
function forceRewriteBarRebuild() {
  const existing = document.getElementById('chs-rewrite-bar');
  if (existing) existing.remove();
  mountRewriteBar();
}

// ── Folder Management ────────────────────────────────────────────────────────

function renderFolderSettings(container) {
  const section = createElement('div', { className: 'chs-section' });
  section.appendChild(createElement('div', { className: 'chs-section-title', textContent: 'Folder Management' }));
  section.appendChild(createElement('p', { className: 'chs-help-text', textContent: 'Add, rename, reorder, or delete folders. Deleting a folder unassigns all chats from it.' }));

  const folders = _panelState.library.folders;

  for (let i = 0; i < folders.length; i++) {
    const folder = folders[i];
    const row = createElement('div', { className: 'chs-row chs-row-between chs-folder-row' });

    // Reorder arrows
    const arrows = createElement('div', { className: 'chs-preset-arrows' });
    if (i > 0) {
      arrows.appendChild(createElement('button', {
        className: 'chs-btn-icon', textContent: '\u25B2', title: 'Move up',
        onClick: () => { swapFolders(i, i - 1); renderFolderSettings(container); }
      }));
    }
    if (i < folders.length - 1) {
      arrows.appendChild(createElement('button', {
        className: 'chs-btn-icon', textContent: '\u25BC', title: 'Move down',
        onClick: () => { swapFolders(i, i + 1); renderFolderSettings(container); }
      }));
    }
    row.appendChild(arrows);

    // Editable name
    const nameInput = createElement('input', {
      className: 'chs-input chs-input-sm',
      value: folder.name,
      onChange: (e) => {
        const newName = e.target.value.trim();
        if (newName) {
          renameFolder(folder.id, newName);
        }
      }
    });
    row.appendChild(nameInput);

    // Delete
    row.appendChild(createElement('button', {
      className: 'chs-btn-danger', textContent: '\u2715', title: `Delete "${folder.name}"`,
      onClick: () => {
        deleteFolder(folder.id);
        renderSettingsTab(container);
      }
    }));

    section.appendChild(row);
  }

  // Add new
  const addRow = createElement('div', { className: 'chs-row' });
  const newInput = createElement('input', { className: 'chs-input chs-input-sm', placeholder: 'New folder name...' });
  addRow.appendChild(newInput);
  addRow.appendChild(createElement('button', {
    className: 'chs-btn chs-btn-sm', textContent: '+',
    onClick: () => { const name = newInput.value.trim(); if (name) { createFolder(name); renderSettingsTab(container); } }
  }));
  section.appendChild(addRow);

  container.appendChild(section);
}

function swapFolders(i, j) {
  const folders = _panelState.library.folders;
  if (!folders || i < 0 || j < 0 || i >= folders.length || j >= folders.length) return;
  const temp = folders[i];
  folders[i] = folders[j];
  folders[j] = temp;
  storageSave('library', _panelState.library);
}
