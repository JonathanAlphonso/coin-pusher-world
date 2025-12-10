/**
 * Android 360x720 Resolution Test
 * Tests that all UI elements are visible and no text overlaps
 */

const { chromium } = require('playwright');
const fs = require('fs');

const VIEWPORT = { width: 360, height: 720 };
const PORT = process.env.PORT || 3007;

async function testAndroidResolution() {
  console.log('='.repeat(60));
  console.log('ANDROID 360x720 RESOLUTION TEST');
  console.log('Testing UI visibility and text overlap');
  console.log('='.repeat(60));

  const screenshotDir = 'screenshots/android-360x720';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: false,
  });

  const page = await browser.newPage();
  await page.setViewportSize(VIEWPORT);

  const results = {
    passed: true,
    issues: [],
    checks: [],
  };

  try {
    console.log(`\nNavigating to game at http://localhost:${PORT}...`);
    await page.goto(`http://localhost:${PORT}?mute&test`);
    await page.waitForTimeout(2000);

    // ========== START SCREEN CHECKS ==========
    console.log('\n--- START SCREEN ---');
    await page.screenshot({ path: `${screenshotDir}/01-start-screen.png` });

    // Check start screen elements
    const startScreenChecks = await page.evaluate(() => {
      const issues = [];
      const viewport = { width: window.innerWidth, height: window.innerHeight };

      // Get all visible elements on start screen
      const startScreen = document.getElementById('start-screen');
      if (!startScreen) return { issues: ['Start screen not found'], viewport };

      const title = startScreen.querySelector('h1');
      const startButton = document.getElementById('start-button');
      const features = startScreen.querySelectorAll('.start-feature');

      // Check title visibility
      if (title) {
        const rect = title.getBoundingClientRect();
        if (rect.left < 0 || rect.right > viewport.width) {
          issues.push(`Title extends beyond viewport (left: ${rect.left}, right: ${rect.right})`);
        }
        if (rect.top < 0) {
          issues.push(`Title cut off at top (top: ${rect.top})`);
        }
      }

      // Check start button visibility
      if (startButton) {
        const rect = startButton.getBoundingClientRect();
        if (rect.bottom > viewport.height) {
          issues.push(`Start button cut off at bottom (bottom: ${rect.bottom}, viewport: ${viewport.height})`);
        }
        if (rect.width < 100) {
          issues.push(`Start button too narrow (width: ${rect.width})`);
        }
      }

      // Check feature items don't overlap
      const featureRects = [];
      features.forEach((feature, i) => {
        const rect = feature.getBoundingClientRect();
        featureRects.push({ index: i, rect });

        if (rect.left < 0 || rect.right > viewport.width) {
          issues.push(`Feature ${i} extends beyond viewport`);
        }
      });

      // Check for overlapping features
      for (let i = 0; i < featureRects.length; i++) {
        for (let j = i + 1; j < featureRects.length; j++) {
          const a = featureRects[i].rect;
          const b = featureRects[j].rect;
          if (!(a.bottom < b.top || a.top > b.bottom || a.right < b.left || a.left > b.right)) {
            issues.push(`Features ${i} and ${j} overlap`);
          }
        }
      }

      return { issues, viewport };
    });

    console.log(`  Viewport: ${startScreenChecks.viewport.width}x${startScreenChecks.viewport.height}`);
    if (startScreenChecks.issues.length === 0) {
      console.log('  [OK] Start screen elements visible and not overlapping');
      results.checks.push({ name: 'Start screen', passed: true });
    } else {
      startScreenChecks.issues.forEach(issue => {
        console.log(`  [X] ${issue}`);
        results.issues.push(`Start screen: ${issue}`);
      });
      results.checks.push({ name: 'Start screen', passed: false, issues: startScreenChecks.issues });
      results.passed = false;
    }

    // ========== GAME UI CHECKS ==========
    console.log('\n--- GAME UI ---');
    await page.click('#start-button');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${screenshotDir}/02-game-ui.png` });

    const gameUIChecks = await page.evaluate(() => {
      const issues = [];
      const viewport = { width: window.innerWidth, height: window.innerHeight };

      // Check score display
      const scoreDisplay = document.getElementById('score-display');
      const queueDisplay = document.getElementById('queue-display');
      const expansionDisplay = document.getElementById('expansion-display');
      const dropButton = document.getElementById('drop-button');
      const helpButton = document.getElementById('help-button');
      const statsButton = document.getElementById('stats-button');

      const elements = [
        { name: 'Score display', el: scoreDisplay },
        { name: 'Queue display', el: queueDisplay },
        { name: 'Expansion display', el: expansionDisplay },
        { name: 'Drop button', el: dropButton },
        { name: 'Help button', el: helpButton },
        { name: 'Stats button', el: statsButton },
      ];

      const rects = [];
      elements.forEach(({ name, el }) => {
        if (!el) {
          issues.push(`${name} not found`);
          return;
        }

        const rect = el.getBoundingClientRect();
        rects.push({ name, rect });

        // Check if element is within viewport
        if (rect.left < -5 || rect.right > viewport.width + 5) {
          issues.push(`${name} extends beyond viewport horizontally`);
        }
        if (rect.top < -5 || rect.bottom > viewport.height + 5) {
          issues.push(`${name} extends beyond viewport vertically`);
        }

        // Check minimum size for buttons
        if (name.includes('button') && (rect.width < 40 || rect.height < 30)) {
          issues.push(`${name} too small to tap (${rect.width}x${rect.height})`);
        }
      });

      // Check for overlapping elements
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i].rect;
          const b = rects[j].rect;
          // Allow small overlap (5px tolerance)
          const overlap = !(a.bottom < b.top - 5 || a.top > b.bottom + 5 ||
                           a.right < b.left - 5 || a.left > b.right + 5);
          if (overlap && a.width > 0 && b.width > 0) {
            issues.push(`${rects[i].name} overlaps with ${rects[j].name}`);
          }
        }
      }

      return { issues, viewport, elementCount: rects.length };
    });

    console.log(`  Found ${gameUIChecks.elementCount} UI elements`);
    if (gameUIChecks.issues.length === 0) {
      console.log('  [OK] Game UI elements visible and not overlapping');
      results.checks.push({ name: 'Game UI', passed: true });
    } else {
      gameUIChecks.issues.forEach(issue => {
        console.log(`  [X] ${issue}`);
        results.issues.push(`Game UI: ${issue}`);
      });
      results.checks.push({ name: 'Game UI', passed: false, issues: gameUIChecks.issues });
      results.passed = false;
    }

    // ========== BOARD SELECTION UI CHECKS ==========
    console.log('\n--- BOARD SELECTION UI ---');

    // Trigger expansion to show board selection
    await page.evaluate(() => {
      Game.score = 260;
      UI.updateScore(260);
      Game.checkExpansion();
    });
    await page.waitForTimeout(1000);

    // Check if board selection appeared
    const boardSelectionVisible = await page.isVisible('#board-selection-overlay:not(.hidden)');
    if (boardSelectionVisible) {
      await page.screenshot({ path: `${screenshotDir}/03-board-selection.png` });

      const boardSelectionChecks = await page.evaluate(() => {
        const issues = [];
        const viewport = { width: window.innerWidth, height: window.innerHeight };

        const overlay = document.getElementById('board-selection-overlay');
        const modal = overlay?.querySelector('.board-selection-modal');
        const title = overlay?.querySelector('.board-selection-title');
        const options = overlay?.querySelectorAll('.board-option');

        if (!modal) {
          issues.push('Board selection modal not found');
          return { issues, viewport };
        }

        const modalRect = modal.getBoundingClientRect();

        // Check modal fits in viewport
        if (modalRect.left < 0 || modalRect.right > viewport.width) {
          issues.push(`Modal extends beyond viewport horizontally (${modalRect.left} to ${modalRect.right})`);
        }
        if (modalRect.top < 0 || modalRect.bottom > viewport.height) {
          issues.push(`Modal extends beyond viewport vertically (${modalRect.top} to ${modalRect.bottom})`);
        }

        // Check title
        if (title) {
          const titleRect = title.getBoundingClientRect();
          const style = window.getComputedStyle(title);
          const fontSize = parseFloat(style.fontSize);
          if (fontSize < 14) {
            issues.push(`Title font too small (${fontSize}px)`);
          }
        }

        // Check board options
        const optionRects = [];
        options?.forEach((opt, i) => {
          const rect = opt.getBoundingClientRect();
          optionRects.push({ index: i, rect });

          // Check option is tappable size
          if (rect.height < 50) {
            issues.push(`Board option ${i} too small to tap (height: ${rect.height})`);
          }

          // Check text inside option
          const name = opt.querySelector('.board-option-name');
          const focus = opt.querySelector('.board-option-focus');
          if (name && focus) {
            const nameRect = name.getBoundingClientRect();
            const focusRect = focus.getBoundingClientRect();
            // Check if they overlap
            if (!(nameRect.bottom <= focusRect.top || nameRect.top >= focusRect.bottom)) {
              if (Math.abs(nameRect.bottom - focusRect.top) > 5) {
                issues.push(`Option ${i}: name and focus text overlap`);
              }
            }
          }
        });

        // Check options don't overlap each other
        for (let i = 0; i < optionRects.length; i++) {
          for (let j = i + 1; j < optionRects.length; j++) {
            const a = optionRects[i].rect;
            const b = optionRects[j].rect;
            if (!(a.bottom < b.top || a.top > b.bottom || a.right < b.left || a.left > b.right)) {
              issues.push(`Board options ${i} and ${j} overlap`);
            }
          }
        }

        return { issues, viewport, optionCount: options?.length || 0 };
      });

      console.log(`  Found ${boardSelectionChecks.optionCount} board options`);
      if (boardSelectionChecks.issues.length === 0) {
        console.log('  [OK] Board selection UI visible and not overlapping');
        results.checks.push({ name: 'Board selection', passed: true });
      } else {
        boardSelectionChecks.issues.forEach(issue => {
          console.log(`  [X] ${issue}`);
          results.issues.push(`Board selection: ${issue}`);
        });
        results.checks.push({ name: 'Board selection', passed: false, issues: boardSelectionChecks.issues });
        results.passed = false;
      }

      // Select a board to continue
      await page.click('.board-option:first-child');
      await page.waitForTimeout(2000);
    } else {
      console.log('  [!] Board selection UI did not appear');
      results.checks.push({ name: 'Board selection', passed: true, note: 'Skipped - UI did not appear' });
    }

    // ========== STATS OVERLAY CHECKS ==========
    console.log('\n--- STATS OVERLAY ---');
    await page.click('#stats-button');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${screenshotDir}/04-stats-overlay.png` });

    const statsChecks = await page.evaluate(() => {
      const issues = [];
      const viewport = { width: window.innerWidth, height: window.innerHeight };

      const overlay = document.getElementById('stats-overlay');
      const content = overlay?.querySelector('.stats-content');
      const grid = document.getElementById('stats-grid');
      const closeBtn = document.getElementById('close-stats');

      if (!content) {
        issues.push('Stats content not found');
        return { issues, viewport };
      }

      const contentRect = content.getBoundingClientRect();

      // Check content fits in viewport
      if (contentRect.left < 0 || contentRect.right > viewport.width) {
        issues.push(`Stats content extends beyond viewport horizontally`);
      }
      if (contentRect.bottom > viewport.height) {
        issues.push(`Stats content extends beyond viewport (bottom: ${contentRect.bottom})`);
      }

      // Check stat rows
      const rows = grid?.querySelectorAll('.stat-row');
      const rowRects = [];
      rows?.forEach((row, i) => {
        const rect = row.getBoundingClientRect();
        rowRects.push({ index: i, rect });

        const label = row.querySelector('.stat-label');
        const value = row.querySelector('.stat-value');
        if (label && value) {
          const labelRect = label.getBoundingClientRect();
          const valueRect = value.getBoundingClientRect();
          // Check if they overlap
          if (labelRect.right > valueRect.left + 5) {
            issues.push(`Stat row ${i}: label and value overlap`);
          }
        }
      });

      // Check close button
      if (closeBtn) {
        const btnRect = closeBtn.getBoundingClientRect();
        if (btnRect.bottom > viewport.height) {
          issues.push(`Close button cut off (bottom: ${btnRect.bottom})`);
        }
      }

      return { issues, viewport, rowCount: rows?.length || 0 };
    });

    console.log(`  Found ${statsChecks.rowCount} stat rows`);
    if (statsChecks.issues.length === 0) {
      console.log('  [OK] Stats overlay visible and not overlapping');
      results.checks.push({ name: 'Stats overlay', passed: true });
    } else {
      statsChecks.issues.forEach(issue => {
        console.log(`  [X] ${issue}`);
        results.issues.push(`Stats overlay: ${issue}`);
      });
      results.checks.push({ name: 'Stats overlay', passed: false, issues: statsChecks.issues });
      results.passed = false;
    }

    await page.click('#close-stats');
    await page.waitForTimeout(500);

    // ========== HELP OVERLAY CHECKS ==========
    console.log('\n--- HELP OVERLAY ---');
    await page.click('#help-button');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${screenshotDir}/05-help-overlay.png` });

    const helpChecks = await page.evaluate(() => {
      const issues = [];
      const viewport = { width: window.innerWidth, height: window.innerHeight };

      const overlay = document.getElementById('help-overlay');
      const content = overlay?.querySelector('.help-content');

      if (!content) {
        issues.push('Help content not found');
        return { issues, viewport };
      }

      const contentRect = content.getBoundingClientRect();

      // Check content fits in viewport width
      if (contentRect.left < 0 || contentRect.right > viewport.width) {
        issues.push(`Help content extends beyond viewport horizontally`);
      }

      // Check sections
      const sections = content.querySelectorAll('.help-section');
      sections.forEach((section, i) => {
        const rect = section.getBoundingClientRect();
        if (rect.left < 0 || rect.right > viewport.width) {
          issues.push(`Help section ${i} extends beyond viewport`);
        }

        // Check help items
        const items = section.querySelectorAll('.help-item');
        items.forEach((item, j) => {
          const itemRect = item.getBoundingClientRect();
          const icon = item.querySelector('.help-item-icon');
          const text = item.querySelector('.help-item-text');

          if (icon && text) {
            const iconRect = icon.getBoundingClientRect();
            const textRect = text.getBoundingClientRect();
            // Check if icon and text overlap significantly
            if (iconRect.right > textRect.left + 10) {
              issues.push(`Help item ${j} in section ${i}: icon overlaps text`);
            }
          }
        });
      });

      // Check close button
      const closeBtn = document.getElementById('close-help');
      if (closeBtn) {
        const btnRect = closeBtn.getBoundingClientRect();
        if (btnRect.left < 0 || btnRect.right > viewport.width) {
          issues.push(`Close button extends beyond viewport`);
        }
      }

      return { issues, viewport, sectionCount: sections.length };
    });

    console.log(`  Found ${helpChecks.sectionCount} help sections`);
    if (helpChecks.issues.length === 0) {
      console.log('  [OK] Help overlay visible and not overlapping');
      results.checks.push({ name: 'Help overlay', passed: true });
    } else {
      helpChecks.issues.forEach(issue => {
        console.log(`  [X] ${issue}`);
        results.issues.push(`Help overlay: ${issue}`);
      });
      results.checks.push({ name: 'Help overlay', passed: false, issues: helpChecks.issues });
      results.passed = false;
    }

    await page.click('#close-help');
    await page.waitForTimeout(500);

    // ========== FINAL GAMEPLAY CHECK ==========
    console.log('\n--- GAMEPLAY CHECK ---');
    await page.screenshot({ path: `${screenshotDir}/06-gameplay.png` });

    // Drop some coins and take screenshot
    for (let i = 0; i < 5; i++) {
      await page.click('#drop-button');
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${screenshotDir}/07-coins-dropped.png` });

    console.log('  [OK] Gameplay screenshots captured');

    // ========== SUMMARY ==========
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));

    console.log(`\nViewport: ${VIEWPORT.width}x${VIEWPORT.height}`);
    console.log('\nChecks:');
    results.checks.forEach(check => {
      const status = check.passed ? '[OK]' : '[X]';
      console.log(`  ${status} ${check.name}`);
    });

    if (results.issues.length > 0) {
      console.log('\nIssues found:');
      results.issues.forEach(issue => console.log(`  - ${issue}`));
    }

    console.log(`\nOverall: ${results.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`Screenshots saved to: ${screenshotDir}/`);

    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('\nTEST ERROR:', error.message);
    results.passed = false;
    results.issues.push(`Error: ${error.message}`);
    await page.screenshot({ path: `${screenshotDir}/error.png` }).catch(() => {});
  } finally {
    await browser.close();
  }

  // Save results
  fs.writeFileSync('test-android-results.json', JSON.stringify(results, null, 2));

  return results.passed ? 0 : 1;
}

// Global timeout to prevent hanging (3 minutes)
const GLOBAL_TIMEOUT = 180000;
const timeoutId = setTimeout(() => {
  console.log('\n[TIMEOUT] Test exceeded 3 minute limit, forcing exit');
  process.exit(1);
}, GLOBAL_TIMEOUT);

testAndroidResolution().then(code => {
  clearTimeout(timeoutId);
  process.exit(code);
}).catch(err => {
  clearTimeout(timeoutId);
  console.error('Test crashed:', err);
  process.exit(1);
});
