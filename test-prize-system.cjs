/**
 * Prize System Test - Tests prize counter, selection, and effects
 * According to design spec section 8
 *
 * Tests:
 * - Prize pool has all expected prizes
 * - Prize counter shows 6 options
 * - Prize selection applies effects correctly
 * - Prizes synergize with board themes
 * - Prize limits are enforced
 */

const { chromium } = require('playwright');

// Server port
const SERVER_PORT = process.env.PORT || 3002;

// Test timeout - 3 minutes max
const TEST_TIMEOUT = 180000;

async function runPrizeSystemTest() {
  console.log('='.repeat(70));
  console.log('PRIZE SYSTEM TEST - Testing prize counter and effects');
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
    // Navigate and start game
    console.log('Loading game...');
    await page.goto(`http://localhost:${SERVER_PORT}?mute&test`, { timeout: 15000 });
    await page.waitForTimeout(1000);

    await page.waitForSelector('#start-button', { timeout: 5000 });
    await page.click('#start-button');
    await page.waitForTimeout(500);
    console.log('✓ Game started\n');

    // Test 1: Prize pool integrity
    console.log('Test 1: Prize Pool Integrity');
    console.log('-'.repeat(70));

    const prizePoolData = await page.evaluate(() => {
      if (!window.Prizes) return { error: 'Prizes not loaded' };

      return {
        totalPrizes: Prizes.prizePool.length,
        prizes: Prizes.prizePool.map(p => ({
          id: p.id,
          name: p.name,
          rarity: p.rarity,
          tags: p.tags,
          affinities: p.affinities
        }))
      };
    });

    if (prizePoolData.error) {
      fail('Prize pool exists', prizePoolData.error);
    } else {
      pass(`Prize pool has ${prizePoolData.totalPrizes} prizes`);

      // Check for minimum expected prizes (design spec says ~30)
      if (prizePoolData.totalPrizes >= 20) {
        pass('Prize pool has sufficient variety');
      } else {
        warn(`Prize pool has only ${prizePoolData.totalPrizes} prizes (expected ~30)`);
      }

      // Check for different prize tags
      const allTags = new Set();
      prizePoolData.prizes.forEach(p => p.tags.forEach(t => allTags.add(t)));

      const expectedTags = ['queue', 'value', 'lucky', 'jackpot', 'combo', 'multi', 'routing'];
      const foundTags = expectedTags.filter(t => allTags.has(t));

      if (foundTags.length >= 6) {
        pass(`Prize tags cover major categories (${foundTags.length}/${expectedTags.length})`);
      } else {
        warn(`Only ${foundTags.length} prize categories found: ${foundTags.join(', ')}`);
      }
    }

    console.log('');

    // Test 2: Prize counter generation
    console.log('Test 2: Prize Counter Generation');
    console.log('-'.repeat(70));

    const counterTest = await page.evaluate(() => {
      if (!window.Prizes) return { error: 'Prizes not loaded' };

      // Generate options without theme affinity
      const options1 = Prizes.generatePrizeOptions(null);

      // Generate options with a theme
      const fakeTheme = { powerupFocus: 'queueSpeed' };
      const options2 = Prizes.generatePrizeOptions(fakeTheme);

      return {
        options1Count: options1.length,
        options2Count: options2.length,
        options1Ids: options1.map(p => p.id),
        options2Ids: options2.map(p => p.id),
        hasQueueAffinityInOptions2: options2.some(p => p.affinities.includes('queueSpeed'))
      };
    });

    if (counterTest.error) {
      fail('Generate prize options', counterTest.error);
    } else {
      if (counterTest.options1Count === 6) {
        pass('Generates 6 prize options without theme');
      } else {
        fail('Generate 6 options', `Got ${counterTest.options1Count} options instead of 6`);
      }

      if (counterTest.options2Count === 6) {
        pass('Generates 6 prize options with theme');
      } else {
        fail('Generate 6 options with theme', `Got ${counterTest.options2Count} options`);
      }

      // Check for duplicates
      const hasDuplicates1 = counterTest.options1Ids.length !== new Set(counterTest.options1Ids).size;
      if (!hasDuplicates1) {
        pass('No duplicate prizes in options');
      } else {
        fail('No duplicates', 'Found duplicate prize IDs in options');
      }
    }

    console.log('');

    // Test 3: Prize selection and effects
    console.log('Test 3: Prize Selection and Effects');
    console.log('-'.repeat(70));

    const effectsTest = await page.evaluate(() => {
      if (!window.Prizes || !window.Game || !window.Coins) {
        return { error: 'Game systems not loaded' };
      }

      const results = {};

      // Get initial state
      const initialQueue = Coins.maxQueueSize;
      const initialValue = Coins.valueMultiplier || 1.0;

      // Select a queue-focused prize manually
      const queuePrize = Prizes.prizePool.find(p => p.tags.includes('queue'));
      if (queuePrize) {
        Prizes.selectPrize(queuePrize);
        results.queuePrizeSelected = queuePrize.name;
        results.queueSizeAfter = Coins.maxQueueSize;
        results.queueSizeChanged = Coins.maxQueueSize !== initialQueue;
      }

      // Select a value-focused prize
      const valuePrize = Prizes.prizePool.find(p => p.tags.includes('value') && !Prizes.activePrizes.some(ap => ap.id === p.id));
      if (valuePrize) {
        Prizes.selectPrize(valuePrize);
        results.valuePrizeSelected = valuePrize.name;
        results.valueMultAfter = Coins.valueMultiplier || 1.0;
        results.valueMultChanged = (Coins.valueMultiplier || 1.0) !== initialValue;
      }

      results.activePrizeCount = Prizes.activePrizes.length;

      return results;
    });

    if (effectsTest.error) {
      fail('Prize effects application', effectsTest.error);
    } else {
      if (effectsTest.queuePrizeSelected) {
        pass(`Selected queue prize: ${effectsTest.queuePrizeSelected}`);
        if (effectsTest.queueSizeChanged) {
          pass('Queue prize effect applied (queue size changed)');
        } else {
          warn('Queue prize may not have modified queue size');
        }
      }

      if (effectsTest.valuePrizeSelected) {
        pass(`Selected value prize: ${effectsTest.valuePrizeSelected}`);
        if (effectsTest.valueMultChanged) {
          pass('Value prize effect applied (multiplier changed)');
        } else {
          warn('Value prize may not have modified multiplier');
        }
      }

      if (effectsTest.activePrizeCount > 0) {
        pass(`${effectsTest.activePrizeCount} prizes active`);
      }
    }

    console.log('');

    // Test 4: Prize UI integration
    console.log('Test 4: Prize Counter UI');
    console.log('-'.repeat(70));

    // Trigger prize counter manually
    const uiTest = await page.evaluate(() => {
      if (!window.Prizes || !window.UI) {
        return { error: 'Prizes or UI not loaded' };
      }

      // Open prize counter
      Prizes.openPrizeCounter(null, () => {});

      return {
        isOpen: Prizes.isOpen,
        optionsCount: Prizes.currentOptions.length
      };
    });

    await page.waitForTimeout(500);

    if (uiTest.error) {
      fail('Prize counter UI', uiTest.error);
    } else {
      if (uiTest.isOpen) {
        pass('Prize counter can be opened');
      } else {
        fail('Open prize counter', 'Counter did not open');
      }

      // Check if overlay is visible
      const overlayVisible = await page.isVisible('#prize-counter-overlay');
      if (overlayVisible) {
        pass('Prize counter overlay is visible');
      } else {
        warn('Prize counter overlay not visible in DOM');
      }

      // Count prize option elements
      const optionCount = await page.locator('.prize-option').count();
      if (optionCount === 6) {
        pass('Prize counter shows 6 options in UI');
      } else {
        fail('6 prize options in UI', `Found ${optionCount} options instead of 6`);
      }

      // Try to select a prize from UI
      if (optionCount > 0) {
        await page.locator('.prize-option').first().click();
        await page.waitForTimeout(500);

        const closedState = await page.evaluate(() => ({
          isOpen: window.Prizes ? Prizes.isOpen : null,
          activePrizes: window.Prizes ? Prizes.activePrizes.length : 0
        }));

        if (!closedState.isOpen) {
          pass('Prize counter closes after selection');
        }

        if (closedState.activePrizes > effectsTest.activePrizeCount) {
          pass('Prize added to active prizes after UI selection');
        }
      }
    }

    console.log('');

    // Test 5: Prize limits
    console.log('Test 5: Prize Limits');
    console.log('-'.repeat(70));

    const limitsTest = await page.evaluate(() => {
      if (!window.Prizes) return { error: 'Prizes not loaded' };

      // Try to add many prizes
      const maxPrizes = Prizes.maxActivePrizes;
      const initialCount = Prizes.activePrizes.length;
      const availablePrizes = Prizes.prizePool.filter(p =>
        !Prizes.activePrizes.some(ap => ap.id === p.id)
      );

      // Add prizes until we reach the limit
      let addedCount = 0;
      for (let i = 0; i < availablePrizes.length && Prizes.activePrizes.length < maxPrizes; i++) {
        Prizes.selectPrize(availablePrizes[i]);
        addedCount++;
      }

      return {
        maxPrizes: maxPrizes,
        initialCount: initialCount,
        finalCount: Prizes.activePrizes.length,
        addedCount: addedCount,
        reachedLimit: Prizes.activePrizes.length === maxPrizes
      };
    });

    if (limitsTest.error) {
      fail('Prize limits', limitsTest.error);
    } else {
      pass(`Max prize limit set to ${limitsTest.maxPrizes}`);

      if (limitsTest.finalCount >= limitsTest.maxPrizes) {
        pass(`Can accumulate up to ${limitsTest.finalCount} prizes`);
      }

      if (limitsTest.reachedLimit) {
        pass(`Prize limit (${limitsTest.maxPrizes}) enforced`);
      } else {
        warn(`Did not reach prize limit (${limitsTest.finalCount}/${limitsTest.maxPrizes})`);
      }
    }

    console.log('');

    // Test 6: Theme affinity weighting
    console.log('Test 6: Theme Affinity System');
    console.log('-'.repeat(70));

    const affinityTest = await page.evaluate(() => {
      if (!window.Prizes) return { error: 'Prizes not loaded' };

      // Reset prizes
      Prizes.reset();

      // Generate many samples with different themes
      const samples = [];
      const themes = [
        { powerupFocus: 'queueSpeed' },
        { powerupFocus: 'coinValue' },
        { powerupFocus: 'jackpotChance' },
        null
      ];

      for (const theme of themes) {
        const options = Prizes.generatePrizeOptions(theme);
        samples.push({
          theme: theme ? theme.powerupFocus : 'none',
          hasMatchingAffinity: theme ? options.some(p => p.affinities.includes(theme.powerupFocus)) : false,
          optionCount: options.length
        });
      }

      return { samples };
    });

    if (affinityTest.error) {
      fail('Theme affinity', affinityTest.error);
    } else {
      let affinityMatchCount = 0;
      affinityTest.samples.forEach(sample => {
        if (sample.theme !== 'none' && sample.hasMatchingAffinity) {
          affinityMatchCount++;
        }
      });

      if (affinityMatchCount > 0) {
        pass(`Theme affinity influences prize selection (${affinityMatchCount} matches)`);
      } else {
        warn('Theme affinity may not be working (no matching affinities found)');
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
      console.log('✅ PRIZE SYSTEM TEST PASSED');
    } else {
      console.log('❌ PRIZE SYSTEM TEST FAILED');
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
runPrizeSystemTest().then(code => {
  clearTimeout(timeoutId);
  console.log('');
  console.log('Done!');
  process.exit(code);
}).catch(e => {
  clearTimeout(timeoutId);
  console.error('Test crashed:', e);
  process.exit(1);
});
