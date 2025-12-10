/**
 * Coin Drop Position Test
 * Verifies that coins NEVER spawn behind the board (negative Z beyond back wall)
 *
 * Run in browser console:
 *   DropTest.start()    - Start monitoring with full logs
 *   DropTest.stop()     - Stop monitoring
 *   DropTest.runTest()  - Automated test dropping many coins
 */

const DropTest = {
  enabled: false,
  logInterval: null,
  totalDrops: 0,
  behindBoardCount: 0,
  minZ: Infinity,
  maxZ: -Infinity,
  originalSpawnCoin: null,

  // The back wall is at Z = -1.5, coins should NEVER be behind this
  BACK_WALL_Z: -1.5,

  // Start monitoring
  start: function() {
    this.enabled = true;
    this.totalDrops = 0;
    this.behindBoardCount = 0;
    this.minZ = Infinity;
    this.maxZ = -Infinity;

    console.log('%c╔══════════════════════════════════════════╗', 'color: #00ff00;');
    console.log('%c║      COIN DROP POSITION MONITOR          ║', 'color: #00ff00; font-weight: bold;');
    console.log('%c╚══════════════════════════════════════════╝', 'color: #00ff00;');

    // Store original and override
    if (!this.originalSpawnCoin && typeof Coins !== 'undefined') {
      this.originalSpawnCoin = Coins.spawnCoin.bind(Coins);
    }

    const self = this;

    if (typeof Coins !== 'undefined') {
      Coins.spawnCoin = function(x, y, z, type) {
        self.totalDrops++;

        // Track Z position
        if (z < self.minZ) self.minZ = z;
        if (z > self.maxZ) self.maxZ = z;

        // Check if behind back wall
        if (z < self.BACK_WALL_Z) {
          self.behindBoardCount++;
          console.log(
            '%c🚨 BUG: Coin spawned BEHIND the board!',
            'color: #ff0000; font-weight: bold; font-size: 14px;'
          );
          console.log(
            `%c   Position: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`,
            'color: #ff6666;'
          );
          console.log(
            `%c   Back wall is at Z = ${self.BACK_WALL_Z}, coin is at Z = ${z.toFixed(2)}`,
            'color: #ff6666;'
          );
        } else {
          console.log(
            `%c✓ Coin spawned at Z = ${z.toFixed(2)} (safe, back wall at ${self.BACK_WALL_Z})`,
            'color: #00ff00;'
          );
        }

        // Call original
        return self.originalSpawnCoin(x, y, z, type);
      };
    }

    // Also monitor drop zone
    if (typeof Board !== 'undefined') {
      const dropZone = Board.getDropZone();
      console.log('%c\n--- Drop Zone Configuration ---', 'color: #ffff00;');
      console.log(`  minX: ${dropZone.minX}`);
      console.log(`  maxX: ${dropZone.maxX}`);
      console.log(`  y: ${dropZone.y}`);
      console.log(`  z: ${dropZone.z}`);
      console.log(`  Back wall: Z = ${this.BACK_WALL_Z}`);

      if (dropZone.z < this.BACK_WALL_Z) {
        console.log('%c  ⚠️ WARNING: Drop zone Z is BEHIND the back wall!', 'color: #ff0000; font-weight: bold;');
      } else {
        console.log('%c  ✓ Drop zone Z is in front of back wall', 'color: #00ff00;');
      }
    }

    // Periodic status report
    this.logInterval = setInterval(() => {
      if (!this.enabled) return;
      console.log(
        `%c[STATUS] Total drops: ${this.totalDrops} | Behind board bugs: ${this.behindBoardCount} | Z range: [${this.minZ.toFixed(2)}, ${this.maxZ.toFixed(2)}]`,
        this.behindBoardCount > 0 ? 'color: #ff0000; font-weight: bold;' : 'color: #00ff00;'
      );
    }, 5000);

    console.log('%cCommands: DropTest.stop() | DropTest.runTest()', 'color: #888888;');
  },

  // Stop monitoring
  stop: function() {
    this.enabled = false;

    if (this.logInterval) {
      clearInterval(this.logInterval);
      this.logInterval = null;
    }

    // Restore original function
    if (this.originalSpawnCoin && typeof Coins !== 'undefined') {
      Coins.spawnCoin = this.originalSpawnCoin;
    }

    console.log('%c╔══════════════════════════════════════════╗', 'color: #ff6600;');
    console.log('%c║       DROP POSITION MONITOR STOPPED      ║', 'color: #ff6600; font-weight: bold;');
    console.log('%c╚══════════════════════════════════════════╝', 'color: #ff6600;');
    console.log(`%cFinal Results:`, 'color: #ffffff; font-weight: bold;');
    console.log(`  Total drops: ${this.totalDrops}`);
    console.log(`  Z range: [${this.minZ.toFixed(2)}, ${this.maxZ.toFixed(2)}]`);
    console.log(
      `  Behind board bugs: ${this.behindBoardCount}`,
      this.behindBoardCount > 0 ? '⚠️ BUGS FOUND!' : '✓ No bugs'
    );
  },

  // Automated test - drop many coins and check positions
  runTest: function(dropCount = 50, duration = 20) {
    console.log('%c╔══════════════════════════════════════════╗', 'color: #ff00ff;');
    console.log('%c║      RUNNING DROP POSITION TEST          ║', 'color: #ff00ff; font-weight: bold;');
    console.log('%c╚══════════════════════════════════════════╝', 'color: #ff00ff;');
    console.log(`Will drop ${dropCount} coins over ${duration} seconds`);
    console.log('Checking that no coins spawn behind the back wall...\n');

    this.start();

    // Drop coins periodically
    let dropped = 0;
    const interval = (duration * 1000) / dropCount;

    const dropInterval = setInterval(() => {
      if (typeof Game !== 'undefined' && Game.isRunning && !Game.isPaused) {
        Game.dropCoin();
        dropped++;

        if (dropped >= dropCount) {
          clearInterval(dropInterval);
        }
      }
    }, interval);

    // End test after duration
    setTimeout(() => {
      clearInterval(dropInterval);
      this.stop();

      console.log('%c\n╔══════════════════════════════════════════╗', 'color: #ff00ff;');
      console.log('%c║           TEST RESULTS                   ║', 'color: #ff00ff; font-weight: bold;');
      console.log('%c╚══════════════════════════════════════════╝', 'color: #ff00ff;');
      console.log(`Coins dropped: ${dropped}`);
      console.log(`Total spawns tracked: ${this.totalDrops}`);
      console.log(`Z range: [${this.minZ.toFixed(2)}, ${this.maxZ.toFixed(2)}]`);
      console.log(`Behind board bugs: ${this.behindBoardCount}`);

      if (this.behindBoardCount === 0 && this.minZ >= this.BACK_WALL_Z) {
        console.log('%c\n✅ TEST PASSED: No coins spawned behind the board!', 'color: #00ff00; font-weight: bold; font-size: 16px;');
      } else {
        console.log('%c\n❌ TEST FAILED: Coins spawned behind the board!', 'color: #ff0000; font-weight: bold; font-size: 16px;');
      }
    }, duration * 1000 + 1000);
  },

  // Quick check of current drop zone configuration
  checkConfig: function() {
    console.log('%c╔══════════════════════════════════════════╗', 'color: #00ffff;');
    console.log('%c║      DROP ZONE CONFIGURATION CHECK       ║', 'color: #00ffff; font-weight: bold;');
    console.log('%c╚══════════════════════════════════════════╝', 'color: #00ffff;');

    if (typeof Board !== 'undefined') {
      const dropZone = Board.getDropZone();
      console.log('%c\n--- Drop Zone ---', 'color: #ffff00;');
      console.log(`  X range: [${dropZone.minX.toFixed(2)}, ${dropZone.maxX.toFixed(2)}]`);
      console.log(`  Y (height): ${dropZone.y}`);
      console.log(`  Z (depth): ${dropZone.z}`);

      console.log('%c\n--- Safety Check ---', 'color: #ffff00;');
      console.log(`  Back wall Z: ${this.BACK_WALL_Z}`);
      console.log(`  Drop zone Z: ${dropZone.z}`);
      console.log(`  Gap: ${(dropZone.z - this.BACK_WALL_Z).toFixed(2)} units`);

      if (dropZone.z >= this.BACK_WALL_Z) {
        console.log('%c  ✓ SAFE: Drop zone is in front of back wall', 'color: #00ff00; font-weight: bold;');
      } else {
        console.log('%c  ✗ UNSAFE: Drop zone is behind back wall!', 'color: #ff0000; font-weight: bold;');
      }
    } else {
      console.log('%c  Board not found!', 'color: #ff0000;');
    }
  }
};

// Make globally available
window.DropTest = DropTest;

console.log('%c╔══════════════════════════════════════════╗', 'color: #00ffff;');
console.log('%c║    Drop Position Test Tool Loaded        ║', 'color: #00ffff; font-weight: bold;');
console.log('%c╚══════════════════════════════════════════╝', 'color: #00ffff;');
console.log('%cCommands:', 'color: #ffffff; font-weight: bold;');
console.log('  DropTest.checkConfig() - Check drop zone configuration');
console.log('  DropTest.start()       - Start live monitoring');
console.log('  DropTest.stop()        - Stop monitoring');
console.log('  DropTest.runTest(50)   - Run automated test with 50 drops');
