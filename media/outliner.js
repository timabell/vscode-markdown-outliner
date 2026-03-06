// Markdown Outliner - Client-side script for collapsible sections
(function () {
  'use strict';

  const STORAGE_KEY = 'markdown-outliner-state';
  let collapsedState = {};
  let contextMenu = null;
  let contextMenuTarget = null;

  // Load saved state from localStorage
  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        collapsedState = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load outliner state:', e);
    }
  }

  // Save state to localStorage
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsedState));
    } catch (e) {
      console.error('Failed to save outliner state:', e);
    }
  }

  // Generate a unique key for an element based on its content and position
  function getElementKey(element) {
    const text = element.textContent.trim().substring(0, 100);
    const tag = element.tagName.toLowerCase();
    const parent = element.parentElement?.tagName.toLowerCase() || '';
    return `${tag}:${parent}:${text}`;
  }

  // Get all content elements that should be collapsed under a heading
  function getCollapsibleContent(heading) {
    const level = parseInt(heading.tagName.substring(1));
    const content = [];
    let next = heading.nextElementSibling;

    while (next) {
      // Stop if we hit a heading at the same level or higher (lower number = higher in hierarchy)
      if (next.tagName.match(/^H[1-6]$/)) {
        const nextLevel = parseInt(next.tagName.substring(1));
        // h1=1 is higher than h2=2, so stop if nextLevel <= level
        if (nextLevel <= level) {
          break;
        }
      }
      content.push(next);
      next = next.nextElementSibling;
    }

    return content;
  }

  // Get nested list content for a list item
  function getNestedListContent(listItem) {
    const nested = listItem.querySelectorAll(':scope > ul, :scope > ol');
    return Array.from(nested);
  }

  // Create collapse/expand toggle button
  function createToggleButton(isCollapsed) {
    const button = document.createElement('span');
    button.className = 'outliner-toggle';
    button.setAttribute('aria-label', isCollapsed ? 'Expand' : 'Collapse');
    button.setAttribute('role', 'button');
    button.textContent = isCollapsed ? '▶' : '▼';
    return button;
  }

  // Create context menu
  function createContextMenu() {
    if (contextMenu) return contextMenu;

    const menu = document.createElement('div');
    menu.className = 'outliner-context-menu';
    menu.innerHTML = `
      <div class="outliner-menu-item" data-action="collapse-children">Collapse All</div>
      <div class="outliner-menu-item" data-action="expand-children">Expand All</div>
      <div class="outliner-menu-divider"></div>
      <div class="outliner-menu-item" data-action="collapse-all">Collapse All in Document</div>
      <div class="outliner-menu-item" data-action="expand-all">Expand All in Document</div>
    `;

    menu.addEventListener('click', (e) => {
      const item = e.target.closest('.outliner-menu-item');
      if (!item) return;

      const action = item.dataset.action;
      handleContextMenuAction(action);
      hideContextMenu();
    });

    document.body.appendChild(menu);
    contextMenu = menu;
    return menu;
  }

  // Show context menu at position
  function showContextMenu(x, y, target) {
    const menu = createContextMenu();
    contextMenuTarget = target;

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.add('visible');

    // Adjust if menu goes off screen
    setTimeout(() => {
      const rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menu.style.left = (x - rect.width) + 'px';
      }
      if (rect.bottom > window.innerHeight) {
        menu.style.top = (y - rect.height) + 'px';
      }
    }, 0);
  }

  // Hide context menu
  function hideContextMenu() {
    if (contextMenu) {
      contextMenu.classList.remove('visible');
    }
    contextMenuTarget = null;
  }

  // Handle context menu actions
  function handleContextMenuAction(action) {
    if (!contextMenuTarget) return;

    const isHeading = contextMenuTarget.classList.contains('outliner-heading');

    switch (action) {
      case 'collapse-children':
        if (isHeading) {
          collapseChildrenHeadings(contextMenuTarget);
        } else {
          collapseChildrenLists(contextMenuTarget);
        }
        break;
      case 'expand-children':
        if (isHeading) {
          expandChildrenHeadings(contextMenuTarget);
        } else {
          expandChildrenLists(contextMenuTarget);
        }
        break;
      case 'collapse-all':
        collapseAll();
        break;
      case 'expand-all':
        expandAll();
        break;
    }
  }

  // Collapse all child headings under a heading
  function collapseChildrenHeadings(heading) {
    // Collapse the heading itself
    toggleHeading(heading, true);

    // Collapse all child headings and list items
    const content = getCollapsibleContent(heading);
    content.forEach(el => {
      if (el.tagName.match(/^H[1-6]$/) && el.classList.contains('outliner-heading')) {
        toggleHeading(el, true);
      }
    });

    // Also collapse all list items within this heading's content
    content.forEach(el => {
      const listItems = el.querySelectorAll ? el.querySelectorAll('.outliner-list-item') : [];
      listItems.forEach(item => toggleListItem(item, true));
    });
  }

  // Expand all child headings under a heading
  function expandChildrenHeadings(heading) {
    // Expand the heading itself
    toggleHeading(heading, false);

    // Expand all child headings
    const content = getCollapsibleContent(heading);
    content.forEach(el => {
      if (el.tagName.match(/^H[1-6]$/) && el.classList.contains('outliner-heading')) {
        toggleHeading(el, false);
      }
    });

    // Also expand all list items within this heading's content
    content.forEach(el => {
      const listItems = el.querySelectorAll ? el.querySelectorAll('.outliner-list-item') : [];
      listItems.forEach(item => toggleListItem(item, false));
    });
  }

  // Collapse all child list items under a list item
  function collapseChildrenLists(listItem) {
    // Collapse the list item itself
    toggleListItem(listItem, true);

    // Collapse all nested children
    const nested = listItem.querySelectorAll('.outliner-list-item');
    nested.forEach(item => toggleListItem(item, true));
  }

  // Expand all child list items under a list item
  function expandChildrenLists(listItem) {
    // Expand the list item itself
    toggleListItem(listItem, false);

    // Expand all nested children
    const nested = listItem.querySelectorAll('.outliner-list-item');
    nested.forEach(item => toggleListItem(item, false));
  }

  // Toggle collapse state for a heading
  function toggleHeading(heading, forceState = null) {
    const key = getElementKey(heading);
    const toggle = heading.querySelector('.outliner-toggle');
    if (!toggle) return;

    const isCollapsed = forceState !== null ? forceState : !heading.classList.contains('collapsed');
    const content = getCollapsibleContent(heading);

    if (isCollapsed) {
      heading.classList.add('collapsed');
      toggle.textContent = '▶';
      toggle.setAttribute('aria-label', 'Expand');
      content.forEach(el => el.classList.add('outliner-hidden'));
      collapsedState[key] = true;
    } else {
      heading.classList.remove('collapsed');
      toggle.textContent = '▼';
      toggle.setAttribute('aria-label', 'Collapse');

      // When expanding, track which child headings are collapsed
      // so we don't show their content
      let skipUntil = null;
      content.forEach(el => {
        // If we're skipping content under a collapsed child heading
        if (skipUntil) {
          if (el.tagName.match(/^H[1-6]$/)) {
            const elLevel = parseInt(el.tagName.substring(1));
            const skipLevel = parseInt(skipUntil.tagName.substring(1));
            // Stop skipping when we reach a heading at same or higher level
            if (elLevel <= skipLevel) {
              skipUntil = null;
            }
          }
          // Don't show content that belongs to collapsed child heading
          if (skipUntil) return;
        }

        // If this is a collapsed child heading, start skipping its content
        if (el.tagName.match(/^H[1-6]$/) && el.classList.contains('collapsed')) {
          skipUntil = el;
          // Show the heading itself, but not its content
          el.classList.remove('outliner-hidden');
          return;
        }

        // Show this element
        el.classList.remove('outliner-hidden');
      });

      delete collapsedState[key];
    }

    saveState();
  }

  // Toggle collapse state for a list item
  function toggleListItem(listItem, forceState = null) {
    const key = getElementKey(listItem);
    const toggle = listItem.querySelector('.outliner-list-toggle');
    if (!toggle) return;

    const isCollapsed = forceState !== null ? forceState : !listItem.classList.contains('collapsed');
    const content = getNestedListContent(listItem);

    if (content.length === 0) return;

    if (isCollapsed) {
      listItem.classList.add('collapsed');
      toggle.textContent = '▶';
      toggle.setAttribute('aria-label', 'Expand');
      content.forEach(el => el.classList.add('outliner-hidden'));
      collapsedState[key] = true;
    } else {
      listItem.classList.remove('collapsed');
      toggle.textContent = '▼';
      toggle.setAttribute('aria-label', 'Collapse');
      content.forEach(el => el.classList.remove('outliner-hidden'));
      delete collapsedState[key];
    }

    saveState();
  }

  // Add toggle buttons to all headings
  function processHeadings() {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

    headings.forEach(heading => {
      // Skip if already processed
      if (heading.querySelector('.outliner-toggle')) return;

      // Skip headings inside list items - they'll be handled by list item toggles
      if (heading.closest('li')) return;

      const content = getCollapsibleContent(heading);
      if (content.length === 0) return;

      const key = getElementKey(heading);
      const isCollapsed = collapsedState[key] || false;
      const toggle = createToggleButton(isCollapsed);

      // Insert toggle at the beginning of the heading
      heading.insertBefore(toggle, heading.firstChild);
      heading.classList.add('outliner-heading');

      // Apply saved state
      if (isCollapsed) {
        heading.classList.add('collapsed');
        content.forEach(el => el.classList.add('outliner-hidden'));
      }

      // Add click handler
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleHeading(heading);
      });

      // Add context menu handler
      toggle.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e.pageX, e.pageY, heading);
      });
    });
  }

  // Add toggle buttons to list items with nested lists
  function processLists() {
    const listItems = document.querySelectorAll('li');

    listItems.forEach(listItem => {
      // Skip if already processed (check both direct child and inside heading)
      if (listItem.querySelector('.outliner-list-toggle')) return;

      const nested = getNestedListContent(listItem);
      if (nested.length === 0) return;

      const key = getElementKey(listItem);
      const isCollapsed = collapsedState[key] || false;
      const toggle = createToggleButton(isCollapsed);

      toggle.classList.add('outliner-list-toggle');

      // If the list item starts with a heading, insert toggle inside the heading
      // Otherwise, insert at the beginning of the list item
      const firstElement = listItem.firstElementChild;
      if (firstElement && firstElement.tagName.match(/^H[1-6]$/)) {
        firstElement.insertBefore(toggle, firstElement.firstChild);
      } else {
        listItem.insertBefore(toggle, listItem.firstChild);
      }

      listItem.classList.add('outliner-list-item');

      // Apply saved state
      if (isCollapsed) {
        listItem.classList.add('collapsed');
        nested.forEach(el => el.classList.add('outliner-hidden'));
      }

      // Add click handler
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleListItem(listItem);
      });

      // Add context menu handler
      toggle.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e.pageX, e.pageY, listItem);
      });
    });
  }

  // Collapse all sections
  function collapseAll() {
    document.querySelectorAll('.outliner-heading').forEach(heading => {
      toggleHeading(heading, true);
    });
    document.querySelectorAll('.outliner-list-item').forEach(listItem => {
      toggleListItem(listItem, true);
    });
  }

  // Expand all sections
  function expandAll() {
    document.querySelectorAll('.outliner-heading').forEach(heading => {
      toggleHeading(heading, false);
    });
    document.querySelectorAll('.outliner-list-item').forEach(listItem => {
      toggleListItem(listItem, false);
    });
  }

  // Initialize the outliner
  function init() {
    loadState();
    processHeadings();
    processLists();
  }

  // Expose functions for external control (for command palette integration and testing)
  window.markdownOutliner = {
    collapseAll,
    expandAll,
    refresh: init,
    // Internal functions exposed for testing
    _test: {
      processHeadings,
      processLists,
      toggleHeading,
      toggleListItem,
      getElementKey,
      getCollapsibleContent,
      getNestedListContent
    }
  };

  // Auto-initialize only if not in test mode
  if (typeof window !== 'undefined' && !window.MARKDOWN_OUTLINER_TEST_MODE) {
    // Hide context menu when clicking elsewhere
    document.addEventListener('click', () => {
      hideContextMenu();
    });

    // Run on initial load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    // Re-run when content changes (for dynamic updates)
    const observer = new MutationObserver(() => {
      processHeadings();
      processLists();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
})();
