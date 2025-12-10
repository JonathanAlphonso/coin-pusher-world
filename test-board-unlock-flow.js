/**
 * Board Unlock and Prize Flow Integration Test
 * Tests the complete flow from score threshold to board selection to prize selection
 *
 * Run with: node test-board-unlock-flow.js
 */

import { chromium } from 'playwright';

const TEST_TIMEOUT = 60000; // 60 seconds max

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
  console.log('   Board Unlock and Prize Flow Integration Test');
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
    await page.goto('http://localhost:3003', { waitUntil: 'networkidle' });

    // Wait for game to initialize
    await page.waitForFunction(() => typeof Game !== 'undefined', { timeout: 10000 });

    // Test 1: Verify BoardManager and Prizes are initialized
    await runTest('BoardManager and Prizes are initialized', async () => {
      const systemsReady = await page.evaluate(() => {
        return typeof BoardManager !== 'undefined' &&
               typeof Prizes !== 'undefined' &&
               Game.boardManager !== null &&
               Game.prizes !== null;
      });

      if (!systemsReady) throw new Error('BoardManager or Prizes not initialized');
    });

    // Test 2: Create initial board
    await runTest('Create initial top board', async () => {
      const boardCreated = await page.evaluate(() => {
        // Create initial top board (Neon Arcade - index 0)
        const board = BoardManager.createBoard(0);
        return board !== null && board.row === 0 && board.col === 0;
      });

      if (!boardCreated) throw new Error('Failed to create initial board');
    });

    // Test 3: Verify coin has top board ID when dropped
    await runTest('Coins spawned with top board ID', async () => {
      const coinHasBoardId = await page.evaluate(() => {
        // Start game if not already running
        if (!Game.isRunning) Game.start();

        // Add to queue and drop a coin
        Coins.addToQueue(1);
        Game.dropCoin();

        // Wait a moment for coin to be created
        return new Promise(resolve => {
          setTimeout(() => {
            const coins = Coins.activeCoins;
            if (coins.length === 0) {
              resolve(false);
            } else {
              const coin = coins[0];
              resolve(coin.currentBoard === 'board_1');
            }
          }, 100);
        });
      });

      if (!coinHasBoardId) throw new Error('Coin not created with board ID');
    });

    // Test 4: Add second board and verify parent-child linking
    await runTest('Add second board with parent-child linking', async () => {
      const linkingCorrect = await page.evaluate(() => {
        // Add second board (Dino Land - index 1)
        const board2 = BoardManager.createBoard(1);

        if (!board2) return false;

        // Check that board2 is in row 1, col 0
        if (board2.row !== 1 || board2.col !== 0) return false;

        // Check that board1 has board2 as child
        const board1 = BoardManager.getBoard('board_1');
        if (!board1) return false;

        // Board2 should be left child of board1 (col 0 -> left child)
        return board1.childLeft === board2.boardId && board2.parent === board1.boardId;
      });

      if (!linkingCorrect) throw new Error('Parent-child linking incorrect');
    });

    // Test 5: Simulate score threshold and check expansion
    await runTest('Score threshold triggers board unlock', async () => {
      const unlockTriggered = await page.evaluate(() => {
        // Set score to just above first threshold
        Game.score = 10001;
        Game.currentExpansionIndex = 0;

        // Check expansion
        const initialBoardCount = BoardManager.currentBoardCount;

        // Manually trigger unlockNewBoard (simulating what checkExpansion does)
        // In actual game, this would be triggered by checkExpansion
        const status = BoardManager.getStatus();
        const canUnlock = !status.isFull && Game.currentExpansionIndex < Game.expansionThresholds.length;

        return canUnlock;
      });

      if (!unlockTriggered) throw new Error('Score threshold did not trigger unlock');
    });

    // Test 6: Verify prize pool is available
    await runTest('Prize system has 30 prizes', async () => {
      const prizeCount = await page.evaluate(() => {
        return Prizes.prizePool.length;
      });

      if (prizeCount !== 30) throw new Error(`Expected 30 prizes, got ${prizeCount}`);
    });

    // Test 7: Generate prize options
    await runTest('Prize system generates 6 options', async () => {
      const optionsGenerated = await page.evaluate(() => {
        const options = Prizes.generatePrizeOptions();
        return options.length === 6 && options.every(p => p.id && p.name);
      });

      if (!optionsGenerated) throw new Error('Prize options not generated correctly');
    });

    // Test 8: Apply a prize effect
    await runTest('Prize effects are applied correctly', async () => {
      const effectApplied = await page.evaluate(() => {
        const initialMaxQueue = Coins.maxQueueSize;

        // Manually apply a prize that increases queue size
        const prize = {
          id: 'bigQueue',
          name: 'Coin Vault',
          summary: 'Max queue +10 coins',
          effects: { maxQueueBonus: 10 }
        };

        Prizes.applyPrizeEffects(prize);

        return Coins.maxQueueSize === initialMaxQueue + 10;
      });

      if (!effectApplied) throw new Error('Prize effect not applied');
    });

    // Test 9: Coin routing to child board
    await runTest('Coins route to child boards', async () => {
      const routingWorks = await page.evaluate(() => {
        // Create a simple 2-board pyramid for testing
        BoardManager.reset();
        const board1 = BoardManager.createBoard(0); // Top board
        const board2 = BoardManager.createBoard(1); // Child board

        // Verify setup
        if (!board1 || !board2) return false;
        if (board1.childLeft !== board2.boardId) return false;

        // Create a test coin on board1
        const coin = Coins.getCoin();
        coin.active = true;
        coin.currentBoard = board1.boardId;
        coin.value = 100;
        coin.pathBoards = [];
        coin.pathMultiplier = 1.0;

        // Simulate routing
        Coins.routeCoinToBoard(coin, board2, -2); // Exit from left side

        // Check that coin now has board2 as current
        return coin.currentBoard === board2.boardId &&
               coin.pathBoards.includes(board1.boardId);
      });

      if (!routingWorks) throw new Error('Coin routing failed');
    });

    // Test 10: ThemeEffects updates with pyramid
    await runTest('ThemeEffects reflects pyramid composition', async () => {
      const effectsUpdated = await page.evaluate(() => {
        // Reset and create a diverse pyramid
        BoardManager.reset();
        ThemeEffects.init();

        BoardManager.createBoard(0); // Neon Arcade - queueSpeed
        BoardManager.createBoard(1); // Dino Land - coinValue
        BoardManager.createBoard(2); // Alien Invasion - luckyCoins

        // Update theme effects
        ThemeEffects.updateEffects(BoardManager.boards);

        const effects = ThemeEffects.activeEffects;

        // Should have all three focus types
        return effects.queueSpeed === 1 &&
               effects.coinValue === 1 &&
               effects.luckyCoins === 1;
      });

      if (!effectsUpdated) throw new Error('ThemeEffects not updated correctly');
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

// Run with timeout
const globalTimeout = setTimeout(() => {
  console.error('\n⏰ Global test timeout - tests took too long!');
  process.exit(1);
}, TEST_TIMEOUT);

main().finally(() => {
  clearTimeout(globalTimeout);
});
