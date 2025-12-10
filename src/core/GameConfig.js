/**
 * Game Configuration - Centralized constants and tuning values
 * Design Spec Section 12.2 - Data-Driven Content
 *
 * This file centralizes all "magic numbers" to make tuning easier.
 * Instead of hardcoded values scattered throughout the codebase,
 * all configurable game parameters are defined here.
 */

const GameConfig = {
  // === Physics & World ===

  /** Y position where coins are considered "fallen off" and should be scored */
  SCORING_Y_THRESHOLD: -15,

  /** Gravity strength for coin physics */
  GRAVITY: 9.8,


  // === Timing & Performance ===

  /** Auto-drop interval in seconds between automatic coin drops */
  AUTO_DROP_INTERVAL: 0.4,

  /** Auto-save interval in seconds for run state persistence (Phase 9) */
  AUTO_SAVE_INTERVAL: 30,

  /** Maximum age of saved game in milliseconds (24 hours) */
  MAX_SAVE_AGE: 24 * 60 * 60 * 1000,

  /** Combo window duration in seconds - time before combo resets */
  COMBO_WINDOW: 1.5,


  // === Performance Settings ===

  performance: {
    normal: {
      /** Maximum number of active coins allowed on screen */
      maxCoins: 50,
      /** Particle effect scale multiplier */
      particleScale: 1.0,
      /** Whether real-time shadows are enabled (disabled for performance) */
      shadowsEnabled: false,
      /** Target frames per second */
      targetFPS: 60,
    },
    low: {
      /** Maximum coins in low performance mode (for old Android devices) */
      maxCoins: 25,
      /** Reduced particle scale for low-end devices */
      particleScale: 0.5,
      /** Shadows disabled in low performance mode */
      shadowsEnabled: false,
      /** Target FPS for low-end devices (Design Spec 10.4) */
      targetFPS: 30,
    },
  },


  // === Coin System ===

  /** Number of coins to pre-create in the object pool */
  COIN_POOL_SIZE: 80,

  /** Base value for newly dropped coins */
  COIN_BASE_VALUE: 10,

  /** Radius of standard coins for collision detection */
  COIN_RADIUS: 0.3,


  // === Camera ===

  camera: {
    /** Initial camera Z position (moves back as pyramid grows) */
    initialZ: 22,
    /** Initial camera Y position (moves up as pyramid grows) */
    initialY: 14,
    /** Final camera Z position with full 8-board pyramid */
    finalZ: 32,
    /** Final camera Y position with full pyramid */
    finalY: 18,
    /** Smoothing factor for camera movement (lower = smoother, 0.01-0.1 range) */
    smoothing: 0.05,
  },


  // === Pyramid & Board System ===

  /** Maximum number of boards in the pyramid (Design Spec Section 6.1) */
  MAX_BOARDS: 8,

  /** Score thresholds for unlocking new boards - Design Spec Section 3.1
   *  Tuned for ~30s to first unlock, then gradually increasing gaps
   *  Early game: ~350-400 pts/sec, slowing as boards fill
   */
  EXPANSION_THRESHOLDS: [
    10000,   // ~30s at 350 pts/sec
    25000,   // +37s at 400 pts/sec
    45000,   // +50s
    70000,   // +62s
    100000,  // +75s
    140000,  // +100s
    190000,  // +125s
    250000,  // +150s
  ],

  /** Number of theme options to offer when selecting a new board */
  THEME_SELECTION_COUNT: 3,


  // === Prize System (Design Spec Section 8) ===

  /** Number of prize options shown in rotating counter */
  PRIZE_COUNTER_SIZE: 6,

  /** Maximum number of active prizes player can hold */
  MAX_ACTIVE_PRIZES: 8,


  // === Jackpot System ===

  jackpot: {
    /** Starting jackpot value */
    initialValue: 100,
    /** Maximum jackpot value before burst */
    maxValue: 10000,
    /** Minimum jackpot value for a burst to trigger */
    minBurst: 500,
    /** Percentage of coin value contributed to jackpot (5%) */
    contributionRate: 0.05,
    /** Chance per jackpot item collected to trigger burst (15%) */
    burstChancePerItem: 0.15,
  },


  // === Bonus Zones ===

  bonus: {
    /** Queue bonus: min coins added to queue */
    queueMin: 3,
    /** Queue bonus: max coins added to queue */
    queueMax: 8,
    /** Duration of 2x value multiplier bonus in milliseconds */
    multiplierDuration: 10000,
    /** Chance for coin rain after bonus slot (50%) */
    coinRainChance: 0.5,
    /** Chance for theme bonus to trigger (30%) */
    themeBonusChance: 0.3,
  },


  // === Combo Multipliers (Design Spec Section 7) ===

  /** Combo tier thresholds and multipliers - higher combos = better rewards */
  COMBO_TIERS: [
    { min: 0,  mult: 1,   name: "",             color: "#ffffff" },
    { min: 3,  mult: 1.5, name: "NICE!",        color: "#00ff00" },
    { min: 6,  mult: 2,   name: "GREAT!",       color: "#00ffff" },
    { min: 10, mult: 3,   name: "AWESOME!",     color: "#ffff00" },
    { min: 15, mult: 4,   name: "INCREDIBLE!",  color: "#ff8800" },
    { min: 20, mult: 5,   name: "LEGENDARY!",   color: "#ff00ff" },
    { min: 30, mult: 7,   name: "GODLIKE!",     color: "#ff0000" },
  ],


  // === Screen Shake ===

  shake: {
    /** Screen shake intensity for 10+ multiplier slots */
    highMultiplier: { intensity: 1.0, duration: 0.4 },
    /** Screen shake for 5-9x multiplier slots */
    mediumMultiplier: { intensity: 0.6, duration: 0.3 },
    /** Screen shake for 3-4x multiplier slots */
    lowMultiplier: { intensity: 0.3, duration: 0.2 },
  },


  // === UI & Touch Targets (Design Spec Section 10.3, 11.3) ===

  ui: {
    /** Minimum tap target size in CSS pixels for mobile (Design Spec 10.4) */
    minTapTarget: 44,
    /** Preferred tap target size for better accessibility */
    preferredTapTarget: 48,
  },
};

// Freeze config to prevent accidental modification
Object.freeze(GameConfig);
Object.freeze(GameConfig.performance);
Object.freeze(GameConfig.performance.normal);
Object.freeze(GameConfig.performance.low);
Object.freeze(GameConfig.camera);
Object.freeze(GameConfig.jackpot);
Object.freeze(GameConfig.bonus);
Object.freeze(GameConfig.shake);
Object.freeze(GameConfig.ui);
GameConfig.COMBO_TIERS.forEach(tier => Object.freeze(tier));
Object.freeze(GameConfig.COMBO_TIERS);
Object.freeze(GameConfig.EXPANSION_THRESHOLDS);

export default GameConfig;
