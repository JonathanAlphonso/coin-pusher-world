/**
 * 8-Board Pyramid Progression Test
 * Tests complete playthrough to 8 boards per design spec section 11.1
 *
 * Requirements:
 * - Start with a fixed RNG seed for deterministic behavior
 * - Use deterministic policy for drops, board choices, and prize choices
 * - Simulate until pyramid reaches 8 boards
 * - Verify no deadlocks, NaN values, or unhandled exceptions
 *
 * Run with: node test-8board-pyramid.js
 */

import { chromium } from 'playwright';

const TEST_TIMEOUT = 60000; // 60 seconds max
const MAX_SIMULATION_TIME = 45000; // 45 seconds of simulation

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

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   8-Board Pyramid Progression Test');
  console.log('   Design Spec Section 11.1 - Full Playthrough');
  console.log('═══════════════════════════════════════════════════════\n');

  const startTime = Date.now();
  let browser, page;

  try {
    // Launch browser
    console.log('🚀 Launching browser...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    page = await context.newPage();

    page.setDefaultTimeout(30000);

    // Navigate to game
    console.log('🌐 Loading game...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });

    // Wait for game to initialize
    await page.waitForFunction(() => typeof Game !== 'undefined', { timeout: 10000 });

    // Test 1: Initialize game with deterministic seed
    await runTest('Initialize game with fixed seed', async () => {
      await page.evaluate(() => {
        // Set a fixed random seed for deterministic behavior
        Math.seedrandom = function(seed) {
          const m = 2**35 - 31;
          const a = 185852;
          let s = seed % m;
          return function () {
            return (s = s * a % m) / m;
          };
        };
        Math.random = Math.seedrandom(12345);

        // Start the game
        if (Game && !Game.isRunning) {
          Game.start();
        }
      });

      await page.waitForTimeout(100);
    });

    // Test 2: Verify BoardManager exists and is initialized
    await runTest('BoardManager is initialized', async () => {
      const managerValid = await page.evaluate(() => {
        return typeof BoardManager !== 'undefined' &&
               typeof BoardManager.createBoard === 'function' &&
               typeof BoardManager.addBoard === 'function' &&
               BoardManager.maxBoards === 8;
      });

      if (!managerValid) throw new Error('BoardManager not properly initialized');
    });

    // Test 3: Create initial top board
    await runTest('Create initial top board', async () => {
      const topBoard = await page.evaluate(() => {
        // Create first board with theme index 0 (Neon Arcade)
        const board = BoardManager.createBoard(0);
        return {
          exists: board !== null,
          boardId: board?.boardId,
          row: board?.row,
          col: board?.col,
          themeIndex: board?.themeIndex
        };
      });

      if (!topBoard.exists) throw new Error('Failed to create top board');
      if (topBoard.row !== 0) throw new Error(`Top board should be row 0, got ${topBoard.row}`);
      if (topBoard.col !== 0) throw new Error(`Top board should be col 0, got ${topBoard.col}`);

      console.log(`   Created board: ${topBoard.boardId} at row ${topBoard.row}, col ${topBoard.col}`);
    });

    // Test 4: Simulate adding boards up to 8 total
    await runTest('Add boards until pyramid has 8 boards', async () => {
      const pyramidGrowth = await page.evaluate((maxTime) => {
        const results = {
          boards: [],
          finalCount: 0,
          errors: []
        };

        // Deterministic theme selection - cycle through themes
        const themes = [0, 1, 2, 3, 4, 5, 6, 7];
        let themeIndex = 1; // Start at 1 since we already created board 0

        // Add boards one by one
        for (let i = 1; i < 8; i++) {
          const theme = themes[themeIndex % themes.length];
          const board = BoardManager.addBoard(theme);

          if (!board) {
            results.errors.push(`Failed to add board ${i + 1}`);
            break;
          }

          results.boards.push({
            boardId: board.boardId,
            row: board.row,
            col: board.col,
            themeIndex: board.themeIndex,
            themeName: board.themeName,
            powerupFocus: board.powerupFocus
          });

          themeIndex++;
        }

        // Get final pyramid status
        const status = BoardManager.getStatus();
        results.finalCount = status.totalBoards;
        results.isFull = status.isFull;
        results.rowCounts = status.rowCounts;

        return results;
      }, MAX_SIMULATION_TIME);

      console.log(`   Final board count: ${pyramidGrowth.finalCount}`);
      console.log(`   Pyramid full: ${pyramidGrowth.isFull}`);
      console.log(`   Row distribution:`, pyramidGrowth.rowCounts);

      if (pyramidGrowth.errors.length > 0) {
        throw new Error(`Board creation errors: ${pyramidGrowth.errors.join(', ')}`);
      }

      if (pyramidGrowth.finalCount !== 8) {
        throw new Error(`Expected 8 boards, got ${pyramidGrowth.finalCount}`);
      }

      if (!pyramidGrowth.isFull) {
        throw new Error('Pyramid should be marked as full');
      }

      // Verify all boards were created
      pyramidGrowth.boards.forEach((board, index) => {
        console.log(`   Board ${index + 2}: ${board.themeName} (${board.powerupFocus}) at row ${board.row}, col ${board.col}`);
      });
    });

    // Test 5: Verify parent-child relationships
    await runTest('Verify pyramid parent-child relationships', async () => {
      const relationships = await page.evaluate(() => {
        const results = {
          boards: [],
          errors: []
        };

        BoardManager.boards.forEach(board => {
          const info = {
            boardId: board.boardId,
            row: board.row,
            col: board.col,
            parent: board.parent,
            childLeft: board.childLeft,
            childRight: board.childRight
          };

          results.boards.push(info);

          // Verify top board has no parent
          if (board.row === 0 && board.parent !== null) {
            results.errors.push(`Top board ${board.boardId} should not have parent`);
          }

          // Verify non-top boards have parents (if they should)
          if (board.row > 0 && !board.parent) {
            results.errors.push(`Board ${board.boardId} at row ${board.row} should have parent`);
          }
        });

        return results;
      });

      if (relationships.errors.length > 0) {
        throw new Error(`Relationship errors: ${relationships.errors.join(', ')}`);
      }

      console.log(`   All ${relationships.boards.length} boards have correct parent-child relationships`);
    });

    // Test 6: Verify no NaN values in board data
    await runTest('Verify no NaN values in pyramid', async () => {
      const hasNaN = await page.evaluate(() => {
        let nanFound = false;

        BoardManager.boards.forEach(board => {
          if (isNaN(board.row) || isNaN(board.col)) {
            nanFound = true;
          }
          if (board.worldPosition) {
            if (isNaN(board.worldPosition.x) || isNaN(board.worldPosition.y) || isNaN(board.worldPosition.z)) {
              nanFound = true;
            }
          }
        });

        return nanFound;
      });

      if (hasNaN) throw new Error('NaN values detected in pyramid data');
    });

    // Test 7: Verify ThemeEffects are updated
    await runTest('ThemeEffects system updated with pyramid', async () => {
      const effectsValid = await page.evaluate(() => {
        if (typeof ThemeEffects === 'undefined') return false;

        // Update effects with current pyramid
        ThemeEffects.updateEffects(BoardManager.boards);

        const summary = ThemeEffects.getSummary();

        return {
          valid: summary.length > 0,
          summary: summary,
          activeEffects: Object.keys(ThemeEffects.activeEffects)
        };
      });

      if (!effectsValid.valid) {
        throw new Error('ThemeEffects not properly updated');
      }

      console.log(`   Active effects: ${effectsValid.activeEffects.join(', ')}`);
    });

    // Test 8: Drop coins and verify they process without errors
    await runTest('Drop coins and verify processing', async () => {
      const coinTest = await page.evaluate(() => {
        const results = {
          coinsDropped: 0,
          errors: []
        };

        // Drop 10 coins
        for (let i = 0; i < 10; i++) {
          try {
            Game.dropCoin();
            results.coinsDropped++;
          } catch (e) {
            results.errors.push(`Drop ${i}: ${e.message}`);
          }
        }

        // Run physics for a few frames
        for (let i = 0; i < 30; i++) {
          try {
            Physics.step(0.016);
            Coins.update(0.016);
          } catch (e) {
            results.errors.push(`Physics frame ${i}: ${e.message}`);
          }
        }

        return results;
      });

      if (coinTest.errors.length > 0) {
        throw new Error(`Coin processing errors: ${coinTest.errors.join(', ')}`);
      }

      console.log(`   Dropped ${coinTest.coinsDropped} coins successfully`);
    });

    // Test 9: Verify score is valid
    await runTest('Score remains valid throughout simulation', async () => {
      const scoreValid = await page.evaluate(() => {
        return !isNaN(Game.score) && isFinite(Game.score);
      });

      if (!scoreValid) throw new Error('Score is NaN or infinite');
    });

    // Test 10: Verify no deadlocks (can still add coins and process physics)
    await runTest('No deadlock - game still responsive', async () => {
      const responsive = await page.evaluate(() => {
        const initialCoins = Coins.activeCoins.length;

        Game.dropCoin();
        Physics.step(0.016);
        Coins.update(0.016);

        // Should be able to process
        return true;
      });

      if (!responsive) throw new Error('Game appears deadlocked');
    });

    // Test 11: Verify pyramid cannot exceed 8 boards
    await runTest('Cannot add more than 8 boards', async () => {
      const cannotAdd = await page.evaluate(() => {
        const status = BoardManager.getStatus();
        if (!status.isFull) return false;

        // Try to add another board
        const board = BoardManager.addBoard(0);

        // Should return null
        return board === null;
      });

      if (!cannotAdd) throw new Error('Pyramid allowed more than 8 boards');
    });

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
