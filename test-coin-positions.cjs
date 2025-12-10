/**
 * Diagnostic test to see where coins are getting stuck
 */

const { chromium } = require('playwright');

// Server port - defaults to 3009, can be overridden with PORT env var
const SERVER_PORT = process.env.PORT || 3002;

async function runDiagnostic() {
  console.log('='.repeat(60));
  console.log('COIN POSITION DIAGNOSTIC');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 500, height: 800 } });

  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      console.log('ERROR:', msg.text());
    }
  });

  await page.goto(`http://localhost:${SERVER_PORT}?mute&test`);
  await page.waitForTimeout(1500);
  await page.click('#start-button');
  await page.waitForTimeout(1000);

  console.log('\nDropping coins and monitoring positions...\n');

  // Drop some coins
  for (let i = 0; i < 30; i++) {
    try {
      await page.click('#drop-button');
      await page.waitForTimeout(100);
    } catch (e) {}
  }

  // Wait for coins to settle
  console.log('Waiting for coins to settle...');
  await page.waitForTimeout(5000);

  // Analyze coin positions
  const analysis = await page.evaluate(() => {
    const coins = Coins.activeCoins;
    const bodies = Physics.bodies;

    // Get board geometry info
    const boardInfo = {
      scoringY: Board.scoringY,
      baseBoardWidth: Board.baseBoardWidth,
      shelfDepth: Board.shelfDepth,
      tierCount: Board.currentTierCount,
      tiers: Board.tiers.map(t => ({
        tierIndex: t.tierIndex,
        baseY: t.baseY,
        baseZ: t.baseZ,
        frontZ: t.frontZ,
        width: t.width
      })),
      pushers: Board.pushers.map(p => ({
        baseY: p.baseY,
        baseZ: p.baseZ,
        position: p.position,
        minZ: p.minZ,
        maxZ: p.maxZ,
        currentZ: p.mesh.position.z
      }))
    };

    // Analyze coin positions
    const coinPositions = bodies.filter(b => b.data && b.data.coin).map(b => ({
      x: b.x.toFixed(2),
      y: b.y.toFixed(2),
      z: b.z.toFixed(2),
      vx: b.vx.toFixed(2),
      vy: b.vy.toFixed(2),
      vz: b.vz.toFixed(2),
      isSleeping: b.isSleeping
    }));

    // Group by Y position
    const yBuckets = {};
    bodies.filter(b => b.data && b.data.coin).forEach(b => {
      const yBucket = Math.round(b.y);
      if (!yBuckets[yBucket]) yBuckets[yBucket] = 0;
      yBuckets[yBucket]++;
    });

    // Group by Z position
    const zBuckets = {};
    bodies.filter(b => b.data && b.data.coin).forEach(b => {
      const zBucket = Math.round(b.z);
      if (!zBuckets[zBucket]) zBuckets[zBucket] = 0;
      zBuckets[zBucket]++;
    });

    // Count sleeping coins
    const sleepingCount = bodies.filter(b => b.data && b.data.coin && b.isSleeping).length;

    return {
      boardInfo,
      totalCoins: coins.length,
      sleepingCount,
      yBuckets,
      zBuckets,
      sampleCoins: coinPositions.slice(0, 10)
    };
  });

  console.log('\n=== BOARD GEOMETRY ===');
  console.log('Scoring Y:', analysis.boardInfo.scoringY);
  console.log('Board Width:', analysis.boardInfo.baseBoardWidth);
  console.log('Shelf Depth:', analysis.boardInfo.shelfDepth);
  console.log('Tier Count:', analysis.boardInfo.tierCount);

  console.log('\nTiers:');
  analysis.boardInfo.tiers.forEach(t => {
    console.log(`  Tier ${t.tierIndex}: Y=${t.baseY}, Z=${t.baseZ}, frontZ=${t.frontZ}, width=${t.width}`);
  });

  console.log('\nPushers:');
  analysis.boardInfo.pushers.forEach((p, i) => {
    console.log(`  Pusher ${i}: baseY=${p.baseY}, baseZ=${p.baseZ}, currentZ=${p.currentZ.toFixed(2)}`);
    console.log(`             position=${p.position.toFixed(2)}, range=[${p.minZ}, ${p.maxZ}]`);
  });

  console.log('\n=== COIN ANALYSIS ===');
  console.log('Total coins:', analysis.totalCoins);
  console.log('Sleeping coins:', analysis.sleepingCount);

  console.log('\nCoins by Y position:');
  Object.entries(analysis.yBuckets).sort((a, b) => Number(b[0]) - Number(a[0])).forEach(([y, count]) => {
    console.log(`  Y=${y}: ${count} coins`);
  });

  console.log('\nCoins by Z position:');
  Object.entries(analysis.zBuckets).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([z, count]) => {
    console.log(`  Z=${z}: ${count} coins`);
  });

  console.log('\nSample coin positions:');
  analysis.sampleCoins.forEach((c, i) => {
    console.log(`  ${i+1}. pos=(${c.x}, ${c.y}, ${c.z}) vel=(${c.vx}, ${c.vy}, ${c.vz}) sleeping=${c.isSleeping}`);
  });

  // Now watch the pusher in action
  console.log('\n=== PUSHER OBSERVATION (10 seconds) ===');
  let lastCoinCount = analysis.totalCoins;

  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(1000);

    const state = await page.evaluate(() => {
      const pusher = Board.pushers[0];
      return {
        pusherZ: pusher.mesh.position.z.toFixed(2),
        pusherPos: pusher.position.toFixed(2),
        direction: pusher.direction,
        coinCount: Coins.activeCoins.length,
        score: Game.score,
        // Get front-most coin position
        frontZ: Math.max(...Physics.bodies.filter(b => b.data && b.data.coin).map(b => b.z))
      };
    });

    const coinsScored = lastCoinCount - state.coinCount;
    lastCoinCount = state.coinCount;

    console.log(`[${i+1}s] Pusher Z=${state.pusherZ} (pos=${state.pusherPos}, dir=${state.direction > 0 ? 'FWD' : 'BACK'}), Coins=${state.coinCount}, Score=${state.score}, Front coin Z=${state.frontZ.toFixed(2)}${coinsScored > 0 ? `, -${coinsScored} fell` : ''}`);
  }

  console.log('\nKeeping browser open for 20 seconds...');
  await page.waitForTimeout(20000);

  await browser.close();
  console.log('Done!');
}

// Global timeout to prevent hanging (2 minutes)
const GLOBAL_TIMEOUT = 120000;
const timeoutId = setTimeout(() => {
  console.log('\n[TIMEOUT] Test exceeded 2 minute limit, forcing exit');
  process.exit(1);
}, GLOBAL_TIMEOUT);

runDiagnostic().then(() => {
  clearTimeout(timeoutId);
  process.exit(0);
}).catch(err => {
  clearTimeout(timeoutId);
  console.error('Test crashed:', err);
  process.exit(1);
});
