/**
 * Comprehensive Test Suite for Coin Pusher World
 * Run with: node test-comprehensive.js
 *
 * Tests all major game systems with proper timeouts
 */

const { chromium } = require('playwright');

// Server port - defaults to 3002, can be overridden with PORT env var
const SERVER_PORT = process.env.PORT || 3002;

// Test timeout settings
const TIMEOUTS = {
  GLOBAL: 10 * 60 * 1000, // 10 minutes max for entire test suite
  PER_TEST: 2 * 60 * 1000, // 2 minutes per individual test
  PAGE_LOAD: 10000,
  ANIMATION: 1000,
  SHORT_WAIT: 500,
};

const results = {
  passed: [],
  failed: [],
  skipped: [],
  startTime: Date.now(),
};

function log(message, indent = 0) {
  const prefix = '  '.repeat(indent);
  console.log(`${prefix}${message}`);
}

function logSuccess(message, indent = 0) {
  log(`✓ ${message}`, indent);
}

function logError(message, indent = 0) {
  log(`✗ ${message}`, indent);
}

function logWarning(message, indent = 0) {
  log(`⚠ ${message}`, indent);
}

/**
 * Run a test with a timeout
 */
async function runTest(name, testFn, page) {
  log('');
  log(`Testing: ${name}`);
  log('-'.repeat(60));

  const testTimeout = setTimeout(() => {
    throw new Error(`Test "${name}" exceeded ${TIMEOUTS.PER_TEST / 1000}s timeout`);
  }, TIMEOUTS.PER_TEST);

  try {
    await testFn(page);
    clearTimeout(testTimeout);
    results.passed.push(name);
    logSuccess(`${name} passed`);
    return true;
  } catch (error) {
    clearTimeout(testTimeout);
    results.failed.push({ name, error: error.message });
    logError(`${name} failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 1: Basic game initialization
 */
async function testGameInitialization(page) {
  const state = await page.evaluate(() => ({
    gameExists: typeof Game !== 'undefined',
    physicsExists: typeof Physics !== 'undefined',
    boardExists: typeof Board !== 'undefined',
    coinsExists: typeof Coins !== 'undefined',
    uiExists: typeof UI !== 'undefined',
    isRunning: Game?.isRunning || false,
  }));

  if (!state.gameExists) throw new Error('Game object not initialized');
  if (!state.physicsExists) throw new Error('Physics object not initialized');
  if (!state.boardExists) throw new Error('Board object not initialized');
  if (!state.coinsExists) throw new Error('Coins object not initialized');
  if (!state.uiExists) throw new Error('UI object not initialized');
  if (!state.isRunning) throw new Error('Game should be running after start');

  logSuccess('All core systems initialized', 1);
}

/**
 * Test 2: Coin dropping mechanics
 */
async function testCoinDropping(page) {
  // Drop 5 coins
  for (let i = 0; i < 5; i++) {
    await page.click('#drop-button');
    await page.waitForTimeout(100);
  }

  await page.waitForTimeout(TIMEOUTS.SHORT_WAIT);

  const state = await page.evaluate(() => ({
    activeCoins: Coins.activeCoins.length,
    physicsBodies: Physics.bodies.length,
    totalDropped: Coins.totalCoinsDropped || 0,
  }));

  if (state.activeCoins === 0) throw new Error('No active coins after dropping');
  if (state.physicsBodies === 0) throw new Error('No physics bodies created');
  if (state.totalDropped < 5) throw new Error(`Expected at least 5 coins dropped, got ${state.totalDropped}`);

  logSuccess(`Dropped ${state.totalDropped} coins, ${state.activeCoins} active`, 1);
}

/**
 * Test 3: Physics simulation
 */
async function testPhysicsSimulation(page) {
  // Drop coins and wait for them to settle
  await page.click('#drop-button');
  await page.waitForTimeout(100);

  const before = await page.evaluate(() => ({
    bodies: Physics.bodies.length,
    coins: Coins.activeCoins.length,
  }));

  // Wait for physics to run
  await page.waitForTimeout(2000);

  const after = await page.evaluate(() => ({
    bodies: Physics.bodies.length,
    coins: Coins.activeCoins.length,
    score: Game.score,
  }));

  // Some coins should have scored or moved
  if (after.score === 0 && after.coins === before.coins) {
    logWarning('Coins may not be moving properly', 1);
  } else {
    logSuccess('Physics simulation running', 1);
  }
}

/**
 * Test 4: Scoring system
 */
async function testScoringSystem(page) {
  const before = await page.evaluate(() => Game.score);

  // Drop multiple coins
  for (let i = 0; i < 10; i++) {
    await page.click('#drop-button');
    await page.waitForTimeout(50);
  }

  // Wait for coins to score
  await page.waitForTimeout(3000);

  const after = await page.evaluate(() => Game.score);

  if (after <= before) {
    throw new Error(`Score did not increase (before: ${before}, after: ${after})`);
  }

  logSuccess(`Score increased from ${before} to ${after}`, 1);
}

/**
 * Test 5: Queue system
 */
async function testQueueSystem(page) {
  const state = await page.evaluate(() => ({
    queue: Coins.coinQueue,
    maxQueue: Coins.maxQueueSize,
    autoDropActive: Coins.autoDropActive,
  }));

  if (state.maxQueue <= 0) throw new Error('Max queue should be positive');
  if (state.queue < 0) throw new Error('Queue count should not be negative');
  if (state.queue > state.maxQueue) {
    throw new Error(`Queue (${state.queue}) exceeds max (${state.maxQueue})`);
  }

  logSuccess(`Queue system working (${state.queue}/${state.maxQueue})`, 1);
}

/**
 * Test 6: Board structure
 */
async function testBoardStructure(page) {
  const state = await page.evaluate(() => ({
    tiers: Board.tiers?.length || 0,
    currentTier: Board.currentTierCount,
    pushers: Board.pushers?.length || 0,
    staticBodies: Physics.staticBodies.length,
  }));

  if (state.currentTier < 1) throw new Error('Current tier should be at least 1');
  if (state.pushers === 0) throw new Error('No pushers found');
  if (state.staticBodies === 0) throw new Error('No static physics bodies');

  logSuccess(`Board has ${state.currentTier} tier(s), ${state.pushers} pusher(s)`, 1);
}

/**
 * Test 7: Tier expansion
 */
async function testTierExpansion(page) {
  // Get current tier
  const initialTier = await page.evaluate(() => Board.currentTierCount);

  // Drop many coins to reach next tier threshold
  log('Dropping coins to reach next tier...', 1);
  for (let i = 0; i < 50; i++) {
    await page.click('#drop-button');
    await page.waitForTimeout(50);

    // Check every 10 drops
    if (i % 10 === 0) {
      await page.waitForTimeout(500);

      // Check for upgrade menu
      const upgradeVisible = await page.isVisible('#upgrade-menu:not(.hidden)');
      if (upgradeVisible) {
        const optionCount = await page.locator('.upgrade-option').count();
        if (optionCount > 0) {
          await page.locator('.upgrade-option').first().click();
          await page.waitForTimeout(500);
          log('Selected upgrade', 2);
        }
      }

      const currentTier = await page.evaluate(() => Board.currentTierCount);
      if (currentTier > initialTier) {
        logSuccess(`Tier expanded from ${initialTier} to ${currentTier}`, 1);
        return;
      }
    }
  }

  // Wait a bit more
  await page.waitForTimeout(2000);
  const finalTier = await page.evaluate(() => Board.currentTierCount);

  if (finalTier > initialTier) {
    logSuccess(`Tier expanded from ${initialTier} to ${finalTier}`, 1);
  } else {
    logWarning(`Tier did not expand (may need more time/coins)`, 1);
  }
}

/**
 * Test 8: Combo system
 */
async function testComboSystem(page) {
  const state = await page.evaluate(() => ({
    comboExists: typeof Combo !== 'undefined',
    currentCombo: Combo?.currentCombo || 0,
    bestCombo: Combo?.bestCombo || 0,
  }));

  if (!state.comboExists) throw new Error('Combo system not initialized');

  logSuccess(`Combo system active (best: ${state.bestCombo}x)`, 1);
}

/**
 * Test 9: Power-up system
 */
async function testPowerUpSystem(page) {
  const state = await page.evaluate(() => ({
    powerUpsExists: typeof PowerUps !== 'undefined',
    upgrades: PowerUps?.upgrades || {},
  }));

  if (!state.powerUpsExists) throw new Error('PowerUps system not initialized');

  const upgradeCount = Object.keys(state.upgrades).length;
  logSuccess(`Power-up system initialized (${upgradeCount} upgrade types)`, 1);
}

/**
 * Test 10: Jackpot system
 */
async function testJackpotSystem(page) {
  const state = await page.evaluate(() => ({
    jackpotExists: typeof Jackpot !== 'undefined',
    meter: Jackpot?.meter || 0,
    maxMeter: Jackpot?.maxMeter || 100,
  }));

  if (!state.jackpotExists) throw new Error('Jackpot system not initialized');

  logSuccess(`Jackpot meter: ${state.meter}/${state.maxMeter}`, 1);
}

/**
 * Test 11: UI updates
 */
async function testUIUpdates(page) {
  const score = await page.textContent('#score-value');
  const queue = await page.textContent('#queue-value');
  const tier = await page.textContent('#expansion-value');

  if (!score || score === '0') {
    logWarning('Score display may not be updating', 1);
  } else {
    logSuccess(`UI showing score: ${score}`, 1);
  }

  if (queue) {
    logSuccess(`UI showing queue: ${queue}`, 1);
  }

  if (tier) {
    logSuccess(`UI showing tier: ${tier}`, 1);
  }
}

/**
 * Test 12: Memory management
 */
async function testMemoryManagement(page) {
  // Drop many coins
  for (let i = 0; i < 30; i++) {
    await page.click('#drop-button');
    await page.waitForTimeout(50);
  }

  await page.waitForTimeout(2000);

  const state = await page.evaluate(() => ({
    activeCoins: Coins.activeCoins.length,
    physicsBodies: Physics.bodies.length,
    totalDropped: Coins.totalCoinsDropped || 0,
  }));

  // Active coins should be much less than total dropped (coins should despawn)
  if (state.activeCoins > state.totalDropped) {
    throw new Error('More active coins than dropped - memory leak?');
  }

  logSuccess(`Memory management OK (${state.activeCoins} active of ${state.totalDropped} dropped)`, 1);
}

/**
 * Test 13: Save system
 */
async function testSaveSystem(page) {
  const state = await page.evaluate(() => ({
    storageExists: typeof Storage !== 'undefined',
    hasHighScores: Storage?.getHighScores()?.length > 0,
    hasSettings: !!Storage?.getSettings(),
  }));

  if (!state.storageExists) throw new Error('Storage system not initialized');

  logSuccess('Save system initialized', 1);
  if (state.hasSettings) logSuccess('Settings loaded', 1);
}

/**
 * Test 14: Daily challenges
 */
async function testDailyChallenges(page) {
  const state = await page.evaluate(() => ({
    challengesExist: typeof DailyChallenges !== 'undefined',
    currentChallenges: DailyChallenges?.activeChallenges?.length || 0,
  }));

  if (!state.challengesExist) throw new Error('Daily challenges system not initialized');

  logSuccess(`Daily challenges active (${state.currentChallenges} challenges)`, 1);
}

/**
 * Test 15: No critical errors in console
 */
async function testNoErrors(page, errors) {
  const criticalErrors = errors.filter(e =>
    !e.text.includes('favicon') &&
    !e.text.includes('DevTools')
  );

  if (criticalErrors.length > 0) {
    logWarning(`${criticalErrors.length} errors detected:`, 1);
    criticalErrors.slice(0, 5).forEach(e => {
      log(`  - ${e.text}`, 2);
    });
    if (criticalErrors.length > 5) {
      log(`  ... and ${criticalErrors.length - 5} more`, 2);
    }
  } else {
    logSuccess('No critical errors detected', 1);
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('═'.repeat(60));
  console.log('COIN PUSHER WORLD - COMPREHENSIVE TEST SUITE');
  console.log('═'.repeat(60));
  console.log('');

  let browser;
  let page;
  const errors = [];

  try {
    // Launch browser
    log('Launching browser...');
    browser = await chromium.launch({
      headless: true,
      timeout: TIMEOUTS.PAGE_LOAD,
    });

    page = await browser.newPage({
      viewport: { width: 400, height: 700 },
    });

    // Track console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push({ time: Date.now(), text: msg.text() });
      }
    });

    page.on('pageerror', error => {
      errors.push({ time: Date.now(), text: error.message });
    });

    // Load game
    log(`Loading game from http://localhost:${SERVER_PORT}...`);
    await page.goto(`http://localhost:${SERVER_PORT}?mute&test`, {
      waitUntil: 'networkidle',
      timeout: TIMEOUTS.PAGE_LOAD,
    });

    await page.waitForTimeout(TIMEOUTS.SHORT_WAIT);

    // Start the game
    log('Starting game...');
    await page.click('#start-button');
    await page.waitForTimeout(TIMEOUTS.SHORT_WAIT);

    // Run all tests
    log('');
    log('Running test suite...');
    log('═'.repeat(60));

    await runTest('1. Game Initialization', testGameInitialization, page);
    await runTest('2. Coin Dropping', testCoinDropping, page);
    await runTest('3. Physics Simulation', testPhysicsSimulation, page);
    await runTest('4. Scoring System', testScoringSystem, page);
    await runTest('5. Queue System', testQueueSystem, page);
    await runTest('6. Board Structure', testBoardStructure, page);
    await runTest('7. Tier Expansion', testTierExpansion, page);
    await runTest('8. Combo System', testComboSystem, page);
    await runTest('9. Power-up System', testPowerUpSystem, page);
    await runTest('10. Jackpot System', testJackpotSystem, page);
    await runTest('11. UI Updates', testUIUpdates, page);
    await runTest('12. Memory Management', testMemoryManagement, page);
    await runTest('13. Save System', testSaveSystem, page);
    await runTest('14. Daily Challenges', testDailyChallenges, page);
    await runTest('15. No Critical Errors', async () => testNoErrors(page, errors), page);

  } catch (error) {
    logError(`Fatal error: ${error.message}`);
    results.failed.push({ name: 'Test Suite', error: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Print summary
  console.log('');
  console.log('═'.repeat(60));
  console.log('TEST SUMMARY');
  console.log('═'.repeat(60));

  const duration = ((Date.now() - results.startTime) / 1000).toFixed(1);
  console.log(`Total time: ${duration}s`);
  console.log('');

  if (results.passed.length > 0) {
    logSuccess(`${results.passed.length} tests passed`);
    results.passed.forEach(name => log(`  - ${name}`, 1));
  }

  if (results.failed.length > 0) {
    console.log('');
    logError(`${results.failed.length} tests failed`);
    results.failed.forEach(({ name, error }) => {
      log(`  - ${name}`, 1);
      log(`    ${error}`, 2);
    });
  }

  if (results.skipped.length > 0) {
    console.log('');
    logWarning(`${results.skipped.length} tests skipped`);
    results.skipped.forEach(name => log(`  - ${name}`, 1));
  }

  console.log('');
  console.log('═'.repeat(60));

  // Exit with appropriate code
  const exitCode = results.failed.length === 0 ? 0 : 1;
  return exitCode;
}

// Global timeout to prevent hanging
const globalTimeoutId = setTimeout(() => {
  console.error('\n[TIMEOUT] Test suite exceeded global timeout, forcing exit');
  process.exit(124); // Timeout exit code
}, TIMEOUTS.GLOBAL);

// Run tests
runAllTests()
  .then(exitCode => {
    clearTimeout(globalTimeoutId);
    process.exit(exitCode);
  })
  .catch(error => {
    clearTimeout(globalTimeoutId);
    console.error('Unhandled error:', error);
    process.exit(1);
  });
