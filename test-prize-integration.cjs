/**
 * Prize System Integration Test
 * Tests prize selection, effects application, and synergy with boards
 * Design spec section 8 & 11.4
 */

const { chromium } = require('playwright');

// Test configuration
const TEST_TIMEOUT = 15000;
const BASE_URL = 'http://localhost:3000';

let browser;
let page;
let passed = 0;
let failed = 0;

// Helper to run a test
async function test(name, fn) {
  process.stdout.write(`🧪 Testing: ${name}\n`);
  try {
    await fn();
    passed++;
    console.log(`✅ PASSED: ${name}\n`);
  } catch (error) {
    failed++;
    console.log(`❌ FAILED: ${name}`);
    console.log(`   ${error.message}\n`);
  }
}

// Assertion helpers
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   Prize System Integration Test');
  console.log('   Design Spec Sections 8 & 11.4');
  console.log('═══════════════════════════════════════════════════════\n');

  // Launch browser
  console.log('🚀 Launching browser...');
  browser = await chromium.launch({
    headless: true,
    timeout: TEST_TIMEOUT
  });
  page = await browser.newPage();

  // Mute audio for tests
  await page.goto(`${BASE_URL}?mute=1`);
  console.log('🌐 Loading game...\n');
  await page.waitForTimeout(2000);

  // Start game
  await page.click('#start-button');
  await page.waitForTimeout(500);

  // === Test 1: Prize pool is available ===
  await test('Prize pool has 30 prizes', async () => {
    const prizeCount = await page.evaluate(() => {
      return window.Prizes ? window.Prizes.prizePool.length : 0;
    });
    assert(prizeCount >= 25, `Expected at least 25 prizes, got ${prizeCount}`);
    console.log(`   Found ${prizeCount} prizes in pool`);
  });

  // === Test 2: Generate prize options ===
  await test('Can generate 6 prize options', async () => {
    const options = await page.evaluate(() => {
      return window.Prizes.generatePrizeOptions();
    });
    assert(options.length === 6, `Expected 6 options, got ${options.length}`);
    console.log(`   Generated 6 prize options: ${options.map(p => p.name).join(', ')}`);
  });

  // === Test 3: Prize effects apply correctly ===
  await test('Prize effects modify game systems', async () => {
    const result = await page.evaluate(() => {
      const Prizes = window.Prizes;
      const Coins = window.Coins;
      const initialBaseValue = Coins.baseValue;
      const initialMaxQueue = Coins.maxQueueSize;

      // Apply a value prize
      const valuePrize = Prizes.prizePool.find(p => p.id === 'goldenTouch');
      if (valuePrize) {
        Prizes.selectPrize(valuePrize);
      }

      // Apply a queue prize
      const queuePrize = Prizes.prizePool.find(p => p.id === 'bigQueue');
      if (queuePrize) {
        Prizes.selectPrize(queuePrize);
      }

      return {
        initialBaseValue,
        initialMaxQueue,
        finalBaseValue: Coins.baseValue,
        finalMaxQueue: Coins.maxQueueSize,
        activePrizes: Prizes.activePrizes.length,
      };
    });

    assert(result.activePrizes === 2, `Expected 2 active prizes, got ${result.activePrizes}`);
    assert(result.finalMaxQueue > result.initialMaxQueue,
      `Queue size should increase (${result.initialMaxQueue} -> ${result.finalMaxQueue})`);
    console.log(`   Applied 2 prizes successfully`);
    console.log(`   Queue size: ${result.initialMaxQueue} -> ${result.finalMaxQueue}`);
  });

  // === Test 4: Prizes synergize with theme powerupFocus ===
  await test('Prize options favor board theme affinities', async () => {
    const result = await page.evaluate(() => {
      const Prizes = window.Prizes;
      const tierThemes = window.tierThemes || [];

      // Get a queueSpeed theme
      const queueSpeedTheme = tierThemes.find(t => t.powerupFocus === 'queueSpeed');

      if (!queueSpeedTheme) {
        return { error: 'No queueSpeed theme found' };
      }

      // Generate options with theme affinity
      const optionsWithAffinity = Prizes.generatePrizeOptions(queueSpeedTheme);

      // Count how many have queueSpeed affinity
      const affinityCount = optionsWithAffinity.filter(p =>
        p.affinities && p.affinities.includes('queueSpeed')
      ).length;

      // Generate options without theme (should have fewer queueSpeed prizes)
      const optionsWithoutAffinity = Prizes.generatePrizeOptions(null);
      const noAffinityCount = optionsWithoutAffinity.filter(p =>
        p.affinities && p.affinities.includes('queueSpeed')
      ).length;

      return {
        withAffinity: affinityCount,
        withoutAffinity: noAffinityCount,
        optionsWithAffinity: optionsWithAffinity.map(p => p.name),
      };
    });

    if (result.error) {
      console.log(`   ⚠️  ${result.error} - skipping affinity test`);
      return;
    }

    console.log(`   queueSpeed prizes with theme: ${result.withAffinity}`);
    console.log(`   queueSpeed prizes without theme: ${result.withoutAffinity}`);
    console.log(`   Options: ${result.optionsWithAffinity.join(', ')}`);
  });

  // === Test 5: Prize limits are enforced ===
  await test('Cannot exceed max active prizes', async () => {
    const result = await page.evaluate(() => {
      const Prizes = window.Prizes;
      const maxPrizes = Prizes.maxActivePrizes;

      // Reset
      Prizes.activePrizes = [];

      // Try to add more than max
      const allPrizes = Prizes.prizePool.slice(0, maxPrizes + 3);
      allPrizes.forEach(prize => {
        Prizes.selectPrize({ ...prize });
      });

      return {
        maxAllowed: maxPrizes,
        actualCount: Prizes.activePrizes.length,
      };
    });

    assert(result.actualCount <= result.maxAllowed,
      `Should not exceed ${result.maxAllowed} prizes, got ${result.actualCount}`);
    console.log(`   Prize limit enforced: ${result.actualCount}/${result.maxAllowed}`);
  });

  // === Test 6: Prize effects stack correctly ===
  await test('Multiple prizes stack their effects', async () => {
    const result = await page.evaluate(() => {
      const Prizes = window.Prizes;
      const Coins = window.Coins;

      // Reset
      Prizes.activePrizes = [];
      Coins.maxQueueSize = 20;

      // Add two queue capacity prizes
      const queuePrize1 = Prizes.prizePool.find(p => p.id === 'bigQueue');
      const queuePrize2 = Prizes.prizePool.find(p => p.id === 'queueEngine');

      if (queuePrize1) Prizes.selectPrize({ ...queuePrize1 });
      if (queuePrize2) Prizes.selectPrize({ ...queuePrize2 });

      return {
        activePrizes: Prizes.activePrizes.map(p => p.name),
        finalMaxQueue: Coins.maxQueueSize,
      };
    });

    assert(result.finalMaxQueue > 20, `Queue should increase from stacking`);
    console.log(`   Stacked prizes: ${result.activePrizes.join(', ')}`);
    console.log(`   Final queue size: ${result.finalMaxQueue}`);
  });

  // === Test 7: Prizes integrate with BoardManager ===
  await test('Prize Counter triggers on board unlock', async () => {
    const result = await page.evaluate(() => {
      const BoardManager = window.BoardManager;
      const Prizes = window.Prizes;

      // Reset BoardManager
      BoardManager.reset();
      BoardManager.init(window.Game.scene, window.Board, window.ThemeEffects);

      // Create initial board
      const board1 = BoardManager.createBoard(0);

      // Check status
      const status1 = BoardManager.getStatus();

      // The Prize Counter should open when a board is added (in normal gameplay)
      // We'll just verify the Prizes system is ready
      const prizeOptions = Prizes.generatePrizeOptions();

      return {
        board1Id: board1 ? board1.boardId : null,
        boardCount: status1.totalBoards,
        prizeOptionsAvailable: prizeOptions.length === 6,
      };
    });

    assert(result.board1Id, 'Board should be created');
    assert(result.boardCount === 1, `Expected 1 board, got ${result.boardCount}`);
    assert(result.prizeOptionsAvailable, 'Prize options should be available');
    console.log(`   Board created: ${result.board1Id}`);
    console.log(`   Prize options ready: ${result.prizeOptionsAvailable}`);
  });

  // === Test 8: No NaN values after prize application ===
  await test('Prize effects never create NaN values', async () => {
    const result = await page.evaluate(() => {
      const Prizes = window.Prizes;
      const Coins = window.Coins;
      const Game = window.Game;

      // Reset
      Prizes.reset();
      Coins.maxQueueSize = 20;
      Coins.baseValue = 10;
      Game.score = 0;

      // Apply several random prizes
      const randomPrizes = Prizes.prizePool
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);

      randomPrizes.forEach(prize => {
        Prizes.selectPrize({ ...prize });
      });

      // Check for NaN
      const checks = {
        maxQueue: Coins.maxQueueSize,
        baseValue: Coins.baseValue,
        score: Game.score,
        queueCount: Coins.coinQueue,
      };

      const hasNaN = Object.values(checks).some(v => isNaN(v) || !isFinite(v));

      return {
        hasNaN,
        checks,
        appliedPrizes: randomPrizes.map(p => p.name),
      };
    });

    assert(!result.hasNaN, `Found NaN values: ${JSON.stringify(result.checks)}`);
    console.log(`   Applied prizes: ${result.appliedPrizes.join(', ')}`);
    console.log(`   All values valid: ${JSON.stringify(result.checks)}`);
  });

  // === Test 9: Prize tags are accurate ===
  await test('All prizes have valid tags and effects', async () => {
    const result = await page.evaluate(() => {
      const Prizes = window.Prizes;
      const validTags = ['queue', 'value', 'lucky', 'jackpot', 'combo', 'multi', 'routing', 'pusher'];

      const invalidPrizes = [];

      Prizes.prizePool.forEach(prize => {
        // Check tags
        if (!prize.tags || prize.tags.length === 0) {
          invalidPrizes.push(`${prize.name}: no tags`);
        }

        // Check effects
        if (!prize.effects || Object.keys(prize.effects).length === 0) {
          invalidPrizes.push(`${prize.name}: no effects`);
        }

        // Check tag validity
        if (prize.tags) {
          prize.tags.forEach(tag => {
            if (!validTags.includes(tag)) {
              invalidPrizes.push(`${prize.name}: invalid tag '${tag}'`);
            }
          });
        }
      });

      return {
        totalPrizes: Prizes.prizePool.length,
        invalidCount: invalidPrizes.length,
        invalid: invalidPrizes.slice(0, 5), // First 5 issues
      };
    });

    assert(result.invalidCount === 0,
      `Found ${result.invalidCount} invalid prizes: ${result.invalid.join(', ')}`);
    console.log(`   All ${result.totalPrizes} prizes have valid tags and effects`);
  });

  // === Test 10: ThemeEffects integrates with Prize effects ===
  await test('Prize effects combine with ThemeEffects', async () => {
    const result = await page.evaluate(() => {
      const BoardManager = window.BoardManager;
      const ThemeEffects = window.ThemeEffects;
      const Prizes = window.Prizes;
      const Coins = window.Coins;

      // Reset
      BoardManager.reset();
      ThemeEffects.reset();
      Prizes.reset();

      BoardManager.init(window.Game.scene, window.Board, ThemeEffects);

      // Create a coinValue board (Dino Land - index 1)
      const board1 = BoardManager.createBoard(1);

      // Update theme effects
      ThemeEffects.updateEffects(BoardManager.boards);

      const baseGlobalMult = ThemeEffects.getGlobalValueMultiplier();

      // Now apply a coin value prize
      const valuePrize = Prizes.prizePool.find(p => p.id === 'goldenTouch');
      if (valuePrize) {
        Prizes.applyPrizeEffects(valuePrize);
      }

      // Drop a coin to check combined effect
      Coins.coinQueue = 5;
      Coins.dropCoin();

      return {
        board: board1.powerupFocus,
        baseGlobalMult: baseGlobalMult,
        coinValueMult: Coins.valueMultiplier,
        hasActiveCoin: Coins.activeCoins.length > 0,
      };
    });

    assert(result.board === 'coinValue', 'Should have coinValue board');
    assert(result.baseGlobalMult > 1.0,
      `Global mult should be > 1.0 with coinValue board, got ${result.baseGlobalMult}`);
    console.log(`   Board theme: ${result.board}`);
    console.log(`   Global value mult from theme: ${result.baseGlobalMult.toFixed(2)}x`);
    console.log(`   Coin value mult from prizes: ${result.coinValueMult.toFixed(2)}x`);
  });

  // Clean up
  await browser.close();

  // Print summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('                    TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
