/**
 * Coin System for Coin Pusher World
 * Enhanced coins with better visuals and vertical gameplay
 */

import * as THREE from 'three';
import { random, randomInt } from '../core/Utils.js';

const Coins = {
  // Coin pool for performance
  coinPool: [],
  activeCoins: [],

  // Coin geometry (shared for all coins)
  geometry: null,
  rimGeometry: null,
  faceGeometry: null,
  starGeometry: null,
  gemGeometry: null,
  crownGeometry: null,
  materials: {},
  rimMaterials: {},
  faceMaterials: {},

  // Queue system
  coinQueue: 0,
  maxQueueSize: 20,
  queueSpeed: 3,
  queueTimer: 0,

  // Queue regeneration (passive income)
  regenTimer: 0,
  regenInterval: 2.0, // Seconds between regen ticks
  regenAmount: 1, // Coins added per tick

  // Coin settings
  coinRadius: 0.35,
  coinHeight: 0.12,
  baseValue: 10,
  valueMultiplier: 1,

  // References
  scene: null,
  physics: null,
  board: null,
  ui: null,
  sound: null,
  combo: null,
  jackpot: null,
  coinRain: null,
  powerUps: null,
  collectibles: null,
  game: null,

  // Initialize coin system
  init: function (scene, refs = {}) {
    this.scene = scene;
    this.physics = refs.physics;
    this.board = refs.board;
    this.ui = refs.ui;
    this.sound = refs.sound;
    this.combo = refs.combo;
    this.jackpot = refs.jackpot;
    this.coinRain = refs.coinRain;
    this.powerUps = refs.powerUps;
    this.collectibles = refs.collectibles;
    this.game = refs.game;

    this.coinPool = [];
    this.activeCoins = [];
    this.coinQueue = 0;
    this.queueTimer = 0;
    this.regenTimer = 0;

    // Create enhanced coin geometry with beveled edge
    this.geometry = new THREE.CylinderGeometry(
      this.coinRadius,
      this.coinRadius,
      this.coinHeight,
      32,
      1
    );

    // Decorative rim geometry (torus around edge)
    this.rimGeometry = new THREE.TorusGeometry(
      this.coinRadius - 0.02,
      0.025,
      8,
      32
    );

    // Face emblem geometries
    this.starGeometry = this.createStarGeometry(0.15, 0.07, 5);
    this.gemGeometry = this.createGemGeometry(0.12);
    this.crownGeometry = this.createCrownGeometry(0.14);
    this.moonGeometry = this.createMoonGeometry(0.12);
    this.shieldGeometry = this.createShieldGeometry(0.13);
    this.prismGeometry = this.createPrismGeometry(0.14);

    // Create materials for different coin types with cool metallic effects
    this.materials = {
      gold: new THREE.MeshPhongMaterial({
        color: 0xffc125,
        specular: 0xffeebb,
        shininess: 120,
        emissive: 0x332200,
      }),
      silver: new THREE.MeshPhongMaterial({
        color: 0xd8e4ec,
        specular: 0xffffff,
        shininess: 150,
        emissive: 0x1a1a22,
      }),
      bronze: new THREE.MeshPhongMaterial({
        color: 0xb87333,
        specular: 0xee9955,
        shininess: 90,
        emissive: 0x1a0d00,
      }),
      special: new THREE.MeshPhongMaterial({
        color: 0x9966ff,
        specular: 0xddbbff,
        shininess: 140,
        emissive: 0x220044,
      }),
      rainbow: new THREE.MeshPhongMaterial({
        color: 0xffffff,
        specular: 0xffffff,
        shininess: 200,
        emissive: 0x222222,
      }),
    };

    // Rim materials (slightly different shade for depth)
    this.rimMaterials = {
      gold: new THREE.MeshPhongMaterial({
        color: 0xdaa520,
        specular: 0xffdd88,
        shininess: 100,
        emissive: 0x221100,
      }),
      silver: new THREE.MeshPhongMaterial({
        color: 0xaabbcc,
        specular: 0xffffff,
        shininess: 130,
        emissive: 0x111118,
      }),
      bronze: new THREE.MeshPhongMaterial({
        color: 0x8b4513,
        specular: 0xcc7744,
        shininess: 70,
        emissive: 0x110800,
      }),
      special: new THREE.MeshPhongMaterial({
        color: 0x7744cc,
        specular: 0xbb99ff,
        shininess: 120,
        emissive: 0x110022,
      }),
      rainbow: new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        specular: 0xffffff,
        shininess: 180,
        emissive: 0x111111,
      }),
    };

    // Face emblem materials
    this.faceMaterials = {
      gold: new THREE.MeshPhongMaterial({
        color: 0xffee00,
        specular: 0xffffcc,
        shininess: 150,
        emissive: 0x443300,
      }),
      silver: new THREE.MeshPhongMaterial({
        color: 0xf0f8ff,
        specular: 0xffffff,
        shininess: 180,
        emissive: 0x222233,
      }),
      bronze: new THREE.MeshPhongMaterial({
        color: 0xcd853f,
        specular: 0xffcc99,
        shininess: 100,
        emissive: 0x221100,
      }),
      special: new THREE.MeshPhongMaterial({
        color: 0xcc44ff,
        specular: 0xffbbff,
        shininess: 160,
        emissive: 0x440066,
      }),
      rainbow: new THREE.MeshPhongMaterial({
        color: 0xffffff,
        specular: 0xffffff,
        shininess: 200,
        emissive: 0x333333,
      }),
    };

    // Pre-create coin pool
    for (let i = 0; i < 80; i++) {
      this.createPooledCoin();
    }
  },

  // Create 5-pointed star geometry
  createStarGeometry: function (outerRadius, innerRadius, points) {
    const shape = new THREE.Shape();
    const angleStep = Math.PI / points;

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = i * angleStep - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();

    const extrudeSettings = { depth: 0.015, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  },

  // Create gem/diamond geometry
  createGemGeometry: function (size) {
    const shape = new THREE.Shape();
    shape.moveTo(0, size);
    shape.lineTo(size * 0.7, 0);
    shape.lineTo(0, -size);
    shape.lineTo(-size * 0.7, 0);
    shape.closePath();

    const extrudeSettings = { depth: 0.02, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  },

  // Create crown geometry
  createCrownGeometry: function (size) {
    const shape = new THREE.Shape();
    shape.moveTo(-size, -size * 0.4);
    shape.lineTo(-size, size * 0.2);
    shape.lineTo(-size * 0.5, 0);
    shape.lineTo(0, size * 0.5);
    shape.lineTo(size * 0.5, 0);
    shape.lineTo(size, size * 0.2);
    shape.lineTo(size, -size * 0.4);
    shape.closePath();

    const extrudeSettings = { depth: 0.015, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  },

  // Create crescent moon geometry
  createMoonGeometry: function (size) {
    const shape = new THREE.Shape();
    // Outer arc
    shape.absarc(0, 0, size, Math.PI * 0.25, Math.PI * 1.75, false);
    // Inner arc (creates crescent)
    shape.absarc(size * 0.35, 0, size * 0.7, Math.PI * 1.75, Math.PI * 0.25, true);

    const extrudeSettings = { depth: 0.015, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  },

  // Create shield geometry
  createShieldGeometry: function (size) {
    const shape = new THREE.Shape();
    shape.moveTo(0, size);
    shape.lineTo(size * 0.8, size * 0.6);
    shape.lineTo(size * 0.8, -size * 0.2);
    shape.quadraticCurveTo(size * 0.4, -size, 0, -size);
    shape.quadraticCurveTo(-size * 0.4, -size, -size * 0.8, -size * 0.2);
    shape.lineTo(-size * 0.8, size * 0.6);
    shape.closePath();

    const extrudeSettings = { depth: 0.015, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  },

  // Create prism/crystal geometry for rainbow coins
  createPrismGeometry: function (size) {
    const shape = new THREE.Shape();
    // Hexagonal prism shape
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * size;
      const y = Math.sin(angle) * size;
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();

    const extrudeSettings = { depth: 0.02, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  },

  // Create a pooled coin with full decorations
  createPooledCoin: function () {
    // Create coin group to hold all parts
    const coinGroup = new THREE.Group();

    // Main coin body
    const body = new THREE.Mesh(this.geometry, this.materials.gold);
    coinGroup.add(body);

    // Top rim (decorative ring on top face)
    const topRim = new THREE.Mesh(this.rimGeometry, this.rimMaterials.gold);
    topRim.rotation.x = Math.PI / 2;
    topRim.position.y = this.coinHeight / 2 + 0.01;
    coinGroup.add(topRim);

    // Bottom rim
    const bottomRim = new THREE.Mesh(this.rimGeometry, this.rimMaterials.gold);
    bottomRim.rotation.x = Math.PI / 2;
    bottomRim.position.y = -this.coinHeight / 2 - 0.01;
    coinGroup.add(bottomRim);

    // Top face emblem (star for gold, will be swapped based on type)
    const topEmblem = new THREE.Mesh(this.starGeometry, this.faceMaterials.gold);
    topEmblem.rotation.x = -Math.PI / 2;
    topEmblem.position.y = this.coinHeight / 2 + 0.01;
    coinGroup.add(topEmblem);

    // Bottom face emblem
    const bottomEmblem = new THREE.Mesh(this.starGeometry, this.faceMaterials.gold);
    bottomEmblem.rotation.x = Math.PI / 2;
    bottomEmblem.position.y = -this.coinHeight / 2 - 0.01;
    coinGroup.add(bottomEmblem);

    // Store references for material/geometry swapping
    coinGroup.userData = {
      body: body,
      topRim: topRim,
      bottomRim: bottomRim,
      topEmblem: topEmblem,
      bottomEmblem: bottomEmblem,
    };

    coinGroup.visible = false;
    this.scene.add(coinGroup);

    this.coinPool.push({
      mesh: coinGroup,
      body: null,
      active: false,
      type: "gold",
      value: this.baseValue,
    });

    return this.coinPool[this.coinPool.length - 1];
  },

  // Get emblem geometry for coin type
  getEmblemGeometry: function (type) {
    switch (type) {
      case "gold":
        return this.starGeometry;
      case "silver":
        return this.moonGeometry;
      case "bronze":
        return this.shieldGeometry;
      case "special":
        return this.gemGeometry;
      case "rainbow":
        return this.prismGeometry;
      default:
        return this.starGeometry;
    }
  },

  // Apply coin type visuals
  applyCoinType: function (coin, type) {
    const group = coin.mesh;
    const parts = group.userData;

    // Update body material
    parts.body.material = this.materials[type];

    // Update rim materials
    parts.topRim.material = this.rimMaterials[type];
    parts.bottomRim.material = this.rimMaterials[type];

    // Update emblem geometry and material
    const emblemGeom = this.getEmblemGeometry(type);
    parts.topEmblem.geometry = emblemGeom;
    parts.bottomEmblem.geometry = emblemGeom;
    parts.topEmblem.material = this.faceMaterials[type];
    parts.bottomEmblem.material = this.faceMaterials[type];

    // Special handling for rainbow coins - create prismatic effect
    if (type === "rainbow") {
      this.applyRainbowEffect(coin);
    }
  },

  // Apply rainbow prismatic effect (static, no flashing)
  applyRainbowEffect: function (coin) {
    const group = coin.mesh;
    const parts = group.userData;

    // Create a beautiful prismatic look with static multi-color gradients
    // Each coin gets a unique but stable hue based on its index
    const coinIndex = this.coinPool.indexOf(coin);
    const baseHue = (coinIndex * 0.1) % 1;

    // Body with iridescent appearance
    const bodyColor = new THREE.Color().setHSL(baseHue, 0.6, 0.7);
    parts.body.material = new THREE.MeshPhongMaterial({
      color: bodyColor,
      specular: 0xffffff,
      shininess: 200,
      emissive: new THREE.Color().setHSL(baseHue, 0.5, 0.15),
    });

    // Rim with complementary color
    const rimHue = (baseHue + 0.5) % 1;
    const rimColor = new THREE.Color().setHSL(rimHue, 0.7, 0.6);
    const rimMat = new THREE.MeshPhongMaterial({
      color: rimColor,
      specular: 0xffffff,
      shininess: 180,
      emissive: new THREE.Color().setHSL(rimHue, 0.5, 0.1),
    });
    parts.topRim.material = rimMat;
    parts.bottomRim.material = rimMat;

    // Emblem with triadic color
    const emblemHue = (baseHue + 0.33) % 1;
    const emblemColor = new THREE.Color().setHSL(emblemHue, 0.8, 0.65);
    const emblemMat = new THREE.MeshPhongMaterial({
      color: emblemColor,
      specular: 0xffffff,
      shininess: 200,
      emissive: new THREE.Color().setHSL(emblemHue, 0.6, 0.2),
    });
    parts.topEmblem.material = emblemMat;
    parts.bottomEmblem.material = emblemMat;

    // Store the base hue for slow animation
    coin.rainbowHue = baseHue;
  },

  // Get a coin from pool
  getCoin: function () {
    for (let i = 0; i < this.coinPool.length; i++) {
      if (!this.coinPool[i].active) {
        return this.coinPool[i];
      }
    }
    return this.createPooledCoin();
  },

  // Spawn a coin at position
  spawnCoin: function (x, y, z, type) {
    type = type || "gold";

    const coin = this.getCoin();
    coin.active = true;
    coin.type = type;

    // Apply the visual theme for this coin type
    this.applyCoinType(coin, type);

    coin.mesh.visible = true;
    coin.mesh.position.set(x, y, z);
    // Initial rotation - coin standing on edge (vertical like pachinko)
    // Rotate around Z by 90 degrees so cylinder axis is horizontal (along X)
    coin.mesh.rotation.set(0, 0, Math.PI / 2);

    // Set value based on type and multiplier
    switch (type) {
      case "gold":
        coin.value = this.baseValue * this.valueMultiplier;
        break;
      case "silver":
        coin.value = this.baseValue * 0.5 * this.valueMultiplier;
        break;
      case "bronze":
        coin.value = this.baseValue * 0.25 * this.valueMultiplier;
        break;
      case "special":
        coin.value = this.baseValue * 5 * this.valueMultiplier;
        break;
      case "rainbow":
        coin.value = this.baseValue * 10 * this.valueMultiplier;
        break;
    }

    // Create physics body with initial rotation
    const self = this;
    coin.body = this.physics ? this.physics.createBody({
      shape: "cylinder",
      x: x,
      y: y,
      z: z,
      radius: this.coinRadius,
      height: this.coinHeight,
      mass: 1,
      friction: 0.35,
      restitution: 0.25,
      mesh: coin.mesh,
      // Initial rotation - coin standing on edge (vertical like pachinko)
      rx: 0,
      ry: 0,
      rz: Math.PI / 2,
      data: { coin: coin },
      onFallOff: function (body) {
        self.onCoinFallOff(coin, body);
      },
    }) : null;

    if (coin.body) {
      // Add small random velocity for natural spread - reduced for more controlled drops
      coin.body.vx = random(-0.3, 0.3);
      coin.body.vy = random(-0.2, 0);

      // Small initial spin - reduced for more realistic behavior
      coin.body.ay = random(-0.5, 0.5);
    }

    this.activeCoins.push(coin);
    return coin;
  },

  // Called when a coin falls off
  onCoinFallOff: function (coin, body) {
    // Register with combo system
    if (this.combo) {
      this.combo.registerFall();
    }

    // Get combo multiplier
    const comboMult = this.combo ? this.combo.getMultiplier() : 1;

    // Contribute to jackpot
    if (this.jackpot) {
      this.jackpot.contribute(coin.value);
    }

    // Track for coin rain rewards
    if (this.coinRain) {
      this.coinRain.onCoinDropped();
    }

    // Check bonus zones first
    const bonusResult = this.checkBonusZones(body.x, body.y, body.z);

    if (bonusResult) {
      if (bonusResult.type === "miss") {
        // Small consolation score
        if (this.game) this.game.addScore(Math.floor(coin.value * 0.1), body.x, body.y, body.z, 1);
        if (this.ui) this.ui.showMessage("Saved!");
      } else if (bonusResult.type === "slot") {
        // Slot multiplier + combo multiplier
        const slotMult = bonusResult.multiplier || 1;
        const totalMult = slotMult * comboMult;
        if (this.game) this.game.addScore(coin.value, body.x, body.y, body.z, totalMult);
        if (this.ui) this.ui.showCoinScore(Math.floor(coin.value * totalMult), { x: body.x, y: body.y, z: body.z });

        if (bonusResult.isBonus) {
          // Bonus slots trigger coin rain or powerup
          if (this.coinRain && Math.random() < 0.5) {
            this.coinRain.trigger("bonusSlot");
          } else if (this.powerUps) {
            this.powerUps.showSelection();
          }
        }

        // Chance to spawn collectible
        if (this.collectibles) {
          this.collectibles.maybeSpawn(body.x, body.y + 2, body.z);
        }
      } else {
        // Regular bonus zone
        this.triggerBonus(bonusResult, body.x, body.y);
        if (this.game) this.game.addScore(coin.value, body.x, body.y, body.z, comboMult);
        if (this.ui) this.ui.showCoinScore(Math.floor(coin.value * comboMult), { x: body.x, y: body.y, z: body.z });
      }
    } else {
      // Regular scoring with combo
      if (this.game) this.game.addScore(coin.value, body.x, body.y, body.z, comboMult);
      if (this.ui) this.ui.showCoinScore(Math.floor(coin.value * comboMult), { x: body.x, y: body.y, z: body.z });
    }

    // Play sound
    if (this.sound) this.sound.play("coin");

    // Check for relic drop
    if (this.relics) this.relics.checkDrop();

    // Recycle coin
    this.recycleCoin(coin);
  },

  // Check if coin hit a bonus zone
  checkBonusZones: function (x, y, z) {
    const bonusZones = this.board?.bonusZones || [];

    for (let i = 0; i < bonusZones.length; i++) {
      const zone = bonusZones[i];

      // Check based on zone shape
      if (zone.radius) {
        // Circular zone (bonus spots on shelves)
        const dx = x - zone.x;
        const dy = y - zone.y;
        // Check Z distance if zone has depth
        const zMatch = !zone.depth || (z !== undefined && Math.abs(z - zone.z) < zone.depth);
        if (dx * dx + dy * dy < zone.radius * zone.radius && zMatch) {
          return zone;
        }
      } else if (zone.width && zone.height) {
        // Rectangular zone (scoring slots)
        const inX = x > zone.x - zone.width / 2 && x < zone.x + zone.width / 2;
        const inY = y > zone.y - zone.height && y < zone.y + zone.height;
        // Check Z bounds if zone has depth
        const inZ = !zone.depth || (z !== undefined && z > zone.z - zone.depth && z < zone.z + zone.depth);

        if (inX && inY && inZ) {
          return zone;
        }
      }
    }

    // Safety fallback: if coin is at scoring level, count as scored
    const scoringY = this.board?.scoringY ?? -15;
    if (y < scoringY + 1) {
      return { type: "slot", multiplier: 1, isBonus: false };
    }

    return null;
  },

  // Trigger a bonus effect
  triggerBonus: function (zone, x, y) {
    switch (zone.type) {
      case "queue":
        const addAmount = randomInt(3, 8);
        this.addToQueue(addAmount);
        if (this.ui) this.ui.showMessage("+" + addAmount + " Coins!", x, y);
        if (this.sound) this.sound.play("bonus");
        break;

      case "multiplier":
        this.valueMultiplier *= 2;
        setTimeout(() => {
          this.valueMultiplier = Math.max(1, this.valueMultiplier / 2);
        }, 10000);
        if (this.ui) this.ui.showMessage("2x Value!", x, y);
        if (this.sound) this.sound.play("bonus");
        break;

      case "powerup":
        if (this.powerUps) this.powerUps.showSelection();
        if (this.sound) this.sound.play("powerup");
        break;

      case "themeBonus":
        // Theme-specific bonus target - upgrades the theme's powerup focus
        if (this.powerUps && zone.powerupType) {
          this.powerUps.applyThemeBonusHit(zone.powerupType);
        }
        if (this.sound) this.sound.play("bonus");
        break;
    }
  },

  // Recycle a coin back to pool
  recycleCoin: function (coin) {
    coin.active = false;
    coin.mesh.visible = false;

    if (coin.body && this.physics) {
      this.physics.removeBody(coin.body);
      coin.body = null;
    }

    const index = this.activeCoins.indexOf(coin);
    if (index > -1) {
      this.activeCoins.splice(index, 1);
    }
  },

  // Drop a coin manually
  dropCoin: function () {
    const dropZone = this.board?.getDropZone();
    if (!dropZone) return;

    // Check queue
    if (this.coinQueue <= 0) return;
    this.coinQueue--;
    if (this.ui) this.ui.updateQueue(this.coinQueue);

    // Random X position within drop zone
    const dropX = random(dropZone.minX, dropZone.maxX);
    const dropY = dropZone.y;
    const dropZ = dropZone.z;

    // Determine coin type with luck factor
    const luckyChance = this.powerUps ? this.powerUps.getLuckyChance() : 0.05;
    let type = "gold";
    const rand = Math.random();

    if (rand < luckyChance * 0.5) {
      type = "rainbow";
    } else if (rand < luckyChance) {
      type = "special";
    } else if (rand < 0.15) {
      type = "silver";
    } else if (rand < 0.25) {
      type = "bronze";
    }

    this.spawnCoin(dropX, dropY, dropZ, type);
  },

  // Add coins to queue
  addToQueue: function (amount) {
    this.coinQueue = Math.min(this.coinQueue + amount, this.maxQueueSize);
    if (this.ui) this.ui.updateQueue(this.coinQueue);
  },

  // Update coin queue regeneration (passive income)
  updateQueue: function (deltaTime) {
    // Always regenerate coins over time (passive income)
    this.regenTimer += deltaTime;

    if (this.regenTimer >= this.regenInterval) {
      this.regenTimer = 0;

      // Add coins if not at max
      if (this.coinQueue < this.maxQueueSize) {
        // Regen faster when queue is low
        const bonusRegen = this.coinQueue < 5 ? 2 : 0;
        this.addToQueue(this.regenAmount + bonusRegen);
      }
    }
  },

  // Update all coins
  update: function (deltaTime) {
    this.updateQueue(deltaTime);

    // Update rainbow coins with slow, smooth color shifting (no flashing)
    const time = performance.now() * 0.0002; // Very slow animation
    for (let i = 0; i < this.activeCoins.length; i++) {
      const coin = this.activeCoins[i];
      if (coin.type === "rainbow" && coin.rainbowHue !== undefined) {
        const parts = coin.mesh.userData;
        if (parts && parts.body && parts.body.material) {
          // Gentle hue shift based on coin's base hue - very slow rotation
          const currentHue = (coin.rainbowHue + time) % 1;

          // Update body color with smooth transition
          parts.body.material.color.setHSL(currentHue, 0.6, 0.7);
          parts.body.material.emissive.setHSL(currentHue, 0.5, 0.15);

          // Rim stays complementary
          const rimHue = (currentHue + 0.5) % 1;
          if (parts.topRim.material.color) {
            parts.topRim.material.color.setHSL(rimHue, 0.7, 0.6);
            parts.topRim.material.emissive.setHSL(rimHue, 0.5, 0.1);
          }
          if (parts.bottomRim.material.color) {
            parts.bottomRim.material.color.setHSL(rimHue, 0.7, 0.6);
            parts.bottomRim.material.emissive.setHSL(rimHue, 0.5, 0.1);
          }

          // Emblem stays triadic
          const emblemHue = (currentHue + 0.33) % 1;
          if (parts.topEmblem.material.color) {
            parts.topEmblem.material.color.setHSL(emblemHue, 0.8, 0.65);
            parts.topEmblem.material.emissive.setHSL(emblemHue, 0.6, 0.2);
          }
          if (parts.bottomEmblem.material.color) {
            parts.bottomEmblem.material.color.setHSL(emblemHue, 0.8, 0.65);
            parts.bottomEmblem.material.emissive.setHSL(emblemHue, 0.6, 0.2);
          }
        }
      }

      // Gentle shimmer effect for special coins (subtle, not flashing)
      if (coin.type === "special" && coin.mesh.userData) {
        const parts = coin.mesh.userData;
        const shimmer = 0.2 + Math.sin(time * 10 + i) * 0.05; // Very subtle
        if (parts.body.material.emissiveIntensity !== undefined) {
          parts.body.material.emissive.setHSL(0.75, 0.8, shimmer);
        }
      }
    }
  },

  // Get active coin count
  getActiveCount: function () {
    return this.activeCoins.length;
  },

  // Set power-up effects
  setQueueSpeed: function (speed) {
    this.queueSpeed = speed;
  },

  setMaxQueue: function (max) {
    this.maxQueueSize = max;
  },

  setValueMultiplier: function (mult) {
    this.valueMultiplier = mult;
  },

  // Clean up all coins
  cleanup: function () {
    for (let i = this.activeCoins.length - 1; i >= 0; i--) {
      this.recycleCoin(this.activeCoins[i]);
    }
  },
};

export default Coins;
