/**
 * Comprehensive freeze debugging test - simulates a real player session
 * and monitors for freezes/hangs
 */

const { chromium } = require('playwright');

// Server port - defaults to 3009, can be overridden with PORT env var
const SERVER_PORT = process.env.PORT || 3002;

async function runFreezeTest() {
  console.log('='.repeat(60));
  console.log('FREEZE DEBUGGING TEST');
  console.log('Playing game like a real user to find freeze issues');
  console.log('='.repeat(60));
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 10
  });

  const page = await browser.newPage({
    viewport: { width: 400, height: 700 }
  });

  // Track errors and warnings
  const errors = [];
  const warnings = [];
  let lastActivityTime = Date.now();

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('favicon')) {
      errors.push({ time: Date.now(), text });
      console.log('❌ ERROR:', text);
    } else if (msg.type() === 'warn') {
      warnings.push({ time: Date.now(), text });
    }
  });

  page.on('pageerror', error => {
    errors.push({ time: Date.now(), text: error.message });
    console.log('❌ PAGE ERROR:', error.message);
  });

  try {
    console.log('Navigating to game...');
    await page.goto(`http://localhost:${SERVER_PORT}?mute&test`, { timeout: 10000 });
    console.log('✓ Game loaded');
    await page.waitForTimeout(1500);

    // Wait for start button and click it
    console.log('Looking for start button...');
    await page.waitForSelector('#start-button', { timeout: 5000 });
    await page.click('#start-button');
    console.log('✓ Game started');
    await page.waitForTimeout(1000);

    let lastTier = 1;
    let dropCount = 0;
    let lastScore = 0;
    let stuckCounter = 0;
    let gameTime = 0;
    const startTime = Date.now();
    const maxDuration = 180000; // 3 minutes max

    // Helper to check game state
    async function checkState() {
      try {
        return await page.evaluate(() => {
          return {
            score: window.Game ? Game.score : -1,
            tier: window.Board ? Board.currentTierCount : -1,
            activeCoins: window.Coins ? Coins.activeCoins.length : -1,
            queue: window.Coins ? Coins.coinQueue : -1,
            isRunning: window.Game ? Game.isRunning : false,
            isPaused: window.Game ? Game.isPaused : true,
            physicsStatic: window.Physics ? Physics.staticBodies.length : -1,
            physicsDynamic: window.Physics ? Physics.bodies.length : -1,
            animationFrame: window.Game ? Game.animationFrameId : null,
          };
        });
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
            const idx = Math.floor(Math.random() * optionCount);
            await page.locator('.upgrade-option').nth(idx).click();
            await page.waitForTimeout(300);
            console.log('  → Selected upgrade option');
            lastActivityTime = Date.now();
            return true;
          }
        }
      } catch (e) {
        console.log('  ⚠ Error handling upgrade menu:', e.message);
      }
      return false;
    }

    // Helper to handle bonus wheel
    async function checkBonusWheel() {
      try {
        const wheelVisible = await page.isVisible('#bonus-wheel-container:not(.hidden)');
        if (wheelVisible) {
          console.log('  🎡 Bonus wheel appeared!');
          const spinVisible = await page.isVisible('#spin-wheel-btn:not(.hidden)');
          if (spinVisible) {
            await page.click('#spin-wheel-btn');
            console.log('  → Spinning wheel...');
            await page.waitForTimeout(7000);
            lastActivityTime = Date.now();
            return true;
          }
        }
      } catch (e) {
        console.log('  ⚠ Error handling bonus wheel:', e.message);
      }
      return false;
    }

    // Helper to check for any blocking modals/dialogs
    async function checkBlockingUI() {
      try {
        // Check for various possible blocking elements
        const selectors = [
          '#upgrade-menu:not(.hidden)',
          '#bonus-wheel-container:not(.hidden)',
          '#game-over-screen:not(.hidden)',
          '.modal:not(.hidden)',
          '[data-modal]:not(.hidden)'
        ];

        for (const sel of selectors) {
          try {
            if (await page.isVisible(sel)) {
              console.log(`  ⚠ Blocking UI found: ${sel}`);
              return sel;
            }
          } catch (e) {}
        }
      } catch (e) {}
      return null;
    }

    console.log('');
    console.log('Starting gameplay simulation...');
    console.log('');

    let iteration = 0;

    while (Date.now() - startTime < maxDuration) {
      iteration++;
      gameTime = Math.round((Date.now() - startTime) / 1000);

      try {
        // Check for bonus wheel first (blocks gameplay)
        const hadWheel = await checkBonusWheel();
        if (hadWheel) continue;

        // Check for upgrade menu
        const hadUpgrade = await checkUpgradeMenu();
        if (hadUpgrade) continue;

        // Check for any other blocking UI
        const blockingUI = await checkBlockingUI();
        if (blockingUI) {
          console.log(`[${gameTime}s] Waiting for blocking UI to clear...`);
          await page.waitForTimeout(500);
          continue;
        }

        // Drop coins (like a player tapping)
        const dropBurst = 2 + Math.floor(Math.random() * 3); // 2-4 drops
        for (let d = 0; d < dropBurst; d++) {
          try {
            // Check if button exists and is clickable
            const buttonVisible = await page.isVisible('#drop-button:not([disabled])');
            if (buttonVisible) {
              await page.click('#drop-button');
              dropCount++;
              lastActivityTime = Date.now();
              await page.waitForTimeout(80 + Math.random() * 80);
            }
          } catch (e) {
            // Button might not be clickable
          }
        }

        // Wait for physics
        await page.waitForTimeout(400 + Math.random() * 300);

        // Get current state
        const state = await checkState();

        if (state.error) {
          console.log(`[${gameTime}s] ❌ ERROR getting state: ${state.error}`);
          break;
        }

        // Check for freeze (score hasn't changed, coins aren't moving)
        if (state.score === lastScore && state.activeCoins > 0) {
          stuckCounter++;
        } else {
          stuckCounter = 0;
        }
        lastScore = state.score;

        // Report on tier changes
        if (state.tier > lastTier) {
          console.log(`[${gameTime}s] 🎉 TIER ${state.tier} UNLOCKED! Score: ${state.score}, Active Coins: ${state.activeCoins}`);
          lastTier = state.tier;
          await page.waitForTimeout(1000);
          await checkUpgradeMenu();
        }

        // Periodic status report
        if (iteration % 15 === 0) {
          console.log(`[${gameTime}s] Tier ${state.tier} | Score ${state.score} | Coins: ${state.activeCoins} active, ${state.queue} queue`);
          console.log(`         Physics: ${state.physicsStatic} static, ${state.physicsDynamic} dynamic | Running: ${state.isRunning}, Paused: ${state.isPaused}`);
        }

        // Check for potential freeze
        if (stuckCounter > 10) {
          console.log(`[${gameTime}s] ⚠️ POTENTIAL FREEZE DETECTED!`);
          console.log(`         Score hasn't changed for ${stuckCounter} iterations`);
          console.log(`         State:`, JSON.stringify(state, null, 2));

          // Take screenshot
          await page.screenshot({ path: `freeze-${gameTime}s.png` });
          console.log(`         Screenshot saved: freeze-${gameTime}s.png`);

          // Check for blocking UI
          const blocker = await checkBlockingUI();
          if (blocker) {
            console.log(`         Blocking UI: ${blocker}`);
          }

          stuckCounter = 0; // Reset counter
        }

        // Check if game is still running
        if (!state.isRunning && !state.isPaused) {
          console.log(`[${gameTime}s] ⚠ Game stopped running!`);
          console.log(`         State:`, JSON.stringify(state, null, 2));

          // Check for game over
          const gameOverVisible = await page.isVisible('#game-over-screen:not(.hidden)');
          if (gameOverVisible) {
            console.log(`[${gameTime}s] Game Over screen is visible`);
          }
          break;
        }

        // Check if we've played enough after reaching tier 8
        if (state.tier >= 8 && gameTime > 120) {
          console.log(`[${gameTime}s] ✓ Reached tier 8 and played for 2+ minutes, ending test`);
          break;
        }

      } catch (e) {
        console.log(`[${gameTime}s] ❌ Exception: ${e.message}`);
        errors.push({ time: Date.now(), text: e.message });
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
    console.log(`Final tier: ${finalState.tier}`);
    console.log(`Final score: ${finalState.score}`);
    console.log(`Active coins: ${finalState.activeCoins}`);
    console.log(`Console errors: ${errors.length}`);
    console.log(`Console warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('');
      console.log('Errors encountered:');
      errors.slice(0, 20).forEach((e, i) => {
        const elapsed = Math.round((e.time - startTime) / 1000);
        console.log(`  ${i + 1}. [${elapsed}s] ${e.text.substring(0, 100)}`);
      });
    }

    console.log('');
    console.log('Keeping browser open for 15 seconds for inspection...');
    await page.waitForTimeout(15000);

  } catch (e) {
    console.log('❌ Test failed:', e.message);
    await page.screenshot({ path: 'test-failure.png' });
    console.log('Screenshot saved: test-failure.png');
  }

  await browser.close();
  console.log('Done!');
}

// Global timeout to prevent hanging (5 minutes)
const GLOBAL_TIMEOUT = 300000;
const timeoutId = setTimeout(() => {
  console.log('\n[TIMEOUT] Test exceeded 5 minute limit, forcing exit');
  process.exit(1);
}, GLOBAL_TIMEOUT);

runFreezeTest().then(() => {
  clearTimeout(timeoutId);
  process.exit(0);
}).catch(e => {
  clearTimeout(timeoutId);
  console.error('Test crashed:', e);
  process.exit(1);
});
