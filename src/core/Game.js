/**
 * Main Game Engine for Coin Pusher World
 * Vertical coin pusher with pachinko elements
 */

import * as THREE from 'three';
import Background from '../world/Background.js';
import { tierThemes } from '../world/themes/index.js';

// Debug configuration - set to false for production builds
// Can be overridden via URL parameter: ?debug=true
const DEBUG = new URLSearchParams(window.location.search).get('debug') === 'true' || false;

const Game = {
  // Debug flag (can be toggled for development)
  DEBUG: DEBUG,
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

  // Auto-save feature (Phase 9 - run state persistence)
  autoSaveTimer: 0,
  autoSaveInterval: 30, // seconds between auto-saves

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

  // FPS tracking (for debug and performance monitoring per design spec 10.4)
  fpsFrames: [],
  fpsUpdateTimer: 0,
  currentFPS: 0,
  fpsElement: null,

  // Score thresholds for expansion (spaced out for gradual progression)
  // First unlock ~30s, then gradually increasing gaps for meaningful progression
  // Early game scores ~350-400 pts/sec, slowing as board fills
  expansionThresholds: [10000, 25000, 45000, 70000, 100000, 140000, 190000, 250000],
  currentExpansionIndex: 0,

  // Milestone tracking for progress notifications (Phase 8 Polish)
  milestoneNotifications: {
    milestone75shown: false,
    milestone90shown: false,
  },

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

  // Camera adjustment for pyramid growth
  cameraAdjustment: {
    targetZ: 22,
    targetY: 14,
    currentZ: 22,
    currentY: 14,
    smoothing: 0.05, // Smoothing factor for camera movement
  },

  // Drop zone preview indicator (Phase 8 Polish - Design Spec 2.2)
  dropPreviewIndicator: null,
  dropPreviewPulseTimer: 0,

  // Haptic feedback support (Phase 8 Polish - Mobile UX enhancement)
  hapticEnabled: true,

  // Score milestone celebrations (Phase 8 Polish)
  scoreMilestones: [10000, 25000, 50000, 100000, 250000, 500000, 1000000],
  reachedMilestones: [],

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

    // Initialize camera adjustment state to match initial position
    this.cameraAdjustment.currentZ = 22;
    this.cameraAdjustment.currentY = 14;
    this.cameraAdjustment.targetZ = 22;
    this.cameraAdjustment.targetY = 14;

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

    // Create drop zone preview indicator (Design Spec 2.2 - Physical Play skill expression)
    this.createDropPreviewIndicator();

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
      // Ignore keyboard shortcuts when typing in overlays or if game not running
      const isTyping = document.activeElement.tagName === 'INPUT' ||
                       document.activeElement.tagName === 'TEXTAREA';
      if (isTyping) return;

      // Space - Drop coin
      if (e.code === "Space" && this.isRunning && !this.isPaused) {
        e.preventDefault();
        this.dropCoin();
      }

      // A - Toggle auto-drop
      if (e.key === "a" || e.key === "A") {
        if (this.isRunning && !this.isPaused) {
          e.preventDefault();
          this.toggleAutoDrop();
          this.ui.showMessage(this.autoDrop ? "Auto-Drop: ON" : "Auto-Drop: OFF");
        }
      }

      // M - Trigger Multi-Drop (Design Spec 5.4)
      if (e.key === "m" || e.key === "M") {
        if (this.isRunning && !this.isPaused && this.coins) {
          e.preventDefault();
          const success = this.coins.triggerMultiDrop(5);
          if (!success && this.ui) {
            this.ui.showMessage("Multi-Drop not ready!");
          }
        }
      }

      // H - Toggle help overlay
      if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        const helpOverlay = document.getElementById("help-overlay");
        if (helpOverlay) {
          if (helpOverlay.style.display === "flex") {
            helpOverlay.style.display = "none";
          } else {
            helpOverlay.style.display = "flex";
          }
        }
      }

      // S - Toggle settings
      if (e.key === "s" || e.key === "S") {
        if (this.isRunning) { // Only during game, not on start screen
          e.preventDefault();
          const settingsOverlay = document.getElementById("settings-overlay");
          if (settingsOverlay) {
            if (settingsOverlay.style.display === "flex") {
              settingsOverlay.style.display = "none";
            } else {
              settingsOverlay.style.display = "flex";
            }
          }
        }
      }

      // B - Toggle board statistics (Design Spec 2.2 - Skill Expression)
      if (e.key === "b" || e.key === "B") {
        if (this.isRunning && !this.isPaused) {
          e.preventDefault();
          if (this.ui && this.ui.showBoardStats && this.ui.hideBoardStats) {
            const boardStatsOverlay = document.getElementById("board-stats-overlay");
            if (boardStatsOverlay) {
              if (boardStatsOverlay.classList.contains("hidden")) {
                this.ui.showBoardStats();
              } else {
                this.ui.hideBoardStats();
              }
            }
          }
        }
      }

      // Escape - Close any open overlay
      if (e.key === "Escape") {
        e.preventDefault();
        const overlays = [
          "help-overlay",
          "settings-overlay",
          "stats-overlay",
          "high-scores-overlay",
          "board-stats-overlay"
        ];
        overlays.forEach(id => {
          const overlay = document.getElementById(id);
          if (overlay && overlay.style.display === "flex") {
            overlay.style.display = "none";
          }
        });
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
    this.autoSaveTimer = 0; // Reset auto-save timer

    // Reset milestone notifications
    this.milestoneNotifications.milestone75shown = false;
    this.milestoneNotifications.milestone90shown = false;

    // Reset score milestones (Phase 8 Polish)
    this.reachedMilestones = [];

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

    // Initialize FPS display in debug mode (Design Spec 10.4)
    this.initFPSDisplay();

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

    // Track FPS (Design Spec 10.4 - performance monitoring)
    if (this.DEBUG) {
      this.updateFPS(this.deltaTime);
    }

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

    // Update camera position (smooth zoom for pyramid growth)
    this.updateCameraPosition(deltaTime);

    // Update drop zone preview indicator (Design Spec 2.2 - Physical Play)
    this.updateDropPreviewIndicator(deltaTime);

    // Auto-save game state periodically (Phase 9 - run state persistence)
    this.autoSaveTimer += deltaTime;
    if (this.autoSaveTimer >= this.autoSaveInterval) {
      this.autoSaveTimer = 0;
      this.saveGameState();
    }

    // Update Multi-Drop gauge UI (Design Spec 5.4)
    if (this.ui && this.boardManager) {
      const gaugeData = this.boardManager.getMultiDropGauge();
      this.ui.updateMultiDropGauge(gaugeData);
    }

    // Update active prizes display (Phase 8 Polish - Design Spec 8.1)
    if (this.ui && this.prizes) {
      this.ui.updateActivePrizes(this.prizes.activePrizes);
    }

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

  // Adjust camera based on pyramid size (smooth transition)
  updateCameraPosition: function (deltaTime) {
    // Only adjust if targets have changed (i.e., not at default position)
    const hasAdjustment = this.cameraAdjustment.targetZ !== 22 || this.cameraAdjustment.targetY !== 14;
    if (!hasAdjustment) return;

    // Smoothly interpolate current position towards target
    const smoothing = this.cameraAdjustment.smoothing;

    this.cameraAdjustment.currentZ += (this.cameraAdjustment.targetZ - this.cameraAdjustment.currentZ) * smoothing;
    this.cameraAdjustment.currentY += (this.cameraAdjustment.targetY - this.cameraAdjustment.currentY) * smoothing;

    // Only update if not in screen shake
    if (!this.originalCameraPosition && this.screenShake.timer <= 0) {
      const aspect = window.innerWidth / window.innerHeight;
      const mobileZOffset = aspect < 1 ? 6 : 0;
      const mobileYOffset = aspect < 1 ? 4 : 0;

      this.camera.position.z = this.cameraAdjustment.currentZ + mobileZOffset;
      this.camera.position.y = this.cameraAdjustment.currentY + mobileYOffset;
    }
  },

  // Adjust camera for pyramid growth (called when boards are added)
  adjustCameraForPyramid: function (boardCount) {
    // Zoom out gradually as more boards are added
    // Starts at z=22, y=14 and zooms out to z=32, y=18 at 8 boards
    const baseZ = 22;
    const baseY = 14;
    const maxZ = 32;
    const maxY = 18;

    // Linear interpolation based on board count (1-8 boards)
    const progress = Math.min(boardCount / 8, 1.0);

    this.cameraAdjustment.targetZ = baseZ + (maxZ - baseZ) * progress;
    this.cameraAdjustment.targetY = baseY + (maxY - baseY) * progress;
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
          // Haptic feedback on coin drop (Design Spec 10.4 - Mobile UX)
          this.triggerHaptic('light');
        }
        if (this.sound) this.sound.play("drop");
      }, i * 80);
    }
  },

  // Add score
  addScore: function (amount, x, y, z, multiplier) {
    multiplier = multiplier || 1;
    const finalAmount = Math.floor(amount * multiplier);

    // Safety check: prevent NaN/Infinity from corrupting score
    if (!isFinite(finalAmount) || isNaN(finalAmount)) {
      console.warn('Invalid score amount detected:', finalAmount, 'from', amount, 'x', multiplier);
      return;
    }

    const oldScore = this.score;
    this.score += finalAmount;
    this.sessionStats.coinsScored++;
    if (this.ui) this.ui.updateScore(this.score);

    // Check for score milestone celebrations (Phase 8 Polish)
    this.checkScoreMilestones(oldScore, this.score);

    // Haptic feedback for big scores (Design Spec 10.4 - Mobile UX)
    if (multiplier >= 5 || finalAmount >= 1000) {
      this.triggerHaptic('heavy');
    } else if (multiplier >= 2 || finalAmount >= 500) {
      this.triggerHaptic('medium');
    }

    // Spawn particles at score location
    if (x !== undefined) {
      const color = multiplier >= 5 ? 0xff00ff : multiplier >= 2 ? 0xffdd00 : 0xffd700;
      this.spawnParticles(x, y, z, color);
    }

    if (this.sound) this.sound.play("score");
  },

  // Check for score milestone celebrations (Phase 8 Polish)
  checkScoreMilestones: function(oldScore, newScore) {
    // Check each milestone to see if we just crossed it
    for (let i = 0; i < this.scoreMilestones.length; i++) {
      const milestone = this.scoreMilestones[i];

      // If we just crossed this milestone and haven't celebrated it yet
      if (oldScore < milestone && newScore >= milestone && !this.reachedMilestones.includes(milestone)) {
        this.reachedMilestones.push(milestone);
        this.celebrateScoreMilestone(milestone);
      }
    }
  },

  // Celebrate reaching a score milestone (Phase 8 Polish)
  celebrateScoreMilestone: function(milestone) {
    // Format the milestone (10k, 100k, 1M, etc.)
    let formattedMilestone;
    if (milestone >= 1000000) {
      formattedMilestone = (milestone / 1000000) + 'M';
    } else if (milestone >= 1000) {
      formattedMilestone = (milestone / 1000) + 'K';
    } else {
      formattedMilestone = milestone.toString();
    }

    // Celebration intensity scales with milestone size
    const intensity = milestone >= 100000 ? 1.5 : milestone >= 50000 ? 1.2 : 0.8;

    // Visual celebration
    if (this.ui) {
      this.ui.showMessage(`🎊 ${formattedMilestone} POINTS! 🎊\nKeep Going!`, '#FFD700', 4000);
    }

    // Screen shake
    this.screenShake(intensity);

    // Sound celebration
    if (this.sound) {
      this.sound.play(milestone >= 100000 ? 'jackpot' : 'levelup');
    }

    // Bonus reward for major milestones
    if (milestone >= 50000 && this.coins) {
      this.coins.addToQueue(5);
    }

    // Haptic feedback for mobile
    this.triggerHaptic('heavy');

    console.log(`🎊 Score milestone reached: ${formattedMilestone}`);
  },

  // Check if we should expand
  checkExpansion: function () {
    if (this.currentExpansionIndex >= this.expansionThresholds.length) return;

    // Calculate progress to next unlock (Design Spec 8 - Polish & Tuning)
    const tierProgress = this.getTierProgress();

    // Show milestone notifications at 75% and 90% progress
    if (tierProgress >= 0.75 && !this.milestoneNotifications.milestone75shown) {
      this.milestoneNotifications.milestone75shown = true;
      if (this.ui) {
        this.ui.showMessage("75% to next board! 🎯", 2000, "#ffaa00");
      }
      if (this.sound) this.sound.play("collect");
    } else if (tierProgress >= 0.90 && !this.milestoneNotifications.milestone90shown) {
      this.milestoneNotifications.milestone90shown = true;
      if (this.ui) {
        this.ui.showMessage("90% to next board! 🔥", 2000, "#ff4400");
      }
      if (this.sound) this.sound.play("powerup");
    }

    if (this.score >= this.expansionThresholds[this.currentExpansionIndex]) {
      this.currentExpansionIndex++;

      // Reset milestone notifications for next board
      this.milestoneNotifications.milestone75shown = false;
      this.milestoneNotifications.milestone90shown = false;

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

          // Adjust camera to fit the growing pyramid
          const status = this.boardManager.getStatus();
          this.adjustCameraForPyramid(status.totalBoards);

          // Update board counter display (Design Spec 10.1)
          if (this.ui) {
            this.ui.updateBoardCounter(status.totalBoards, status.maxBoards);
          }

          // Show helpful tip about the new board's power (Phase 8 Polish)
          const theme = tierThemes[selectedThemeIndex];
          if (theme && this.ui && !status.isFull) {
            // Helpful tip explaining what this board does
            const tips = {
              queueSpeed: 'Speeds up auto-drop! More coins, faster gameplay.',
              coinValue: 'Increases coin value! Every coin is worth more.',
              luckyCoins: 'Creates lucky coins! Watch for special high-value drops.',
              multiDrop: 'Charges Multi-Drop gauge! Drop multiple coins at once.',
              queueCapacity: 'Bigger coin queue! Store more coins for later.',
              widerPusher: 'Wider push coverage! More coins get moved.',
              comboTime: 'Longer combo windows! Chain scores for bigger multipliers.',
              jackpotChance: 'Better jackpot odds! Watch for jackpot exits.',
            };

            const tip = tips[theme.powerupFocus] || theme.description;
            this.ui.showMessage(`${theme.icon} ${theme.name}\n${tip}`, theme.glow ? `#${theme.glow.toString(16).padStart(6, '0')}` : '#00ffff', 3000);
          }

          // Celebrate pyramid completion! (Phase 8 Polish - Design Spec Section 3.1)
          if (status.isFull && this.ui && this.sound) {
            // Visual celebration
            this.ui.showMessage('🎉 PYRAMID COMPLETE! 🎉\nMaximum Power Unlocked!', '#FFD700', 5000);

            // Screen shake for epic feel
            this.screenShake(2.0);

            // Sound celebration
            this.sound.play('powerup');

            // Add bonus queue as a reward
            if (this.coins) {
              this.coins.addToQueue(10);
            }

            console.log('🎉 8-board pyramid completed! All theme synergies active!');
          }

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

    // Remove FPS display on game over
    this.removeFPSDisplay();

    // Hide drop preview indicator
    if (this.dropPreviewIndicator) {
      this.dropPreviewIndicator.visible = false;
    }

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

    // Clear saved game state since run is complete (Phase 9)
    this.clearGameState();

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

  // Get complete save data for run persistence (Phase 9 - Section 2.2)
  getSaveData: function () {
    if (!this.isRunning) return null; // Only save active games

    const saveData = {
      // Core game state
      score: this.score,
      expansionIndex: this.currentExpansionIndex,
      autoDrop: this.autoDrop,

      // Session stats
      sessionStats: { ...this.sessionStats },

      // System save data (only if systems exist and have save methods)
      powerUps: this.powerUps && this.powerUps.getSaveData ? this.powerUps.getSaveData() : null,
      coins: this.coins && this.coins.getSaveData ? this.coins.getSaveData() : null,
      combo: this.combo && this.combo.getSaveData ? this.combo.getSaveData() : null,
      jackpot: this.jackpot && this.jackpot.getSaveData ? this.jackpot.getSaveData() : null,
      boardManager: this.boardManager && this.boardManager.getSaveData ? this.boardManager.getSaveData() : null,
      prizes: this.prizes && this.prizes.getSaveData ? this.prizes.getSaveData() : null,

      // Timestamp for save validity
      timestamp: Date.now(),
      version: 1, // For future migration support
    };

    return saveData;
  },

  // Load save data and restore game state (Phase 9 - Section 2.2)
  loadSaveData: function (data) {
    if (!data) return false;

    try {
      // Restore core game state
      this.score = data.score || 0;
      this.currentExpansionIndex = data.expansionIndex || 0;
      this.autoDrop = data.autoDrop || false;

      // Restore session stats
      if (data.sessionStats) {
        this.sessionStats = { ...this.sessionStats, ...data.sessionStats };
      }

      // Update UI
      if (this.ui) {
        this.ui.updateScore(this.score);
        this.ui.updateAutoDropButton(this.autoDrop);
      }

      // Restore system states (in dependency order)
      if (data.powerUps && this.powerUps && this.powerUps.loadSaveData) {
        this.powerUps.loadSaveData(data.powerUps);
      }

      if (data.boardManager && this.boardManager && this.boardManager.loadSaveData) {
        this.boardManager.loadSaveData(data.boardManager);
      }

      if (data.prizes && this.prizes && this.prizes.loadSaveData) {
        this.prizes.loadSaveData(data.prizes);
      }

      if (data.coins && this.coins && this.coins.loadSaveData) {
        this.coins.loadSaveData(data.coins);
      }

      if (data.combo && this.combo && this.combo.loadSaveData) {
        this.combo.loadSaveData(data.combo);
      }

      if (data.jackpot && this.jackpot && this.jackpot.loadSaveData) {
        this.jackpot.loadSaveData(data.jackpot);
      }

      console.log('Game state restored from save');
      return true;
    } catch (error) {
      console.error('Failed to load save data:', error);
      return false;
    }
  },

  // Save current game state to persistent storage
  saveGameState: function () {
    if (!this.storage || !this.isRunning) return false;

    const saveData = this.getSaveData();
    if (!saveData) return false;

    const success = this.storage.saveGame(saveData);
    if (success) {
      if (this.DEBUG) console.log('Game state saved');
      // Show auto-save indicator (Phase 9 - visual feedback)
      if (this.ui) this.ui.showAutoSaveIndicator();
    }
    return success;
  },

  // Load and restore game state from persistent storage
  loadGameState: function () {
    if (!this.storage) return false;

    const saveData = this.storage.loadGame();
    if (!saveData) {
      console.log('No saved game found');
      return false;
    }

    // Check if save is too old (optional - could expire after 24h)
    const MAX_SAVE_AGE = 24 * 60 * 60 * 1000; // 24 hours
    if (saveData.timestamp && Date.now() - saveData.timestamp > MAX_SAVE_AGE) {
      console.log('Save data too old, starting fresh');
      this.storage.clearGame();
      return false;
    }

    return this.loadSaveData(saveData);
  },

  // Clear saved game state
  clearGameState: function () {
    if (!this.storage) return false;
    return this.storage.clearGame();
  },

  // Update FPS tracking (Design Spec 10.4 - performance monitoring)
  updateFPS: function (deltaTime) {
    // Add current frame time to tracking array
    this.fpsFrames.push(deltaTime);

    // Keep only the last 60 frames for averaging
    if (this.fpsFrames.length > 60) {
      this.fpsFrames.shift();
    }

    // Update FPS display every 0.5 seconds
    this.fpsUpdateTimer += deltaTime;
    if (this.fpsUpdateTimer >= 0.5) {
      this.fpsUpdateTimer = 0;

      // Calculate average FPS from frame times
      const avgFrameTime = this.fpsFrames.reduce((a, b) => a + b, 0) / this.fpsFrames.length;
      this.currentFPS = avgFrameTime > 0 ? Math.round(1 / avgFrameTime) : 0;

      // Update FPS display
      this.updateFPSDisplay();
    }
  },

  /**
   * Trigger haptic feedback on supported devices
   * Design Spec 10.4 - Mobile UX enhancement (Phase 8 Polish)
   * @param {string} type - 'light', 'medium', 'heavy' for different intensities
   */
  triggerHaptic: function (type = 'light') {
    if (!this.hapticEnabled) return;

    // Check if Vibration API is available (mobile devices)
    if (navigator.vibrate) {
      const patterns = {
        light: 10,      // Quick tap (coin drop)
        medium: 20,     // Score event
        heavy: [15, 10, 15],  // Big score/jackpot
      };
      navigator.vibrate(patterns[type] || patterns.light);
    }

    // Check if modern Haptic Feedback API is available (iOS Safari 13+, Android Chrome)
    if (window.navigator && window.navigator.vibrate) {
      // Already handled above
    }
  },

  /**
   * Create drop zone preview indicator
   * Design Spec 2.2 - Physical Play skill expression
   * Shows where coins will drop to help players aim better
   */
  createDropPreviewIndicator: function () {
    // Create a glowing ring indicator at the drop zone
    const geometry = new THREE.RingGeometry(0.8, 1.0, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });

    this.dropPreviewIndicator = new THREE.Mesh(geometry, material);
    this.dropPreviewIndicator.rotation.x = -Math.PI / 2; // Lay flat
    this.dropPreviewIndicator.visible = false; // Hidden until game starts
    this.scene.add(this.dropPreviewIndicator);

    // Add a subtle emissive glow
    material.emissive = new THREE.Color(0x00aaff);
    material.emissiveIntensity = 0.3;
  },

  /**
   * Update drop zone preview indicator position and animation
   * Called each frame during gameplay
   */
  updateDropPreviewIndicator: function (deltaTime) {
    if (!this.dropPreviewIndicator || !this.isRunning) return;

    // Show indicator only when game is running
    if (!this.dropPreviewIndicator.visible && this.isRunning && !this.isPaused) {
      this.dropPreviewIndicator.visible = true;
    }

    // Get current drop zone from board
    const dropZone = this.board?.getDropZone();
    if (!dropZone) {
      this.dropPreviewIndicator.visible = false;
      return;
    }

    // Position at drop zone
    const centerX = (dropZone.minX + dropZone.maxX) / 2;
    this.dropPreviewIndicator.position.set(centerX, dropZone.y + 0.1, dropZone.z);

    // Gentle pulsing animation (Design Spec 8 - Visual feedback)
    this.dropPreviewPulseTimer += deltaTime;
    const pulseScale = 1.0 + Math.sin(this.dropPreviewPulseTimer * 3.0) * 0.1;
    this.dropPreviewIndicator.scale.set(pulseScale, 1, pulseScale);

    // Gentle opacity pulse
    const pulseOpacity = 0.3 + Math.sin(this.dropPreviewPulseTimer * 2.5) * 0.15;
    this.dropPreviewIndicator.material.opacity = pulseOpacity;

    // Color shift based on queue status (green when full, cyan when medium, blue when low)
    if (this.coins) {
      const queueRatio = this.coins.coinQueue / this.coins.maxQueueSize;
      if (queueRatio > 0.7) {
        this.dropPreviewIndicator.material.color.setHex(0x00ff88); // Greenish
      } else if (queueRatio > 0.3) {
        this.dropPreviewIndicator.material.color.setHex(0x00ffff); // Cyan
      } else {
        this.dropPreviewIndicator.material.color.setHex(0x4488ff); // Bluish
      }
    }
  },

  // Initialize FPS display element
  initFPSDisplay: function () {
    if (!this.DEBUG) return;

    // Create FPS display element if it doesn't exist
    if (!this.fpsElement) {
      this.fpsElement = document.createElement('div');
      this.fpsElement.id = 'fps-counter';
      this.fpsElement.style.position = 'fixed';
      this.fpsElement.style.top = '10px';
      this.fpsElement.style.right = '10px';
      this.fpsElement.style.padding = '8px 12px';
      this.fpsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      this.fpsElement.style.color = '#00ff00';
      this.fpsElement.style.fontFamily = 'monospace';
      this.fpsElement.style.fontSize = '14px';
      this.fpsElement.style.borderRadius = '4px';
      this.fpsElement.style.zIndex = '10000';
      this.fpsElement.style.pointerEvents = 'none';
      this.fpsElement.textContent = 'FPS: --';
      document.body.appendChild(this.fpsElement);
    }
  },

  // Update FPS display element
  updateFPSDisplay: function () {
    if (!this.fpsElement) return;

    const targetFPS = this.lowPerformanceMode
      ? this.performanceSettings.low.targetFPS
      : this.performanceSettings.normal.targetFPS;

    // Color code based on performance relative to target
    let color = '#00ff00'; // Green - good
    if (this.currentFPS < targetFPS * 0.8) {
      color = '#ffff00'; // Yellow - warning
    }
    if (this.currentFPS < targetFPS * 0.5) {
      color = '#ff0000'; // Red - poor
    }

    this.fpsElement.style.color = color;
    this.fpsElement.textContent = `FPS: ${this.currentFPS} (Target: ${targetFPS})`;
  },

  // Remove FPS display element
  removeFPSDisplay: function () {
    if (this.fpsElement && this.fpsElement.parentNode) {
      this.fpsElement.parentNode.removeChild(this.fpsElement);
      this.fpsElement = null;
    }
  },
};

export default Game;
