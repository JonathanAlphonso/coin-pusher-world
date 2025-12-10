/**
 * Test: Pachinko Peg Collision and Bounce
 * Verifies that coins dropped from the top collide with and bounce off pachinko pegs
 */

const puppeteer = require('puppeteer');

// Server port - defaults to 3009, can be overridden with PORT env var
const SERVER_PORT = process.env.PORT || 3002;

const TEST_URL = `http://localhost:${SERVER_PORT}?mute&test`;
const TIMEOUT = 30000;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testPachinkoBounce() {
  console.log('=== Pachinko Peg Bounce Test ===\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=800,600']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600 });

  try {
    console.log('1. Loading game...');
    await page.goto(TEST_URL, { waitUntil: 'networkidle0', timeout: TIMEOUT });
    await sleep(2000);

    console.log('2. Starting game...');
    // Click canvas to start
    await page.click('canvas');
    await sleep(500);

    // Check game state
    let gameState = await page.evaluate(() => ({
      isRunning: window.Game?.isRunning,
      isPaused: window.Game?.isPaused,
      hasCoins: !!window.Coins
    }));
    console.log(`   Game state after click: running=${gameState.isRunning}, paused=${gameState.isPaused}`);

    if (!gameState.isRunning) {
      console.log('   Game not started, looking for start button...');
      // Look for any clickable UI element
      await page.evaluate(() => {
        // Try to start the game directly
        if (window.Game && !window.Game.isRunning) {
          window.Game.start();
        }
      });
      await sleep(1000);
    }

    gameState = await page.evaluate(() => ({
      isRunning: window.Game?.isRunning,
      isPaused: window.Game?.isPaused,
      coinQueue: window.Coins?.coinQueue
    }));
    console.log(`   Game state now: running=${gameState.isRunning}, paused=${gameState.isPaused}, queue=${gameState.coinQueue}`);

    console.log('3. Getting configuration info...');
    const configData = await page.evaluate(() => {
      const dropZone = window.Board.getDropZone();
      const pegs = window.Board.pegs || [];
      const staticBodies = window.Physics.staticBodies || [];

      // Find peg bodies
      const pegBodies = staticBodies.filter(b => b.shape === 'peg' || b.shape === 'sphere');

      return {
        dropZone: dropZone,
        pegCount: pegs.length,
        pegBodiesCount: pegBodies.length,
        staticBodiesShapes: staticBodies.map(b => b.shape).filter((v, i, a) => a.indexOf(v) === i),
        pegYRange: pegs.length > 0 ? {
          min: Math.min(...pegs.map(p => p.mesh.position.y)),
          max: Math.max(...pegs.map(p => p.mesh.position.y))
        } : null
      };
    });

    console.log(`   Drop zone: Y=${configData.dropZone.y}, Z=${configData.dropZone.z}`);
    console.log(`   Drop zone X range: ${configData.dropZone.minX.toFixed(2)} to ${configData.dropZone.maxX.toFixed(2)}`);
    console.log(`   Visual pegs: ${configData.pegCount}`);
    console.log(`   Physics peg bodies: ${configData.pegBodiesCount}`);
    console.log(`   Static body shapes: ${configData.staticBodiesShapes.join(', ')}`);
    if (configData.pegYRange) {
      console.log(`   Peg Y range: ${configData.pegYRange.min.toFixed(2)} to ${configData.pegYRange.max.toFixed(2)}`);
    }

    console.log('\n4. Dropping coins and tracking positions...');

    // Set up collision tracking
    await page.evaluate(() => {
      window.testData = {
        coinsDropped: 0,
        pegCollisions: 0,
        collisionEvents: []
      };

      // Intercept physics collision detection
      const originalResolvePegCollision = window.Physics.resolvePegCollision;
      window.Physics.resolvePegCollision = function(body, peg) {
        if (body.data && body.data.coin) {
          window.testData.pegCollisions++;
          window.testData.collisionEvents.push({
            time: Date.now(),
            coinY: body.y.toFixed(2),
            pegY: peg.y.toFixed(2)
          });
        }
        return originalResolvePegCollision.call(this, body, peg);
      };
    });

    // Drop coins and track their movement
    for (let i = 0; i < 5; i++) {
      console.log(`\n   Dropping coin ${i + 1}...`);

      const beforeDrop = await page.evaluate(() => ({
        activeCoins: window.Coins.activeCoins.length,
        pegCollisions: window.testData.pegCollisions,
        physicsBodies: window.Physics.bodies.length
      }));
      console.log(`      Before: ${beforeDrop.activeCoins} active coins, ${beforeDrop.physicsBodies} physics bodies`);

      // Drop a coin
      await page.evaluate(() => {
        window.Game.dropCoin();
        window.testData.coinsDropped++;
      });

      const afterDropImmediate = await page.evaluate(() => ({
        activeCoins: window.Coins.activeCoins.length,
        physicsBodies: window.Physics.bodies.length
      }));
      console.log(`      After drop: ${afterDropImmediate.activeCoins} active coins, ${afterDropImmediate.physicsBodies} physics bodies`);

      // Track coin position over time - more frequently
      let lastY = null;
      let coinMoved = false;
      for (let t = 0; t < 20; t++) {
        await sleep(100);
        const coinState = await page.evaluate(() => {
          const coins = window.Coins.activeCoins;
          if (coins.length === 0) return null;
          const coin = coins[coins.length - 1];
          if (!coin) return null;
          return {
            meshY: coin.mesh?.position?.y?.toFixed(2),
            bodyY: coin.body?.y?.toFixed(2),
            bodyVy: coin.body?.vy?.toFixed(2),
            isSleeping: coin.body?.isSleeping
          };
        });

        if (coinState) {
          if (lastY !== null && lastY !== coinState.bodyY) {
            coinMoved = true;
          }
          lastY = coinState.bodyY;

          if (t % 5 === 0) {
            console.log(`      t=${t*100}ms: meshY=${coinState.meshY}, bodyY=${coinState.bodyY}, vy=${coinState.bodyVy}, sleeping=${coinState.isSleeping}`);
          }
        }
      }

      console.log(`      Coin moved: ${coinMoved}`);

      const afterDrop = await page.evaluate(() => ({
        pegCollisions: window.testData.pegCollisions,
        recentCollisions: window.testData.collisionEvents.slice(-3)
      }));

      const newCollisions = afterDrop.pegCollisions - beforeDrop.pegCollisions;
      console.log(`      Peg collisions: ${newCollisions}`);
    }

    // Final summary
    console.log('\n5. Test Results:');
    const finalData = await page.evaluate(() => window.testData);

    console.log(`   Total coins dropped: ${finalData.coinsDropped}`);
    console.log(`   Total peg collisions: ${finalData.pegCollisions}`);

    if (finalData.coinsDropped > 0) {
      console.log(`   Average collisions per coin: ${(finalData.pegCollisions / finalData.coinsDropped).toFixed(2)}`);
    }

    const avgCollisions = finalData.coinsDropped > 0 ? finalData.pegCollisions / finalData.coinsDropped : 0;
    const passed = avgCollisions >= 1;

    console.log('\n' + '='.repeat(50));
    if (passed) {
      console.log('TEST PASSED: Coins are bouncing off pachinko pegs!');
    } else {
      console.log('TEST FAILED: Coins are not hitting enough pegs');
    }
    console.log('='.repeat(50));

    console.log('\nKeeping browser open for 10 seconds for visual inspection...');
    await sleep(10000);

    await browser.close();
    process.exit(passed ? 0 : 1);

  } catch (error) {
    console.error('Test error:', error.message);
    await browser.close();
    process.exit(1);
  }
}

// Global timeout to prevent hanging (3 minutes)
const GLOBAL_TIMEOUT = 180000;
const timeoutId = setTimeout(() => {
  console.log('\n[TIMEOUT] Test exceeded 3 minute limit, forcing exit');
  process.exit(1);
}, GLOBAL_TIMEOUT);

testPachinkoBounce().finally(() => clearTimeout(timeoutId));
