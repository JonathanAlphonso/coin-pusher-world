/**
 * Full Playthrough Test - Plays the game naturally until all 8 boards are unlocked
 * Drops coins, selects boards, handles bonus wheels and upgrades
 */

const { chromium } = require('playwright');
const fs = require('fs');

// Server port - defaults to 3002, can be overridden with PORT env var
const SERVER_PORT = process.env.PORT || 3002;

const TARGET_BOARDS = 8;
const MAX_DURATION = 600000; // 10 minutes max
const SCORE_THRESHOLDS = [10000, 25000, 45000, 70000, 100000, 140000, 190000, 250000];

async function runFullPlaythrough() {
  console.log('='.repeat(70));
  console.log('COIN PUSHER WORLD - FULL PLAYTHROUGH TEST');
  console.log('Playing the game naturally until all 8 boards are unlocked');
  console.log('='.repeat(70));
  console.log('');

  // Create screenshots directory
  const screenshotDir = 'screenshots/full-playthrough';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: false,
    slowMo: 5
  });

  const page = await browser.newPage({
    viewport: { width: 450, height: 800 }
  });

  // Track game state
  const stats = {
    startTime: Date.now(),
    coinsDropped: 0,
    boardsUnlocked: 1,
    themesSelected: [],
    prizesSelected: 0,
    bonusWheelsSpun: 0,
    upgradesSelected: 0,
    errors: [],
    scoreHistory: []
  };

  // Console logging
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      stats.errors.push({ time: elapsed(), text: msg.text() });
    }
  });

  page.on('pageerror', error => {
    stats.errors.push({ time: elapsed(), text: error.message });
    console.log(`[${elapsed()}s] ❌ PAGE ERROR: ${error.message}`);
  });

  function elapsed() {
    return Math.round((Date.now() - stats.startTime) / 1000);
  }

  // Helper to get game state
  async function getState() {
    try {
      return await page.evaluate(() => ({
        score: window.Game ? Game.score : 0,
        tierCount: window.Board ? Board.currentTierCount : 1,
        activeCoins: window.Coins ? Coins.activeCoins.length : 0,
        coinQueue: window.Coins ? Coins.coinQueue : 0,
        isRunning: window.Game ? Game.isRunning : false,
        isPaused: window.Game ? Game.isPaused : true,
        expansionIndex: window.Game ? Game.currentExpansionIndex : 0,
        usedThemes: window.Board && Board.usedThemeIndices ? [...Board.usedThemeIndices] : [],
        themes: window.Board && Board.tiers ?
          Board.tiers.filter(t => t.theme).map(t => t.theme.name) : []
      }));
    } catch (e) {
      return { error: e.message };
    }
  }

  // Helper to drop coins
  async function dropCoins(count) {
    for (let i = 0; i < count; i++) {
      try {
        const canDrop = await page.evaluate(() => {
          return window.Coins && Coins.coinQueue > 0;
        });

        if (canDrop) {
          const buttonVisible = await page.isVisible('#drop-button:not([disabled])');
          if (buttonVisible) {
            await page.click('#drop-button');
            stats.coinsDropped++;
            await page.waitForTimeout(60 + Math.random() * 40);
          }
        } else {
          // Wait a bit for coins to refill
          await page.waitForTimeout(200);
        }
      } catch (e) {
        // Button might not be ready
      }
    }
  }

  // Helper to handle board selection
  async function handleBoardSelection() {
    try {
      const visible = await page.isVisible('#board-selection-overlay:not(.hidden)');
      if (!visible) return false;

      console.log(`[${elapsed()}s] 📋 Board selection appeared!`);
      await page.screenshot({ path: `${screenshotDir}/board-${stats.boardsUnlocked + 1}-selection.png` });

      // Get available options
      const options = await page.evaluate(() => {
        const opts = document.querySelectorAll('.board-option');
        return Array.from(opts).map(el => ({
          index: el.dataset.themeIndex,
          name: el.querySelector('.board-option-name')?.textContent || 'Unknown'
        }));
      });

      if (options.length === 0) {
        console.log(`[${elapsed()}s] ⚠ No board options found, waiting...`);
        await page.waitForTimeout(500);
        return true;
      }

      // Select a theme we haven't used (prefer first unused)
      let selectedOption = options[0];
      for (const opt of options) {
        if (!stats.themesSelected.includes(opt.name)) {
          selectedOption = opt;
          break;
        }
      }

      console.log(`[${elapsed()}s] → Selecting: ${selectedOption.name}`);
      stats.themesSelected.push(selectedOption.name);

      await page.click(`.board-option[data-theme-index="${selectedOption.index}"]`, { timeout: 5000 });
      await page.waitForTimeout(2500); // Wait for expansion animation

      stats.boardsUnlocked++;
      console.log(`[${elapsed()}s] ✅ Board ${stats.boardsUnlocked} unlocked with ${selectedOption.name}!`);

      await page.screenshot({ path: `${screenshotDir}/board-${stats.boardsUnlocked}-unlocked.png` });
      return true;
    } catch (e) {
      console.log(`[${elapsed()}s] ⚠ Board selection error: ${e.message}`);
      return false;
    }
  }

  // Helper to handle prize counter
  async function handlePrizeCounter() {
    try {
      const visible = await page.isVisible('#prize-counter-overlay:not(.hidden)');
      if (!visible) return false;

      console.log(`[${elapsed()}s] 🎁 Prize counter appeared!`);

      const optionCount = await page.locator('.prize-option').count();
      if (optionCount > 0) {
        const idx = Math.floor(Math.random() * optionCount);
        await page.locator('.prize-option').nth(idx).click();
        stats.prizesSelected = (stats.prizesSelected || 0) + 1;
        console.log(`[${elapsed()}s] → Selected prize`);
        await page.waitForTimeout(500);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // Helper to handle bonus wheel (legacy - may not be in game)
  async function handleBonusWheel() {
    try {
      const visible = await page.isVisible('#bonus-wheel-container:not(.hidden)');
      if (!visible) return false;

      console.log(`[${elapsed()}s] 🎡 Bonus wheel appeared!`);

      const spinVisible = await page.isVisible('#spin-wheel-btn:not(.hidden)');
      if (spinVisible) {
        await page.click('#spin-wheel-btn');
        console.log(`[${elapsed()}s] → Spinning wheel...`);
        stats.bonusWheelsSpun++;
        await page.waitForTimeout(6000); // Wait for spin animation
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // Helper to handle upgrade menu
  async function handleUpgradeMenu() {
    try {
      const visible = await page.isVisible('#upgrade-menu:not(.hidden)');
      if (!visible) return false;

      console.log(`[${elapsed()}s] ⬆️ Upgrade menu appeared!`);

      const optionCount = await page.locator('.upgrade-option').count();
      if (optionCount > 0) {
        const idx = Math.floor(Math.random() * optionCount);
        await page.locator('.upgrade-option').nth(idx).click();
        stats.upgradesSelected++;
        console.log(`[${elapsed()}s] → Selected upgrade`);
        await page.waitForTimeout(500);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  try {
    // Navigate and start game
    console.log('Navigating to game...');
    await page.goto(`http://localhost:${SERVER_PORT}?mute&test`, { timeout: 15000 });
    await page.waitForTimeout(1500);
    console.log('✓ Game loaded');

    // Click start button
    await page.waitForSelector('#start-button', { timeout: 5000 });
    await page.click('#start-button');
    await page.waitForTimeout(1000);
    console.log('✓ Game started');
    console.log('');

    await page.screenshot({ path: `${screenshotDir}/00-game-started.png` });

    // Get initial theme
    const initialState = await getState();
    if (initialState.themes.length > 0) {
      stats.themesSelected.push(initialState.themes[0]);
      console.log(`[${elapsed()}s] Starting theme: ${initialState.themes[0]}`);
    }

    console.log('');
    console.log('Starting gameplay loop...');
    console.log(`Score thresholds for new boards: ${SCORE_THRESHOLDS.join(', ')}`);
    console.log('');

    let lastTierCount = 1;
    let lastScore = 0;
    let iteration = 0;
    let stuckCount = 0;

    // Main game loop
    while (Date.now() - stats.startTime < MAX_DURATION) {
      iteration++;

      // Check for blocking UI elements first
      const hadBoardSelection = await handleBoardSelection();
      if (hadBoardSelection) continue;

      const hadPrize = await handlePrizeCounter();
      if (hadPrize) continue;

      const hadWheel = await handleBonusWheel();
      if (hadWheel) continue;

      const hadUpgrade = await handleUpgradeMenu();
      if (hadUpgrade) continue;

      // Drop coins in bursts (simulates natural gameplay)
      const dropBurst = 3 + Math.floor(Math.random() * 4); // 3-6 coins
      await dropCoins(dropBurst);

      // Wait for physics and coins to settle
      await page.waitForTimeout(300 + Math.random() * 200);

      // Get current state
      const state = await getState();
      if (state.error) {
        console.log(`[${elapsed()}s] ❌ Error getting state: ${state.error}`);
        break;
      }

      // Detect tier change
      if (state.tierCount > lastTierCount) {
        console.log(`[${elapsed()}s] 🎉 TIER ${state.tierCount} UNLOCKED! Score: ${state.score}`);
        lastTierCount = state.tierCount;
        stats.boardsUnlocked = state.tierCount;

        // Check for board selection that might have appeared
        await page.waitForTimeout(500);
        await handleBoardSelection();
      }

      // Track score changes
      if (state.score !== lastScore) {
        stuckCount = 0;
        lastScore = state.score;
      } else if (state.activeCoins > 0) {
        stuckCount++;
      }

      // Periodic status update
      if (iteration % 20 === 0) {
        const nextThreshold = SCORE_THRESHOLDS[state.expansionIndex] || 'MAX';
        const progress = typeof nextThreshold === 'number'
          ? Math.round((state.score / nextThreshold) * 100)
          : 100;

        console.log(
          `[${elapsed()}s] Board ${state.tierCount}/8 | ` +
          `Score: ${state.score}/${nextThreshold} (${progress}%) | ` +
          `Coins: ${stats.coinsDropped} dropped, ${state.activeCoins} active`
        );

        stats.scoreHistory.push({
          time: elapsed(),
          score: state.score,
          tier: state.tierCount
        });
      }

      // Check if potentially stuck
      if (stuckCount > 20) {
        console.log(`[${elapsed()}s] ⚠ Game may be stuck, taking screenshot...`);
        await page.screenshot({ path: `${screenshotDir}/stuck-${elapsed()}s.png` });
        stuckCount = 0;
      }

      // Success condition - all 8 boards unlocked
      if (state.tierCount >= TARGET_BOARDS) {
        console.log('');
        console.log(`[${elapsed()}s] 🏆 ALL ${TARGET_BOARDS} BOARDS UNLOCKED!`);
        break;
      }

      // Check if game is still running
      if (!state.isRunning && !state.isPaused) {
        const gameOver = await page.isVisible('#game-over-screen:not(.hidden)');
        if (gameOver) {
          console.log(`[${elapsed()}s] Game Over!`);
          break;
        }
      }
    }

    // Final state and summary
    console.log('');
    console.log('='.repeat(70));
    console.log('PLAYTHROUGH COMPLETE');
    console.log('='.repeat(70));

    const finalState = await getState();
    await page.screenshot({ path: `${screenshotDir}/final-state.png` });

    console.log('');
    console.log('STATISTICS:');
    console.log(`  Duration: ${elapsed()} seconds`);
    console.log(`  Coins dropped: ${stats.coinsDropped}`);
    console.log(`  Final score: ${finalState.score}`);
    console.log(`  Boards unlocked: ${finalState.tierCount}/${TARGET_BOARDS}`);
    console.log(`  Prizes selected: ${stats.prizesSelected}`);
    console.log(`  Bonus wheels spun: ${stats.bonusWheelsSpun}`);
    console.log(`  Upgrades selected: ${stats.upgradesSelected}`);
    console.log('');
    console.log('THEMES SELECTED:');
    stats.themesSelected.forEach((theme, idx) => {
      console.log(`  Board ${idx + 1}: ${theme}`);
    });

    if (stats.errors.length > 0) {
      console.log('');
      console.log('ERRORS:');
      stats.errors.slice(0, 10).forEach(e => {
        console.log(`  [${e.time}s] ${e.text.substring(0, 80)}`);
      });
    }

    // Determine pass/fail
    const passed = finalState.tierCount >= TARGET_BOARDS;
    console.log('');
    if (passed) {
      console.log('✅ TEST PASSED - All 8 boards successfully unlocked!');
    } else {
      console.log(`❌ TEST FAILED - Only reached ${finalState.tierCount}/${TARGET_BOARDS} boards`);
    }

    // Save results
    const results = {
      passed,
      duration: elapsed(),
      finalScore: finalState.score,
      boardsUnlocked: finalState.tierCount,
      coinsDropped: stats.coinsDropped,
      themesSelected: stats.themesSelected,
      prizesSelected: stats.prizesSelected,
      bonusWheelsSpun: stats.bonusWheelsSpun,
      upgradesSelected: stats.upgradesSelected,
      scoreHistory: stats.scoreHistory,
      errors: stats.errors
    };

    fs.writeFileSync('test-full-playthrough-results.json', JSON.stringify(results, null, 2));
    console.log('');
    console.log(`Screenshots saved to: ${screenshotDir}/`);
    console.log('Results saved to: test-full-playthrough-results.json');

    // Keep browser open briefly to see final state
    console.log('');
    console.log('Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);

    await browser.close();
    return passed ? 0 : 1;

  } catch (e) {
    console.log(`❌ Test failed: ${e.message}`);
    await page.screenshot({ path: `${screenshotDir}/error.png` }).catch(() => {});
    await browser.close();
    return 1;
  }
}

// Global timeout to prevent hanging (10 minutes for full playthrough)
const GLOBAL_TIMEOUT = 600000;
const timeoutId = setTimeout(() => {
  console.log('\n[TIMEOUT] Test exceeded 10 minute limit, forcing exit');
  process.exit(1);
}, GLOBAL_TIMEOUT);

// Run the test
runFullPlaythrough().then(code => {
  clearTimeout(timeoutId);
  console.log('');
  console.log('Done!');
  process.exit(code);
}).catch(e => {
  clearTimeout(timeoutId);
  console.error('Test crashed:', e);
  process.exit(1);
});
