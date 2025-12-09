/**
 * Power-Up System for Coin Pusher World
 * Handles upgrades, abilities, and power-up effects
 */

import { random } from '../core/Utils.js';

const PowerUps = {
  // Permanent upgrade types
  types: {
    queueSpeed: {
      id: "queueSpeed",
      name: "Queue Speed",
      icon: "⚡",
      description: "Coins drop faster from queue",
      maxLevel: 10,
      baseEffect: 1,
      effectPerLevel: 0.3,
    },
    queueCapacity: {
      id: "queueCapacity",
      name: "Queue Size",
      icon: "📦",
      description: "Hold more coins in queue",
      maxLevel: 10,
      baseEffect: 10,
      effectPerLevel: 5,
    },
    coinValue: {
      id: "coinValue",
      name: "Coin Value",
      icon: "💰",
      description: "All coins worth more",
      maxLevel: 10,
      baseEffect: 1,
      effectPerLevel: 0.25,
    },
    multiDrop: {
      id: "multiDrop",
      name: "Multi Drop",
      icon: "🎯",
      description: "Drop multiple coins at once",
      maxLevel: 5,
      baseEffect: 1,
      effectPerLevel: 1,
    },
    luckyCoins: {
      id: "luckyCoins",
      name: "Lucky Coins",
      icon: "🍀",
      description: "Higher chance of special coins & collectibles",
      maxLevel: 5,
      baseEffect: 0.05,
      effectPerLevel: 0.03,
    },
    widerPusher: {
      id: "widerPusher",
      name: "Wide Pusher",
      icon: "↔️",
      description: "Pushers cover more area",
      maxLevel: 5,
      baseEffect: 1,
      effectPerLevel: 0.15,
    },
    comboTime: {
      id: "comboTime",
      name: "Combo Time",
      icon: "⏱️",
      description: "Combos last longer",
      maxLevel: 5,
      baseEffect: 1.5,
      effectPerLevel: 0.3,
    },
    jackpotChance: {
      id: "jackpotChance",
      name: "Jackpot Luck",
      icon: "🎰",
      description: "Better jackpot burst chance",
      maxLevel: 5,
      baseEffect: 0.15,
      effectPerLevel: 0.05,
    },
  },

  // Temporary abilities
  abilities: {
    coinShower: {
      id: "coinShower",
      name: "Coin Shower",
      icon: "🌧️",
      description: "Rain down 30 coins!",
      cooldown: 60,
      currentCooldown: 0,
    },
    frenzyMode: {
      id: "frenzyMode",
      name: "Frenzy Mode",
      icon: "🔥",
      description: "Double speed & value for 15s!",
      cooldown: 90,
      currentCooldown: 0,
    },
    magneticPull: {
      id: "magneticPull",
      name: "Magnetic Pull",
      icon: "🧲",
      description: "Pull all coins forward!",
      cooldown: 45,
      currentCooldown: 0,
    },
    goldenTouch: {
      id: "goldenTouch",
      name: "Golden Touch",
      icon: "✨",
      description: "Next 20 coins are golden (5x value)!",
      cooldown: 120,
      currentCooldown: 0,
    },
  },

  // Active temporary effects
  activeEffects: {
    frenzy: false,
    goldenTouch: 0,
  },

  // Current levels for each power-up
  levels: {},

  // References
  ui: null,
  sound: null,
  game: null,
  coins: null,
  board: null,
  collectibles: null,

  // Initialize power-up system
  init: function (refs = {}) {
    this.ui = refs.ui;
    this.sound = refs.sound;
    this.game = refs.game;
    this.coins = refs.coins;
    this.board = refs.board;
    this.collectibles = refs.collectibles;

    this.levels = {};
    for (const key in this.types) {
      this.levels[key] = 0;
    }
  },

  // Get current effect value for a power-up
  getEffect: function (powerUpId) {
    const type = this.types[powerUpId];
    if (!type) return 0;

    const level = this.levels[powerUpId] || 0;
    return type.baseEffect + level * type.effectPerLevel;
  },

  // Upgrade a power-up
  upgrade: function (powerUpId) {
    const type = this.types[powerUpId];
    if (!type) return false;

    if (this.levels[powerUpId] < type.maxLevel) {
      this.levels[powerUpId]++;
      this.applyEffects();
      if (this.ui) this.ui.updatePowerUp(powerUpId, this.levels[powerUpId]);
      return true;
    }
    return false;
  },

  // Apply all power-up effects
  applyEffects: function () {
    if (this.coins) {
      this.coins.setQueueSpeed(this.getEffect("queueSpeed"));
      this.coins.setMaxQueue(Math.floor(this.getEffect("queueCapacity")));
      this.coins.setValueMultiplier(this.getEffect("coinValue"));
    }
  },

  // Get multi-drop count
  getMultiDropCount: function () {
    return Math.floor(this.getEffect("multiDrop"));
  },

  // Get lucky coin chance
  getLuckyChance: function () {
    return this.getEffect("luckyCoins");
  },

  // Get combo window time
  getComboWindow: function () {
    return this.getEffect("comboTime");
  },

  // Get jackpot burst chance
  getJackpotChance: function () {
    return this.getEffect("jackpotChance");
  },

  // Get pusher width multiplier
  getPusherWidth: function () {
    return this.getEffect("widerPusher");
  },

  // Activate an ability
  activateAbility: function (abilityId) {
    const ability = this.abilities[abilityId];
    if (!ability || ability.currentCooldown > 0) return false;

    switch (abilityId) {
      case "coinShower":
        this.doCoinShower();
        break;
      case "frenzyMode":
        this.doFrenzyMode();
        break;
      case "magneticPull":
        this.doMagneticPull();
        break;
      case "goldenTouch":
        this.doGoldenTouch();
        break;
    }

    ability.currentCooldown = ability.cooldown;
    return true;
  },

  // Coin Shower ability
  doCoinShower: function () {
    if (this.ui) this.ui.showMessage("🌧️ COIN SHOWER!");
    if (this.sound) this.sound.play("ability");

    if (this.board && this.coins) {
      const dropZone = this.board.getDropZone();
      for (let i = 0; i < 30; i++) {
        setTimeout(() => {
          const x = random(dropZone.minX, dropZone.maxX);
          const y = dropZone.y + Math.random() * 5;
          const z = dropZone.z + Math.random() * 2;
          this.coins.spawnCoin(x, y, z, "gold");
        }, i * 40);
      }
    }
  },

  // Frenzy Mode ability
  doFrenzyMode: function () {
    if (this.activeEffects.frenzy) return;

    if (this.ui) this.ui.showMessage("🔥 FRENZY MODE!");
    if (this.sound) this.sound.play("ability");
    this.activeEffects.frenzy = true;

    if (this.board && this.coins) {
      const originalSpeeds = this.board.pushers.map(p => p.speed);
      this.board.pushers.forEach(p => p.speed *= 2);

      const originalMult = this.coins.valueMultiplier;
      this.coins.valueMultiplier *= 2;

      setTimeout(() => {
        this.board.pushers.forEach((p, i) => p.speed = originalSpeeds[i]);
        this.coins.valueMultiplier = originalMult;
        this.activeEffects.frenzy = false;
        if (this.ui) this.ui.showMessage("Frenzy ended!");
      }, 15000);
    }
  },

  // Magnetic Pull ability
  doMagneticPull: function () {
    if (this.ui) this.ui.showMessage("🧲 MAGNETIC PULL!");
    if (this.sound) this.sound.play("ability");

    if (this.coins) {
      for (const coin of this.coins.activeCoins) {
        if (coin.body) {
          coin.body.vz = 3;
          coin.body.vy = 0.5;
        }
      }
    }

    if (this.collectibles && this.collectibles.activeItems) {
      for (const item of this.collectibles.activeItems) {
        if (item.body) {
          item.body.vz = 3;
          item.body.vy = 0.5;
        }
      }
    }
  },

  // Golden Touch ability
  doGoldenTouch: function () {
    if (this.ui) this.ui.showMessage("✨ GOLDEN TOUCH!");
    if (this.sound) this.sound.play("ability");
    this.activeEffects.goldenTouch = 20;
  },

  // Check if golden touch is active
  useGoldenTouch: function () {
    if (this.activeEffects.goldenTouch > 0) {
      this.activeEffects.goldenTouch--;
      return true;
    }
    return false;
  },

  // Update cooldowns
  updateCooldowns: function (deltaTime) {
    for (const id in this.abilities) {
      if (this.abilities[id].currentCooldown > 0) {
        this.abilities[id].currentCooldown -= deltaTime;
      }
    }
  },

  // Show power-up selection screen
  showSelection: function () {
    const menu = document.getElementById("upgrade-menu");
    if (!menu) return;

    if (!menu.classList.contains("hidden")) {
      return;
    }

    const options = document.getElementById("upgrade-options");
    if (!options) return;

    options.innerHTML = "";

    const available = [];
    for (const key in this.types) {
      if (this.levels[key] < this.types[key].maxLevel) {
        available.push(key);
      }
    }

    const shuffled = available.sort(() => Math.random() - 0.5);
    const offered = shuffled.slice(0, 3);

    if (offered.length === 0) {
      if (this.coins) this.coins.addToQueue(10);
      if (this.ui) this.ui.showMessage("All maxed! +10 Queue!");
      return;
    }

    for (let i = 0; i < offered.length; i++) {
      const typeId = offered[i];
      const type = this.types[typeId];
      const currentLevel = this.levels[typeId];

      const optionDiv = document.createElement("div");
      optionDiv.className = "upgrade-option";
      optionDiv.innerHTML = `
        <div class="upgrade-name">${type.icon} ${type.name} (Lv ${currentLevel + 1})</div>
        <div class="upgrade-desc">${type.description}</div>
      `;

      optionDiv.addEventListener("click", () => {
        this.selectUpgrade(typeId);
      });

      options.appendChild(optionDiv);
    }

    menu.classList.remove("hidden");
    if (this.game) this.game.pause();
  },

  // Select an upgrade
  selectUpgrade: function (powerUpId) {
    this.upgrade(powerUpId);

    const menu = document.getElementById("upgrade-menu");
    if (menu) menu.classList.add("hidden");

    if (this.game) this.game.resume();

    const type = this.types[powerUpId];
    if (this.ui) this.ui.showMessage(type.icon + " " + type.name + " upgraded!");
  },

  // Get save data
  getSaveData: function () {
    return {
      levels: { ...this.levels },
    };
  },

  // Load save data
  loadSaveData: function (data) {
    if (data && data.levels) {
      this.levels = { ...data.levels };
      this.applyEffects();

      for (const key in this.levels) {
        if (this.ui) this.ui.updatePowerUp(key, this.levels[key]);
      }
    }
  },

  // Apply theme bonus - automatically upgrade the theme's focused powerup
  applyThemeBonus: function (powerupType) {
    if (!powerupType || !this.types[powerupType]) return;

    const type = this.types[powerupType];
    const currentLevel = this.levels[powerupType] || 0;

    if (currentLevel < type.maxLevel) {
      this.upgrade(powerupType);
      if (this.ui) this.ui.showMessage(type.icon + " Theme Bonus: " + type.name + "!");
    } else {
      // Already maxed, give bonus coins instead
      if (this.coins) this.coins.addToQueue(15);
      if (this.ui) this.ui.showMessage("Theme Bonus: +15 Coins!");
    }
  },

  // Upgrade powerup from theme bonus target hit
  applyThemeBonusHit: function (powerupType) {
    if (!powerupType || !this.types[powerupType]) {
      // Random small bonus if no type specified
      if (this.coins) this.coins.addToQueue(5);
      return;
    }

    const type = this.types[powerupType];
    const currentLevel = this.levels[powerupType] || 0;

    // 30% chance to upgrade, otherwise bonus coins
    if (currentLevel < type.maxLevel && Math.random() < 0.3) {
      this.upgrade(powerupType);
      if (this.ui) this.ui.showMessage(type.icon + " " + type.name + " +1!");
      if (this.sound) this.sound.play("levelup");
    } else {
      // Give bonus coins proportional to how upgraded the powerup is
      const bonusCoins = 5 + currentLevel * 2;
      if (this.coins) this.coins.addToQueue(bonusCoins);
      if (this.ui) this.ui.showMessage("+" + bonusCoins + " Coins!");
    }
  },
};

export default PowerUps;
