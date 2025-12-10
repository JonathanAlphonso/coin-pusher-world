/**
 * Realistic gameplay test - simulates a real player session
 * Run with: node test-realistic-play.js
 */

const { chromium } = require('playwright');

// Server port - defaults to 3002, can be overridden with PORT env var
const SERVER_PORT = process.env.PORT || 3002;

async function runRealisticTest() {
  console.log('='.repeat(60));
  console.log('REALISTIC GAMEPLAY TEST');
  console.log('Testing extended play through all tiers');
  console.log('='.repeat(60));
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 20
  });

  const page = await browser.newPage({
    viewport: { width: 400, height: 700 } // Mobile-like size
  });

  // Track errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      errors.push({ time: Date.now(), text: msg.text() });
      console.log('ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    errors.push({ time: Date.now(), text: error.message });
    console.log('PAGE ERROR:', error.message);
  });

  await page.goto(`http://localhost:${SERVER_PORT}?mute`);
  console.log(`Loaded game on port ${SERVER_PORT}`);
  await page.waitForTimeout(1000);

  // Start the game
  await page.click('#start-button');
  console.log('Started game');
  await page.waitForTimeout(500);

  let lastTier = 1;
  let dropCount = 0;
  let gameTime = 0;
  const startTime = Date.now();

  // Helper to check game state
  async function checkState() {
    try {
      return await page.evaluate(() => ({
        score: Game.score,
        tier: Board.currentTierCount,
        activeCoins: Coins.activeCoins.length,
        queue: Coins.coinQueue,
        isRunning: Game.isRunning,
        physicsStatic: Physics.staticBodies.length,
        physicsDynamic: Physics.bodies.length
      }));
    } catch (e) {
      return { error: e.message };
    }
  }

  // Helper to dismiss upgrade menu
  async function checkUpgradeMenu() {
    try {
      const visible = await page.isVisible('#upgrade-menu:not(.hidden)');
      if (visible) {
        const optionCount = await page.locator('.upgrade-option').count();
        if (optionCount > 0) {
          // Pick a random upgrade
          const idx = Math.floor(Math.random() * optionCount);
          await page.locator('.upgrade-option').nth(idx).click();
          await page.waitForTimeout(300);
          console.log('  Selected upgrade option');
        }
      }
    } catch (e) {
      console.log('  Error handling upgrade menu:', e.message);
    }
  }

  // Helper to handle bonus wheel
  async function checkBonusWheel() {
    try {
      const wheelVisible = await page.isVisible('#bonus-wheel-container:not(.hidden)');
      if (wheelVisible) {
        console.log('  Bonus wheel appeared!');
        // Click spin button if visible
        const spinVisible = await page.isVisible('#spin-wheel-btn:not(.hidden)');
        if (spinVisible) {
          await page.click('#spin-wheel-btn');
          console.log('  Spinning wheel...');
          // Wait for spin animation (4 seconds) plus result display (2 seconds)
          await page.waitForTimeout(7000);
        }
      }
    } catch (e) {
      console.log('  Error handling bonus wheel:', e.message);
    }
  }

  console.log('');
  console.log('Starting gameplay simulation...');
  console.log('');

  // Play until we reach tier 8 or hit max iterations
  const maxIterations = 200;
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;
    gameTime = Math.round((Date.now() - startTime) / 1000);

    try {
      // Drop coins (like a player tapping the button)
      const dropBurst = 3 + Math.floor(Math.random() * 3); // 3-5 drops
      for (let d = 0; d < dropBurst; d++) {
        try {
          await page.click('#drop-button');
          dropCount++;
          await page.waitForTimeout(100 + Math.random() * 100); // Variable timing
        } catch (e) {
          // Button might not be clickable
        }
      }

      // Wait for physics to settle
      await page.waitForTimeout(500 + Math.random() * 500);

      // Check for bonus wheel first (blocks gameplay)
      await checkBonusWheel();

      // Check for upgrade menu
      await checkUpgradeMenu();

      // Get current state
      const state = await checkState();

      if (state.error) {
        console.log(`[${gameTime}s] ERROR getting state: ${state.error}`);
        break;
      }

      // Report on tier changes
      if (state.tier > lastTier) {
        console.log(`[${gameTime}s] NEW TIER ${state.tier} unlocked! Score: ${state.score}, Coins: ${state.activeCoins}`);
        lastTier = state.tier;

        // Wait for tier animation
        await page.waitForTimeout(1000);
        await checkUpgradeMenu();
      }

      // Periodic status report
      if (iteration % 20 === 0) {
        console.log(`[${gameTime}s] Iter ${iteration}: Tier ${state.tier}, Score ${state.score}, Coins ${state.activeCoins}, Queue ${state.queue}`);
        console.log(`         Physics: ${state.physicsStatic} static, ${state.physicsDynamic} dynamic`);
      }

      // Check if game is still running
      if (!state.isRunning) {
        console.log(`[${gameTime}s] Game stopped running!`);
        break;
      }

      // Exit if we've reached tier 8 and played a bit more
      if (state.tier >= 8 && iteration > 150) {
        console.log(`[${gameTime}s] Reached tier 8, continuing play test...`);
        break;
      }

    } catch (e) {
      console.log(`[${gameTime}s] Exception: ${e.message}`);
      errors.push({ time: Date.now(), text: e.message });

      // Try to recover
      await page.waitForTimeout(1000);
    }
  }

  // Final state
  console.log('');
  console.log('='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));

  const finalState = await checkState();
  console.log(`Total time: ${gameTime} seconds`);
  console.log(`Total drops: ${dropCount}`);
  console.log(`Final tier: ${finalState.tier || 'unknown'}`);
  console.log(`Final score: ${finalState.score || 'unknown'}`);
  console.log(`Active coins: ${finalState.activeCoins || 'unknown'}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('');
    console.log('Errors encountered:');
    errors.forEach((e, i) => {
      const elapsed = Math.round((e.time - startTime) / 1000);
      console.log(`  ${i + 1}. [${elapsed}s] ${e.text}`);
    });
  }

  console.log('');
  console.log('Keeping browser open for 20 seconds for inspection...');
  await page.waitForTimeout(20000);

  await browser.close();
  console.log('Done!');
}

// Global timeout to prevent hanging (5 minutes)
const GLOBAL_TIMEOUT = 300000;
const timeoutId = setTimeout(() => {
  console.log('\n[TIMEOUT] Test exceeded 5 minute limit, forcing exit');
  process.exit(1);
}, GLOBAL_TIMEOUT);

runRealisticTest().then(() => {
  clearTimeout(timeoutId);
  process.exit(0);
}).catch(e => {
  clearTimeout(timeoutId);
  console.error('Test failed:', e);
  process.exit(1);
});
