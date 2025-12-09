/**
 * Collectibles System for Coin Pusher World
 * Rare items that form sets for massive bonuses!
 */

import * as THREE from 'three';

const Collectibles = {
  // Scene reference
  scene: null,

  // Active collectibles on the board
  activeItems: [],

  // Collection - items the player has collected
  collection: {},

  // Collectible sets with rarity
  sets: {
    gems: {
      name: "Precious Gems",
      icon: "💎",
      bonus: 5000,
      items: [
        { id: "ruby", name: "Ruby", icon: "🔴", rarity: "common", value: 100 },
        { id: "sapphire", name: "Sapphire", icon: "🔵", rarity: "common", value: 100 },
        { id: "emerald", name: "Emerald", icon: "🟢", rarity: "uncommon", value: 200 },
        { id: "diamond", name: "Diamond", icon: "💎", rarity: "rare", value: 500 },
        { id: "amethyst", name: "Amethyst", icon: "🟣", rarity: "uncommon", value: 200 },
      ],
    },
    crowns: {
      name: "Royal Crowns",
      icon: "👑",
      bonus: 10000,
      items: [
        { id: "bronze_crown", name: "Bronze Crown", icon: "🥉", rarity: "common", value: 150 },
        { id: "silver_crown", name: "Silver Crown", icon: "🥈", rarity: "uncommon", value: 300 },
        { id: "gold_crown", name: "Gold Crown", icon: "🥇", rarity: "rare", value: 600 },
        { id: "platinum_crown", name: "Platinum Crown", icon: "👑", rarity: "legendary", value: 1500 },
      ],
    },
    stars: {
      name: "Cosmic Stars",
      icon: "⭐",
      bonus: 7500,
      items: [
        { id: "star1", name: "Red Star", icon: "🌟", rarity: "common", value: 120 },
        { id: "star2", name: "Blue Star", icon: "💫", rarity: "common", value: 120 },
        { id: "star3", name: "Gold Star", icon: "⭐", rarity: "uncommon", value: 250 },
        { id: "star4", name: "Shooting Star", icon: "🌠", rarity: "rare", value: 450 },
        { id: "star5", name: "Super Nova", icon: "✨", rarity: "legendary", value: 1200 },
      ],
    },
    lucky: {
      name: "Lucky Charms",
      icon: "🍀",
      bonus: 15000,
      items: [
        { id: "clover", name: "Four Leaf Clover", icon: "🍀", rarity: "uncommon", value: 200 },
        { id: "horseshoe", name: "Lucky Horseshoe", icon: "🧲", rarity: "uncommon", value: 200 },
        { id: "rainbow", name: "Rainbow", icon: "🌈", rarity: "rare", value: 400 },
        { id: "pot_gold", name: "Pot of Gold", icon: "🪙", rarity: "legendary", value: 1000 },
      ],
    },
  },

  // Rarity colors and drop rates
  rarities: {
    common: { color: 0x808080, chance: 0.6, glow: 0x444444 },
    uncommon: { color: 0x00ff00, chance: 0.25, glow: 0x004400 },
    rare: { color: 0x0088ff, chance: 0.12, glow: 0x002244 },
    legendary: { color: 0xff00ff, chance: 0.03, glow: 0x440044 },
  },

  // Geometry for collectibles
  geometry: null,
  materials: {},

  // Drop chance per coin
  baseDropChance: 0.08,

  // References
  physics: null,
  powerUps: null,
  ui: null,
  game: null,
  sound: null,
  coinRain: null,
  board: null,

  // Initialize
  init: function (scene, refs = {}) {
    this.scene = scene;
    this.physics = refs.physics;
    this.powerUps = refs.powerUps;
    this.ui = refs.ui;
    this.game = refs.game;
    this.sound = refs.sound;
    this.coinRain = refs.coinRain;
    this.board = refs.board;

    this.activeItems = [];
    this.collection = {};

    for (const setId in this.sets) {
      this.collection[setId] = {};
      for (const item of this.sets[setId].items) {
        this.collection[setId][item.id] = 0;
      }
    }

    this.geometry = new THREE.OctahedronGeometry(0.3, 0);

    for (const rarity in this.rarities) {
      const r = this.rarities[rarity];
      this.materials[rarity] = new THREE.MeshPhongMaterial({
        color: r.color,
        emissive: r.glow,
        emissiveIntensity: 0.5,
        specular: 0xffffff,
        shininess: 100,
        transparent: true,
        opacity: 0.9,
      });
    }
  },

  // Maybe spawn a collectible when a coin is dropped
  maybeSpawn: function (x, y, z) {
    const luck = this.powerUps ? this.powerUps.getLuckyChance() : 0.05;
    const chance = this.baseDropChance + luck * 0.5;

    if (Math.random() < chance) {
      this.spawnRandom(x, y, z);
    }
  },

  // Spawn a random collectible
  spawnRandom: function (x, y, z) {
    const rand = Math.random();
    let rarity = "common";
    let cumulative = 0;

    for (const r in this.rarities) {
      cumulative += this.rarities[r].chance;
      if (rand < cumulative) {
        rarity = r;
        break;
      }
    }

    const availableItems = [];
    for (const setId in this.sets) {
      for (const item of this.sets[setId].items) {
        if (item.rarity === rarity) {
          availableItems.push({ setId, item });
        }
      }
    }

    if (availableItems.length === 0) {
      rarity = "common";
      for (const setId in this.sets) {
        for (const item of this.sets[setId].items) {
          if (item.rarity === "common") {
            availableItems.push({ setId, item });
          }
        }
      }
    }

    const chosen = availableItems[Math.floor(Math.random() * availableItems.length)];
    this.spawn(x, y, z, chosen.setId, chosen.item);
  },

  // Spawn a specific collectible
  spawn: function (x, y, z, setId, itemData) {
    const mesh = new THREE.Mesh(this.geometry, this.materials[itemData.rarity].clone());
    mesh.position.set(x, y + 1, z);
    this.scene.add(mesh);

    const body = this.physics ? this.physics.createBody({
      shape: "sphere",
      x: x,
      y: y + 1,
      z: z,
      radius: 0.3,
      mass: 0.5,
      friction: 0.3,
      restitution: 0.4,
      mesh: mesh,
      data: { collectible: true },
    }) : null;

    const collectible = {
      mesh: mesh,
      body: body,
      setId: setId,
      item: itemData,
      spinSpeed: 2 + Math.random() * 2,
      bobPhase: Math.random() * Math.PI * 2,
    };

    this.activeItems.push(collectible);

    if (itemData.rarity === "rare" || itemData.rarity === "legendary") {
      if (this.ui) this.ui.showMessage(itemData.icon + " " + itemData.name + " appeared!");
      if (this.sound) this.sound.play("bonus");
    }

    return collectible;
  },

  // Called when collectible falls off
  onCollect: function (collectible) {
    const item = collectible.item;
    const setId = collectible.setId;

    this.collection[setId][item.id]++;

    if (this.game && collectible.body) {
      this.game.addScore(item.value, collectible.body.x, collectible.body.y, collectible.body.z, 1);
    }

    const rarityText = item.rarity === "legendary" ? "LEGENDARY " : item.rarity === "rare" ? "RARE " : "";
    if (this.ui) this.ui.showMessage(rarityText + item.icon + " " + item.name + " collected!");

    this.checkSetCompletion(setId);

    if (this.sound) {
      if (item.rarity === "legendary") {
        this.sound.play("jackpot");
      } else if (item.rarity === "rare") {
        this.sound.play("bonus");
      } else {
        this.sound.play("coin");
      }
    }

    this.removeCollectible(collectible);
  },

  // Check if a set is complete
  checkSetCompletion: function (setId) {
    const set = this.sets[setId];
    let complete = true;

    for (const item of set.items) {
      if (this.collection[setId][item.id] < 1) {
        complete = false;
        break;
      }
    }

    if (complete) {
      if (this.ui) this.ui.showMessage(set.icon + " " + set.name + " COMPLETE! +" + set.bonus);
      if (this.game) this.game.addScore(set.bonus, 0, 5, 0, 1);
      if (this.sound) this.sound.play("levelup");

      for (const item of set.items) {
        this.collection[setId][item.id] = 0;
      }

      if (this.coinRain) this.coinRain.trigger("setComplete");
    }
  },

  // Remove a collectible
  removeCollectible: function (collectible) {
    this.scene.remove(collectible.mesh);
    if (collectible.body && this.physics) {
      this.physics.removeBody(collectible.body);
    }

    const index = this.activeItems.indexOf(collectible);
    if (index > -1) {
      this.activeItems.splice(index, 1);
    }
  },

  // Update collectibles
  update: function (deltaTime) {
    const time = performance.now() * 0.001;
    const scoringY = this.board?.scoringY ?? -15;

    for (let i = this.activeItems.length - 1; i >= 0; i--) {
      const c = this.activeItems[i];

      c.mesh.rotation.y += c.spinSpeed * deltaTime;
      c.mesh.rotation.x += c.spinSpeed * 0.5 * deltaTime;

      const pulse = 0.4 + Math.sin(time * 3 + c.bobPhase) * 0.2;
      c.mesh.material.emissiveIntensity = pulse;

      if (c.body && c.body.y < scoringY) {
        this.onCollect(c);
      }
    }
  },

  // Get collection status for UI
  getCollectionStatus: function () {
    const status = {};
    for (const setId in this.sets) {
      const set = this.sets[setId];
      let collected = 0;
      for (const item of set.items) {
        if (this.collection[setId][item.id] > 0) {
          collected++;
        }
      }
      status[setId] = {
        name: set.name,
        icon: set.icon,
        collected: collected,
        total: set.items.length,
        complete: collected === set.items.length,
      };
    }
    return status;
  },

  // Cleanup
  cleanup: function () {
    for (let i = this.activeItems.length - 1; i >= 0; i--) {
      this.removeCollectible(this.activeItems[i]);
    }
  },
};

export default Collectibles;
