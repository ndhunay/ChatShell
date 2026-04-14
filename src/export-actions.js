/**
 * export-actions.js — Export tools for assistant responses.
 *
 * Attaches per-response export controls for copying and downloading content
 * in various formats.
 */

/**
 * Extract plain text from an assistant message element.
 * Strips HTML tags and normalizes whitespace.
 * @param {HTMLElement} messageEl
 * @returns {string}
 */
function extractPlainText(messageEl) {
  // Clone to avoid modifying the DOM
  const clone = messageEl.cloneNode(true);
  // Remove any ChatShell-injected elements from the clone
  clone.querySelectorAll('[class^="chs-"]').forEach(el => el.remove());
  // Get text content
  let text = clone.innerText || clone.textContent || '';
  // Normalize whitespace but preserve paragraph breaks
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

/**
 * Extract markdown-ish content from an assistant message.
 * Preserves structure like headings, lists, and code blocks.
 * @param {HTMLElement} messageEl
 * @returns {string}
 */
function extractMarkdown(messageEl) {
  const clone = messageEl.cloneNode(true);
  clone.querySelectorAll('[class^="chs-"]').forEach(el => el.remove());

  let md = '';

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      md += node.textContent;
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName.toLowerCase();

    // Block-level elements
    if (tag === 'h1') { md += '\n# '; walkChildren(node); md += '\n\n'; return; }
    if (tag === 'h2') { md += '\n## '; walkChildren(node); md += '\n\n'; return; }
    if (tag === 'h3') { md += '\n### '; walkChildren(node); md += '\n\n'; return; }
    if (tag === 'h4') { md += '\n#### '; walkChildren(node); md += '\n\n'; return; }
    if (tag === 'p') { walkChildren(node); md += '\n\n'; return; }
    if (tag === 'br') { md += '\n'; return; }

    // Lists
    if (tag === 'ul' || tag === 'ol') {
      md += '\n';
      const items = node.querySelectorAll(':scope > li');
      items.forEach((li, i) => {
        const prefix = tag === 'ol' ? `${i + 1}. ` : '- ';
        md += prefix + (li.innerText || '').trim() + '\n';
      });
      md += '\n';
      return;
    }

    // Code blocks
    if (tag === 'pre') {
      const code = node.querySelector('code');
      const lang = code ? (code.className.match(/language-(\w+)/) || [])[1] || '' : '';
      const codeText = (code || node).innerText || '';
      md += '\n```' + lang + '\n' + codeText.trim() + '\n```\n\n';
      return;
    }

    // Inline code
    if (tag === 'code' && !node.closest('pre')) {
      md += '`' + node.textContent + '`';
      return;
    }

    // Bold/italic
    if (tag === 'strong' || tag === 'b') { md += '**'; walkChildren(node); md += '**'; return; }
    if (tag === 'em' || tag === 'i') { md += '*'; walkChildren(node); md += '*'; return; }

    // Links
    if (tag === 'a') {
      const href = node.getAttribute('href') || '';
      md += '[';
      walkChildren(node);
      md += `](${href})`;
      return;
    }

    // Default: recurse
    walkChildren(node);
  }

  function walkChildren(node) {
    for (const child of node.childNodes) walk(child);
  }

  // Find the markdown/prose content container within the message
  const prose = clone.querySelector('.markdown, .prose, [class*="markdown"]') || clone;
  walk(prose);

  return md.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Convert to email-ready text: strip markdown artifacts, clean formatting.
 * @param {HTMLElement} messageEl
 * @returns {string}
 */
function extractEmailText(messageEl) {
  let text = extractPlainText(messageEl);
  // Remove markdown-style headers (# / ## / ###)
  text = text.replace(/^#{1,4}\s+/gm, '');
  // Remove bold markers
  text = text.replace(/\*\*/g, '');
  // Remove inline code backticks
  text = text.replace(/`([^`]+)`/g, '$1');
  // Remove code fence markers
  text = text.replace(/```[\w]*\n?/g, '');
  // Clean up bullet markers for email
  text = text.replace(/^[-*]\s+/gm, '• ');
  // Normalize spacing
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

/**
 * Mount export buttons on a single assistant message element.
 * Idempotent — skips if already mounted on this element.
 * @param {HTMLElement} messageEl
 */
function mountExportButtons(messageEl) {
  if (messageEl.querySelector('.chs-export-bar')) return;

  const bar = createElement('div', { className: 'chs-export-bar' });

  const actions = [
    {
      label: '📋 Text',
      title: 'Copy as plain text',
      handler: () => {
        const text = extractPlainText(messageEl);
        copyToClipboard(text).then(() => showToast('Copied as plain text'));
      }
    },
    {
      label: '📝 MD',
      title: 'Copy as markdown',
      handler: () => {
        const md = extractMarkdown(messageEl);
        copyToClipboard(md).then(() => showToast('Copied as markdown'));
      }
    },
    {
      label: '✉️ Email',
      title: 'Copy as email-ready text',
      handler: () => {
        const text = extractEmailText(messageEl);
        copyToClipboard(text).then(() => showToast('Copied as email-ready text'));
      }
    },
    {
      label: '💾 .md',
      title: 'Export to .md file',
      handler: () => {
        const md = extractMarkdown(messageEl);
        const title = getChatTitle().replace(/[^a-zA-Z0-9 _-]/g, '');
        const date = new Date().toISOString().split('T')[0];
        const filename = `${title}-${date}.md`;
        downloadFile(filename, md);
        showToast('Exported to file');
      }
    }
  ];

  for (const action of actions) {
    const btn = createElement('button', {
      className: 'chs-export-btn',
      textContent: action.label,
      title: action.title,
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        action.handler();
      }
    });
    bar.appendChild(btn);
  }

  // Find a good insertion point — after the message content, before action buttons
  const proseContainer = messageEl.querySelector('.markdown, .prose, [class*="markdown"]');
  const insertTarget = proseContainer ? proseContainer.parentElement : messageEl;
  insertTarget.appendChild(bar);

  log('Export buttons mounted on message');
}

/**
 * Scan for all assistant messages and mount export buttons on each.
 * Called on initial load and on DOM mutations.
 */
function mountAllExportButtons() {
  const messages = findAllElements('assistantMessages');
  for (const msg of messages) {
    mountExportButtons(msg);
  }
}
