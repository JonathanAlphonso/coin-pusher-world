/**
 * Main Game Engine for Coin Pusher World
 * Vertical coin pusher with pachinko elements
 */

const Game = {
  // Three.js components
  scene: null,
  camera: null,
  renderer: null,

  // Game state
  isRunning: false,
  isPaused: false,
  score: 0,

  // Timing
  lastTime: 0,
  deltaTime: 0,

  // Score thresholds for expansion (balanced for achievable gameplay)
  // ~30 coins at base value to first expansion, scales reasonably
  expansionThresholds: [250, 600, 1100, 1800, 2800, 4200, 6000, 9000],
  currentExpansionIndex: 0,

  // Canvas
  canvas: null,

  // Particle system
  particles: [],

  // Initialize the game
  init: function () {
    console.log("Initializing Coin Pusher World...");

    this.canvas = document.getElementById("game-canvas");

    // Create scene with gradient-like background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    // Create camera (angled view to see coin stacking and pusher action)
    const aspect = window.innerWidth / window.innerHeight;
    // Adjust FOV for mobile portrait screens (taller screens need wider FOV)
    const baseFOV = 50;
    const mobileFOV = aspect < 1 ? baseFOV + (1 - aspect) * 25 : baseFOV;
    this.camera = new THREE.PerspectiveCamera(mobileFOV, aspect, 0.1, 200);
    // Position camera further back on mobile for better overview
    const mobileZOffset = aspect < 1 ? 4 : 0;
    this.camera.position.set(0, 12, 18 + mobileZOffset);
    this.camera.lookAt(0, -2, 0);

    // Create renderer with optimizations
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance",
      precision: "mediump",
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

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
    this.scene.fog = new THREE.Fog(0x0a0a1a, 40, 120);

    // Initialize systems
    Physics.init();
    UI.init();
    Board.init(this.scene);
    Coins.init(this.scene);
    PowerUps.init();
    Sound.init();
    Combo.init();
    BonusWheel.init();
    Jackpot.init(this.scene);
    Collectibles.init(this.scene);

    // Handle window resize
    window.addEventListener("resize", this.onResize.bind(this));

    // Handle touch/click for dropping coins
    this.setupInputHandlers();

    // Show start screen
    UI.showStartScreen();

    console.log("Game initialized!");
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

    UI.reset();
    PowerUps.init();

    // Give starting coins in queue
    Coins.addToQueue(15);

    // Start game loop
    this.lastTime = performance.now();
    this.gameLoop();

    Sound.playMusic();
    console.log("Game started!");
  },

  // Restart the game
  restart: function () {
    // Clean up
    Coins.cleanup();
    Board.cleanup();
    Physics.init();

    // Reinitialize
    Board.init(this.scene);
    Coins.init(this.scene);

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
    Physics.update(deltaTime);

    // Update board (pusher movement)
    Board.update(deltaTime);

    // Update coins
    Coins.update(deltaTime);

    // Update collectibles
    Collectibles.update(deltaTime);

    // Update combo system
    Combo.update(deltaTime);

    // Update jackpot
    Jackpot.update(deltaTime);

    // Update power-up cooldowns
    PowerUps.updateCooldowns(deltaTime);

    // Update particles
    this.updateParticles(deltaTime);

    // Update UI
    UI.update(deltaTime);

    // Check for expansion
    this.checkExpansion();
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
    const baseFOV = 50;
    this.camera.fov = aspect < 1 ? baseFOV + (1 - aspect) * 25 : baseFOV;

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  },

  // Drop a coin manually
  dropCoin: function () {
    if (!this.isRunning || this.isPaused) return;

    const dropCount = PowerUps.getMultiDropCount();

    for (let i = 0; i < dropCount; i++) {
      setTimeout(() => {
        Coins.dropCoin();
        Sound.play("drop");
      }, i * 80);
    }
  },

  // Add score
  addScore: function (amount, x, y, z, multiplier) {
    multiplier = multiplier || 1;
    const finalAmount = Math.floor(amount * multiplier);
    this.score += finalAmount;
    UI.updateScore(this.score);

    // Spawn particles at score location
    if (x !== undefined) {
      const color = multiplier >= 5 ? 0xff00ff : multiplier >= 2 ? 0xffdd00 : 0xffd700;
      this.spawnParticles(x, y, z, color);
    }

    Sound.play("score");
  },

  // Check if we should expand
  checkExpansion: function () {
    if (this.currentExpansionIndex >= this.expansionThresholds.length) return;

    if (this.score >= this.expansionThresholds[this.currentExpansionIndex]) {
      this.currentExpansionIndex++;
      Board.expandPyramid();
      Sound.play("levelup");
    }
  },

  // Game over
  gameOver: function () {
    this.isRunning = false;
    UI.showGameOver(this.score);
    Sound.stopMusic();
  },

  // Get save data
  getSaveData: function () {
    return {
      score: this.score,
      expansionIndex: this.currentExpansionIndex,
      powerUps: PowerUps.getSaveData(),
    };
  },

  // Load save data
  loadSaveData: function (data) {
    if (!data) return;

    this.score = data.score || 0;
    this.currentExpansionIndex = data.expansionIndex || 0;
    UI.updateScore(this.score);

    if (data.powerUps) {
      PowerUps.loadSaveData(data.powerUps);
    }
  },
};

// Initialize game when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  Game.init();
});

// Make available globally
window.Game = Game;
