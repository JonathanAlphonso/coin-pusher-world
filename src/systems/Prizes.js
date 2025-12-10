/**
 * Prize System for Coin Pusher World
 * Implements Prize Counter with 6-option rotating selection
 * According to design spec section 4.4
 */

import { random } from '../core/Utils.js';

const Prizes = {
  // Prize pool - all available prizes in the game
  prizePool: [
    // Queue-focused prizes
    {
      id: 'fastQueue',
      name: 'Rapid Dropper',
      icon: '⚡',
      summary: 'Queue refills 50% faster',
      tags: ['queue'],
      affinities: ['queueSpeed'],
      effects: { queueRegenSpeed: 0.5 },
      rarity: 'common',
    },
    {
      id: 'bigQueue',
      name: 'Coin Vault',
      icon: '🏦',
      summary: 'Max queue +10 coins',
      tags: ['queue'],
      affinities: ['queueCapacity'],
      effects: { maxQueueBonus: 10 },
      rarity: 'common',
    },
    {
      id: 'queueOnHit',
      name: 'Bounce Refund',
      icon: '🔄',
      summary: '+1 queue per obstacle hit',
      tags: ['queue'],
      affinities: ['queueCapacity'],
      effects: { queuePerHit: 1 },
      rarity: 'uncommon',
    },

    // Value-focused prizes
    {
      id: 'goldenTouch',
      name: 'Golden Touch',
      icon: '✨',
      summary: '+25% coin value',
      tags: ['value'],
      affinities: ['coinValue'],
      effects: { coinValueMult: 0.25 },
      rarity: 'common',
    },
    {
      id: 'compoundValue',
      name: 'Compound Interest',
      icon: '📈',
      summary: '+5% value per board visited',
      tags: ['value'],
      affinities: ['coinValue'],
      effects: { valuePerBoard: 0.05 },
      rarity: 'uncommon',
    },
    {
      id: 'megaCoins',
      name: 'Mega Minter',
      icon: '💰',
      summary: '+100% base coin value',
      tags: ['value'],
      affinities: ['coinValue'],
      effects: { baseValueMult: 1.0 },
      rarity: 'rare',
    },

    // Lucky coin prizes
    {
      id: 'luckyStreak',
      name: 'Lucky Streak',
      icon: '🍀',
      summary: '+10% special coin chance',
      tags: ['lucky'],
      affinities: ['luckyCoins'],
      effects: { luckyChance: 0.10 },
      rarity: 'common',
    },
    {
      id: 'rainbowLuck',
      name: 'Rainbow Fortune',
      icon: '🌈',
      summary: 'Rainbow coins worth 2x more',
      tags: ['lucky', 'value'],
      affinities: ['luckyCoins'],
      effects: { rainbowMult: 1.0 },
      rarity: 'uncommon',
    },
    {
      id: 'luckyBurst',
      name: 'Lucky Burst',
      icon: '✨',
      summary: 'Every 10th coin is rainbow',
      tags: ['lucky'],
      affinities: ['luckyCoins'],
      effects: { guaranteedRainbow: 10 },
      rarity: 'rare',
    },

    // Jackpot prizes
    {
      id: 'jackpotFill',
      name: 'Jackpot Charger',
      icon: '🔋',
      summary: 'Jackpot fills 30% faster',
      tags: ['jackpot'],
      affinities: ['jackpotChance'],
      effects: { jackpotFillRate: 0.30 },
      rarity: 'common',
    },
    {
      id: 'bigJackpot',
      name: 'Mega Jackpot',
      icon: '🎰',
      summary: '+50% jackpot payout',
      tags: ['jackpot', 'value'],
      affinities: ['jackpotChance'],
      effects: { jackpotMult: 0.50 },
      rarity: 'uncommon',
    },
    {
      id: 'miniJackpots',
      name: 'Mini Jackpots',
      icon: '🎲',
      summary: 'Small jackpot every 20 coins',
      tags: ['jackpot'],
      affinities: ['jackpotChance'],
      effects: { miniJackpotInterval: 20 },
      rarity: 'uncommon',
    },

    // Combo prizes
    {
      id: 'comboExtender',
      name: 'Combo Timer',
      icon: '⏱️',
      summary: '+50% combo window time',
      tags: ['combo'],
      affinities: ['comboTime'],
      effects: { comboWindowMult: 0.50 },
      rarity: 'common',
    },
    {
      id: 'comboBooster',
      name: 'Combo Master',
      icon: '🔥',
      summary: '+100% combo multiplier',
      tags: ['combo', 'value'],
      affinities: ['comboTime'],
      effects: { comboMult: 1.0 },
      rarity: 'uncommon',
    },
    {
      id: 'comboStarter',
      name: 'Instant Combo',
      icon: '⚡',
      summary: 'Start at 5x combo',
      tags: ['combo'],
      affinities: ['comboTime'],
      effects: { baseCombo: 5 },
      rarity: 'rare',
    },

    // Multi-drop prizes
    {
      id: 'doubleDrop',
      name: 'Double Drop',
      icon: '2️⃣',
      summary: 'Drop 2 coins at once',
      tags: ['multi'],
      affinities: ['multiDrop'],
      effects: { multiDropCount: 1 },
      rarity: 'uncommon',
    },
    {
      id: 'tripleDrop',
      name: 'Triple Drop',
      icon: '3️⃣',
      summary: 'Drop 3 coins at once',
      tags: ['multi'],
      affinities: ['multiDrop'],
      effects: { multiDropCount: 2 },
      rarity: 'rare',
    },
    {
      id: 'spreadDrop',
      name: 'Spread Shot',
      icon: '🎯',
      summary: 'Multi-drop covers full width',
      tags: ['multi', 'routing'],
      affinities: ['multiDrop'],
      effects: { dropSpread: 1.0 },
      rarity: 'uncommon',
    },

    // Routing prizes
    {
      id: 'centerBias',
      name: 'Center Magnet',
      icon: '🧲',
      summary: 'Coins drift to center slots',
      tags: ['routing'],
      affinities: ['widerPusher'],
      effects: { centerBias: 0.3 },
      rarity: 'common',
    },
    {
      id: 'edgeBias',
      name: 'Edge Router',
      icon: '↔️',
      summary: 'More coins hit edge obstacles',
      tags: ['routing'],
      affinities: [],
      effects: { edgeBias: 0.3 },
      rarity: 'uncommon',
    },
    {
      id: 'smartRouting',
      name: 'Smart Router',
      icon: '🧠',
      summary: 'Coins favor best child boards',
      tags: ['routing'],
      affinities: [],
      effects: { smartRouting: 1 },
      rarity: 'rare',
    },

    // Hybrid/Synergy prizes
    {
      id: 'pyramidPower',
      name: 'Pyramid Power',
      icon: '🔺',
      summary: '+10% all bonuses per tier',
      tags: ['value', 'combo', 'jackpot'],
      affinities: [],
      effects: { tierBonusMult: 0.10 },
      rarity: 'rare',
    },
    {
      id: 'themeSync',
      name: 'Theme Synergy',
      icon: '🔗',
      summary: 'Matching boards give 2x bonus',
      tags: ['value'],
      affinities: [],
      effects: { themeSynergy: 1.0 },
      rarity: 'rare',
    },
    {
      id: 'allAround',
      name: 'All-Rounder',
      icon: '🌟',
      summary: '+20% to everything',
      tags: ['value', 'queue', 'combo'],
      affinities: [],
      effects: { globalMult: 0.20 },
      rarity: 'legendary',
    },

    // Additional strategic prizes (reaching 30-prize pool goal)
    {
      id: 'pusherPower',
      name: 'Power Pusher',
      icon: '💪',
      summary: '+40% pusher strength',
      tags: ['pusher'],
      affinities: ['widerPusher'],
      effects: { pushStrength: 0.40 },
      rarity: 'common',
    },
    {
      id: 'cascadeMaster',
      name: 'Cascade Master',
      icon: '🌊',
      summary: '+20% value per board cascaded',
      tags: ['value', 'routing'],
      affinities: ['coinValue'],
      effects: { cascadeBonus: 0.20 },
      rarity: 'epic',
    },
    {
      id: 'queueEngine',
      name: 'Queue Engine',
      icon: '⚙️',
      summary: '+15 max queue, +30% regen',
      tags: ['queue'],
      affinities: ['queueSpeed', 'queueCapacity'],
      effects: { maxQueueBonus: 15, queueRegenSpeed: 0.30 },
      rarity: 'epic',
    },
    {
      id: 'comboChain',
      name: 'Chain Reaction',
      icon: '⛓️',
      summary: 'Combos never break (3s window)',
      tags: ['combo'],
      affinities: ['comboTime'],
      effects: { comboWindowMult: 2.0 },
      rarity: 'legendary',
    },
    {
      id: 'doubleJackpot',
      name: 'Double Jackpot',
      icon: '💎',
      summary: '2x jackpot value always',
      tags: ['jackpot', 'value'],
      affinities: ['jackpotChance'],
      effects: { jackpotMult: 1.0 },
      rarity: 'epic',
    },
    {
      id: 'ultimatePyramid',
      name: 'Ultimate Pyramid',
      icon: '🏔️',
      summary: '8-board pyramid gives 5x score',
      tags: ['value'],
      affinities: [],
      effects: { fullPyramidMult: 4.0 },
      rarity: 'legendary',
    },
  ],

  // Active prizes (selected by player)
  activePrizes: [],
  maxActivePrizes: 8,

  // Prize selection state
  currentOptions: [],
  selectionCallback: null,

  // Prize counter UI state
  isOpen: false,

  // References
  ui: null,
  game: null,
  sound: null,

  /**
   * Initialize prize system
   */
  init: function(refs = {}) {
    this.ui = refs.ui;
    this.game = refs.game;
    this.sound = refs.sound;
    this.activePrizes = [];
    this.currentOptions = [];
    this.isOpen = false;
  },

  /**
   * Generate 6 prize options
   * Uses weighted random based on rarity and affinities
   */
  generatePrizeOptions: function(boardTheme = null) {
    const options = [];
    const usedIds = new Set(this.activePrizes.map(p => p.id));

    // Calculate weights for each prize
    const weights = this.prizePool.map(prize => {
      // Skip already selected prizes
      if (usedIds.has(prize.id)) return 0;

      let weight = 1.0;

      // Rarity weights
      const rarityWeights = {
        common: 1.0,
        uncommon: 0.6,
        rare: 0.3,
        legendary: 0.1,
      };
      weight *= rarityWeights[prize.rarity] || 1.0;

      // Affinity bonus (if board theme matches)
      if (boardTheme && prize.affinities.includes(boardTheme.powerupFocus)) {
        weight *= 2.0; // 2x more likely if synergizes with board
      }

      return weight;
    });

    // Select 6 prizes using weighted random
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    for (let i = 0; i < 6 && options.length < 6; i++) {
      let rand = Math.random() * totalWeight;
      let cumulative = 0;

      for (let j = 0; j < this.prizePool.length; j++) {
        cumulative += weights[j];
        if (rand <= cumulative && weights[j] > 0) {
          options.push({ ...this.prizePool[j] });
          weights[j] = 0; // Don't select again
          break;
        }
      }
    }

    // Fallback: if we couldn't get 6 (all selected or bad luck), add random unused
    while (options.length < 6) {
      const available = this.prizePool.filter(p =>
        !usedIds.has(p.id) && !options.some(o => o.id === p.id)
      );
      if (available.length === 0) break;

      const randomPrize = available[Math.floor(Math.random() * available.length)];
      options.push({ ...randomPrize });
    }

    return options;
  },

  /**
   * Open prize counter UI with 6 options
   */
  openPrizeCounter: function(boardTheme = null, callback = null) {
    this.currentOptions = this.generatePrizeOptions(boardTheme);
    this.selectionCallback = callback;
    this.isOpen = true;

    // Create/show UI
    if (this.ui) {
      this.ui.showPrizeCounter(this.currentOptions, (selectedPrize) => {
        this.selectPrize(selectedPrize);
      });
    }
  },

  /**
   * Select a prize from the counter
   */
  selectPrize: function(prize) {
    if (!prize) return;

    // Add to active prizes
    if (this.activePrizes.length < this.maxActivePrizes) {
      this.activePrizes.push(prize);
    }

    // Apply effects immediately
    this.applyPrizeEffects(prize);

    // Play sound
    if (this.sound) {
      this.sound.play('powerup');
    }

    // Close counter
    this.closePrizeCounter();

    // Callback
    if (this.selectionCallback) {
      this.selectionCallback(prize);
      this.selectionCallback = null;
    }
  },

  /**
   * Apply prize effects to game systems
   */
  applyPrizeEffects: function(prize) {
    if (!this.game) return;

    const effects = prize.effects;

    // Queue effects
    if (effects.queueRegenSpeed) {
      const coins = this.game.coins;
      if (coins) {
        coins.regenInterval *= (1 - effects.queueRegenSpeed);
      }
    }

    if (effects.maxQueueBonus) {
      const coins = this.game.coins;
      if (coins) {
        coins.maxQueueSize += effects.maxQueueBonus;
      }
    }

    if (effects.queuePerHit) {
      // Store for later use when obstacles are hit
      if (!this.game.prizeEffects) this.game.prizeEffects = {};
      this.game.prizeEffects.queuePerHit = (this.game.prizeEffects.queuePerHit || 0) + effects.queuePerHit;
    }

    // Value effects
    if (effects.coinValueMult) {
      const coins = this.game.coins;
      if (coins) {
        coins.valueMultiplier *= (1 + effects.coinValueMult);
      }
    }

    if (effects.baseValueMult) {
      const coins = this.game.coins;
      if (coins) {
        coins.baseValue *= (1 + effects.baseValueMult);
      }
    }

    if (effects.valuePerBoard) {
      if (!this.game.prizeEffects) this.game.prizeEffects = {};
      this.game.prizeEffects.valuePerBoard = (this.game.prizeEffects.valuePerBoard || 0) + effects.valuePerBoard;
    }

    // Lucky coin effects
    if (effects.luckyChance) {
      if (!this.game.prizeEffects) this.game.prizeEffects = {};
      this.game.prizeEffects.luckyChance = (this.game.prizeEffects.luckyChance || 0) + effects.luckyChance;
    }

    // Jackpot effects
    if (effects.jackpotFillRate) {
      const jackpot = this.game.jackpot;
      if (jackpot) {
        jackpot.contributionRate *= (1 + effects.jackpotFillRate);
      }
    }

    if (effects.jackpotMult) {
      if (!this.game.prizeEffects) this.game.prizeEffects = {};
      this.game.prizeEffects.jackpotMult = (this.game.prizeEffects.jackpotMult || 0) + effects.jackpotMult;
    }

    // Combo effects
    if (effects.comboWindowMult) {
      const combo = this.game.combo;
      if (combo) {
        combo.comboWindow *= (1 + effects.comboWindowMult);
      }
    }

    if (effects.comboMult) {
      const combo = this.game.combo;
      if (combo) {
        combo.comboMultiplierBonus = (combo.comboMultiplierBonus || 0) + effects.comboMult;
      }
    }

    // Multi-drop effects
    if (effects.multiDropCount) {
      const powerUps = this.game.powerUps;
      if (powerUps && powerUps.upgrades && powerUps.upgrades.multiDrop) {
        powerUps.upgrades.multiDrop.level += effects.multiDropCount;
      }
    }

    // Global effects
    if (effects.globalMult) {
      if (!this.game.prizeEffects) this.game.prizeEffects = {};
      this.game.prizeEffects.globalMult = (this.game.prizeEffects.globalMult || 0) + effects.globalMult;
    }

    console.log(`Prize applied: ${prize.name} - ${prize.summary}`);
  },

  /**
   * Close prize counter
   */
  closePrizeCounter: function() {
    this.isOpen = false;
    this.currentOptions = [];

    if (this.ui) {
      this.ui.hidePrizeCounter();
    }
  },

  /**
   * Get all active prize effects
   */
  getActiveEffects: function() {
    const combined = {};

    this.activePrizes.forEach(prize => {
      Object.entries(prize.effects).forEach(([key, value]) => {
        combined[key] = (combined[key] || 0) + value;
      });
    });

    return combined;
  },

  /**
   * Reset prizes (for new game)
   */
  reset: function() {
    this.activePrizes = [];
    this.currentOptions = [];
    this.isOpen = false;
  },
};

export default Prizes;
