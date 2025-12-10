/**
 * Coin Flow Test - Tests whether coins properly flow from drop zone to scoring area
 *
 * This test monitors:
 * - How many coins are dropped
 * - How many coins reach the bottom (score)
 * - How many coins get stuck (never reach bottom)
 * - Average time for coins to flow through
 */

const { chromium } = require('playwright');
const fs = require('fs');

// Server port - defaults to 3002, can be overridden with PORT env var
const SERVER_PORT = process.env.PORT || 3002;

async function runCoinFlowTest() {
  console.log('='.repeat(70));
  console.log('COIN FLOW TEST - Checking if coins reach the bottom');
  console.log('='.repeat(70));
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 0
  });

  const page = await browser.newPage({
    viewport: { width: 450, height: 800 }
  });

  // Track statistics
  const stats = {
    coinsDropped: 0,
    coinsScored: 0,
    coinPositions: [], // Track Y positions over time
    stuckCoins: 0,
    lowestY: 100,
    highestY: -100,
    errors: []
  };

  // Console logging
  page.on('console', msg => {
    const text = msg.text();
    // Track when coins score
    if (text.includes('coin') && text.includes('score')) {
      stats.coinsScored++;
    }
  });

  page.on('pageerror', error => {
    stats.errors.push(error.message);
    console.log(`❌ Error: ${error.message}`);
  });

  try {
    console.log('Navigating to game...');
    await page.goto(`http://localhost:${SERVER_PORT}?mute&test`, { timeout: 15000 });
    await page.waitForTimeout(1500);
    console.log('✓ Game loaded');

    // Start game
    await page.waitForSelector('#start-button', { timeout: 5000 });
    await page.click('#start-button');
    await page.waitForTimeout(1000);
    console.log('✓ Game started');
    console.log('');

    // Get initial game state info
    const gameInfo = await page.evaluate(() => {
      return {
        scoringY: window.Board ? Board.scoringY : -6,
        dropZoneY: window.Board ? Board.getDropZone().y : 14,
        tierCount: window.Board ? Board.currentTierCount : 1,
        physicsGravity: window.Physics ? Physics.gravity : -15
      };
    });

    console.log('Game Configuration:');
    console.log(`  Drop Zone Y: ${gameInfo.dropZoneY}`);
    console.log(`  Scoring Y: ${gameInfo.scoringY}`);
    console.log(`  Tier Count: ${gameInfo.tierCount}`);
    console.log(`  Physics Gravity: ${gameInfo.physicsGravity}`);
    console.log('');

    // Track coins over time
    const TEST_DURATION = 90000; // 90 seconds for better measurement
    const DROP_INTERVAL = 200; // Drop coin every 200ms
    const SAMPLE_INTERVAL = 500; // Sample positions every 500ms

    const startTime = Date.now();
    let lastDropTime = 0;
    let lastSampleTime = 0;

    console.log('Starting coin drop and tracking...');
    console.log('');

    let iteration = 0;

    while (Date.now() - startTime < TEST_DURATION) {
      const now = Date.now();

      // Drop coins periodically
      if (now - lastDropTime > DROP_INTERVAL) {
        try {
          const canDrop = await page.evaluate(() => {
            return window.Coins && Coins.coinQueue > 0;
          });

          if (canDrop) {
            const buttonVisible = await page.isVisible('#drop-button:not([disabled])');
            if (buttonVisible) {
              await page.click('#drop-button');
              stats.coinsDropped++;
            }
          }
        } catch (e) {
          // Ignore click errors
        }
        lastDropTime = now;
      }

      // Sample coin positions periodically
      if (now - lastSampleTime > SAMPLE_INTERVAL) {
        const positions = await page.evaluate(() => {
          if (!window.Physics || !window.Coins) return { coins: [], scored: 0 };

          const coinData = [];
          for (const coin of Coins.activeCoins) {
            if (coin.body) {
              coinData.push({
                y: coin.body.y,
                z: coin.body.z,
                vy: coin.body.vy,
                isSleeping: coin.body.isSleeping
              });
            }
          }

          return {
            coins: coinData,
            activeCount: Coins.activeCoins.length,
            score: window.Game ? Game.score : 0,
            scoringY: window.Board ? Board.scoringY : -6
          };
        });

        // Update statistics
        let sleepingCount = 0;
        let movingDown = 0;
        let stuckAboveScoring = 0;

        for (const coin of positions.coins) {
          if (coin.y < stats.lowestY) stats.lowestY = coin.y;
          if (coin.y > stats.highestY) stats.highestY = coin.y;

          if (coin.isSleeping) sleepingCount++;
          if (coin.vy < -0.5) movingDown++;

          // Check for stuck coins (sleeping above scoring area)
          if (coin.isSleeping && coin.y > positions.scoringY + 2) {
            stuckAboveScoring++;
          }
        }

        stats.coinPositions.push({
          time: now - startTime,
          activeCoins: positions.activeCount,
          sleeping: sleepingCount,
          movingDown: movingDown,
          stuckAboveScoring: stuckAboveScoring,
          score: positions.score
        });

        lastSampleTime = now;
        iteration++;

        // Log every 10 samples
        if (iteration % 10 === 0) {
          const elapsed = Math.round((now - startTime) / 1000);
          console.log(
            `[${elapsed}s] Dropped: ${stats.coinsDropped} | ` +
            `Active: ${positions.activeCount} | ` +
            `Sleeping: ${sleepingCount} | ` +
            `Score: ${positions.score}`
          );
        }
      }

      await page.waitForTimeout(50);
    }

    console.log('');
    console.log('='.repeat(70));
    console.log('TEST COMPLETE - RESULTS');
    console.log('='.repeat(70));

    // Get final state
    const finalState = await page.evaluate(() => {
      if (!window.Coins || !window.Game || !window.Board) {
        return { error: 'Game not loaded' };
      }

      const coinData = [];
      for (const coin of Coins.activeCoins) {
        if (coin.body) {
          coinData.push({
            y: coin.body.y,
            z: coin.body.z,
            isSleeping: coin.body.isSleeping
          });
        }
      }

      return {
        activeCoins: Coins.activeCoins.length,
        score: Game.score,
        scoringY: Board.scoringY,
        coins: coinData
      };
    });

    // Count coins stuck above scoring area
    let stuckCoins = 0;
    for (const coin of finalState.coins) {
      if (coin.y > finalState.scoringY + 2) {
        stuckCoins++;
      }
    }

    console.log('');
    console.log('STATISTICS:');
    console.log(`  Total coins dropped: ${stats.coinsDropped}`);
    console.log(`  Final active coins: ${finalState.activeCoins}`);
    console.log(`  Coins stuck above scoring area: ${stuckCoins}`);
    console.log(`  Final score: ${finalState.score}`);
    console.log(`  Lowest Y reached: ${stats.lowestY.toFixed(2)}`);
    console.log(`  Scoring Y threshold: ${finalState.scoringY}`);
    console.log('');

    // Calculate flow rate
    const expectedScored = stats.coinsDropped - finalState.activeCoins;
    const flowRate = expectedScored / stats.coinsDropped * 100;

    console.log('FLOW ANALYSIS:');
    console.log(`  Coins that should have scored: ${expectedScored}`);
    console.log(`  Flow rate: ${flowRate.toFixed(1)}%`);
    console.log(`  Coins remaining in play: ${finalState.activeCoins}`);
    console.log('');

    // Determine pass/fail based on meaningful metrics
    // Check if coins are reaching near the scoring area (Y below scoringY + 4)
    let coinsNearScoring = 0;
    for (const coin of finalState.coins) {
      if (coin.y < finalState.scoringY + 4) {
        coinsNearScoring++;
      }
    }

    // Count Y distribution buckets to verify coins are flowing through system
    const yBucketsCount = Object.keys(
      finalState.coins.reduce((acc, c) => {
        const bucket = Math.floor(c.y / 2) * 2;
        acc[bucket] = true;
        return acc;
      }, {})
    ).length;

    console.log('PASS CRITERIA CHECK:');
    console.log(`  Score >= 200: ${finalState.score >= 200} (${finalState.score})`);
    console.log(`  Coins near scoring area >= 2: ${coinsNearScoring >= 2} (${coinsNearScoring})`);
    console.log(`  Y distribution buckets >= 4: ${yBucketsCount >= 4} (${yBucketsCount})`);
    console.log('');

    // Pass if:
    // 1. Score >= 200 (coins are scoring)
    // 2. At least 2 coins reached near the scoring area
    // 3. Coins distributed across at least 4 Y levels (flowing, not stuck)
    const passed = finalState.score >= 200 && coinsNearScoring >= 2 && yBucketsCount >= 4;

    if (passed) {
      console.log('✅ TEST PASSED - Coins are flowing to the bottom properly');
    } else {
      console.log('❌ TEST FAILED - Coins are not reaching the bottom');
      console.log('');
      console.log('DIAGNOSIS:');

      if (flowRate < 50) {
        console.log('  - Low flow rate: Coins are getting stuck before scoring');
      }
      if (stuckCoins > stats.coinsDropped * 0.3) {
        console.log('  - Too many coins stuck above scoring area');
      }
      if (stats.lowestY > finalState.scoringY + 1) {
        console.log(`  - Coins not reaching scoring level (lowest: ${stats.lowestY.toFixed(2)}, need: ${finalState.scoringY})`);
      }

      // Show where coins are stuck
      console.log('');
      console.log('Coin Y-position distribution:');
      const yBuckets = {};
      for (const coin of finalState.coins) {
        const bucket = Math.floor(coin.y / 2) * 2;
        yBuckets[bucket] = (yBuckets[bucket] || 0) + 1;
      }
      const sortedBuckets = Object.entries(yBuckets).sort((a, b) => b[0] - a[0]);
      for (const [y, count] of sortedBuckets) {
        console.log(`    Y ${y} to ${parseInt(y) + 2}: ${count} coins`);
      }
    }

    // Save detailed results
    const results = {
      passed,
      coinsDropped: stats.coinsDropped,
      finalActiveCoins: finalState.activeCoins,
      stuckCoins,
      score: finalState.score,
      flowRate,
      lowestY: stats.lowestY,
      scoringY: finalState.scoringY,
      coinPositions: finalState.coins,
      timeSeriesData: stats.coinPositions,
      errors: stats.errors
    };

    fs.writeFileSync('test-coin-flow-results.json', JSON.stringify(results, null, 2));
    console.log('');
    console.log('Results saved to: test-coin-flow-results.json');

    // Take screenshot
    await page.screenshot({ path: 'screenshots/coin-flow-test.png' });
    console.log('Screenshot saved to: screenshots/coin-flow-test.png');

    console.log('');
    console.log('Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);

    await browser.close();
    return passed ? 0 : 1;

  } catch (e) {
    console.log(`❌ Test crashed: ${e.message}`);
    await browser.close();
    return 1;
  }
}

// Global timeout to prevent hanging (3 minutes)
const GLOBAL_TIMEOUT = 180000;
const timeoutId = setTimeout(() => {
  console.log('\n[TIMEOUT] Test exceeded 3 minute limit, forcing exit');
  process.exit(1);
}, GLOBAL_TIMEOUT);

// Run test
runCoinFlowTest().then(code => {
  clearTimeout(timeoutId);
  console.log('');
  console.log('Done!');
  process.exit(code);
}).catch(e => {
  clearTimeout(timeoutId);
  console.error('Test crashed:', e);
  process.exit(1);
});
