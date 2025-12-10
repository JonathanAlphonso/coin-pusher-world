/**
 * Coin Path Tracking Test
 * Tests the path tracking system for coins according to design spec section 7.1
 *
 * Tests:
 * - Coins have pathBoards, pathEvents, and pathMultiplier fields
 * - Board visits are recorded correctly
 * - Path events are recorded with proper multipliers
 * - calculateCoinScore uses path multipliers
 * - Path summary provides useful debug info
 */

const { chromium } = require('playwright');

const SERVER_PORT = process.env.PORT || 3003;
const TEST_TIMEOUT = 120000; // 2 minutes

async function runPathTrackingTest() {
  console.log('='.repeat(70));
  console.log('COIN PATH TRACKING TEST');
  console.log('='.repeat(70));
  console.log('');

  const browser = await chromium.launch({
    headless: true,
    timeout: 10000
  });

  const page = await browser.newPage({
    viewport: { width: 450, height: 800 }
  });

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  function pass(test) {
    results.passed.push(test);
    console.log(`  ✓ ${test}`);
  }

  function fail(test, reason) {
    results.failed.push({ test, reason });
    console.log(`  ✗ ${test}: ${reason}`);
  }

  function warn(message) {
    results.warnings.push(message);
    console.log(`  ⚠ ${message}`);
  }

  try {
    // Load game
    console.log('Loading game...');
    await page.goto(`http://localhost:${SERVER_PORT}?mute&test`, { timeout: 15000 });
    await page.waitForTimeout(1000);

    await page.waitForSelector('#start-button', { timeout: 5000 });
    await page.click('#start-button');
    await page.waitForTimeout(500);
    console.log('✓ Game started\n');

    // Test 1: Coin path tracking fields
    console.log('Test 1: Path Tracking Fields');
    console.log('-'.repeat(70));

    const fieldsTest = await page.evaluate(() => {
      if (!window.Coins) return { error: 'Coins not loaded' };

      // Drop a coin to test
      Coins.addToQueue(5);
      Coins.dropCoin();

      // Wait a moment for coin to be created
      if (Coins.activeCoins.length === 0) {
        return { error: 'No coins created' };
      }

      const coin = Coins.activeCoins[0];

      return {
        hasPathBoards: Array.isArray(coin.pathBoards),
        hasPathEvents: Array.isArray(coin.pathEvents),
        hasPathMultiplier: typeof coin.pathMultiplier === 'number',
        pathBoardsInitial: coin.pathBoards.length,
        pathEventsInitial: coin.pathEvents.length,
        pathMultiplierInitial: coin.pathMultiplier
      };
    });

    if (fieldsTest.error) {
      fail('Path tracking fields exist', fieldsTest.error);
    } else {
      if (fieldsTest.hasPathBoards) {
        pass('Coin has pathBoards array');
      } else {
        fail('pathBoards field', 'Missing or not an array');
      }

      if (fieldsTest.hasPathEvents) {
        pass('Coin has pathEvents array');
      } else {
        fail('pathEvents field', 'Missing or not an array');
      }

      if (fieldsTest.hasPathMultiplier) {
        pass('Coin has pathMultiplier number');
      } else {
        fail('pathMultiplier field', 'Missing or not a number');
      }

      if (fieldsTest.pathBoardsInitial === 0) {
        pass('pathBoards starts empty');
      } else {
        warn(`pathBoards not empty initially (${fieldsTest.pathBoardsInitial} items)`);
      }

      if (fieldsTest.pathEventsInitial === 0) {
        pass('pathEvents starts empty');
      } else {
        warn(`pathEvents not empty initially (${fieldsTest.pathEventsInitial} items)`);
      }

      if (fieldsTest.pathMultiplierInitial === 1.0) {
        pass('pathMultiplier starts at 1.0');
      } else {
        warn(`pathMultiplier starts at ${fieldsTest.pathMultiplierInitial} instead of 1.0`);
      }
    }

    console.log('');

    // Test 2: Recording board visits
    console.log('Test 2: Board Visit Recording');
    console.log('-'.repeat(70));

    const boardVisitTest = await page.evaluate(() => {
      if (!window.Coins) return { error: 'Coins not loaded' };

      // Create a test coin
      Coins.addToQueue(1);
      Coins.dropCoin();

      if (Coins.activeCoins.length === 0) {
        return { error: 'No coins created' };
      }

      const coin = Coins.activeCoins[0];

      // Simulate board visits
      Coins.recordBoardVisit(coin, 'board_1', 'queueSpeed');
      const afterFirst = {
        pathBoards: [...coin.pathBoards],
        pathMultiplier: coin.pathMultiplier
      };

      Coins.recordBoardVisit(coin, 'board_2', 'coinValue');
      const afterSecond = {
        pathBoards: [...coin.pathBoards],
        pathMultiplier: coin.pathMultiplier
      };

      // Try recording same board again
      Coins.recordBoardVisit(coin, 'board_1', 'queueSpeed');
      const afterDuplicate = {
        pathBoards: [...coin.pathBoards],
        pathMultiplier: coin.pathMultiplier
      };

      return {
        afterFirst,
        afterSecond,
        afterDuplicate
      };
    });

    if (boardVisitTest.error) {
      fail('Board visit recording', boardVisitTest.error);
    } else {
      if (boardVisitTest.afterFirst.pathBoards.length === 1 &&
          boardVisitTest.afterFirst.pathBoards[0] === 'board_1') {
        pass('First board visit recorded');
      } else {
        fail('First board visit', `Expected ['board_1'], got ${JSON.stringify(boardVisitTest.afterFirst.pathBoards)}`);
      }

      if (boardVisitTest.afterSecond.pathBoards.length === 2 &&
          boardVisitTest.afterSecond.pathBoards.includes('board_2')) {
        pass('Second board visit recorded');
      } else {
        fail('Second board visit', `Expected 2 boards, got ${JSON.stringify(boardVisitTest.afterSecond.pathBoards)}`);
      }

      if (boardVisitTest.afterDuplicate.pathBoards.length === 2) {
        pass('Duplicate board visits prevented');
      } else {
        fail('Duplicate prevention', `Expected 2 boards, got ${boardVisitTest.afterDuplicate.pathBoards.length}`);
      }
    }

    console.log('');

    // Test 3: Recording path events
    console.log('Test 3: Path Event Recording');
    console.log('-'.repeat(70));

    const eventsTest = await page.evaluate(() => {
      if (!window.Coins) return { error: 'Coins not loaded' };

      // Create a test coin
      Coins.addToQueue(1);
      Coins.dropCoin();

      if (Coins.activeCoins.length === 0) {
        return { error: 'No coins created' };
      }

      const coin = Coins.activeCoins[0];
      const initialMult = coin.pathMultiplier;

      // Record different event types
      Coins.recordPathEvent(coin, 'board_1', 'queueSpeed', 'obstacle_hit');
      const afterObstacle = {
        events: coin.pathEvents.length,
        multiplier: coin.pathMultiplier,
        multChanged: coin.pathMultiplier > initialMult
      };

      const prevMult = coin.pathMultiplier;
      Coins.recordPathEvent(coin, 'board_1', 'jackpotChance', 'jackpot_slot');
      const afterJackpot = {
        events: coin.pathEvents.length,
        multiplier: coin.pathMultiplier,
        multIncreased: coin.pathMultiplier > prevMult,
        lastEvent: coin.pathEvents[coin.pathEvents.length - 1]
      };

      return {
        initialMult,
        afterObstacle,
        afterJackpot
      };
    });

    if (eventsTest.error) {
      fail('Path event recording', eventsTest.error);
    } else {
      if (eventsTest.afterObstacle.events === 1) {
        pass('Obstacle hit event recorded');
      } else {
        fail('Obstacle hit recording', `Expected 1 event, got ${eventsTest.afterObstacle.events}`);
      }

      if (eventsTest.afterObstacle.multChanged) {
        pass('Obstacle hit increases path multiplier');
      } else {
        warn('Obstacle hit did not change multiplier');
      }

      if (eventsTest.afterJackpot.events === 2) {
        pass('Multiple events recorded');
      } else {
        fail('Multiple events', `Expected 2 events, got ${eventsTest.afterJackpot.events}`);
      }

      if (eventsTest.afterJackpot.multIncreased) {
        pass('Jackpot event increases multiplier');
      } else {
        fail('Jackpot multiplier', 'Multiplier did not increase');
      }

      if (eventsTest.afterJackpot.lastEvent &&
          eventsTest.afterJackpot.lastEvent.eventType === 'jackpot_slot') {
        pass('Event structure correct');
      } else {
        fail('Event structure', 'Missing or incorrect event data');
      }
    }

    console.log('');

    // Test 4: Score calculation with path
    console.log('Test 4: Score Calculation');
    console.log('-'.repeat(70));

    const scoreTest = await page.evaluate(() => {
      if (!window.Coins) return { error: 'Coins not loaded' };

      // Create two coins - one with path, one without
      Coins.addToQueue(2);
      Coins.dropCoin();
      Coins.dropCoin();

      if (Coins.activeCoins.length < 2) {
        return { error: 'Not enough coins created' };
      }

      const normalCoin = Coins.activeCoins[0];
      const pathCoin = Coins.activeCoins[1];

      // Add path to second coin
      Coins.recordBoardVisit(pathCoin, 'board_1', 'queueSpeed');
      Coins.recordBoardVisit(pathCoin, 'board_2', 'coinValue');
      Coins.recordPathEvent(pathCoin, 'board_2', 'jackpotChance', 'jackpot_slot');

      const normalScore = Coins.calculateCoinScore(normalCoin);
      const pathScore = Coins.calculateCoinScore(pathCoin);

      return {
        normalCoin: {
          value: normalCoin.value,
          pathMult: normalCoin.pathMultiplier,
          score: normalScore
        },
        pathCoin: {
          value: pathCoin.value,
          pathMult: pathCoin.pathMultiplier,
          boardsVisited: pathCoin.pathBoards.length,
          eventsTriggered: pathCoin.pathEvents.length,
          score: pathScore
        }
      };
    });

    if (scoreTest.error) {
      fail('Score calculation', scoreTest.error);
    } else {
      pass(`Normal coin score: ${scoreTest.normalCoin.score} (mult: ${scoreTest.normalCoin.pathMult})`);
      pass(`Path coin score: ${scoreTest.pathCoin.score} (mult: ${scoreTest.pathCoin.pathMult})`);

      if (scoreTest.pathCoin.score > scoreTest.normalCoin.score) {
        pass('Path increases coin score');
      } else {
        warn(`Path coin score (${scoreTest.pathCoin.score}) not higher than normal (${scoreTest.normalCoin.score})`);
      }
    }

    console.log('');

    // Test 5: Path summary
    console.log('Test 5: Path Summary');
    console.log('-'.repeat(70));

    const summaryTest = await page.evaluate(() => {
      if (!window.Coins) return { error: 'Coins not loaded' };

      // Create a coin with complex path
      Coins.addToQueue(1);
      Coins.dropCoin();

      if (Coins.activeCoins.length === 0) {
        return { error: 'No coins created' };
      }

      const coin = Coins.activeCoins[0];

      Coins.recordBoardVisit(coin, 'board_1', 'queueSpeed');
      Coins.recordBoardVisit(coin, 'board_2', 'coinValue');
      Coins.recordPathEvent(coin, 'board_1', 'queueSpeed', 'obstacle_hit');
      Coins.recordPathEvent(coin, 'board_2', 'jackpotChance', 'jackpot_slot');
      Coins.recordPathEvent(coin, 'board_2', 'luckyCoins', 'lucky_exit');

      const summary = Coins.getPathSummary(coin);

      return {
        summary,
        hasSummary: summary !== null,
        hasFields: summary && summary.boardsVisited !== undefined &&
                   summary.eventsTriggered !== undefined &&
                   summary.pathMultiplier !== undefined &&
                   summary.events !== undefined
      };
    });

    if (summaryTest.error) {
      fail('Path summary', summaryTest.error);
    } else {
      if (summaryTest.hasSummary) {
        pass('getPathSummary returns data');
      } else {
        fail('Path summary', 'Returned null');
      }

      if (summaryTest.hasFields) {
        pass('Summary has all required fields');
        pass(`Summary: ${JSON.stringify(summaryTest.summary)}`);
      } else {
        fail('Summary fields', 'Missing required fields');
      }
    }

    console.log('');

    // Print summary
    console.log('='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    console.log('');

    if (results.passed.length > 0) {
      console.log(`✓ ${results.passed.length} tests passed:`);
      results.passed.forEach(test => console.log(`  - ${test}`));
      console.log('');
    }

    if (results.failed.length > 0) {
      console.log(`✗ ${results.failed.length} tests failed:`);
      results.failed.forEach(({ test, reason }) => {
        console.log(`  - ${test}: ${reason}`);
      });
      console.log('');
    }

    if (results.warnings.length > 0) {
      console.log(`⚠ ${results.warnings.length} warnings:`);
      results.warnings.forEach(warn => console.log(`  - ${warn}`));
      console.log('');
    }

    const passed = results.failed.length === 0;

    if (passed) {
      console.log('✅ PATH TRACKING TEST PASSED');
    } else {
      console.log('❌ PATH TRACKING TEST FAILED');
    }

    await browser.close();
    return passed ? 0 : 1;

  } catch (e) {
    console.log(`\n❌ Test crashed: ${e.message}`);
    console.log(e.stack);
    await browser.close();
    return 1;
  }
}

// Global timeout
const timeoutId = setTimeout(() => {
  console.log('\n[TIMEOUT] Test exceeded time limit, forcing exit');
  process.exit(124);
}, TEST_TIMEOUT);

// Run test
runPathTrackingTest().then(code => {
  clearTimeout(timeoutId);
  console.log('');
  console.log('Done!');
  process.exit(code);
}).catch(e => {
  clearTimeout(timeoutId);
  console.error('Test crashed:', e);
  process.exit(1);
});
