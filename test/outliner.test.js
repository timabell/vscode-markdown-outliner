/**
 * Markdown Outliner Tests
 * Simple, lightweight tests focused on user-facing behavior and regression protection
 */

const fs = require('fs');
const path = require('path');

// Read the outliner script
const scriptPath = path.join(__dirname, '../media/outliner.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Shared mock storage that persists across test document setups
const mockStorage = {};

// Helper to create test HTML and initialize outliner
function setupTestDocument(html, clearStorage = true) {
  // Reset document
  document.body.innerHTML = html;
  document.head.innerHTML = '';

  // Clear previous outliner instance and script
  if (window.markdownOutliner) {
    delete window.markdownOutliner;
  }

  // Remove any existing outliner scripts
  document.querySelectorAll('script').forEach(s => s.remove());

  // Enable test mode to prevent auto-initialization
  window.MARKDOWN_OUTLINER_TEST_MODE = true;

  // Optionally clear storage
  if (clearStorage) {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  }

  // Mock localStorage (reuse same storage object)
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, value) => { mockStorage[key] = value.toString(); },
      clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
      removeItem: (key) => { delete mockStorage[key]; }
    },
    writable: true,
    configurable: true
  });

  // Execute script
  const script = document.createElement('script');
  script.textContent = scriptContent;
  document.head.appendChild(script);

  // Manually initialize
  window.markdownOutliner.refresh();
}

// Helper to simulate user clicking an element
function click(element) {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
  element.dispatchEvent(event);
}

// Helper to get toggle button for a heading
function getHeadingToggle(heading) {
  return heading.querySelector('.outliner-toggle');
}

// Helper to get toggle button for a list item
function getListToggle(listItem) {
  return listItem.querySelector('.outliner-list-toggle');
}

// Helper to check if element is hidden
function isHidden(element) {
  return element.classList.contains('outliner-hidden');
}

// Helper to check if element is collapsed
function isCollapsed(element) {
  return element.classList.contains('collapsed');
}

describe('Markdown Outliner - Core User Behaviors', () => {
  test('heading toggle - click to collapse, click again to expand', () => {
    setupTestDocument(`
      <h1>Title</h1>
      <p id="content">Content paragraph</p>
      <h2>Next section</h2>
    `);

    const h1 = document.querySelector('h1');
    const content = document.getElementById('content');
    const toggle = getHeadingToggle(h1);

    expect(toggle).toBeTruthy();
    expect(isHidden(content)).toBe(false);

    // Click to collapse
    click(toggle);
    expect(isCollapsed(h1)).toBe(true);
    expect(isHidden(content)).toBe(true);
    expect(toggle.textContent).toBe('▶');

    // Click to expand
    click(toggle);
    expect(isCollapsed(h1)).toBe(false);
    expect(isHidden(content)).toBe(false);
    expect(toggle.textContent).toBe('▼');
  });

  test('list item toggle - click to collapse nested list', () => {
    setupTestDocument(`
      <ul>
        <li id="parent">Parent
          <ul id="nested">
            <li>Child 1</li>
            <li>Child 2</li>
          </ul>
        </li>
      </ul>
    `);

    const parentLi = document.getElementById('parent');
    const nestedList = document.getElementById('nested');
    const toggle = getListToggle(parentLi);

    expect(toggle).toBeTruthy();
    expect(isHidden(nestedList)).toBe(false);

    // Click to collapse
    click(toggle);
    expect(isCollapsed(parentLi)).toBe(true);
    expect(isHidden(nestedList)).toBe(true);

    // Click to expand
    click(toggle);
    expect(isCollapsed(parentLi)).toBe(false);
    expect(isHidden(nestedList)).toBe(false);
  });

  test('collapse state persists across page reload', () => {
    setupTestDocument(`
      <h1>Title</h1>
      <p id="content">Content</p>
    `);

    const h1 = document.querySelector('h1');
    const toggle = getHeadingToggle(h1);

    // Collapse and verify state is saved
    click(toggle);
    expect(isCollapsed(h1)).toBe(true);

    // Simulate reload by re-initializing with same HTML (don't clear storage)
    setupTestDocument(`
      <h1>Title</h1>
      <p id="content">Content</p>
    `, false);

    const h1After = document.querySelector('h1');
    const contentAfter = document.getElementById('content');

    expect(isCollapsed(h1After)).toBe(true);
    expect(isHidden(contentAfter)).toBe(true);
  });

  test('expand all makes everything visible', () => {
    setupTestDocument(`
      <h1>H1</h1>
      <p id="p1">Content 1</p>
      <h2>H2</h2>
      <p id="p2">Content 2</p>
    `);

    const h1 = document.querySelector('h1');
    const h2 = document.querySelector('h2');
    const toggle1 = getHeadingToggle(h1);
    const toggle2 = getHeadingToggle(h2);

    // Collapse both
    click(toggle1);
    click(toggle2);
    expect(isCollapsed(h1)).toBe(true);
    expect(isCollapsed(h2)).toBe(true);

    // Expand all
    window.markdownOutliner.expandAll();

    expect(isCollapsed(h1)).toBe(false);
    expect(isCollapsed(h2)).toBe(false);
    expect(isHidden(document.getElementById('p1'))).toBe(false);
    expect(isHidden(document.getElementById('p2'))).toBe(false);
  });

  test('collapse all hides everything', () => {
    setupTestDocument(`
      <h1>H1</h1>
      <p id="p1">Content 1</p>
      <h2>H2</h2>
      <p id="p2">Content 2</p>
    `);

    // All should be expanded initially
    const p1 = document.getElementById('p1');
    const p2 = document.getElementById('p2');
    expect(isHidden(p1)).toBe(false);
    expect(isHidden(p2)).toBe(false);

    // Collapse all
    window.markdownOutliner.collapseAll();

    const h1 = document.querySelector('h1');
    const h2 = document.querySelector('h2');
    expect(isCollapsed(h1)).toBe(true);
    expect(isCollapsed(h2)).toBe(true);
    expect(isHidden(p1)).toBe(true);
    expect(isHidden(p2)).toBe(true);
  });

  test('nested headings collapse with parent', () => {
    setupTestDocument(`
      <h1>Parent</h1>
      <p id="p1">Parent content</p>
      <h2 id="child">Child</h2>
      <p id="p2">Child content</p>
      <h1>Next section</h1>
    `);

    const parent = document.querySelector('h1');
    const toggle = getHeadingToggle(parent);

    // Collapse parent
    click(toggle);

    const childHeading = document.getElementById('child');
    const p1 = document.getElementById('p1');
    const p2 = document.getElementById('p2');

    expect(isCollapsed(parent)).toBe(true);
    expect(isHidden(childHeading)).toBe(true);
    expect(isHidden(p1)).toBe(true);
    expect(isHidden(p2)).toBe(true);
  });
});

describe('Markdown Outliner - Regression Protection', () => {
  test('empty document does not crash', () => {
    expect(() => setupTestDocument('')).not.toThrow();
  });

  test.skip('heading with no content gets no toggle button', () => {
    setupTestDocument(`
      <h1>First</h1>
      <h2>Second immediately after</h2>
      <p>Content</p>
    `);

    const h1 = document.querySelector('h1');
    const toggle = getHeadingToggle(h1);

    expect(toggle).toBeFalsy();
  });

  test('corrupted localStorage does not crash', () => {
    // Set up corrupted data before initialization
    document.body.innerHTML = '<h1>Title</h1><p>Content</p>';
    document.head.innerHTML = '';

    window.MARKDOWN_OUTLINER_TEST_MODE = true;

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => '{invalid json',
        setItem: () => {},
        clear: () => {},
        removeItem: () => {}
      },
      writable: true,
      configurable: true
    });

    const script = document.createElement('script');
    script.textContent = scriptContent;

    expect(() => {
      document.head.appendChild(script);
      window.markdownOutliner.refresh();
    }).not.toThrow();

    const h1 = document.querySelector('h1');
    const toggle = getHeadingToggle(h1);
    expect(toggle).toBeTruthy();
  });

  test('headings inside list items are not double-processed', () => {
    setupTestDocument(`
      <ul>
        <li>
          <h2 id="heading-in-list">Heading in list</h2>
          <p>Content</p>
        </li>
      </ul>
    `);

    const heading = document.getElementById('heading-in-list');
    const headingToggle = getHeadingToggle(heading);

    // Heading should not get its own toggle (handled by list item)
    expect(headingToggle).toBeFalsy();
  });

  test('list item without nested content gets no toggle', () => {
    setupTestDocument(`
      <ul>
        <li id="simple">Just text</li>
      </ul>
    `);

    const li = document.getElementById('simple');
    const toggle = getListToggle(li);

    expect(toggle).toBeFalsy();
  });

  test('deeply nested structure does not crash', () => {
    expect(() => {
      setupTestDocument(`
        <h1>L1</h1>
        <h2>L2</h2>
        <h3>L3</h3>
        <h4>L4</h4>
        <h5>L5</h5>
        <h6>L6</h6>
        <p>Deep content</p>
      `);
    }).not.toThrow();
  });
});
