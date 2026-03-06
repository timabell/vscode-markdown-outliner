// Markdown Outliner - Client-side script for collapsible sections
(function () {
  'use strict';

  const STORAGE_KEY = 'markdown-outliner-state';
  let collapsedState = {};

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
      if (next.tagName.match(/^H[1-6]$/)) {
        const nextLevel = parseInt(next.tagName.substring(1));
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
      content.forEach(el => el.classList.remove('outliner-hidden'));
      delete collapsedState[key];
    }

    saveState();
  }

  // Toggle collapse state for a list item
  function toggleListItem(listItem, forceState = null) {
    const key = getElementKey(listItem);
    const toggle = listItem.querySelector('.outliner-toggle');
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
    });
  }

  // Add toggle buttons to list items with nested lists
  function processLists() {
    const listItems = document.querySelectorAll('li');

    listItems.forEach(listItem => {
      // Skip if already processed
      if (listItem.querySelector(':scope > .outliner-toggle')) return;

      const nested = getNestedListContent(listItem);
      if (nested.length === 0) return;

      const key = getElementKey(listItem);
      const isCollapsed = collapsedState[key] || false;
      const toggle = createToggleButton(isCollapsed);

      toggle.classList.add('outliner-list-toggle');

      // Find the first text node or inline element to insert before
      let insertPoint = listItem.firstChild;
      while (insertPoint && insertPoint.nodeType !== Node.TEXT_NODE && !insertPoint.textContent.trim()) {
        insertPoint = insertPoint.nextSibling;
      }

      if (insertPoint) {
        listItem.insertBefore(toggle, insertPoint);
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

  // Expose functions for external control (for command palette integration)
  window.markdownOutliner = {
    collapseAll,
    expandAll,
    refresh: init
  };
})();
