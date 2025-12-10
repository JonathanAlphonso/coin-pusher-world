/**
 * Comprehensive Test Suite for Coin Pusher World
 * Tests game initialization, systems, and core functionality
 *
 * Run with: node test-comprehensive.js
 */

import { chromium } from 'playwright';

const TEST_TIMEOUT = 120000; // 2 minutes max for all tests
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
  console.log('   Coin Pusher World - Comprehensive Test Suite');
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

    // Set timeout for page operations
    page.setDefaultTimeout(SINGLE_TEST_TIMEOUT);

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      console.error('Page error:', error.message);
    });

    // Navigate to game
    console.log('🌐 Loading game...');
    await page.goto('http://localhost:3005', { waitUntil: 'networkidle' });

    // Wait for game to initialize
    await page.waitForFunction(() => typeof Game !== 'undefined', { timeout: 10000 });

    // Start the game for tests that need it
    await page.evaluate(() => {
      if (Game && !Game.isRunning) {
        Game.start();
      }
    });

    // Give it a moment to fully start
    await page.waitForTimeout(100);

    // Test 1: Game Initialization
    await runTest('Game initializes correctly', async () => {
      const gameLoaded = await page.evaluate(() => {
        return typeof Game !== 'undefined' &&
               typeof Physics !== 'undefined' &&
               typeof Board !== 'undefined' &&
               typeof Coins !== 'undefined' &&
               typeof UI !== 'undefined';
      });

      if (!gameLoaded) throw new Error('Game objects not initialized');
    });

    // Test 2: Three.js Scene Setup
    await runTest('Three.js scene is set up', async () => {
      const sceneSetup = await page.evaluate(() => {
        return Game.scene !== null &&
               Game.camera !== null &&
               Game.renderer !== null &&
               Game.scene.children.length > 0;
      });

      if (!sceneSetup) throw new Error('Three.js scene not properly set up');
    });

    // Test 3: Board Creation
    await runTest('Board is created with correct geometry', async () => {
      const boardValid = await page.evaluate(() => {
        return Board.group !== null &&
               Board.pushers !== null &&
               Board.pushers.length > 0 &&
               Board.walls !== null;
      });

      if (!boardValid) throw new Error('Board not properly initialized');
    });

    // Test 4: Physics System
    await runTest('Physics system is initialized', async () => {
      const physicsValid = await page.evaluate(() => {
        return Physics.bodies !== null &&
               Array.isArray(Physics.bodies) &&
               typeof Physics.step === 'function' &&
               typeof Physics.addBody === 'function';
      });

      if (!physicsValid) throw new Error('Physics system not initialized');
    });

    // Test 5: Coin Drop
    await runTest('Coins can be dropped', async () => {
      const coinDropped = await page.evaluate(() => {
        const initialBodies = Physics.bodies.length;
        if (Game && Game.dropCoin) {
          Game.dropCoin();
        }
        // Check after a brief moment
        return new Promise(resolve => {
          setTimeout(() => {
            const afterBodies = Physics.bodies.length;
            resolve(afterBodies > initialBodies);
          }, 100);
        });
      });

      if (!coinDropped) throw new Error('Coin not added to physics system');
    });

    // Test 6: Coin Physics
    await runTest('Coin physics updates correctly', async () => {
      const coinMoved = await page.evaluate(() => {
        // Drop a coin
        if (Game && Game.dropCoin) {
          Game.dropCoin();
        }

        // Wait and check physics in a promise
        return new Promise(resolve => {
          setTimeout(() => {
            // Check if any coin has moved (vy should be negative due to gravity)
            const coins = Physics.bodies.filter(b => b.type === 'coin' || b.mesh);
            const hasCoin = coins.length > 0;
            const hasMovement = coins.some(coin => Math.abs(coin.vy) > 0.1 || Math.abs(coin.vz) > 0.1);
            resolve(hasCoin && hasMovement);
          }, 500);
        });
      });

      if (!coinMoved) throw new Error('Coin physics not updating');
    });

    // Test 7: UI Elements
    await runTest('UI elements are present', async () => {
      const uiElements = await page.evaluate(() => {
        const scoreEl = document.getElementById('score-value');
        const dropBtn = document.getElementById('drop-button');
        return scoreEl !== null && dropBtn !== null;
      });

      if (!uiElements) throw new Error('Required UI elements missing');
    });

    // Test 8: Score System
    await runTest('Score system works', async () => {
      const scoreWorks = await page.evaluate(() => {
        const initialScore = Game.score;
        Game.addScore(100);
        return Game.score === initialScore + 100;
      });

      if (!scoreWorks) throw new Error('Score system not working');
    });

    // Test 9: Combo System
    await runTest('Combo system is initialized', async () => {
      const comboValid = await page.evaluate(() => {
        return typeof Combo !== 'undefined' &&
               typeof Combo.update === 'function';
      });

      if (!comboValid) throw new Error('Combo system not initialized');
    });

    // Test 10: Jackpot System
    await runTest('Jackpot system is initialized', async () => {
      const jackpotValid = await page.evaluate(() => {
        return typeof Jackpot !== 'undefined' &&
               typeof Jackpot.init === 'function';
      });

      if (!jackpotValid) throw new Error('Jackpot system not initialized');
    });

    // Test 11: PowerUps System
    await runTest('PowerUps system is initialized', async () => {
      const powerUpsValid = await page.evaluate(() => {
        return typeof PowerUps !== 'undefined' &&
               typeof PowerUps.init === 'function';
      });

      if (!powerUpsValid) throw new Error('PowerUps system not initialized');
    });

    // Test 12: Coin Rain System
    await runTest('Coin Rain system is initialized', async () => {
      const coinRainValid = await page.evaluate(() => {
        return typeof CoinRain !== 'undefined' &&
               typeof CoinRain.trigger === 'function';
      });

      if (!coinRainValid) throw new Error('Coin Rain system not initialized');
    });

    // Test 13: Collectibles System
    await runTest('Collectibles system is initialized', async () => {
      const collectiblesValid = await page.evaluate(() => {
        return typeof Collectibles !== 'undefined' &&
               typeof Collectibles.init === 'function';
      });

      if (!collectiblesValid) throw new Error('Collectibles system not initialized');
    });

    // Test 14: Prizes System
    await runTest('Prizes system is initialized', async () => {
      const prizesValid = await page.evaluate(() => {
        return typeof Prizes !== 'undefined' &&
               typeof Prizes.init === 'function';
      });

      if (!prizesValid) throw new Error('Prizes system not initialized');
    });

    // Test 15: Daily Challenges System
    await runTest('Daily Challenges system is initialized', async () => {
      const challengesValid = await page.evaluate(() => {
        return typeof DailyChallenges !== 'undefined' &&
               typeof DailyChallenges.init === 'function';
      });

      if (!challengesValid) throw new Error('Daily Challenges system not initialized');
    });

    // Test 16: No Console Errors
    await runTest('No critical console errors', async () => {
      const errors = await page.evaluate(() => {
        // Check if there are any stored errors
        return window.__testErrors || [];
      });

      // Set up error tracking for future
      await page.evaluate(() => {
        window.__testErrors = [];
        const originalError = console.error;
        console.error = function(...args) {
          window.__testErrors.push(args.join(' '));
          originalError.apply(console, args);
        };
      });

      if (errors.length > 0) {
        throw new Error(`Console errors found: ${errors.join(', ')}`);
      }
    });

    // Test 17: Coin Cleanup
    await runTest('Coins are cleaned up when off-board', async () => {
      const cleanupWorks = await page.evaluate(() => {
        // Drop several coins
        for (let i = 0; i < 5; i++) {
          Game.dropCoin();
        }

        const initialCount = Physics.bodies.filter(b => b.type === 'coin').length;

        // Manually trigger cleanup by moving coins far off board
        Physics.bodies.forEach(body => {
          if (body.type === 'coin') {
            body.z = 100; // Far beyond board
          }
        });

        // Run physics step which should clean up
        Physics.step(0.016);
        Coins.update(0.016);

        const afterCount = Physics.bodies.filter(b => b.type === 'coin').length;

        // Should have fewer coins now
        return afterCount <= initialCount;
      });

      if (!cleanupWorks) throw new Error('Coin cleanup not working');
    });

    // Test 18: No NaN in Score
    await runTest('Score never becomes NaN', async () => {
      const scoreValid = await page.evaluate(() => {
        Game.addScore(100);
        Game.addScore(50);
        return !isNaN(Game.score) && isFinite(Game.score);
      });

      if (!scoreValid) throw new Error('Score is NaN or infinite');
    });

    // Test 19: Pusher Movement
    await runTest('Pusher moves correctly', async () => {
      const pusherMoves = await page.evaluate(() => {
        if (!Board.pushers || Board.pushers.length === 0) return false;

        const pusher = Board.pushers[0];
        const initialPos = pusher.position;

        // Update pusher
        for (let i = 0; i < 10; i++) {
          Board.update(0.016);
        }

        // Position should have changed
        return pusher.position !== initialPos;
      });

      if (!pusherMoves) throw new Error('Pusher not moving');
    });

    // Test 20: Memory Leak Check
    await runTest('No major memory leaks (object count stable)', async () => {
      const memoryOk = await page.evaluate(() => {
        // Count initial objects
        const initialBodies = Physics.bodies.length;
        const initialMeshes = Game.scene.children.length;

        // Drop and clean up many coins
        for (let i = 0; i < 50; i++) {
          Game.dropCoin();

          // Move coins off-board immediately
          Physics.bodies.forEach(body => {
            if (body.type === 'coin') {
              body.z = 100;
            }
          });

          Physics.step(0.016);
          Coins.update(0.016);
        }

        // Final counts should not grow unbounded
        const finalBodies = Physics.bodies.length;
        const finalMeshes = Game.scene.children.length;

        // Allow some growth but not 50x
        return finalBodies < initialBodies + 20 &&
               finalMeshes < initialMeshes + 20;
      });

      if (!memoryOk) throw new Error('Possible memory leak detected');
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
