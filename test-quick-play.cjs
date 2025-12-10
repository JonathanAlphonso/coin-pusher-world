/**
 * Quick gameplay test to verify game progression
 */
const { chromium } = require('playwright');

async function quickPlayTest() {
  console.log('='.repeat(50));
  console.log('QUICK GAMEPLAY TEST');
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 450, height: 750 } });

  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      console.log('ERROR:', msg.text());
    }
  });

  const port = process.env.PORT || 3007;
  await page.goto(`http://localhost:${port}?mute&test`);
  await page.waitForTimeout(1500);
  await page.click('#start-button');
  await page.waitForTimeout(500);

  const startTime = Date.now();
  let lastTier = 1;
  let iterations = 0;
  const maxTime = 60000; // 60 seconds max

  console.log('\nPlaying game...\n');

  while (Date.now() - startTime < maxTime) {
    iterations++;

    // Drop coins
    for (let i = 0; i < 3; i++) {
      try {
        await page.click('#drop-button');
        await page.waitForTimeout(80);
      } catch (e) {}
    }

    await page.waitForTimeout(400);

    // Check for upgrade menu and dismiss it
    try {
      const upgradeVisible = await page.isVisible('#upgrade-menu:not(.hidden)');
      if (upgradeVisible) {
        const count = await page.locator('.upgrade-option').count();
        if (count > 0) {
          await page.locator('.upgrade-option').first().click();
          await page.waitForTimeout(300);
          console.log('  -> Selected upgrade');
        }
      }
    } catch (e) {}

    // Check for board selection
    try {
      const boardSelectVisible = await page.isVisible('#board-selection-overlay:not(.hidden)');
      if (boardSelectVisible) {
        const count = await page.locator('.board-option').count();
        if (count > 0) {
          await page.locator('.board-option').first().click();
          await page.waitForTimeout(500);
          console.log('  -> Selected board');
        }
      }
    } catch (e) {}

    // Check for bonus wheel
    try {
      const wheelVisible = await page.isVisible('#bonus-wheel-container:not(.hidden)');
      if (wheelVisible) {
        const spinVisible = await page.isVisible('#spin-wheel-btn:not(.hidden)');
        if (spinVisible) {
          await page.click('#spin-wheel-btn');
          await page.waitForTimeout(6000);
          console.log('  -> Spun bonus wheel');
        }
      }
    } catch (e) {}

    // Get state
    const state = await page.evaluate(() => ({
      score: Game.score,
      tier: Board.currentTierCount,
      coins: Coins.activeCoins.length
    }));

    // Report tier changes
    if (state.tier > lastTier) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`[${elapsed}s] TIER ${state.tier} UNLOCKED! Score: ${state.score}`);
      lastTier = state.tier;
    }

    // Periodic status
    if (iterations % 15 === 0) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`[${elapsed}s] Tier ${state.tier}, Score ${state.score}, Coins ${state.coins}`);
    }

    // Exit early if we've unlocked multiple tiers
    if (state.tier >= 3) {
      console.log('\nReached tier 3! Game is progressing well.');
      break;
    }
  }

  const finalState = await page.evaluate(() => ({
    score: Game.score,
    tier: Board.currentTierCount,
    coins: Coins.activeCoins.length
  }));

  const totalTime = Math.round((Date.now() - startTime) / 1000);

  console.log('\n' + '='.repeat(50));
  console.log('RESULTS');
  console.log('='.repeat(50));
  console.log(`Time: ${totalTime}s`);
  console.log(`Final Tier: ${finalState.tier}`);
  console.log(`Final Score: ${finalState.score}`);
  console.log(`Active Coins: ${finalState.coins}`);
  console.log(`Iterations: ${iterations}`);

  if (finalState.tier >= 2) {
    console.log('\n[PASS] Game is progressing through tiers!');
  } else {
    console.log('\n[WARN] Game did not reach tier 2 in 60 seconds');
  }

  console.log('\nClosing in 5 seconds...');
  await page.waitForTimeout(5000);
  await browser.close();
}

// Global timeout to prevent hanging
const GLOBAL_TIMEOUT = 120000; // 2 minutes
const timeoutId = setTimeout(() => {
  console.log('\n[TIMEOUT] Test exceeded 2 minute limit, forcing exit');
  process.exit(1);
}, GLOBAL_TIMEOUT);

quickPlayTest()
  .then(() => {
    clearTimeout(timeoutId);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    clearTimeout(timeoutId);
    process.exit(1);
  });
