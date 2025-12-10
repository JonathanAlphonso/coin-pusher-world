/**
 * UI Hitbox Overlap & Touch Target Tests
 * Tests UI elements per design spec section 11.3
 *
 * Requirements:
 * - No overlapping interactive/text elements
 * - Minimum tap target size (44-48px) on mobile
 * - Tests on both desktop and mobile viewports
 *
 * Run with: node test-ui-hitbox.js
 */

import { chromium } from 'playwright';

const TEST_TIMEOUT = 60000; // 60 seconds max

// Viewport configurations
const VIEWPORTS = {
  desktop: { width: 1280, height: 720, name: 'Desktop (1280x720)' },
  tablet: { width: 768, height: 1024, name: 'Tablet (768x1024)' },
  mobile: { width: 375, height: 667, name: 'Mobile (375x667)' },
  oldAndroid: { width: 800, height: 480, name: 'Old Android (800x480)' },
};

// Minimum tap target size (CSS pixels)
const MIN_TAP_TARGET = 44;

// Tolerance for overlap detection (pixels)
const OVERLAP_TOLERANCE = 2;

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

async function runTest(name, testFn, timeout = 30000) {
  console.log(`\n🧪 Testing: ${name}`);

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Test timeout after ${timeout}ms`)), timeout)
    );

    await Promise.race([testFn(), timeoutPromise]);

    console.log(`✅ PASSED: ${name}`);
    testResults.passed++;
    return true;
  } catch (error) {
    console.error(`❌ FAILED: ${name}`);
    console.error(`   Error: ${error.message}`);
    testResults.failed++;
    testResults.errors.push({ test: name, error: error.message });
    return false;
  }
}

/**
 * Get bounding boxes for all interactive and text elements
 */
async function getElementBoundingBoxes(page) {
  return await page.evaluate(() => {
    const elements = [];

    // Selectors for interactive elements
    const interactiveSelectors = [
      'button',
      'a',
      'input',
      '[role="button"]',
      '[onclick]',
      '.clickable',
    ];

    // Selectors for text/display elements
    const textSelectors = [
      '.score',
      '.queue-display',
      '.expansion-display',
      '#score-value',
      '#queue-value',
      '#expansion-value',
      '.ui-label',
      '.message',
    ];

    const allSelectors = [...new Set([...interactiveSelectors, ...textSelectors])];

    allSelectors.forEach(selector => {
      const els = document.querySelectorAll(selector);
      els.forEach(el => {
        // Skip hidden elements
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return;
        }

        const rect = el.getBoundingClientRect();

        // Only include elements with non-zero dimensions
        if (rect.width > 0 && rect.height > 0) {
          elements.push({
            selector: selector,
            id: el.id || '',
            class: el.className || '',
            text: el.textContent?.trim().substring(0, 30) || '',
            rect: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              left: rect.left,
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
            },
            isInteractive: interactiveSelectors.includes(selector),
            isButton: el.tagName === 'BUTTON' || el.getAttribute('role') === 'button',
          });
        }
      });
    });

    return elements;
  });
}

/**
 * Check if two rectangles overlap
 */
function rectanglesOverlap(rect1, rect2, tolerance = 0) {
  return !(
    rect1.right - tolerance < rect2.left + tolerance ||
    rect1.left + tolerance > rect2.right - tolerance ||
    rect1.bottom - tolerance < rect2.top + tolerance ||
    rect1.top + tolerance > rect2.bottom - tolerance
  );
}

/**
 * Get the shortest dimension of a rectangle
 */
function getShortestDimension(rect) {
  return Math.min(rect.width, rect.height);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   UI Hitbox Overlap & Touch Target Tests');
  console.log('   Design Spec Section 11.3');
  console.log('═══════════════════════════════════════════════════════\n');

  const startTime = Date.now();
  let browser;

  try {
    // Launch browser
    console.log('🚀 Launching browser...');
    browser = await chromium.launch({ headless: true });

    // Test each viewport
    for (const [key, viewport] of Object.entries(VIEWPORTS)) {
      console.log(`\n📱 Testing viewport: ${viewport.name}`);

      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height }
      });
      const page = await context.newPage();
      page.setDefaultTimeout(30000);

      // Navigate to game
      await page.goto('http://localhost:3003', { waitUntil: 'networkidle' });

      // Wait for UI to initialize
      await page.waitForFunction(() => typeof UI !== 'undefined', { timeout: 10000 });
      await page.waitForTimeout(500); // Let UI settle

      // Test: Get all UI elements
      await runTest(`[${viewport.name}] UI elements are visible`, async () => {
        const elements = await getElementBoundingBoxes(page);

        if (elements.length === 0) {
          throw new Error('No UI elements found');
        }

        console.log(`   Found ${elements.length} UI elements`);
      });

      // Test: No overlapping elements
      await runTest(`[${viewport.name}] No overlapping UI elements`, async () => {
        const elements = await getElementBoundingBoxes(page);
        const overlaps = [];

        for (let i = 0; i < elements.length; i++) {
          for (let j = i + 1; j < elements.length; j++) {
            const el1 = elements[i];
            const el2 = elements[j];

            if (rectanglesOverlap(el1.rect, el2.rect, OVERLAP_TOLERANCE)) {
              overlaps.push({
                element1: `${el1.selector} (${el1.id || el1.class})`,
                element2: `${el2.selector} (${el2.id || el2.class})`,
                el1Rect: el1.rect,
                el2Rect: el2.rect,
              });
            }
          }
        }

        if (overlaps.length > 0) {
          console.log(`   Found ${overlaps.length} overlapping pairs:`);
          overlaps.slice(0, 3).forEach(overlap => {
            console.log(`     • ${overlap.element1} ↔ ${overlap.element2}`);
          });
          throw new Error(`Found ${overlaps.length} overlapping UI elements`);
        }

        console.log(`   All ${elements.length} elements have no overlaps`);
      });

      // Test: Minimum tap target size (mobile/tablet only)
      if (key === 'mobile' || key === 'tablet' || key === 'oldAndroid') {
        await runTest(`[${viewport.name}] Interactive elements meet minimum tap target`, async () => {
          const elements = await getElementBoundingBoxes(page);
          const interactive = elements.filter(el => el.isInteractive);
          const tooSmall = [];

          interactive.forEach(el => {
            const shortestSide = getShortestDimension(el.rect);
            if (shortestSide < MIN_TAP_TARGET) {
              tooSmall.push({
                element: `${el.selector} (${el.id || el.class})`,
                size: `${Math.round(el.rect.width)}x${Math.round(el.rect.height)}`,
                shortestSide: Math.round(shortestSide),
              });
            }
          });

          if (tooSmall.length > 0) {
            console.log(`   Found ${tooSmall.length} elements below ${MIN_TAP_TARGET}px:`);
            tooSmall.forEach(item => {
              console.log(`     • ${item.element}: ${item.size} (shortest: ${item.shortestSide}px)`);
            });
            throw new Error(`Found ${tooSmall.length} interactive elements below minimum tap target size`);
          }

          console.log(`   All ${interactive.length} interactive elements meet ${MIN_TAP_TARGET}px minimum`);
        });
      }

      // Test: Buttons are properly sized
      await runTest(`[${viewport.name}] Buttons have reasonable dimensions`, async () => {
        const elements = await getElementBoundingBoxes(page);
        const buttons = elements.filter(el => el.isButton);
        const issues = [];

        buttons.forEach(btn => {
          // Check if button is too small
          if (btn.rect.width < 30 || btn.rect.height < 20) {
            issues.push({
              button: `${btn.id || btn.class}`,
              issue: 'Too small',
              size: `${Math.round(btn.rect.width)}x${Math.round(btn.rect.height)}`,
            });
          }

          // Check if button is unreasonably large (likely a bug)
          if (btn.rect.width > viewport.width * 0.9 || btn.rect.height > viewport.height * 0.9) {
            issues.push({
              button: `${btn.id || btn.class}`,
              issue: 'Unreasonably large',
              size: `${Math.round(btn.rect.width)}x${Math.round(btn.rect.height)}`,
            });
          }
        });

        if (issues.length > 0) {
          console.log(`   Found ${issues.length} button sizing issues:`);
          issues.forEach(item => {
            console.log(`     • ${item.button}: ${item.issue} (${item.size})`);
          });
          throw new Error(`Found ${issues.length} button sizing issues`);
        }

        console.log(`   All ${buttons.length} buttons have reasonable dimensions`);
      });

      // Test: Elements are within viewport
      await runTest(`[${viewport.name}] All elements within viewport bounds`, async () => {
        const elements = await getElementBoundingBoxes(page);
        const outsideViewport = [];

        elements.forEach(el => {
          const rect = el.rect;

          // Check if element extends beyond viewport
          if (rect.left < -10 || rect.top < -10 ||
              rect.right > viewport.width + 10 ||
              rect.bottom > viewport.height + 10) {
            outsideViewport.push({
              element: `${el.selector} (${el.id || el.class})`,
              position: `(${Math.round(rect.left)}, ${Math.round(rect.top)})`,
              size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
            });
          }
        });

        if (outsideViewport.length > 0) {
          console.log(`   Found ${outsideViewport.length} elements outside viewport:`);
          outsideViewport.slice(0, 3).forEach(item => {
            console.log(`     • ${item.element} at ${item.position}`);
          });
          throw new Error(`Found ${outsideViewport.length} elements outside viewport`);
        }

        console.log(`   All ${elements.length} elements within viewport`);
      });

      await context.close();
    }

  } catch (error) {
    console.error('\n💥 Fatal test error:', error.message);
    testResults.errors.push({ test: 'Test suite setup', error: error.message });
    testResults.failed++;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Print results
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('                    TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏱️  Duration: ${duration}s`);

  if (testResults.errors.length > 0) {
    console.log('\n📋 Failed Tests:');
    testResults.errors.forEach(err => {
      console.log(`   • ${err.test}: ${err.error}`);
    });
  }

  console.log('═══════════════════════════════════════════════════════\n');

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run with global timeout
const globalTimeout = setTimeout(() => {
  console.error('\n⏰ Global test timeout - tests took too long!');
  process.exit(1);
}, TEST_TIMEOUT);

main().finally(() => {
  clearTimeout(globalTimeout);
});
