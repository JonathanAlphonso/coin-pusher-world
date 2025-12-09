/**
 * Relics System for Coin Pusher World
 * Persistent bonus objects that drop randomly and provide game-long bonuses
 * Similar to relics in Slay the Spire
 */

import * as THREE from 'three';
import { random } from '../core/Utils.js';

const Relics = {
  // All available relics
  types: {
    goldenIdol: {
      id: "goldenIdol",
      name: "Golden Idol",
      icon: "🗿",
      description: "+25% coin value permanently",
      effect: { type: "coinValue", value: 0.25 },
      color: 0xffd700,
      rarity: "common",
    },
    luckyClover: {
      id: "luckyClover",
      name: "Lucky Clover",
      icon: "🍀",
      description: "+10% special coin chance",
      effect: { type: "luckyChance", value: 0.10 },
      color: 0x00ff00,
      rarity: "common",
    },
    ancientCrown: {
      id: "ancientCrown",
      name: "Ancient Crown",
      icon: "👑",
      description: "+50% combo multiplier bonus",
      effect: { type: "comboBonus", value: 0.50 },
      color: 0xffaa00,
      rarity: "uncommon",
    },
    crystalBall: {
      id: "crystalBall",
      name: "Crystal Ball",
      icon: "🔮",
      description: "Jackpot fills 25% faster",
      effect: { type: "jackpotRate", value: 0.25 },
      color: 0x9900ff,
      rarity: "uncommon",
    },
    magnetStone: {
      id: "magnetStone",
      name: "Magnet Stone",
      icon: "🧲",
      description: "Coins drift toward center",
      effect: { type: "magnetism", value: 0.3 },
      color: 0xff0044,
      rarity: "uncommon",
    },
    phoenixFeather: {
      id: "phoenixFeather",
      name: "Phoenix Feather",
      icon: "🪶",
      description: "+1 coin per drop",
      effect: { type: "extraCoin", value: 1 },
      color: 0xff4400,
      rarity: "rare",
    },
    dragonScale: {
      id: "dragonScale",
      name: "Dragon Scale",
      icon: "🐉",
      description: "2x slot multipliers",
      effect: { type: "slotMultiplier", value: 2 },
      color: 0x00ffaa,
      rarity: "rare",
    },
    timeCrystal: {
      id: "timeCrystal",
      name: "Time Crystal",
      icon: "💎",
      description: "+50% pusher speed",
      effect: { type: "pusherSpeed", value: 0.50 },
      color: 0x00ccff,
      rarity: "rare",
    },
    infinityGem: {
      id: "infinityGem",
      name: "Infinity Gem",
      icon: "💠",
      description: "All bonuses +20%",
      effect: { type: "allBonus", value: 0.20 },
      color: 0xff00ff,
      rarity: "legendary",
    },
    cosmicEgg: {
      id: "cosmicEgg",
      name: "Cosmic Egg",
      icon: "🥚",
      description: "Random bonus each tier",
      effect: { type: "tierBonus", value: 1 },
      color: 0xffffff,
      rarity: "legendary",
    },
  },

  // Rarity weights for spawning
  rarityWeights: {
    common: 50,
    uncommon: 30,
    rare: 15,
    legendary: 5,
  },

  // Collected relics
  collected: [],

  // Active relic meshes on the board
  activeRelics: [],

  // Computed bonuses from collected relics
  bonuses: {
    coinValue: 0,
    luckyChance: 0,
    comboBonus: 0,
    jackpotRate: 0,
    magnetism: 0,
    extraCoin: 0,
    slotMultiplier: 1,
    pusherSpeed: 0,
    allBonus: 0,
    tierBonus: 0,
  },

  // References
  scene: null,
  physics: null,
  board: null,
  ui: null,
  sound: null,
  game: null,
  coins: null,

  // Drop chance per scored coin
  dropChance: 0.003,
  lastDropTime: 0,
  dropCooldown: 30000, // 30 seconds between drops

  // Initialize
  init: function (scene, refs = {}) {
    this.scene = scene;
    this.physics = refs.physics;
    this.board = refs.board;
    this.ui = refs.ui;
    this.sound = refs.sound;
    this.game = refs.game;
    this.coins = refs.coins;

    this.collected = [];
    this.activeRelics = [];
    this.resetBonuses();
    this.createUI();
  },

  // Reset bonuses
  resetBonuses: function () {
    this.bonuses = {
      coinValue: 0,
      luckyChance: 0,
      comboBonus: 0,
      jackpotRate: 0,
      magnetism: 0,
      extraCoin: 0,
      slotMultiplier: 1,
      pusherSpeed: 0,
      allBonus: 0,
      tierBonus: 0,
    };
  },

  // Create UI for collected relics
  createUI: function () {
    const container = document.createElement("div");
    container.id = "relics-display";
    container.innerHTML = "";
    const gameContainer = document.getElementById("game-container");
    if (gameContainer) {
      gameContainer.appendChild(container);
    }
    this.updateUI();
  },

  // Update UI display
  updateUI: function () {
    const container = document.getElementById("relics-display");
    if (!container) return;

    if (this.collected.length === 0) {
      container.innerHTML = "";
      return;
    }

    let html = '<div class="relics-header">Relics</div><div class="relics-list">';
    for (const relic of this.collected) {
      html += `<div class="relic-item" title="${relic.name}: ${relic.description}">
        <span class="relic-icon">${relic.icon}</span>
      </div>`;
    }
    html += "</div>";
    container.innerHTML = html;
  },

  // Check if a relic should drop
  checkDrop: function () {
    const now = performance.now();
    if (now - this.lastDropTime < this.dropCooldown) return;

    // Increase chance based on score
    const scoreBonus = this.game ? Math.min(this.game.score / 50000, 0.01) : 0;
    const chance = this.dropChance + scoreBonus;

    if (Math.random() < chance) {
      this.spawnRelic();
      this.lastDropTime = now;
    }
  },

  // Pick a random relic based on rarity
  pickRandomRelic: function () {
    // Filter out already collected relics
    const available = Object.values(this.types).filter(
      r => !this.collected.find(c => c.id === r.id)
    );

    if (available.length === 0) return null;

    // Weight by rarity
    let totalWeight = 0;
    for (const relic of available) {
      totalWeight += this.rarityWeights[relic.rarity] || 10;
    }

    let roll = Math.random() * totalWeight;
    for (const relic of available) {
      roll -= this.rarityWeights[relic.rarity] || 10;
      if (roll <= 0) return relic;
    }

    return available[0];
  },

  // Spawn a relic on the board
  spawnRelic: function (forcedRelic = null) {
    const relic = forcedRelic || this.pickRandomRelic();
    if (!relic) return null;

    const dropZone = this.board?.getDropZone();
    if (!dropZone) return null;

    const x = random(dropZone.minX + 2, dropZone.maxX - 2);
    const y = dropZone.y + 5;
    const z = dropZone.z;

    // Create relic mesh - larger, more impressive
    const group = new THREE.Group();

    // Main body - icosahedron for gem-like appearance
    const bodyGeom = new THREE.IcosahedronGeometry(0.8, 1);
    const bodyMat = new THREE.MeshPhongMaterial({
      color: relic.color,
      emissive: relic.color,
      emissiveIntensity: 0.6,
      specular: 0xffffff,
      shininess: 100,
      transparent: true,
      opacity: 0.9,
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    group.add(body);

    // Outer glow ring
    const ringGeom = new THREE.TorusGeometry(1.2, 0.08, 8, 24);
    const ringMat = new THREE.MeshPhongMaterial({
      color: relic.color,
      emissive: relic.color,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.6,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Inner sparkle particles
    for (let i = 0; i < 6; i++) {
      const sparkGeom = new THREE.SphereGeometry(0.1, 8, 6);
      const sparkMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
      });
      const spark = new THREE.Mesh(sparkGeom, sparkMat);
      spark.userData = { orbitAngle: (i / 6) * Math.PI * 2, orbitSpeed: 2 + Math.random() };
      group.add(spark);
    }

    group.position.set(x, y, z);
    this.scene.add(group);

    // Create physics body
    const relicBody = this.physics ? this.physics.createBody({
      shape: "sphere",
      x: x, y: y, z: z,
      radius: 0.8,
      mass: 3,
      restitution: 0.4,
      friction: 0.5,
      mesh: group,
      data: { isRelic: true, relicType: relic.id },
    }) : null;

    const activeRelic = {
      type: relic,
      mesh: group,
      body: relicBody,
      spawnTime: performance.now(),
    };

    this.activeRelics.push(activeRelic);

    // Show announcement
    if (this.ui) {
      this.ui.showMessage(`${relic.icon} RELIC APPEARED! ${relic.icon}`);
    }
    if (this.sound) this.sound.play("levelup");

    return activeRelic;
  },

  // Collect a relic
  collect: function (activeRelic) {
    const relic = activeRelic.type;

    // Add to collection
    this.collected.push(relic);

    // Apply bonus
    this.applyBonus(relic);

    // Remove from active
    const idx = this.activeRelics.indexOf(activeRelic);
    if (idx !== -1) {
      this.activeRelics.splice(idx, 1);
    }

    // Remove mesh
    this.scene.remove(activeRelic.mesh);
    if (activeRelic.body && this.physics) {
      this.physics.removeBody(activeRelic.body);
    }

    // Show collection message
    if (this.ui) {
      this.ui.showMessage(`${relic.icon} ${relic.name}! ${relic.description}`);
    }
    if (this.sound) this.sound.play("jackpot");

    this.updateUI();
  },

  // Apply a relic's bonus
  applyBonus: function (relic) {
    const effect = relic.effect;

    switch (effect.type) {
      case "coinValue":
        this.bonuses.coinValue += effect.value;
        break;
      case "luckyChance":
        this.bonuses.luckyChance += effect.value;
        break;
      case "comboBonus":
        this.bonuses.comboBonus += effect.value;
        break;
      case "jackpotRate":
        this.bonuses.jackpotRate += effect.value;
        break;
      case "magnetism":
        this.bonuses.magnetism += effect.value;
        break;
      case "extraCoin":
        this.bonuses.extraCoin += effect.value;
        break;
      case "slotMultiplier":
        this.bonuses.slotMultiplier *= effect.value;
        break;
      case "pusherSpeed":
        this.bonuses.pusherSpeed += effect.value;
        // Apply to existing pushers
        if (this.board) {
          for (const pusher of this.board.pushers) {
            pusher.speed *= (1 + effect.value);
          }
        }
        break;
      case "allBonus":
        this.bonuses.allBonus += effect.value;
        break;
      case "tierBonus":
        this.bonuses.tierBonus += effect.value;
        break;
    }
  },

  // Get computed bonus value with allBonus applied
  getBonus: function (type) {
    const base = this.bonuses[type] || 0;
    if (type === "slotMultiplier") {
      return base * (1 + this.bonuses.allBonus);
    }
    return base * (1 + this.bonuses.allBonus);
  },

  // Check if a body is a relic and should be collected
  checkCollection: function (body) {
    if (!body.data?.isRelic) return false;

    const activeRelic = this.activeRelics.find(r => r.body === body);
    if (!activeRelic) return false;

    // Check if it's in the scoring zone
    if (body.y < this.board?.scoringY + 2) {
      this.collect(activeRelic);
      return true;
    }

    return false;
  },

  // Update
  update: function (deltaTime) {
    const time = performance.now() * 0.001;

    for (const activeRelic of this.activeRelics) {
      const mesh = activeRelic.mesh;
      const body = activeRelic.body;

      // Sync position from physics
      if (body) {
        mesh.position.set(body.x, body.y, body.z);
      }

      // Rotate the main body
      mesh.children[0].rotation.y += deltaTime * 1.5;
      mesh.children[0].rotation.x += deltaTime * 0.5;

      // Rotate the ring
      if (mesh.children[1]) {
        mesh.children[1].rotation.z += deltaTime * 2;
      }

      // Animate sparkle particles
      for (let i = 2; i < mesh.children.length; i++) {
        const spark = mesh.children[i];
        if (spark.userData?.orbitAngle !== undefined) {
          spark.userData.orbitAngle += spark.userData.orbitSpeed * deltaTime;
          const angle = spark.userData.orbitAngle;
          spark.position.x = Math.cos(angle) * 0.6;
          spark.position.y = Math.sin(angle * 2) * 0.3;
          spark.position.z = Math.sin(angle) * 0.6;
        }
      }

      // Pulse glow
      const intensity = 0.5 + Math.sin(time * 3) * 0.3;
      mesh.children[0].material.emissiveIntensity = intensity;
      if (mesh.children[1]) {
        mesh.children[1].material.emissiveIntensity = intensity * 1.2;
      }

      // Check for collection
      if (body) {
        this.checkCollection(body);
      }
    }
  },

  // Cleanup
  cleanup: function () {
    for (const activeRelic of this.activeRelics) {
      this.scene.remove(activeRelic.mesh);
      if (activeRelic.body && this.physics) {
        this.physics.removeBody(activeRelic.body);
      }
    }
    this.activeRelics = [];
    this.collected = [];
    this.resetBonuses();
  },
};

export default Relics;
