/**
 * Coin Rain System for Coin Pusher World
 * Non-interrupting reward system that spawns coins from above
 */

import { random } from '../core/Utils.js';

const CoinRain = {
  // Track coins dropped for rewards
  coinsDropped: 0,
  coinsForReward: 50,

  // Reward types with weights
  rewards: [
    { label: "+10 Coins", icon: "🪙", type: "coins", value: 10, weight: 30 },
    { label: "2x Score 30s", icon: "✨", type: "multiplier", value: 2, weight: 15 },
    { label: "+25 Coins", icon: "💰", type: "coins", value: 25, weight: 25 },
    { label: "Coin Shower!", icon: "🌧️", type: "coinShower", value: 30, weight: 10 },
    { label: "+50 Coins", icon: "💎", type: "coins", value: 50, weight: 12 },
    { label: "FRENZY MODE!", icon: "🔥", type: "frenzy", value: 15, weight: 5 },
    { label: "+100 Coins", icon: "👑", type: "coins", value: 100, weight: 2 },
    { label: "JACKPOT!", icon: "🎰", type: "jackpot", value: 0, weight: 1 },
  ],

  // References
  game: null,
  sound: null,
  ui: null,
  coins: null,
  board: null,
  jackpot: null,

  // Initialize
  init: function (refs = {}) {
    this.game = refs.game;
    this.sound = refs.sound;
    this.ui = refs.ui;
    this.coins = refs.coins;
    this.board = refs.board;
    this.jackpot = refs.jackpot;
    this.coinsDropped = 0;
  },

  // Track coins dropped for rewards
  onCoinDropped: function () {
    this.coinsDropped++;
    if (this.coinsDropped >= this.coinsForReward) {
      this.coinsDropped = 0;
      this.trigger("coinCount");
    }
  },

  // Pick a random reward based on weights
  pickReward: function () {
    const totalWeight = this.rewards.reduce((sum, r) => sum + r.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const reward of this.rewards) {
      roll -= reward.weight;
      if (roll <= 0) {
        return reward;
      }
    }
    return this.rewards[0];
  },

  // Trigger a coin rain reward
  trigger: function (reason) {
    const reward = this.pickReward();

    // Show message based on reason
    let prefix = "";
    if (reason === "setComplete") {
      prefix = "SET BONUS: ";
    } else if (reason === "coinCount") {
      prefix = "BONUS: ";
    } else if (reason === "bonusSlot") {
      prefix = "SLOT BONUS: ";
    }

    if (this.ui) {
      this.ui.showMessage(prefix + reward.icon + " " + reward.label);
    }
    if (this.sound) this.sound.play("win");

    // Apply the reward
    this.applyReward(reward);

    // Always spawn some visual coin rain
    this.spawnCoinRain(10 + Math.floor(Math.random() * 10));
  },

  // Apply the selected reward
  applyReward: function (reward) {
    switch (reward.type) {
      case "coins":
        if (this.coins) this.coins.addToQueue(reward.value);
        break;

      case "multiplier":
        if (this.coins) {
          this.coins.valueMultiplier *= reward.value;
          setTimeout(() => {
            this.coins.valueMultiplier = Math.max(1, this.coins.valueMultiplier / reward.value);
            if (this.ui) this.ui.showMessage("Multiplier ended!");
          }, 30000);
        }
        break;

      case "coinShower":
        this.spawnCoinRain(reward.value);
        break;

      case "frenzy":
        this.triggerFrenzyMode(reward.value);
        break;

      case "jackpot":
        if (this.jackpot) this.jackpot.burst();
        break;
    }
  },

  // Spawn coins falling from above
  spawnCoinRain: function (count) {
    const dropZone = this.board?.getDropZone();
    if (!dropZone || !this.coins) return;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const x = random(dropZone.minX, dropZone.maxX);
        const y = dropZone.y + 3 + Math.random() * 5;
        const z = dropZone.z + Math.random() * 2;
        const type = Math.random() < 0.2 ? "special" : "gold";
        this.coins.spawnCoin(x, y, z, type);
      }, i * 60);
    }
  },

  // Trigger frenzy mode
  triggerFrenzyMode: function (duration) {
    if (this.ui) this.ui.showMessage("🔥 FRENZY MODE!");

    // Speed up pushers
    const pushers = this.board?.pushers || [];
    const originalSpeeds = pushers.map(p => p.speed);
    pushers.forEach(p => p.speed *= 2);

    // Double coin value
    const originalMult = this.coins?.valueMultiplier || 1;
    if (this.coins) this.coins.valueMultiplier *= 2;

    // End frenzy after duration
    setTimeout(() => {
      pushers.forEach((p, i) => p.speed = originalSpeeds[i]);
      if (this.coins) this.coins.valueMultiplier = originalMult;
      if (this.ui) this.ui.showMessage("Frenzy ended!");
    }, duration * 1000);
  },
};

export default CoinRain;
