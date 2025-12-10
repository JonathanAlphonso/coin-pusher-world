/**
 * Combo/Streak System for Coin Pusher World
 * Multiple falls in quick succession multiply rewards!
 */

const Combo = {
  // Current combo state
  count: 0,
  timer: 0,
  comboWindow: 1.5,

  // Multiplier tiers
  tiers: [
    { min: 0, mult: 1, name: "", color: "#ffffff" },
    { min: 3, mult: 1.5, name: "NICE!", color: "#00ff00" },
    { min: 6, mult: 2, name: "GREAT!", color: "#00ffff" },
    { min: 10, mult: 3, name: "AWESOME!", color: "#ffff00" },
    { min: 15, mult: 4, name: "INCREDIBLE!", color: "#ff8800" },
    { min: 20, mult: 5, name: "LEGENDARY!", color: "#ff00ff" },
    { min: 30, mult: 7, name: "GODLIKE!", color: "#ff0000" },
  ],

  // Best combo this session
  bestCombo: 0,

  // UI elements
  comboElement: null,
  multiplierElement: null,
  textElement: null,
  container: null,

  // References (set during init)
  ui: null,
  sound: null,

  // Initialize
  init: function (ui = null, sound = null) {
    this.ui = ui;
    this.sound = sound;
    this.count = 0;
    this.timer = 0;
    this.bestCombo = 0;
    this.createUI();
  },

  // Create combo UI
  createUI: function () {
    const container = document.createElement("div");
    container.id = "combo-container";
    container.className = "hidden";
    container.innerHTML = `
      <div class="combo-count" id="combo-count">0</div>
      <div class="combo-text" id="combo-text">COMBO</div>
      <div class="combo-multiplier" id="combo-multiplier">x1</div>
    `;
    const gameContainer = document.getElementById("game-container");
    if (gameContainer) {
      gameContainer.appendChild(container);
    }

    this.comboElement = document.getElementById("combo-count");
    this.multiplierElement = document.getElementById("combo-multiplier");
    this.textElement = document.getElementById("combo-text");
    this.container = container;
  },

  // Register a coin fall (call this when a coin scores)
  registerFall: function () {
    this.count++;
    this.timer = this.comboWindow;

    if (this.count > this.bestCombo) {
      this.bestCombo = this.count;
    }

    this.updateUI();

    const tier = this.getCurrentTier();
    const prevTier = this.getTierForCount(this.count - 1);

    if (tier.min > prevTier.min && tier.name) {
      if (this.ui) this.ui.showMessage(tier.name + " x" + tier.mult);
      if (this.sound) this.sound.play("combo");
    }
  },

  // Get current multiplier
  getMultiplier: function () {
    return this.getCurrentTier().mult;
  },

  // Get current tier
  getCurrentTier: function () {
    return this.getTierForCount(this.count);
  },

  // Get tier for specific count
  getTierForCount: function (count) {
    let currentTier = this.tiers[0];
    for (const tier of this.tiers) {
      if (count >= tier.min) {
        currentTier = tier;
      }
    }
    return currentTier;
  },

  // Update UI
  updateUI: function () {
    const tier = this.getCurrentTier();

    if (this.count >= 3 && this.container) {
      this.container.classList.remove("hidden");
      if (this.comboElement) this.comboElement.textContent = this.count;
      if (this.multiplierElement) this.multiplierElement.textContent = "x" + tier.mult;
      if (this.textElement) this.textElement.textContent = tier.name || "COMBO";
      this.container.style.color = tier.color;
      if (this.comboElement) this.comboElement.style.color = tier.color;
      if (this.multiplierElement) this.multiplierElement.style.color = tier.color;

      this.container.classList.remove("pulse");
      void this.container.offsetWidth;
      this.container.classList.add("pulse");
    }
  },

  // Update combo timer
  update: function (deltaTime) {
    if (this.count > 0) {
      this.timer -= deltaTime;

      if (this.timer <= 0) {
        this.endCombo();
      }
    }
  },

  // End combo - returns bonus info if any
  endCombo: function () {
    let bonus = null;
    if (this.count >= 10) {
      bonus = {
        amount: this.count * 10,
        comboCount: this.count
      };
    }

    this.count = 0;
    this.timer = 0;
    if (this.container) {
      this.container.classList.add("hidden");
    }

    return bonus;
  },

  // Get combo bonus (extra points based on combo)
  getComboBonus: function () {
    if (this.count < 3) return 0;
    return this.count * 5;
  },

  // Phase 9 - Save/Load support for run state persistence
  getSaveData: function () {
    return {
      count: this.count,
      timer: this.timer,
      bestCombo: this.bestCombo,
    };
  },

  loadSaveData: function (data) {
    if (!data) return;

    this.count = data.count || 0;
    this.timer = data.timer || 0;
    this.bestCombo = data.bestCombo || 0;

    // Update UI to reflect loaded state
    if (this.count >= 3) {
      this.updateUI();
    }
  },
};

export default Combo;
