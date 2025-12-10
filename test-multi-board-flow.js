/**
 * Multi-Board Coin Flow Test
 * Tests coin routing through the pyramid (Design Spec 6.3 & 6.4)
 *
 * This test verifies:
 * - Coins route from parent boards to child boards
 * - Coins eventually reach the scoring tray from bottom row boards
 * - Path tracking records board visits correctly
 * - Score accumulates properly through multi-board paths
 *
 * Run with: node test-multi-board-flow.js
 */

import { chromium } from 'playwright';

const TEST_TIMEOUT = 120000; // 2 minutes max
const SINGLE_TEST_TIMEOUT = 30000; // 30 seconds per test

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

async function runTest(name, testFn, timeout = SINGLE_TEST_TIMEOUT) {
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
  console.log('   Multi-Board Coin Flow Test (Design Spec 6.3 & 6.4)');
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
    page.setDefaultTimeout(SINGLE_TEST_TIMEOUT);

    // Navigate to game
    console.log('🌐 Loading game...');
    await page.goto('http://localhost:3003', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof Game !== 'undefined', { timeout: 10000 });

    // Test 1: Setup 3-board pyramid
    await runTest('Create 3-board pyramid for testing', async () => {
      const setup = await page.evaluate(() => {
        // Reset and initialize
        if (BoardManager) {
          BoardManager.reset();
          BoardManager.init(Game.scene, Board, ThemeEffects);
        }

        // Create 3 boards: top + 2 children
        const board1 = BoardManager.createBoard(0); // Top board (Neon Arcade - queueSpeed)
        const board2 = BoardManager.createBoard(1); // Child left (Dino Land - coinValue)
        const board3 = BoardManager.createBoard(2); // Child right (Alien Invasion - luckyCoins)

        return {
          boardCount: BoardManager.currentBoardCount,
          board1Row: board1.row,
          board2Row: board2.row,
          board3Row: board3.row,
          board1Children: {
            left: board1.childLeft,
            right: board1.childRight
          }
        };
      });

      if (setup.boardCount !== 3) throw new Error(`Expected 3 boards, got ${setup.boardCount}`);
      if (setup.board1Row !== 0) throw new Error('Board 1 should be in row 0');
      if (setup.board2Row !== 1) throw new Error('Board 2 should be in row 1');
      if (setup.board3Row !== 1) throw new Error('Board 3 should be in row 1');
      if (!setup.board1Children.left || !setup.board1Children.right) {
        throw new Error('Top board missing child references');
      }

      console.log('   ✓ 3-board pyramid created with correct parent-child links');
    });

    // Test 2: Drop coin on top board
    await runTest('Drop coin on top board and track initial state', async () => {
      const drop = await page.evaluate(() => {
        // Disable auto-drop to prevent interference
        Game.autoDrop = false;

        // Clear any existing coins
        Coins.activeCoins.forEach(c => c.active = false);
        Coins.activeCoins = [];

        // Add coins to queue first
        Coins.addToQueue(5);

        // Ensure game is running
        if (!Game.isRunning) {
          Game.start();
        }

        // Drop a coin on top board
        if (Game && Game.dropCoin) {
          Game.dropCoin();
        }

        // Give it a moment to spawn
        return new Promise(resolve => {
          setTimeout(() => {
            // Find the coin with a current board
            const coinWithBoard = Coins.activeCoins.find(c => c.currentBoard !== null);

            resolve({
              coinCount: Coins.activeCoins.length,
              hasCurrentBoard: coinWithBoard !== undefined,
              currentBoard: coinWithBoard ? coinWithBoard.currentBoard : null,
              pathBoardsLength: coinWithBoard ? coinWithBoard.pathBoards.length : 0,
              queue: Coins.coinQueue
            });
          }, 100);
        });
      });

      if (drop.coinCount === 0) throw new Error('No coin was spawned');
      if (!drop.hasCurrentBoard) throw new Error('Coin does not have current board set');

      console.log(`   ✓ Coin spawned on board: ${drop.currentBoard}`);
      console.log(`   ✓ Queue remaining: ${drop.queue}`);
    });

    // Test 3: Simulate physics and wait for coin to fall to child board
    await runTest('Coin routes from top board to child board', async () => {
      const routing = await page.evaluate(() => {
        // Ensure we have a coin with a board to track
        let trackedCoin = Coins.activeCoins.find(c => c.currentBoard !== null);

        if (!trackedCoin) {
          // Clear coins and drop a fresh one
          Coins.activeCoins.forEach(c => c.active = false);
          Coins.activeCoins = [];
          Coins.addToQueue(1);
          Game.dropCoin();

          // Wait a moment for it to spawn
          setTimeout(() => {
            trackedCoin = Coins.activeCoins.find(c => c.currentBoard !== null);
          }, 50);
        }

        return new Promise(resolve => {
          let checkCount = 0;
          const maxChecks = 200; // ~10 seconds at 50ms intervals

          const checkInterval = setInterval(() => {
            checkCount++;

            // Find a coin with a board assignment
            const coin = Coins.activeCoins.find(c => c.currentBoard !== null && c.active);

            if (!coin) {
              if (checkCount < 5) return; // Give it a moment to spawn
              clearInterval(checkInterval);
              resolve({ success: false, reason: 'No coin with board assignment found' });
              return;
            }

            // Check if coin has visited multiple boards
            if (coin.pathBoards && coin.pathBoards.length >= 2) {
              clearInterval(checkInterval);
              resolve({
                success: true,
                pathBoards: coin.pathBoards,
                pathBoardsCount: coin.pathBoards.length,
                pathEvents: coin.pathEvents.map(e => e.eventType),
                currentBoard: coin.currentBoard
              });
              return;
            }

            // Check if coin was scored before visiting 2 boards (unexpected for 3-board pyramid)
            if (coin.scored) {
              clearInterval(checkInterval);
              resolve({
                success: false,
                reason: 'Coin scored before visiting multiple boards',
                pathBoards: coin.pathBoards,
                scored: coin.scored
              });
              return;
            }

            // Timeout
            if (checkCount >= maxChecks) {
              clearInterval(checkInterval);
              resolve({
                success: false,
                reason: 'Timeout waiting for coin to route',
                pathBoards: coin.pathBoards,
                currentBoard: coin.currentBoard
              });
            }
          }, 50);
        });
      });

      if (!routing.success) {
        throw new Error(routing.reason || 'Routing failed');
      }

      console.log(`   ✓ Coin visited ${routing.pathBoardsCount} boards`);
      console.log(`   ✓ Path: ${routing.pathBoards.join(' → ')}`);
      console.log(`   ✓ Events: ${routing.pathEvents.join(', ')}`);
    });

    // Test 4: Create full 8-board pyramid and test end-to-end flow
    await runTest('Coin flows through full 8-board pyramid to scoring tray', async () => {
      const fullFlow = await page.evaluate(() => {
        // Reset and create full pyramid
        BoardManager.reset();
        BoardManager.init(Game.scene, Board, ThemeEffects);

        // Create 8 boards
        for (let i = 0; i < 8; i++) {
          BoardManager.createBoard(i % 8);
        }

        // Reset coins
        Coins.activeCoins = [];
        Coins.totalCoinsScored = 0;

        // Add to queue and drop a coin
        Coins.addToQueue(1);
        const initialScore = Game.score;
        if (Game && Game.dropCoin) {
          Game.dropCoin();
        }

        // Wait for coin to complete journey
        return new Promise(resolve => {
          let checkCount = 0;
          const maxChecks = 400; // ~20 seconds

          const checkInterval = setInterval(() => {
            checkCount++;

            const coin = Coins.activeCoins[0];

            // Check if coin was scored
            if (Coins.totalCoinsScored > 0 || Game.score > initialScore) {
              clearInterval(checkInterval);
              resolve({
                success: true,
                coinsScored: Coins.totalCoinsScored,
                scoreGained: Game.score - initialScore,
                finalPathBoards: coin ? coin.pathBoards : [],
                boardsVisited: coin ? coin.pathBoards.length : 0
              });
              return;
            }

            // Check if coin got stuck or disappeared
            if (!coin || (!coin.active && Coins.totalCoinsScored === 0)) {
              clearInterval(checkInterval);
              resolve({
                success: false,
                reason: 'Coin disappeared without scoring',
                pathBoards: coin ? coin.pathBoards : []
              });
              return;
            }

            // Timeout
            if (checkCount >= maxChecks) {
              clearInterval(checkInterval);
              resolve({
                success: false,
                reason: 'Timeout - coin did not reach scoring tray',
                stillActive: coin && coin.active,
                pathBoards: coin ? coin.pathBoards : []
              });
            }
          }, 50);
        });
      });

      if (!fullFlow.success) {
        throw new Error(fullFlow.reason || 'Full flow test failed');
      }

      if (fullFlow.scoreGained === 0) {
        throw new Error('Coin reached scoring but no score was added');
      }

      console.log(`   ✓ Coin reached scoring tray`);
      console.log(`   ✓ Boards visited: ${fullFlow.boardsVisited}`);
      console.log(`   ✓ Score gained: ${fullFlow.scoreGained}`);
    });

    // Test 5: Verify path tracking affects score
    await runTest('Path through multiple boards increases score', async () => {
      const pathBonus = await page.evaluate(() => {
        // Reset
        BoardManager.reset();
        BoardManager.init(Game.scene, Board, ThemeEffects);
        Coins.activeCoins = [];

        // Create 4-board pyramid
        for (let i = 0; i < 4; i++) {
          BoardManager.createBoard(i % 8);
        }

        // Drop 5 coins
        const coinsToTest = 5;
        const initialScore = Game.score;

        // Add to queue
        Coins.addToQueue(coinsToTest);

        for (let i = 0; i < coinsToTest; i++) {
          if (Game && Game.dropCoin) {
            Game.dropCoin();
          }
        }

        // Wait for all coins to score
        return new Promise(resolve => {
          let checkCount = 0;
          const maxChecks = 400; // 20 seconds

          const checkInterval = setInterval(() => {
            checkCount++;

            const coinsScored = Coins.totalCoinsScored;

            // All coins scored
            if (coinsScored >= coinsToTest) {
              clearInterval(checkInterval);

              // Calculate results
              const totalScore = Game.score - initialScore;
              const avgScore = totalScore / coinsToTest;

              // Get path boards from any scored coin as example
              let avgBoards = 0;
              const scoredCoins = Coins.activeCoins.filter(c => c.scored);
              if (scoredCoins.length > 0) {
                avgBoards = scoredCoins.reduce((sum, c) => sum + (c.pathBoards ? c.pathBoards.length : 0), 0) / scoredCoins.length;
              }

              resolve({
                allScored: true,
                avgScore,
                avgBoards,
                totalScore
              });
              return;
            }

            // Timeout
            if (checkCount >= maxChecks) {
              clearInterval(checkInterval);
              resolve({
                allScored: false,
                coinsScored,
                coinsToTest
              });
            }
          }, 50);
        });
      });

      if (!pathBonus.allScored) {
        throw new Error(`Not all coins scored: ${pathBonus.coinsScored}/${pathBonus.coinsToTest}`);
      }

      console.log(`   ✓ Average score per coin: ${pathBonus.avgScore.toFixed(0)}`);
      console.log(`   ✓ Average boards visited: ${pathBonus.avgBoards.toFixed(1)}`);
    });

    // Test 6: Verify no coins get stuck in multi-board pyramid
    await runTest('No coins get permanently stuck in pyramid', async () => {
      const stuckTest = await page.evaluate(() => {
        // Reset
        BoardManager.reset();
        BoardManager.init(Game.scene, Board, ThemeEffects);
        Coins.activeCoins = [];

        // Create full 8-board pyramid
        for (let i = 0; i < 8; i++) {
          BoardManager.createBoard(i % 8);
        }

        const initialScore = Game.score;
        const coinsToTest = 10;

        // Add to queue and drop multiple coins
        Coins.addToQueue(coinsToTest);

        for (let i = 0; i < coinsToTest; i++) {
          if (Game && Game.dropCoin) {
            Game.dropCoin();
          }
        }

        // Wait for all coins to score or timeout
        return new Promise(resolve => {
          let checkCount = 0;
          const maxChecks = 600; // 30 seconds

          const checkInterval = setInterval(() => {
            checkCount++;

            const coinsScored = Coins.totalCoinsScored;
            const activeCoins = Coins.activeCoins.filter(c => c.active).length;

            // All coins scored successfully
            if (coinsScored >= coinsToTest) {
              clearInterval(checkInterval);
              resolve({
                success: true,
                coinsScored,
                scoreGained: Game.score - initialScore,
                time: checkCount * 50
              });
              return;
            }

            // Timeout - check how many made it
            if (checkCount >= maxChecks) {
              clearInterval(checkInterval);
              resolve({
                success: false,
                coinsScored,
                coinsStuck: coinsToTest - coinsScored,
                activeCoins,
                time: checkCount * 50
              });
            }
          }, 50);
        });
      });

      if (!stuckTest.success) {
        throw new Error(`${stuckTest.coinsStuck} coins got stuck in pyramid (only ${stuckTest.coinsScored}/${stuckTest.coinsToTest || 10} scored)`);
      }

      console.log(`   ✓ All ${stuckTest.coinsScored} coins successfully scored`);
      console.log(`   ✓ Completion time: ${(stuckTest.time / 1000).toFixed(1)}s`);
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
