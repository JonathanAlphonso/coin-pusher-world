/**
 * Main Game Engine for Coin Pusher World
 * Vertical coin pusher with pachinko elements
 */

import * as THREE from 'three';
import Background from '../world/Background.js';
import { tierThemes } from '../world/themes/index.js';

const Game = {
  // Three.js components
  scene: null,
  camera: null,
  renderer: null,
  background: null,

  // Game state
  isRunning: false,
  isPaused: false,
  score: 0,

  // Session stats
  sessionStats: {
    coinsDropped: 0,
    coinsScored: 0,
    bestCombo: 0,
    jackpotBursts: 0,
    collectiblesFound: 0,
    powerUpsEarned: 0,
  },

  // Auto-drop feature
  autoDrop: false,
  autoDropTimer: 0,
  autoDropInterval: 0.4, // seconds between auto drops

  // Performance mode (for old Android devices per design spec 10.4)
  lowPerformanceMode: false,
  performanceSettings: {
    normal: {
      maxCoins: 50,
      particleScale: 1.0,
      shadowsEnabled: false, // Already disabled for performance
      targetFPS: 60,
    },
    low: {
      maxCoins: 25,
      particleScale: 0.5,
      shadowsEnabled: false,
      targetFPS: 30,
    },
  },

  // Timing
  lastTime: 0,
  deltaTime: 0,

  // Score thresholds for expansion (spaced out for gradual progression)
  // First unlock ~30s, then gradually increasing gaps for meaningful progression
  // Early game scores ~350-400 pts/sec, slowing as board fills
  expansionThresholds: [10000, 25000, 45000, 70000, 100000, 140000, 190000, 250000],
  currentExpansionIndex: 0,

  // Canvas
  canvas: null,

  // Particle system
  particles: [],

  // Screen shake
  screenShake: {
    intensity: 0,
    duration: 0,
    timer: 0,
  },
  originalCameraPosition: null,

  // System references
  physics: null,
  ui: null,
  board: null,
  coins: null,
  powerUps: null,
  sound: null,
  combo: null,
  coinRain: null,
  jackpot: null,
  collectibles: null,
  relics: null,
  storage: null,
  dailyChallenges: null,

  // Initialize the game
  init: function (refs = {}) {
    console.log("Initializing Coin Pusher World...");

    // Store system references
    this.physics = refs.physics;
    this.ui = refs.ui;
    this.board = refs.board;
    this.coins = refs.coins;
    this.powerUps = refs.powerUps;
    this.sound = refs.sound;
    this.combo = refs.combo;
    this.coinRain = refs.coinRain;
    this.jackpot = refs.jackpot;
    this.collectibles = refs.collectibles;

    this.canvas = document.getElementById("game-canvas");

    // Create scene
    this.scene = new THREE.Scene();
    // Background handled by Background system, but set strict fog color to match skybox bottom
    this.scene.background = new THREE.Color(0x050510);

    // Create camera (angled view to see coin stacking and pusher action)
    const aspect = window.innerWidth / window.innerHeight;
    // Adjust FOV for mobile portrait screens (taller screens need wider FOV)
    const baseFOV = 60; // Increased base FOV to see more of the board
    const mobileFOV = aspect < 1 ? baseFOV + (1 - aspect) * 30 : baseFOV;
    this.camera = new THREE.PerspectiveCamera(mobileFOV, aspect, 0.1, 300); // Increased far plane for skybox
    // Position camera further back and higher for better overview
    const mobileZOffset = aspect < 1 ? 6 : 0;
    const mobileYOffset = aspect < 1 ? 4 : 0;
    this.camera.position.set(0, 14 + mobileYOffset, 22 + mobileZOffset);
    this.camera.lookAt(0, 0, 0);

    // Create renderer with optimizations
    const isTinyScreen = Math.min(window.innerWidth, window.innerHeight) < 420;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !isTinyScreen, // drop AA on tiny/mobile to avoid GPU overdraw
      powerPreference: "high-performance",
      precision: "mediump",
    });
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.physicallyCorrectLights = true;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const pixelRatioCap = isTinyScreen ? 1.25 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));

    // Initialize Background System
    this.background = Background;
    this.background.init(this.scene, this.camera);

    // Enhanced lighting for better visuals
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    // Main directional light
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(5, 10, 15);
    this.scene.add(mainLight);

    // Colored accent lights for arcade feel
    const blueLight = new THREE.PointLight(0x0088ff, 0.8, 30);
    blueLight.position.set(-8, 5, 10);
    this.scene.add(blueLight);

    const purpleLight = new THREE.PointLight(0x8800ff, 0.6, 30);
    purpleLight.position.set(8, -10, 10);
    this.scene.add(purpleLight);

    const goldLight = new THREE.PointLight(0xffaa00, 0.5, 25);
    goldLight.position.set(0, 0, 15);
    this.scene.add(goldLight);

    // Add fog for depth (extended range to keep all tiers visible)
    this.scene.fog = new THREE.Fog(0x1a0b2e, 60, 180);

    // Handle window resize
    window.addEventListener("resize", this.onResize.bind(this));

    // Handle touch/click for dropping coins
    this.setupInputHandlers();

    // Show start screen
    if (this.ui) {
        this.ui.showStartScreen();
        // Setup raycasting for relics if systems exist
        if(this.collectibles) {
            this.ui.setupRaycaster(this.camera, this.scene, this.collectibles);
        }
    }

    console.log("Game initialized!");

    return this.scene;
  },

  // Setup input handlers
  setupInputHandlers: function () {
    // Keyboard support
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" && this.isRunning && !this.isPaused) {
        this.dropCoin();
      }
    });
  },

  // Start the game
  start: function () {
    this.isRunning = true;
    this.isPaused = false;
    this.score = 0;
    this.currentExpansionIndex = 0;
    this.autoDrop = false;
    this.autoDropTimer = 0;

    // Reset session stats
    this.sessionStats = {
      coinsDropped: 0,
      coinsScored: 0,
      bestCombo: 0,
      jackpotBursts: 0,
      collectiblesFound: 0,
      powerUpsEarned: 0,
    };

    if (this.ui) this.ui.reset();
    if (this.powerUps) this.powerUps.init();

    // Give starting coins in queue
    if (this.coins) this.coins.addToQueue(15);

    // Claim and apply bonus from completed daily challenges
    if (this.dailyChallenges) {
      const bonus = this.dailyChallenges.claimBonus();
      if (bonus > 0) {
        // Convert bonus to starting score
        this.score = bonus;
        if (this.ui) {
          this.ui.updateScore(this.score);
          this.ui.showMessage(`Challenge Bonus: +${bonus}!`);
        }
      }
    }

    // Start game loop
    this.lastTime = performance.now();
    this.gameLoop();

    if (this.sound) this.sound.playMusic();
    console.log("Game started!");
  },

  // Restart the game
  restart: function () {
    // Clean up
    if (this.coins) this.coins.cleanup();
    if (this.board) this.board.cleanup();
    if (this.physics) this.physics.init(this.board);

    // Reinitialize
    if (this.board) {
      this.board.init(this.scene, {
        physics: this.physics,
        coins: this.coins,
        ui: this.ui,
        game: this,
      });
    }
    if (this.coins) {
      this.coins.init(this.scene, {
        physics: this.physics,
        board: this.board,
        ui: this.ui,
        sound: this.sound,
        combo: this.combo,
        jackpot: this.jackpot,
        coinRain: this.coinRain,
        powerUps: this.powerUps,
        collectibles: this.collectibles,
        game: this,
      });
    }

    // Start fresh
    this.start();
  },

  // Pause the game
  pause: function () {
    this.isPaused = true;
  },

  // Resume the game
  resume: function () {
    this.isPaused = false;
    this.lastTime = performance.now();
  },

  // Main game loop
  gameLoop: function () {
    if (!this.isRunning) return;

    requestAnimationFrame(this.gameLoop.bind(this));

    if (this.isPaused) return;

    // Calculate delta time
    const currentTime = performance.now();
    this.deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Cap delta time to prevent large jumps
    this.deltaTime = Math.min(this.deltaTime, 0.1);

    // Update game systems
    this.update(this.deltaTime);

    // Render
    this.render();
  },

  // Update game logic
  update: function (deltaTime) {
    // Update physics
    if (this.physics) this.physics.update(deltaTime);

    // Update background
    if (this.background) this.background.update(deltaTime);

    // Update board (pusher movement)
    if (this.board) this.board.update(deltaTime);

    // Update coins
    if (this.coins) this.coins.update(deltaTime);

    // Update collectibles
    if (this.collectibles) this.collectibles.update(deltaTime);

    // Update relics
    if (this.relics) this.relics.update(deltaTime);

    // Update combo system
    if (this.combo) this.combo.update(deltaTime);

    // Update jackpot
    if (this.jackpot) this.jackpot.update(deltaTime);

    // Update power-up cooldowns
    if (this.powerUps) this.powerUps.updateCooldowns(deltaTime);

    // Update auto-drop
    if (this.autoDrop && this.coins && this.coins.coinQueue > 0) {
      this.autoDropTimer += deltaTime;

      // Get dynamic auto-drop interval from ThemeEffects
      const effectiveInterval = this.themeEffects
        ? this.themeEffects.getAutoDropInterval(this.autoDropInterval)
        : this.autoDropInterval;

      if (this.autoDropTimer >= effectiveInterval) {
        this.autoDropTimer = 0;
        this.dropCoin();
      }
    }

    // Update particles
    this.updateParticles(deltaTime);

    // Update screen shake
    this.updateScreenShake(deltaTime);

    // Update UI
    if (this.ui) this.ui.update(deltaTime);

    // Check for expansion
    this.checkExpansion();
  },

  // Trigger screen shake
  shake: function (intensity = 0.5, duration = 0.3) {
    // Only shake if this is stronger than current shake
    if (intensity > this.screenShake.intensity) {
      this.screenShake.intensity = intensity;
      this.screenShake.duration = duration;
      this.screenShake.timer = duration;

      // Store original camera position if not already stored
      if (!this.originalCameraPosition) {
        this.originalCameraPosition = this.camera.position.clone();
      }
    }
  },

  // Update screen shake effect
  updateScreenShake: function (deltaTime) {
    if (this.screenShake.timer <= 0) return;

    this.screenShake.timer -= deltaTime;

    if (this.screenShake.timer <= 0) {
      // Reset camera to original position
      if (this.originalCameraPosition) {
        this.camera.position.copy(this.originalCameraPosition);
        this.originalCameraPosition = null;
      }
      this.screenShake.intensity = 0;
      return;
    }

    // Calculate shake with decay
    const progress = this.screenShake.timer / this.screenShake.duration;
    const currentIntensity = this.screenShake.intensity * progress;

    // Apply random offset to camera
    if (this.originalCameraPosition) {
      const offsetX = (Math.random() - 0.5) * 2 * currentIntensity;
      const offsetY = (Math.random() - 0.5) * 2 * currentIntensity;

      this.camera.position.x = this.originalCameraPosition.x + offsetX;
      this.camera.position.y = this.originalCameraPosition.y + offsetY;
    }
  },

  // Update particle effects
  updateParticles: function (deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      // Update position
      p.mesh.position.x += p.vx * deltaTime;
      p.mesh.position.y += p.vy * deltaTime;
      p.mesh.position.z += p.vz * deltaTime;
      p.vy -= 5 * deltaTime; // Gravity

      // Fade out
      p.mesh.material.opacity = p.life / p.maxLife;
      p.mesh.scale.setScalar(p.life / p.maxLife);
    }
  },

  // Spawn coin collection particles
  spawnParticles: function (x, y, z, color) {
    const count = 8;
    const geometry = new THREE.SphereGeometry(0.1, 4, 4);

    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);

      const angle = (i / count) * Math.PI * 2;
      const speed = 3 + Math.random() * 2;

      this.particles.push({
        mesh: mesh,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 2,
        vz: (Math.random() - 0.5) * 2,
        life: 0.8,
        maxLife: 0.8,
      });
    }
  },

  // Render the scene
  render: function () {
    this.renderer.render(this.scene, this.camera);
  },

  // Handle window resize
  onResize: function () {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    this.camera.aspect = aspect;

    // Adjust FOV dynamically for portrait/landscape
    const baseFOV = 60;
    this.camera.fov = aspect < 1 ? baseFOV + (1 - aspect) * 30 : baseFOV;

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  },

  // Drop a coin manually
  dropCoin: function () {
    if (!this.isRunning || this.isPaused) return;

    const dropCount = this.powerUps ? this.powerUps.getMultiDropCount() : 1;

    for (let i = 0; i < dropCount; i++) {
      setTimeout(() => {
        if (this.coins && this.coins.dropCoin()) {
          this.sessionStats.coinsDropped++;
        }
        if (this.sound) this.sound.play("drop");
      }, i * 80);
    }
  },

  // Add score
  addScore: function (amount, x, y, z, multiplier) {
    multiplier = multiplier || 1;
    const finalAmount = Math.floor(amount * multiplier);
    this.score += finalAmount;
    this.sessionStats.coinsScored++;
    if (this.ui) this.ui.updateScore(this.score);

    // Spawn particles at score location
    if (x !== undefined) {
      const color = multiplier >= 5 ? 0xff00ff : multiplier >= 2 ? 0xffdd00 : 0xffd700;
      this.spawnParticles(x, y, z, color);
    }

    if (this.sound) this.sound.play("score");
  },

  // Check if we should expand
  checkExpansion: function () {
    if (this.currentExpansionIndex >= this.expansionThresholds.length) return;

    if (this.score >= this.expansionThresholds[this.currentExpansionIndex]) {
      this.currentExpansionIndex++;

      // Use BoardManager if available, otherwise fall back to old system
      if (this.boardManager) {
        this.unlockNewBoard();
      } else if (this.board) {
        this.board.expandPyramid();
      }

      if (this.sound) this.sound.play("levelup");
    }

    // Update progress bar
    if (this.ui) this.ui.updateTierProgress(this.getTierProgress());
  },

  // Unlock a new board in the pyramid (design spec section 6.2)
  unlockNewBoard: function () {
    if (!this.boardManager) return;

    // Check if pyramid is full
    const status = this.boardManager.getStatus();
    if (status.isFull) {
      console.log('Pyramid is full (8 boards reached)');
      return;
    }

    // Pause game for board selection
    this.pause();

    // Get excluded theme indices (already in use)
    const excludedThemes = this.boardManager.getExcludedThemes();

    if (this.ui) {
      this.ui.showBoardSelection(excludedThemes, (selectedThemeIndex) => {
        // Add the new board
        const newBoard = this.boardManager.addBoard(selectedThemeIndex);

        if (newBoard) {
          console.log(`New board added: ${newBoard.boardId} at row ${newBoard.row}, col ${newBoard.col}`);

          // Update the physical board visualization (optional, can be implemented later)
          // if (this.board) {
          //   this.board.visualizeBoard(newBoard);
          // }

          // Show prize counter after board selection (design spec section 8.2)
          if (this.prizes) {
            // Get the theme for affinity bonuses
            const theme = tierThemes[selectedThemeIndex] || null;

            this.prizes.openPrizeCounter(theme, (selectedPrize) => {
              console.log(`Prize selected: ${selectedPrize.name}`);
              this.resume();
            });
          } else {
            this.resume();
          }
        } else {
          console.error('Failed to add board');
          this.resume();
        }
      });
    }
  },

  // Get progress towards next tier (0-1)
  getTierProgress: function () {
    if (this.currentExpansionIndex >= this.expansionThresholds.length) {
      return 1; // Max tier reached
    }

    const currentThreshold = this.expansionThresholds[this.currentExpansionIndex];
    const previousThreshold = this.currentExpansionIndex > 0
      ? this.expansionThresholds[this.currentExpansionIndex - 1]
      : 0;

    const progressInTier = this.score - previousThreshold;
    const tierRange = currentThreshold - previousThreshold;

    return Math.min(1, Math.max(0, progressInTier / tierRange));
  },

  // Get next tier threshold for display
  getNextTierThreshold: function () {
    if (this.currentExpansionIndex >= this.expansionThresholds.length) {
      return null; // Max tier reached
    }
    return this.expansionThresholds[this.currentExpansionIndex];
  },

  // Game over
  gameOver: function () {
    this.isRunning = false;
    this.autoDrop = false;

    const tier = this.board ? this.board.currentTierCount : 1;

    // Update session stats with final values
    if (this.combo) {
      this.sessionStats.bestCombo = this.combo.bestCombo || 0;
    }

    // Build complete session stats
    const completeSessionStats = {
      ...this.sessionStats,
      score: this.score,
      tier: tier,
    };

    // Save high score
    let highScoreResult = null;
    if (this.storage && this.score > 0) {
      highScoreResult = this.storage.addHighScore(this.score, tier);
      // Update lifetime stats
      this.storage.updateLifetimeStats(completeSessionStats);
    }

    // Check daily challenges
    if (this.dailyChallenges) {
      this.dailyChallenges.updateProgress(completeSessionStats);
    }

    if (this.ui) this.ui.showGameOver(this.score, highScoreResult, completeSessionStats);
    if (this.sound) this.sound.stopMusic();
  },

  // Toggle auto-drop feature
  toggleAutoDrop: function () {
    this.autoDrop = !this.autoDrop;
    this.autoDropTimer = 0;
    if (this.ui) this.ui.updateAutoDropButton(this.autoDrop);
    return this.autoDrop;
  },

  // Toggle performance mode (design spec 10.4)
  togglePerformanceMode: function () {
    this.lowPerformanceMode = !this.lowPerformanceMode;
    console.log(`Performance mode: ${this.lowPerformanceMode ? 'LOW' : 'NORMAL'}`);

    // Apply performance settings immediately
    if (this.coins) {
      const settings = this.getPerformanceSettings();
      this.coins.maxActiveCoins = settings.maxCoins;

      // Clean up excess coins if in low performance mode
      if (this.lowPerformanceMode && this.coins.activeCoins.length > settings.maxCoins) {
        console.log(`Cleaning up excess coins (${this.coins.activeCoins.length} -> ${settings.maxCoins})`);
        // Remove oldest coins beyond the limit
        const excessCount = this.coins.activeCoins.length - settings.maxCoins;
        for (let i = 0; i < excessCount; i++) {
          const coin = this.coins.activeCoins[0];
          if (coin) {
            this.coins.removeCoin(coin);
          }
        }
      }
    }

    // Update UI
    if (this.ui) {
      this.ui.updatePerformanceMode(this.lowPerformanceMode);
    }

    // Save to storage
    if (this.storage) {
      const settings = this.storage.getSettings();
      settings.lowPerformanceMode = this.lowPerformanceMode;
      this.storage.saveSettings(settings);
    }

    return this.lowPerformanceMode;
  },

  // Get current performance settings
  getPerformanceSettings: function () {
    return this.lowPerformanceMode
      ? this.performanceSettings.low
      : this.performanceSettings.normal;
  },

  // Get save data
  getSaveData: function () {
    return {
      score: this.score,
      expansionIndex: this.currentExpansionIndex,
      powerUps: this.powerUps ? this.powerUps.getSaveData() : null,
    };
  },

  // Load save data
  loadSaveData: function (data) {
    if (!data) return;

    this.score = data.score || 0;
    this.currentExpansionIndex = data.expansionIndex || 0;
    if (this.ui) this.ui.updateScore(this.score);

    if (data.powerUps && this.powerUps) {
      this.powerUps.loadSaveData(data.powerUps);
    }
  },
};

export default Game;
