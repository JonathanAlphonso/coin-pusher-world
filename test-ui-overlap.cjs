/**
 * UI Overlap Test
 * Tests that UI buttons and interface elements don't overlap each other
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PORT = 3002;

// Define UI elements to test for overlaps
const UI_ELEMENTS = [
  // Top-right buttons (stacked vertically)
  { id: 'stats-button', group: 'top-right-stack' },
  { id: 'combat-button', group: 'top-right-stack' },
  { id: 'run-button', group: 'top-right-stack' },

  // Top-bar buttons (horizontal row)
  { id: 'settings-button', group: 'top-bar' },
  { id: 'help-button', group: 'top-bar' },
  { id: 'unlock-shop-button', group: 'top-bar' },
  { id: 'run-history-button', group: 'top-bar' },

  // Bottom center buttons
  { id: 'drop-button', group: 'bottom-center' },
  { id: 'auto-drop-button', group: 'bottom-center' },
  { id: 'speed-button', group: 'bottom-center' },

  // HUD elements
  { id: 'ui-overlay', group: 'top-left' },
  { id: 'score-display', group: 'hud' },
  { id: 'queue-display', group: 'hud' },
  { id: 'expansion-display', group: 'hud' },
  { id: 'gold-display', group: 'hud' },
  { id: 'tier-progress-container', group: 'hud' },

  // Dynamic elements
  { id: 'combo-container', group: 'center-top' },
  { id: 'jackpot-container', group: 'top-right-area' },
];

// Elements that can overlap (parent-child relationships)
const ALLOWED_OVERLAPS = [
  ['ui-overlay', 'score-display'],
  ['ui-overlay', 'queue-display'],
  ['ui-overlay', 'expansion-display'],
  ['ui-overlay', 'gold-display'],
  ['ui-overlay', 'tier-progress-container'],
];

function rectsOverlap(rect1, rect2) {
  // Playwright boundingBox uses x/y/width/height, convert to edges
  const r1 = {
    left: rect1.x,
    right: rect1.x + rect1.width,
    top: rect1.y,
    bottom: rect1.y + rect1.height
  };
  const r2 = {
    left: rect2.x,
    right: rect2.x + rect2.width,
    top: rect2.y,
    bottom: rect2.y + rect2.height
  };

  // Check if two rectangles overlap
  return !(
    r1.right <= r2.left ||
    r1.left >= r2.right ||
    r1.bottom <= r2.top ||
    r1.top >= r2.bottom
  );
}

function getOverlapArea(rect1, rect2) {
  // Convert to edges
  const r1 = {
    left: rect1.x,
    right: rect1.x + rect1.width,
    top: rect1.y,
    bottom: rect1.y + rect1.height
  };
  const r2 = {
    left: rect2.x,
    right: rect2.x + rect2.width,
    top: rect2.y,
    bottom: rect2.y + rect2.height
  };

  if (!rectsOverlap(rect1, rect2)) return 0;

  const overlapLeft = Math.max(r1.left, r2.left);
  const overlapRight = Math.min(r1.right, r2.right);
  const overlapTop = Math.max(r1.top, r2.top);
  const overlapBottom = Math.min(r1.bottom, r2.bottom);

  return (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
}

function isAllowedOverlap(id1, id2) {
  return ALLOWED_OVERLAPS.some(
    ([a, b]) => (a === id1 && b === id2) || (a === id2 && b === id1)
  );
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('UI OVERLAP TEST');
  console.log('='.repeat(60));
  console.log('');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;
  const failures = [];

  // Test at multiple viewport sizes
  const viewports = [
    { name: 'Desktop (1280x720)', width: 1280, height: 720 },
    { name: 'Tablet (768x1024)', width: 768, height: 1024 },
    { name: 'Mobile (375x667)', width: 375, height: 667 },
    { name: 'Small Mobile (360x640)', width: 360, height: 640 },
    { name: 'Very Small (320x568)', width: 320, height: 568 },
  ];

  for (const viewport of viewports) {
    console.log(`\nTesting viewport: ${viewport.name}`);
    console.log('-'.repeat(40));

    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    try {
      await page.goto(`http://localhost:${PORT}?mute`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for UI to be ready
      await page.waitForSelector('#drop-button', { timeout: 10000 });

      // Click start to dismiss start screen
      const startButton = await page.$('#start-button');
      if (startButton && await startButton.isVisible()) {
        await startButton.click();
        await page.waitForTimeout(500);
      }

      // Get bounding boxes for all visible elements
      const elementRects = [];

      for (const element of UI_ELEMENTS) {
        const el = await page.$(`#${element.id}`);
        if (el) {
          const isVisible = await el.isVisible();
          if (isVisible) {
            const rect = await el.boundingBox();
            if (rect) {
              elementRects.push({
                id: element.id,
                group: element.group,
                rect: rect
              });
            }
          }
        }
      }

      console.log(`  Found ${elementRects.length} visible UI elements`);

      // Check for overlaps between elements
      let viewportOverlaps = [];

      for (let i = 0; i < elementRects.length; i++) {
        for (let j = i + 1; j < elementRects.length; j++) {
          const el1 = elementRects[i];
          const el2 = elementRects[j];

          // Skip allowed overlaps
          if (isAllowedOverlap(el1.id, el2.id)) continue;

          const overlap = rectsOverlap(el1.rect, el2.rect);
          if (overlap) {
            const overlapArea = getOverlapArea(el1.rect, el2.rect);
            // Only report significant overlaps (more than 10 pixels)
            if (overlapArea > 10) {
              viewportOverlaps.push({
                element1: el1.id,
                element2: el2.id,
                overlapArea: Math.round(overlapArea),
                rect1: el1.rect,
                rect2: el2.rect
              });
            }
          }
        }
      }

      if (viewportOverlaps.length === 0) {
        console.log(`  [PASS] No overlaps detected`);
        passed++;
      } else {
        console.log(`  [FAIL] ${viewportOverlaps.length} overlap(s) detected:`);
        for (const overlap of viewportOverlaps) {
          console.log(`    - ${overlap.element1} overlaps ${overlap.element2} (${overlap.overlapArea}px^2)`);
          console.log(`      ${overlap.element1}: x=${Math.round(overlap.rect1.x)}, y=${Math.round(overlap.rect1.y)}, w=${Math.round(overlap.rect1.width)}, h=${Math.round(overlap.rect1.height)}`);
          console.log(`      ${overlap.element2}: x=${Math.round(overlap.rect2.x)}, y=${Math.round(overlap.rect2.y)}, w=${Math.round(overlap.rect2.width)}, h=${Math.round(overlap.rect2.height)}`);
        }
        failed++;
        failures.push({
          viewport: viewport.name,
          overlaps: viewportOverlaps
        });
      }

      // Additional check: elements going off-screen
      const offScreenElements = elementRects.filter(el => {
        const right = el.rect.x + el.rect.width;
        const bottom = el.rect.y + el.rect.height;
        return el.rect.x < 0 ||
               el.rect.y < 0 ||
               right > viewport.width ||
               bottom > viewport.height;
      });

      if (offScreenElements.length > 0) {
        console.log(`  [WARN] ${offScreenElements.length} element(s) partially off-screen:`);
        for (const el of offScreenElements) {
          console.log(`    - ${el.id}: x=${Math.round(el.rect.x)}, y=${Math.round(el.rect.y)}, w=${Math.round(el.rect.width)}, h=${Math.round(el.rect.height)}`);
          failed++;
          failures.push({
            viewport: viewport.name,
            overlaps: [{ element1: el.id, element2: 'viewport-boundary', overlapArea: 0 }]
          });
        }
      }

      // Print all element positions for debugging
      if (process.argv.includes('--verbose')) {
        console.log(`  Element positions:`);
        for (const el of elementRects) {
          const right = viewport.width - el.rect.x - el.rect.width;
          console.log(`    ${el.id}: left=${Math.round(el.rect.x)}, top=${Math.round(el.rect.y)}, w=${Math.round(el.rect.width)}, h=${Math.round(el.rect.height)}, right=${Math.round(right)}`);
        }
      }

      // Take screenshot for first viewport
      if (viewport.name === 'Desktop (1280x720)') {
        await page.screenshot({ path: 'ui-overlap-desktop.png', fullPage: false });
        console.log(`  Screenshot saved: ui-overlap-desktop.png`);
      }

      // Check for minimum touch target sizes on mobile
      if (viewport.width < 500) {
        const smallTouchTargets = elementRects.filter(el => {
          const isTappable = el.id.includes('button') || el.id === 'drop-button';
          return isTappable && (el.rect.width < 44 || el.rect.height < 44);
        });

        if (smallTouchTargets.length > 0) {
          console.log(`  [WARN] ${smallTouchTargets.length} button(s) below 44px minimum touch target:`);
          for (const el of smallTouchTargets) {
            console.log(`    - ${el.id}: ${Math.round(el.rect.width)}x${Math.round(el.rect.height)}px`);
          }
        }
      }

    } catch (error) {
      console.log(`  [ERROR] ${error.message}`);
      failed++;
    }
  }

  await browser.close();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Viewports tested: ${viewports.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failures.length > 0) {
    console.log('\nDETAILED FAILURES:');
    for (const failure of failures) {
      console.log(`\n  ${failure.viewport}:`);
      for (const overlap of failure.overlaps) {
        console.log(`    ${overlap.element1} <-> ${overlap.element2}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));

  return failed === 0;
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });
