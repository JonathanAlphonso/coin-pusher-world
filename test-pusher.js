/**
 * Pusher Physics Debug Test
 * Tests that coins are NEVER pushed backward by the pusher
 *
 * Run in browser console:
 *   PusherDebug.start()    - Start monitoring with full logs
 *   PusherDebug.stop()     - Stop monitoring
 *   PusherDebug.snapshot() - One-time state dump
 *   PusherDebug.runTest()  - Automated test for backward push bug
 */

const PusherDebug = {
  enabled: false,
  logInterval: null,
  backwardPushCount: 0,
  forwardPushCount: 0,
  originalResolveBox: null,

  // Start monitoring
  start: function() {
    this.enabled = true;
    this.backwardPushCount = 0;
    this.forwardPushCount = 0;

    console.log('%c╔══════════════════════════════════════════╗', 'color: #00ff00;');
    console.log('%c║      PUSHER DEBUG MONITOR STARTED        ║', 'color: #00ff00; font-weight: bold;');
    console.log('%c╚══════════════════════════════════════════╝', 'color: #00ff00;');

    // Store original and override
    if (!this.originalResolveBox) {
      this.originalResolveBox = Physics.resolveBoxCollision.bind(Physics);
    }

    const self = this;
    Physics.resolveBoxCollision = function(body, staticBody) {
      const pusherId = staticBody.id;
      const pusherVel = Physics.pusherVelocities[pusherId];
      const coinVzBefore = body.vz;

      // Call original
      self.originalResolveBox(body, staticBody);

      // Check if this was a pusher collision
      if (pusherVel !== undefined && Math.abs(pusherVel) > 0.1) {
        const coinVzAfter = body.vz;
        const deltaVz = coinVzAfter - coinVzBefore;

        // Only log significant velocity changes
        if (Math.abs(deltaVz) > 0.3) {
          const pusherDirection = pusherVel > 0 ? 'FORWARD →' : 'BACKWARD ←';
          const coinPushed = deltaVz > 0 ? 'forward' : 'backward';

          if (pusherVel < 0) {
            // Pusher is retracting
            if (deltaVz < -0.5) {
              // BUG: Coin pushed backward!
              self.backwardPushCount++;
              console.log(
                '%c🚨 BUG DETECTED: Coin pushed BACKWARD by retracting pusher!',
                'color: #ff0000; font-weight: bold; font-size: 14px;'
              );
              console.log(
                `%c   Pusher vel: ${pusherVel.toFixed(2)} | Coin Δvz: ${deltaVz.toFixed(2)}`,
                'color: #ff6666;'
              );
              console.log(
                `%c   Coin position: (${body.x.toFixed(1)}, ${body.y.toFixed(1)}, ${body.z.toFixed(1)})`,
                'color: #ff6666;'
              );
            } else {
              console.log(
                `%c✓ Pusher retracting (vel=${pusherVel.toFixed(2)}), coin NOT pushed backward (Δvz=${deltaVz.toFixed(2)})`,
                'color: #888888;'
              );
            }
          } else {
            // Pusher moving forward
            self.forwardPushCount++;
            console.log(
              `%c✓ [FORWARD PUSH] Pusher vel=${pusherVel.toFixed(2)} | Coin Δvz=+${deltaVz.toFixed(2)}`,
              'color: #00ff00;'
            );
          }
        }
      }
    };

    // Periodic status report
    this.logInterval = setInterval(() => {
      if (!this.enabled) return;
      console.log(
        `%c[STATUS] Forward pushes: ${this.forwardPushCount} | Backward push bugs: ${this.backwardPushCount}`,
        this.backwardPushCount > 0 ? 'color: #ff0000; font-weight: bold;' : 'color: #00ff00;'
      );
    }, 5000);

    console.log('%cCommands: PusherDebug.stop() | PusherDebug.snapshot() | PusherDebug.runTest()', 'color: #888888;');
  },

  // Stop monitoring
  stop: function() {
    this.enabled = false;

    if (this.logInterval) {
      clearInterval(this.logInterval);
      this.logInterval = null;
    }

    // Restore original function
    if (this.originalResolveBox) {
      Physics.resolveBoxCollision = this.originalResolveBox;
    }

    console.log('%c╔══════════════════════════════════════════╗', 'color: #ff6600;');
    console.log('%c║       PUSHER DEBUG MONITOR STOPPED       ║', 'color: #ff6600; font-weight: bold;');
    console.log('%c╚══════════════════════════════════════════╝', 'color: #ff6600;');
    console.log(`%cFinal Results:`, 'color: #ffffff; font-weight: bold;');
    console.log(`  Forward pushes: ${this.forwardPushCount}`);
    console.log(
      `  Backward push bugs: ${this.backwardPushCount}`,
      this.backwardPushCount > 0 ? '⚠️ BUGS FOUND!' : '✓ No bugs'
    );
  },

  // One-time snapshot of current state
  snapshot: function() {
    console.log('%c╔══════════════════════════════════════════╗', 'color: #00ffff;');
    console.log('%c║          PUSHER STATE SNAPSHOT           ║', 'color: #00ffff; font-weight: bold;');
    console.log('%c╚══════════════════════════════════════════╝', 'color: #00ffff;');

    console.log('%c\n--- Pusher Velocities ---', 'color: #ffff00;');
    const velocities = Physics.pusherVelocities;
    for (const id in velocities) {
      const vel = velocities[id];
      const dir = vel > 0 ? '→ FORWARD' : vel < 0 ? '← BACKWARD' : '• STOPPED';
      const color = vel > 0 ? '#00ff00' : vel < 0 ? '#ff6600' : '#888888';
      console.log(`%c  ${id}: ${vel.toFixed(3)} ${dir}`, `color: ${color};`);
    }

    console.log('%c\n--- Pusher Positions ---', 'color: #ffff00;');
    if (Board && Board.pushers) {
      Board.pushers.forEach((p, i) => {
        const progress = ((p.position - p.minZ) / (p.maxZ - p.minZ) * 100).toFixed(0);
        const dir = p.direction > 0 ? '→' : '←';
        console.log(`  Tier ${i}: pos=${p.position.toFixed(2)} ${dir} [${progress}%] speed=${p.speed}`);
      });
    }

    console.log('%c\n--- Coins Near Pushers ---', 'color: #ffff00;');
    if (Board && Board.pushers && Physics.bodies) {
      let nearCount = 0;
      Physics.bodies.forEach(body => {
        Board.pushers.forEach((pusher, i) => {
          const dz = Math.abs(body.z - pusher.body.z);
          const dy = Math.abs(body.y - pusher.body.y);
          if (dz < 2 && dy < 1.5) {
            nearCount++;
            const vzColor = body.vz < -0.5 ? '#ff0000' : body.vz > 0.5 ? '#00ff00' : '#888888';
            console.log(
              `%c  Coin near Tier ${i}: pos=(${body.x.toFixed(1)}, ${body.z.toFixed(1)}) vZ=${body.vz.toFixed(2)}`,
              `color: ${vzColor};`
            );
          }
        });
      });
      if (nearCount === 0) {
        console.log('  (no coins near pushers)');
      }
    }
  },

  // Automated test - drop coins and monitor for backward push bugs
  runTest: function(duration = 30) {
    console.log('%c╔══════════════════════════════════════════╗', 'color: #ff00ff;');
    console.log('%c║      RUNNING AUTOMATED PUSHER TEST       ║', 'color: #ff00ff; font-weight: bold;');
    console.log('%c╚══════════════════════════════════════════╝', 'color: #ff00ff;');
    console.log(`Test duration: ${duration} seconds`);
    console.log('Dropping coins continuously and monitoring for backward push bugs...\n');

    this.start();

    // Drop coins periodically
    let dropCount = 0;
    const dropInterval = setInterval(() => {
      if (Game && Game.isRunning && !Game.isPaused) {
        Game.dropCoin();
        dropCount++;
      }
    }, 200);

    // End test
    setTimeout(() => {
      clearInterval(dropInterval);
      this.stop();

      console.log('%c\n╔══════════════════════════════════════════╗', 'color: #ff00ff;');
      console.log('%c║           TEST RESULTS                   ║', 'color: #ff00ff; font-weight: bold;');
      console.log('%c╚══════════════════════════════════════════╝', 'color: #ff00ff;');
      console.log(`Coins dropped: ${dropCount}`);
      console.log(`Forward pushes detected: ${this.forwardPushCount}`);
      console.log(`Backward push bugs: ${this.backwardPushCount}`);

      if (this.backwardPushCount === 0) {
        console.log('%c\n✅ TEST PASSED: No backward push bugs detected!', 'color: #00ff00; font-weight: bold; font-size: 16px;');
      } else {
        console.log('%c\n❌ TEST FAILED: Backward push bugs detected!', 'color: #ff0000; font-weight: bold; font-size: 16px;');
      }
    }, duration * 1000);
  }
};

// Make globally available
window.PusherDebug = PusherDebug;

console.log('%c╔══════════════════════════════════════════╗', 'color: #00ffff;');
console.log('%c║    Pusher Debug Tool Loaded              ║', 'color: #00ffff; font-weight: bold;');
console.log('%c╚══════════════════════════════════════════╝', 'color: #00ffff;');
console.log('%cCommands:', 'color: #ffffff; font-weight: bold;');
console.log('  PusherDebug.start()     - Start live monitoring');
console.log('  PusherDebug.stop()      - Stop monitoring');
console.log('  PusherDebug.snapshot()  - View current state');
console.log('  PusherDebug.runTest(30) - Run 30-second automated test');
