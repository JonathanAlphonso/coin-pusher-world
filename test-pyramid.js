/**
 * Pyramid Structure Test for Coin Pusher World
 * Tests BoardManager pyramid structure according to design spec section 11.1
 *
 * Run with: node test-pyramid.js
 */

import { chromium } from 'playwright';

const TEST_TIMEOUT = 120000; // 2 minutes max

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   Coin Pusher World - Pyramid Structure Test');
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

    // Navigate to game
    console.log('🌐 Loading game...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for game to initialize
    await page.waitForFunction(() => typeof Game !== 'undefined' && typeof BoardManager !== 'undefined', { timeout: 10000 });

    console.log('\n📋 Testing Pyramid Structure\n');

    // Test 1: BoardManager initialized
    console.log('🧪 Test 1: BoardManager is initialized');
    const hasManager = await page.evaluate(() => {
      return Game.boardManager !== null && Game.boardManager !== undefined;
    });
    if (!hasManager) throw new Error('BoardManager not initialized');
    console.log('✅ BoardManager is initialized');

    // Test 2: Pyramid starts empty
    console.log('\n🧪 Test 2: Pyramid starts empty');
    const initialStatus = await page.evaluate(() => {
      return Game.boardManager.getStatus();
    });
    if (initialStatus.totalBoards !== 0) throw new Error(`Expected 0 boards, got ${initialStatus.totalBoards}`);
    console.log(`✅ Pyramid starts empty (0/${initialStatus.maxBoards} boards)`);

    // Test 3: Can add boards up to maximum
    console.log('\n🧪 Test 3: Adding boards to pyramid (max 8)');
    const addResult = await page.evaluate(() => {
      const results = {
        boards: [],
        finalStatus: null,
        errors: []
      };

      // Add 8 boards with different themes
      for (let i = 0; i < 8; i++) {
        try {
          const board = Game.boardManager.createBoard(i % 8); // Use theme index
          if (board) {
            results.boards.push({
              id: board.boardId,
              row: board.row,
              col: board.col,
              themeIndex: board.themeIndex
            });
          } else {
            results.errors.push(`Failed to create board ${i + 1}`);
          }
        } catch (err) {
          results.errors.push(`Error creating board ${i + 1}: ${err.message}`);
        }
      }

      results.finalStatus = Game.boardManager.getStatus();
      return results;
    });

    if (addResult.errors.length > 0) {
      console.error('❌ Errors during board creation:');
      addResult.errors.forEach(err => console.error('   ', err));
    }

    console.log(`   Added ${addResult.boards.length} boards`);
    console.log(`   Final pyramid status: ${addResult.finalStatus.totalBoards}/${addResult.finalStatus.maxBoards} boards`);

    if (addResult.finalStatus.totalBoards !== 8) {
      throw new Error(`Expected 8 boards, got ${addResult.finalStatus.totalBoards}`);
    }
    console.log('✅ Successfully added 8 boards to pyramid');

    // Test 4: Pyramid layout follows design spec
    console.log('\n🧪 Test 4: Verifying pyramid layout structure');
    const layoutCheck = await page.evaluate(() => {
      const status = Game.boardManager.getStatus();
      const expectedLayout = {
        0: 1, // Row 0: 1 board
        1: 2, // Row 1: 2 boards
        2: 3, // Row 2: 3 boards
        3: 2  // Row 3: 2 boards (total = 8)
      };

      const errors = [];
      for (const [row, expectedCount] of Object.entries(expectedLayout)) {
        const actualCount = status.rowCounts[row] || 0;
        if (actualCount !== expectedCount) {
          errors.push(`Row ${row}: expected ${expectedCount} boards, got ${actualCount}`);
        }
      }

      return {
        rowCounts: status.rowCounts,
        expectedLayout,
        errors
      };
    });

    console.log('   Row distribution:', JSON.stringify(layoutCheck.rowCounts));
    if (layoutCheck.errors.length > 0) {
      console.error('❌ Layout errors:');
      layoutCheck.errors.forEach(err => console.error('   ', err));
      throw new Error('Pyramid layout does not match design spec');
    }
    console.log('✅ Pyramid layout matches design spec (1-2-3-2 structure)');

    // Test 5: Parent-child relationships
    console.log('\n🧪 Test 5: Verifying parent-child board relationships');
    const relationshipCheck = await page.evaluate(() => {
      const boards = Game.boardManager.boards;
      const errors = [];
      let validLinks = 0;

      boards.forEach(board => {
        // Check if child boards exist when referenced
        if (board.childLeft) {
          const child = Game.boardManager.getBoard(board.childLeft);
          if (!child) {
            errors.push(`Board ${board.boardId} references missing left child ${board.childLeft}`);
          } else if (child.parent !== board.boardId) {
            errors.push(`Left child ${child.boardId} does not reference parent ${board.boardId}`);
          } else {
            validLinks++;
          }
        }

        if (board.childRight) {
          const child = Game.boardManager.getBoard(board.childRight);
          if (!child) {
            errors.push(`Board ${board.boardId} references missing right child ${board.childRight}`);
          } else if (child.parent !== board.boardId) {
            errors.push(`Right child ${child.boardId} does not reference parent ${board.boardId}`);
          } else {
            validLinks++;
          }
        }

        // Check parent reference
        if (board.parent) {
          const parent = Game.boardManager.getBoard(board.parent);
          if (!parent) {
            errors.push(`Board ${board.boardId} references missing parent ${board.parent}`);
          }
        }
      });

      return { validLinks, totalBoards: boards.length, errors };
    });

    console.log(`   Valid parent-child links: ${relationshipCheck.validLinks}`);
    if (relationshipCheck.errors.length > 0) {
      console.error('❌ Relationship errors:');
      relationshipCheck.errors.forEach(err => console.error('   ', err));
      throw new Error('Invalid parent-child relationships');
    }
    console.log('✅ All parent-child relationships valid');

    // Test 6: Exit routing configuration
    console.log('\n🧪 Test 6: Verifying exit routing configuration');
    const exitCheck = await page.evaluate(() => {
      const boards = Game.boardManager.boards;
      const errors = [];
      let scoringExits = 0;
      let childExits = 0;

      boards.forEach(board => {
        board.exits.forEach(exit => {
          if (exit.target === 'scoring_tray') {
            scoringExits++;
          } else if (exit.target === 'child_left' || exit.target === 'child_right') {
            childExits++;
          } else {
            errors.push(`Board ${board.boardId} has invalid exit target: ${exit.target}`);
          }
        });
      });

      return { scoringExits, childExits, errors };
    });

    console.log(`   Scoring tray exits: ${exitCheck.scoringExits}`);
    console.log(`   Child board exits: ${exitCheck.childExits}`);
    if (exitCheck.errors.length > 0) {
      console.error('❌ Exit routing errors:');
      exitCheck.errors.forEach(err => console.error('   ', err));
      throw new Error('Invalid exit configurations');
    }
    console.log('✅ Exit routing properly configured');

    // Test 7: Cannot exceed maximum boards
    console.log('\n🧪 Test 7: Verifying maximum board limit');
    const limitCheck = await page.evaluate(() => {
      const status = Game.boardManager.getStatus();
      if (!status.isFull) {
        return { error: 'Pyramid not marked as full after 8 boards' };
      }

      // Try to add another board
      const extraBoard = Game.boardManager.addBoard(0);
      if (extraBoard !== null) {
        return { error: 'Was able to add 9th board (should be blocked)' };
      }

      return { success: true, isFull: status.isFull };
    });

    if (limitCheck.error) {
      throw new Error(limitCheck.error);
    }
    console.log('✅ Maximum board limit (8) enforced correctly');

    // Test 8: Reset functionality
    console.log('\n🧪 Test 8: Testing pyramid reset');
    const resetCheck = await page.evaluate(() => {
      Game.boardManager.reset();
      const status = Game.boardManager.getStatus();
      return {
        totalBoards: status.totalBoards,
        isFull: status.isFull
      };
    });

    if (resetCheck.totalBoards !== 0) {
      throw new Error(`Reset failed: ${resetCheck.totalBoards} boards remain`);
    }
    console.log('✅ Pyramid reset works correctly');

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('                   ALL TESTS PASSED');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ 8 tests passed`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('═══════════════════════════════════════════════════════\n');

    await browser.close();
    process.exit(0);

  } catch (error) {
    console.error('\n💥 TEST FAILED');
    console.error('Error:', error.message);
    console.error('\n═══════════════════════════════════════════════════════');
    console.error('                   TEST FAILED');
    console.error('═══════════════════════════════════════════════════════\n');

    if (browser) await browser.close();
    process.exit(1);
  }
}

// Set overall timeout
const timeout = setTimeout(() => {
  console.error('\n💥 Test suite timeout');
  process.exit(1);
}, TEST_TIMEOUT);

main().finally(() => clearTimeout(timeout));
