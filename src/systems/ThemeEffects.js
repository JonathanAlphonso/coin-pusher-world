/**
 * Theme Effects System for Coin Pusher World
 * Centralizes theme powerupFocus mechanics according to design spec section 5
 *
 * Each theme's powerupFocus defines how it contributes to the overall engine:
 * - queueSpeed: Reduces auto-drop interval
 * - coinValue: Increases coin value multipliers
 * - luckyCoins: Creates special high-value coins
 * - multiDrop: Enhances multi-coin drops
 * - queueCapacity: Increases queue size and gain
 * - widerPusher: Improves pusher coverage
 * - comboTime: Extends combo windows
 * - jackpotChance: Modulates jackpot probability
 */

const ThemeEffects = {
  // Effect multipliers per powerupFocus type
  effects: {
    queueSpeed: {
      name: 'Queue Speed',
      description: 'Faster auto-drop interval',
      autoDropReduction: 0.10, // -10% per board with this focus
      minAutoDropInterval: 0.2, // Minimum 200ms between drops
    },
    coinValue: {
      name: 'Coin Value',
      description: 'Persistent coin value increases',
      globalValueBonus: 0.15, // +15% per board with this focus
      boardPassBonus: 0.05, // +5% when coin passes through this board
    },
    luckyCoins: {
      name: 'Lucky Coins',
      description: 'Occasionally super-valuable coins',
      luckyChanceBonus: 0.05, // +5% per board with this focus
      luckyMultiplier: 3.0, // Lucky coins worth 3x more
    },
    multiDrop: {
      name: 'Multi-Drop',
      description: 'Enhanced multi-coin drops',
      multiDropChargeRate: 0.20, // +20% charge rate per board
      multiDropBonusCoins: 1, // +1 coin per multi-drop
    },
    queueCapacity: {
      name: 'Queue Capacity',
      description: 'Larger queue and more queue gain',
      maxQueueBonus: 5, // +5 max queue per board
      queueGainBonus: 0.15, // +15% queue gain from obstacles
    },
    widerPusher: {
      name: 'Wider Pusher',
      description: 'Better pusher coverage',
      pushStrengthBonus: 0.10, // +10% push strength
      pusherWidthBonus: 0.05, // +5% pusher width
    },
    comboTime: {
      name: 'Combo Time',
      description: 'Extended combo windows',
      comboWindowBonus: 0.25, // +25% combo window duration
      comboMultiplierBonus: 0.10, // +10% combo multiplier scaling
    },
    jackpotChance: {
      name: 'Jackpot Chance',
      description: 'Enhanced jackpot probability and payout',
      jackpotChanceBonus: 0.08, // +8% jackpot trigger chance
      jackpotPayoutBonus: 0.20, // +20% jackpot payout
    },
  },

  // Active effects from current pyramid
  activeEffects: {},

  /**
   * Initialize theme effects system
   */
  init: function() {
    this.activeEffects = {};
  },

  /**
   * Update active effects based on current pyramid boards
   * @param {Array} boards - Array of boards from BoardManager
   */
  updateEffects: function(boards) {
    // Reset active effects
    this.activeEffects = {};

    // Count boards by powerupFocus
    const focusCounts = {};
    boards.forEach(board => {
      const focus = board.powerupFocus || 'none';
      focusCounts[focus] = (focusCounts[focus] || 0) + 1;
    });

    // Calculate cumulative effects
    for (const [focus, count] of Object.entries(focusCounts)) {
      if (this.effects[focus]) {
        this.activeEffects[focus] = {
          count: count,
          ...this.effects[focus]
        };
      }
    }

    return this.activeEffects;
  },

  /**
   * Get the current global value multiplier from coinValue boards
   * @returns {number} Multiplier (1.0 = no bonus)
   */
  getGlobalValueMultiplier: function() {
    const effect = this.activeEffects.coinValue;
    if (!effect) return 1.0;

    return 1.0 + (effect.globalValueBonus * effect.count);
  },

  /**
   * Get the board pass value bonus
   * @param {string} powerupFocus - The board's powerupFocus
   * @returns {number} Bonus multiplier
   */
  getBoardPassBonus: function(powerupFocus) {
    if (powerupFocus === 'coinValue' && this.effects.coinValue) {
      return this.effects.coinValue.boardPassBonus;
    }
    return 0;
  },

  /**
   * Get the current auto-drop interval reduction
   * @param {number} baseInterval - Base auto-drop interval in seconds
   * @returns {number} Modified interval in seconds
   */
  getAutoDropInterval: function(baseInterval) {
    const effect = this.activeEffects.queueSpeed;
    if (!effect) return baseInterval;

    const reduction = effect.autoDropReduction * effect.count;
    const newInterval = baseInterval * (1.0 - reduction);
    return Math.max(effect.minAutoDropInterval, newInterval);
  },

  /**
   * Get the current lucky coin chance
   * @param {number} baseChance - Base lucky coin chance (0-1)
   * @returns {number} Modified chance (0-1)
   */
  getLuckyChance: function(baseChance) {
    const effect = this.activeEffects.luckyCoins;
    if (!effect) return baseChance;

    return Math.min(0.5, baseChance + (effect.luckyChanceBonus * effect.count));
  },

  /**
   * Get the lucky coin multiplier
   * @returns {number} Multiplier for lucky coins
   */
  getLuckyMultiplier: function() {
    const effect = this.activeEffects.luckyCoins;
    return effect ? effect.luckyMultiplier : 1.0;
  },

  /**
   * Get the max queue size bonus
   * @param {number} baseMaxQueue - Base max queue size
   * @returns {number} Modified max queue size
   */
  getMaxQueueSize: function(baseMaxQueue) {
    const effect = this.activeEffects.queueCapacity;
    if (!effect) return baseMaxQueue;

    return baseMaxQueue + (effect.maxQueueBonus * effect.count);
  },

  /**
   * Get the queue gain bonus multiplier
   * @returns {number} Multiplier for queue gains (1.0 = no bonus)
   */
  getQueueGainMultiplier: function() {
    const effect = this.activeEffects.queueCapacity;
    if (!effect) return 1.0;

    return 1.0 + (effect.queueGainBonus * effect.count);
  },

  /**
   * Get the combo window duration multiplier
   * @returns {number} Multiplier for combo window (1.0 = no bonus)
   */
  getComboWindowMultiplier: function() {
    const effect = this.activeEffects.comboTime;
    if (!effect) return 1.0;

    return 1.0 + (effect.comboWindowBonus * effect.count);
  },

  /**
   * Get the combo multiplier scaling bonus
   * @returns {number} Additional combo multiplier per combo level
   */
  getComboMultiplierBonus: function() {
    const effect = this.activeEffects.comboTime;
    if (!effect) return 0;

    return effect.comboMultiplierBonus * effect.count;
  },

  /**
   * Get the jackpot trigger chance bonus
   * @param {number} baseChance - Base jackpot chance (0-1)
   * @returns {number} Modified chance (0-1)
   */
  getJackpotChance: function(baseChance) {
    const effect = this.activeEffects.jackpotChance;
    if (!effect) return baseChance;

    return Math.min(0.5, baseChance + (effect.jackpotChanceBonus * effect.count));
  },

  /**
   * Get the jackpot payout multiplier
   * @returns {number} Multiplier for jackpot payout (1.0 = no bonus)
   */
  getJackpotPayoutMultiplier: function() {
    const effect = this.activeEffects.jackpotChance;
    if (!effect) return 1.0;

    return 1.0 + (effect.jackpotPayoutBonus * effect.count);
  },

  /**
   * Get multi-drop charge rate multiplier
   * @returns {number} Multiplier for charge rate (1.0 = no bonus)
   */
  getMultiDropChargeRate: function() {
    const effect = this.activeEffects.multiDrop;
    if (!effect) return 1.0;

    return 1.0 + (effect.multiDropChargeRate * effect.count);
  },

  /**
   * Get bonus coins for multi-drop
   * @returns {number} Additional coins per multi-drop
   */
  getMultiDropBonusCoins: function() {
    const effect = this.activeEffects.multiDrop;
    if (!effect) return 0;

    return effect.multiDropBonusCoins * effect.count;
  },

  /**
   * Get push strength multiplier
   * @returns {number} Multiplier for push strength (1.0 = no bonus)
   */
  getPushStrengthMultiplier: function() {
    const effect = this.activeEffects.widerPusher;
    if (!effect) return 1.0;

    return 1.0 + (effect.pushStrengthBonus * effect.count);
  },

  /**
   * Get pusher width bonus
   * @returns {number} Multiplier for pusher width (1.0 = no bonus)
   */
  getPusherWidthMultiplier: function() {
    const effect = this.activeEffects.widerPusher;
    if (!effect) return 1.0;

    return 1.0 + (effect.pusherWidthBonus * effect.count);
  },

  /**
   * Get a summary of all active effects for display
   * @returns {Array} Array of active effect descriptions
   */
  getSummary: function() {
    const summary = [];

    for (const [focus, effect] of Object.entries(this.activeEffects)) {
      summary.push({
        name: effect.name,
        description: effect.description,
        count: effect.count,
        focus: focus
      });
    }

    return summary;
  },

  /**
   * Reset all active effects
   */
  reset: function() {
    this.activeEffects = {};
  }
};

export default ThemeEffects;
