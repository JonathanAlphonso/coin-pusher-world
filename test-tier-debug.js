/**
 * Debug test for tier unlock crash
 * Run with: node test-tier-debug.js
 */

const { chromium } = require('playwright');

// Server port - defaults to 3007, can be overridden with PORT env var
const SERVER_PORT = process.env.PORT || 3002;

async function runTierDebugTest() {
  console.log('='.repeat(60));
  console.log('TIER UNLOCK DEBUG TEST');
  console.log('='.repeat(60));
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });

  const page = await browser.newPage({
    viewport: { width: 800, height: 600 }
  });

  // Capture console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('PAGE ERROR:', error.message);
  });

  await page.goto(`http://localhost:${SERVER_PORT}?mute`);
  console.log(`Loaded game page on port ${SERVER_PORT}`);
  await page.waitForTimeout(1000);

  // Start the game
  await page.click('#start-button');
  console.log('Started game');
  await page.waitForTimeout(1000);

  // Get initial state
  const initialState = await page.evaluate(() => ({
    tiers: Board.currentTierCount,
    maxTiers: Board.maxTiers,
    thresholds: Game.expansionThresholds
  }));
  console.log(`Initial state: ${initialState.tiers} tier(s), max ${initialState.maxTiers}`);
  console.log(`Thresholds: ${initialState.thresholds.join(', ')}`);
  console.log('');

  // Test each tier unlock one by one
  for (let targetTier = 2; targetTier <= 8; targetTier++) {
    console.log(`--- Attempting to unlock tier ${targetTier} ---`);

    try {
      // Set score high enough to unlock the tier
      const result = await page.evaluate((tier) => {
        try {
          const threshold = Game.expansionThresholds[tier - 2];
          if (threshold !== undefined) {
            Game.score = threshold + 10;
            Game.checkExpansion();
          }
          return {
            success: true,
            tiers: Board.currentTierCount,
            score: Game.score,
            pushers: Board.pushers.length,
            spinners: Board.spinners.length,
            sidePushers: Board.sidePushers.length,
            bumpers: Board.bumpers.length,
            bonusZones: Board.bonusZones.length
          };
        } catch (e) {
          return {
            success: false,
            error: e.message,
            stack: e.stack
          };
        }
      }, targetTier);

      if (result.success) {
        console.log(`  Tiers: ${result.tiers}`);
        console.log(`  Pushers: ${result.pushers}, Spinners: ${result.spinners}`);
        console.log(`  Side Pushers: ${result.sidePushers}, Bumpers: ${result.bumpers}`);
        console.log(`  Bonus Zones: ${result.bonusZones}`);
      } else {
        console.log(`  ERROR: ${result.error}`);
        console.log(`  Stack: ${result.stack}`);
      }

      // Wait for animations and rendering
      await page.waitForTimeout(800);

      // Dismiss upgrade menu if visible
      const upgradeVisible = await page.isVisible('#upgrade-menu:not(.hidden)');
      if (upgradeVisible) {
        console.log('  Selecting upgrade...');
        await page.click('.upgrade-option:first-child');
        await page.waitForTimeout(500);
      }

      // Check for errors after each tier
      if (errors.length > 0) {
        console.log(`  ERRORS DETECTED: ${errors.length}`);
        errors.forEach(e => console.log(`    - ${e}`));
      }

    } catch (e) {
      console.log(`  EXCEPTION: ${e.message}`);
    }

    console.log('');
  }

  // Final state
  console.log('='.repeat(60));
  console.log('FINAL STATE');
  console.log('='.repeat(60));

  const finalState = await page.evaluate(() => ({
    tiers: Board.currentTierCount,
    pushers: Board.pushers.length,
    spinners: Board.spinners.length,
    sidePushers: Board.sidePushers.length,
    bumpers: Board.bumpers.length,
    decorations: Board.decorations.length,
    bonusZones: Board.bonusZones.length,
    activeCoins: Coins.activeCoins.length,
    physicsStatic: Physics.staticBodies.length,
    physicsDynamic: Physics.bodies.length
  }));

  console.log(`Tiers: ${finalState.tiers}`);
  console.log(`Pushers: ${finalState.pushers}`);
  console.log(`Spinners: ${finalState.spinners}`);
  console.log(`Side Pushers: ${finalState.sidePushers}`);
  console.log(`Bumpers: ${finalState.bumpers}`);
  console.log(`Decorations: ${finalState.decorations}`);
  console.log(`Bonus Zones: ${finalState.bonusZones}`);
  console.log(`Active Coins: ${finalState.activeCoins}`);
  console.log(`Physics Static: ${finalState.physicsStatic}`);
  console.log(`Physics Dynamic: ${finalState.physicsDynamic}`);

  console.log('');
  console.log(`Total errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log('All errors:');
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  }

  console.log('');
  console.log('Keeping browser open for 30 seconds for inspection...');
  await page.waitForTimeout(30000);

  await browser.close();
  console.log('Test complete!');
}

// Global timeout to prevent hanging (3 minutes)
const GLOBAL_TIMEOUT = 180000;
const timeoutId = setTimeout(() => {
  console.log('\n[TIMEOUT] Test exceeded 3 minute limit, forcing exit');
  process.exit(1);
}, GLOBAL_TIMEOUT);

runTierDebugTest().then(() => {
  clearTimeout(timeoutId);
  process.exit(0);
}).catch(e => {
  clearTimeout(timeoutId);
  console.error('Test failed:', e);
  process.exit(1);
});
