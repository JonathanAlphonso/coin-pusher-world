/**
 * Coin Pusher Board System
 * Pyramid-shaped coin pusher with themed tiers that expands at score milestones
 * Coins cascade from tier to tier - never falling into the abyss!
 */

import * as THREE from 'three';
import { random } from '../core/Utils.js';
import { tierThemes, getThemeOptions } from './themes/index.js';
import TextureGenerator from './TextureGenerator.js';

// Helper function to create capsule-like geometry (CapsuleGeometry not in Three.js r128)
function createCapsuleGeometry(radius, length, capSegments, radialSegments) {
  const cylinderHeight = length + radius * 2;
  const segments = radialSegments || 8;
  const heightSegments = capSegments || 4;
  const geometry = new THREE.CylinderGeometry(radius, radius, cylinderHeight, segments, heightSegments);
  return geometry;
}

const Board = {
  // Scene reference
  scene: null,

  // Materials (created per-tier with themes)
  materials: {},

  // Board dimensions - base tier size
  baseBoardWidth: 10,
  shelfDepth: 5,

  // Pyramid configuration - designed so tiers connect!
  tierOffsetY: -4.5,
  tierOffsetZ: 8.0,
  tierWidthIncrease: 3,

  // Pusher tiers
  pushers: [],
  tiers: [],

  // Pegs for pachinko sections
  pegs: [],

  // Bonus zones
  bonusZones: [],

  // Scoring slot elements
  scoringSlotMeshes: [],
  scoringSlotBodies: [],
  containmentBodies: [],

  // Current tier count
  currentTierCount: 1,
  maxTiers: 8,

  // Scoring threshold
  scoringY: -25,

  // Tier themes
  tierThemes: tierThemes,

  // Dynamic elements arrays
  spinners: [],
  sidePushers: [],
  bumpers: [],
  decorations: [],
  coinMovers: [], // New themed coin-moving mechanisms
  ledStrips: [], // LED light strips for each tier

  // New interactive elements
  laserGrids: [],
  pinballFlippers: [],
  arcadeButtons: [],
  volcanos: [],
  bouncyEggs: [],
  dinoTails: [],
  wormholes: [],
  plasmaTurrets: [],
  alienPods: [],
  swingingAnchors: [],
  treasureChests: [],
  shipWheels: [],
  lollipopSpinners: [],
  peppermintWheels: [],
  gummyBounces: [],
  asteroidFields: [],
  solarPanels: [],
  plasmaConduits: [],
  lilyPads: [],
  rollingBoulders: [],
  monkeySwings: [],
  pistons: [],
  laserScanners: [],
  rotatingGears: [],

  // Track which theme indices have been used
  usedThemeIndices: [],

  // References
  physics: null,
  coins: null,
  ui: null,
  game: null,

  // Initialize board
  init: function (scene, refs = {}) {
    this.scene = scene;
    this.physics = refs.physics;
    this.coins = refs.coins;
    this.ui = refs.ui;
    this.game = refs.game;

    this.pushers = [];
    this.tiers = [];
    this.pegs = [];
    this.bonusZones = [];
    this.spinners = [];
    this.sidePushers = [];
    this.bumpers = [];
    this.decorations = [];
    this.coinMovers = [];
    this.ledStrips = [];
    this.scoringSlotMeshes = [];
    this.scoringSlotBodies = [];
    this.containmentBodies = [];
    this.currentTierCount = 1;
    this.usedThemeIndices = [0]; // Reset and mark theme 0 as used (first tier)

    // Initialize new interactive element arrays
    this.laserGrids = [];
    this.pinballFlippers = [];
    this.arcadeButtons = [];
    this.volcanos = [];
    this.bouncyEggs = [];
    this.dinoTails = [];
    this.wormholes = [];
    this.plasmaTurrets = [];
    this.alienPods = [];
    this.swingingAnchors = [];
    this.treasureChests = [];
    this.shipWheels = [];
    this.lollipopSpinners = [];
    this.peppermintWheels = [];
    this.gummyBounces = [];
    this.asteroidFields = [];
    this.solarPanels = [];
    this.plasmaConduits = [];
    this.lilyPads = [];
    this.rollingBoulders = [];
    this.monkeySwings = [];
    this.pistons = [];
    this.laserScanners = [];
    this.rotatingGears = [];

    this.createBaseMaterials();
    this.createContainmentWalls();
    this.createPachinkoZone(12, 4);
    this.createPusherTier(0, 0, 0, this.baseBoardWidth);
    this.createScoringSlots(this.getScoringY());
    this.spawnStartingCoins();
  },

  // Add collision body for a decoration
  addDecorationCollision: function (x, y, z, radius, shape) {
    shape = shape || "peg";
    if (this.physics) {
      this.physics.createBody({
        shape: shape,
        x: x,
        y: y,
        z: z,
        radius: radius,
        isStatic: true,
        restitution: 0.5,
        data: { noSync: true, isDecoration: true },
      });
    }
  },

  // Create base materials (using MeshPhongMaterial for WebGL1 compatibility - Design Spec 10.4)
  createBaseMaterials: function () {
    this.materials = {
      peg: new THREE.MeshPhongMaterial({
        color: 0xff7043,
        emissive: 0x552200,
        emissiveIntensity: 0.4,
      }),
      pegBonus: new THREE.MeshPhongMaterial({
        color: 0x00e676,
        emissive: 0x007744,
        emissiveIntensity: 0.65,
      }),
      divider: new THREE.MeshPhongMaterial({
        color: 0x7c4dff,
        emissive: 0x2b0a78,
        emissiveIntensity: 0.6,
      }),
      slotGood: new THREE.MeshPhongMaterial({
        color: 0x00e676,
        emissive: 0x00b05a,
        emissiveIntensity: 0.65,
      }),
      slotBad: new THREE.MeshPhongMaterial({
        color: 0xff1744,
        emissive: 0x8a0020,
        emissiveIntensity: 0.55,
      }),
      slotBonus: new THREE.MeshPhongMaterial({
        color: 0xffea00,
        emissive: 0xb28900,
        emissiveIntensity: 0.7,
      }),
      ramp: new THREE.MeshPhongMaterial({
        color: 0x455a64,
        emissive: 0x0b1115,
        emissiveIntensity: 0.15,
      }),
    };
  },

  // Create themed materials for a specific tier
  createTierMaterials: function (tierIndex) {
    const theme = this.tierThemes[tierIndex % this.tierThemes.length];
    
    // Generate textures if defined
    let shelfTexture = null;
    let wallTexture = null;
    
    if (theme.textureType) {
        // Shelf texture
        shelfTexture = TextureGenerator.createTexture(theme.textureType, {
            color1: theme.shelf,
            color2: theme.wall, // Use wall color as secondary for contrast
            color3: theme.accent
        });
        
        // Wall texture
        wallTexture = TextureGenerator.createTexture(theme.textureType, {
            color1: theme.wall,
            color2: theme.shelf, // Invert or use shelf/accent
            color3: theme.accent
        });
        
        if (theme.textureScale) {
            const s = theme.textureScale / 2;
            shelfTexture.repeat.set(s, s);
            wallTexture.repeat.set(s, s);
        }
    }

    return {
      shelf: new THREE.MeshPhongMaterial({
        color: shelfTexture ? 0xffffff : theme.shelf,
        map: shelfTexture,
      }),
      wall: new THREE.MeshPhongMaterial({
        color: wallTexture ? 0xffffff : theme.wall,
        map: wallTexture,
        emissive: theme.glow,
        emissiveIntensity: 0.25,
      }),
      pusher: new THREE.MeshPhongMaterial({
        color: theme.pusher,
        emissive: theme.pusher,
        emissiveIntensity: 0.25,
      }),
      accent: new THREE.MeshPhongMaterial({
        color: theme.accent,
        emissive: theme.accent,
        emissiveIntensity: 0.55,
        transparent: true,
        opacity: 0.9,
      }),
      glow: new THREE.MeshPhongMaterial({
        color: theme.glow,
        emissive: theme.glow,
        emissiveIntensity: 0.75,
        transparent: true,
        opacity: 0.8,
      }),
    };
  },

  // Get the Y position for scoring slots based on current tier count
  getScoringY: function () {
    return -6 + (this.currentTierCount - 1) * this.tierOffsetY;
  },

  // Get tier position based on tier index
  getTierPosition: function (tierIndex) {
    return {
      y: tierIndex * this.tierOffsetY,
      z: tierIndex * this.tierOffsetZ,
      width: this.baseBoardWidth + tierIndex * this.tierWidthIncrease
    };
  },

  // Create pachinko peg zone at the top
  createPachinkoZone: function (startY, endY) {
    const rows = 5;
    const pegRadius = 0.25;
    const spacingX = 1.3;
    const spacingY = (startY - endY) / rows;

    // BACK WALL - prevents coins from falling behind the board
    const backWallGeom = new THREE.BoxGeometry(this.baseBoardWidth + 1, 14, 0.3);
    const backWallMat = new THREE.MeshPhongMaterial({
      color: 0x1a1a2e,
      emissive: 0x0a0a15,
      emissiveIntensity: 0.2,
    });
    const backWall = new THREE.Mesh(backWallGeom, backWallMat);
    backWall.position.set(0, 7, -1.5); // Behind the pegs
    this.scene.add(backWall);
    this.tiers.push(backWall);

    if (this.physics) {
      this.physics.createBody({
        shape: "box",
        x: 0, y: 7, z: -1.5,
        width: this.baseBoardWidth + 1,
        height: 14,
        depth: 0.3,
        isStatic: true,
      });
    }

    // Side walls for pachinko zone
    for (let side = -1; side <= 1; side += 2) {
      const x = side * (this.baseBoardWidth / 2 + 0.2);
      const wallGeom = new THREE.BoxGeometry(0.3, 12, 4);
      const wallMat = new THREE.MeshPhongMaterial({
        color: 0x7c4dff,
        emissive: 0x3d1f99,
        emissiveIntensity: 0.3,
      });
      const wall = new THREE.Mesh(wallGeom, wallMat);
      wall.position.set(x, 8, 0);
      this.scene.add(wall);
      this.tiers.push(wall);

      if (this.physics) {
        this.physics.createBody({
          shape: "box",
          x: x, y: 8, z: 0,
          width: 0.3,
          height: 12,
          depth: 4,
          isStatic: true,
        });
      }
    }

    // Create pegs with rainbow colors
    for (let row = 0; row < rows; row++) {
      const y = startY - row * spacingY;
      const pegsInRow = row % 2 === 0 ? 7 : 8;
      const offsetX = row % 2 === 0 ? 0 : spacingX / 2;

      for (let i = 0; i < pegsInRow; i++) {
        const x = (i - (pegsInRow - 1) / 2) * spacingX + offsetX;

        const hue = ((row * 0.15) + (i * 0.08)) % 1;
        const isBonus = Math.random() < 0.1;

        const pegColor = isBonus ? 0x00ff88 : new THREE.Color().setHSL(hue, 0.8, 0.5).getHex();
        const pegMat = new THREE.MeshPhongMaterial({
          color: pegColor,
          emissive: pegColor,
          emissiveIntensity: isBonus ? 0.5 : 0.2,
          specular: 0xffffff,
          shininess: 80,
        });

        const pegGeom = new THREE.CylinderGeometry(pegRadius, pegRadius, 0.5, 16);
        const peg = new THREE.Mesh(pegGeom, pegMat);
        peg.rotation.x = Math.PI / 2;
        peg.position.set(x, y, 0);
        this.scene.add(peg);

        if (this.physics) {
          this.physics.createBody({
            shape: "peg", // Use "peg" shape for proper collision detection
            x: x, y: y, z: 0,
            radius: pegRadius,
            height: 0.5,
            isStatic: true,
            restitution: 0.6,
            data: { noSync: true, isBonus: isBonus },
          });
        }

        this.pegs.push({ mesh: peg, isBonus: isBonus, baseHue: hue });
      }
    }

  },

  // Create a themed pusher tier with proper connections
  createPusherTier: function (tierIndex, baseY, baseZ, boardWidth) {
    const tierMats = this.createTierMaterials(tierIndex);
    const theme = this.tierThemes[tierIndex % this.tierThemes.length];
    
    // Add background decoration for initial tier
    if (this.game && this.game.background) {
      this.game.background.addThemeDecoration(theme);
    }

    const tierMeshes = [];

    const upperY = baseY + 1.5;
    const lowerY = baseY;
    const upperShelfZ = baseZ - 1;
    const lowerShelfZ = baseZ + 1.5;
    const frontZ = lowerShelfZ + this.shelfDepth / 2;

    // Edge lights
    this.createEdgeLights(tierIndex, boardWidth, lowerY, lowerShelfZ, tierMats, tierMeshes);
    this.createThemeLights(tierIndex, baseY, baseZ, boardWidth, theme);

    // Upper shelf
    const upperShelfGeom = new THREE.BoxGeometry(boardWidth - 1, 0.25, 2.5);
    const upperShelf = new THREE.Mesh(upperShelfGeom, tierMats.shelf);
    upperShelf.position.set(0, upperY, upperShelfZ);
    this.scene.add(upperShelf);
    tierMeshes.push(upperShelf);

    if (this.physics) {
      this.physics.createBody({
        shape: "box",
        x: 0, y: upperY, z: upperShelfZ,
        width: boardWidth - 1,
        height: 0.25,
        depth: 2.5,
        isStatic: true,
      });
    }

    // Upper shelf back wall with glow strip
    const upperBackGeom = new THREE.BoxGeometry(boardWidth - 1, 1.2, 0.2);
    const upperBack = new THREE.Mesh(upperBackGeom, tierMats.wall);
    upperBack.position.set(0, upperY + 0.7, upperShelfZ - 1.3);
    this.scene.add(upperBack);
    tierMeshes.push(upperBack);

    const glowStripGeom = new THREE.BoxGeometry(boardWidth - 1.5, 0.15, 0.1);
    const glowStrip = new THREE.Mesh(glowStripGeom, tierMats.glow);
    glowStrip.position.set(0, upperY + 1.2, upperShelfZ - 1.2);
    this.scene.add(glowStrip);
    tierMeshes.push(glowStrip);

    if (this.physics) {
      this.physics.createBody({
        shape: "box",
        x: 0, y: upperY + 0.7, z: upperShelfZ - 1.3,
        width: boardWidth - 1,
        height: 1.2,
        depth: 0.2,
        isStatic: true,
      });
    }

    // Pusher
    const pusherWidth = boardWidth - 2;
    const pusherHeight = 0.7;
    const pusherDepth = 1.6;

    const pusherGeom = new THREE.BoxGeometry(pusherWidth, pusherHeight, pusherDepth);
    const pusherMesh = new THREE.Mesh(pusherGeom, tierMats.pusher);
    const pusherY = upperY + 0.12 + pusherHeight / 2;
    const pusherBaseZ = upperShelfZ - 0.3;
    pusherMesh.position.set(0, pusherY, pusherBaseZ);
    this.scene.add(pusherMesh);
    tierMeshes.push(pusherMesh);

    const pusherBody = this.physics ? this.physics.createBody({
      shape: "box",
      x: 0, y: pusherY, z: pusherBaseZ,
      width: pusherWidth,
      height: pusherHeight,
      depth: pusherDepth,
      isStatic: true,
      mesh: pusherMesh,
    }) : null;

    this.pushers.push({
      mesh: pusherMesh,
      body: pusherBody,
      baseY: pusherY,
      baseZ: pusherBaseZ,
      position: 0,
      direction: 1,
      speed: 1.6 + tierIndex * 0.15, // Faster upper pusher
      minZ: -1.2,
      maxZ: 1.8, // Extended range to push coins off upper shelf
      tierIndex: tierIndex,
      theme: theme,
    });

    // Lower shelf
    const lowerShelfGeom = new THREE.BoxGeometry(boardWidth, 0.25, this.shelfDepth);
    const lowerShelf = new THREE.Mesh(lowerShelfGeom, tierMats.shelf);
    lowerShelf.position.set(0, lowerY, lowerShelfZ);
    this.scene.add(lowerShelf);
    tierMeshes.push(lowerShelf);

    if (this.physics) {
      this.physics.createBody({
        shape: "box",
        x: 0, y: lowerY, z: lowerShelfZ,
        width: boardWidth,
        height: 0.25,
        depth: this.shelfDepth,
        isStatic: true,
      });
    }

    // Lower shelf back wall
    const lowerBackGeom = new THREE.BoxGeometry(boardWidth, 1, 0.2);
    const lowerBack = new THREE.Mesh(lowerBackGeom, tierMats.wall);
    lowerBack.position.set(0, lowerY + 0.6, lowerShelfZ - this.shelfDepth / 2);
    this.scene.add(lowerBack);
    tierMeshes.push(lowerBack);

    if (this.physics) {
      this.physics.createBody({
        shape: "box",
        x: 0, y: lowerY + 0.6, z: lowerShelfZ - this.shelfDepth / 2,
        width: boardWidth,
        height: 1,
        depth: 0.2,
        isStatic: true,
      });
    }

    // Lower shelf pusher - pushes coins from lower shelf to front edge
    const lowerPusherWidth = boardWidth - 1;
    const lowerPusherHeight = 0.6;
    const lowerPusherDepth = 1.4;

    const lowerPusherGeom = new THREE.BoxGeometry(lowerPusherWidth, lowerPusherHeight, lowerPusherDepth);
    const lowerPusherMesh = new THREE.Mesh(lowerPusherGeom, tierMats.pusher);
    const lowerPusherY = lowerY + 0.12 + lowerPusherHeight / 2;
    const lowerPusherBaseZ = lowerShelfZ - this.shelfDepth / 2 + 0.8;
    lowerPusherMesh.position.set(0, lowerPusherY, lowerPusherBaseZ);
    this.scene.add(lowerPusherMesh);
    tierMeshes.push(lowerPusherMesh);

    const lowerPusherBody = this.physics ? this.physics.createBody({
      shape: "box",
      x: 0, y: lowerPusherY, z: lowerPusherBaseZ,
      width: lowerPusherWidth,
      height: lowerPusherHeight,
      depth: lowerPusherDepth,
      isStatic: true,
      mesh: lowerPusherMesh,
    }) : null;

    this.pushers.push({
      mesh: lowerPusherMesh,
      body: lowerPusherBody,
      baseY: lowerPusherY,
      baseZ: lowerPusherBaseZ,
      position: 0,
      direction: 1,
      speed: 1.5 + tierIndex * 0.1, // Faster pushing
      minZ: -0.5,
      maxZ: 4.8, // Extended to push coins past front edge
      tierIndex: tierIndex,
      theme: theme,
      isLowerPusher: true,
    });

    // Front lip - very low to allow coins to roll over easily
    const lipGeom = new THREE.BoxGeometry(boardWidth, 0.05, 0.1);
    const lip = new THREE.Mesh(lipGeom, tierMats.accent);
    lip.position.set(0, lowerY + 0.08, frontZ);
    this.scene.add(lip);
    tierMeshes.push(lip);

    if (this.physics) {
      this.physics.createBody({
        shape: "box",
        x: 0, y: lowerY + 0.08, z: frontZ,
        width: boardWidth,
        height: 0.05,
        depth: 0.1,
        isStatic: true,
      });
    }

    // Side walls
    for (let side = -1; side <= 1; side += 2) {
      const x = side * (boardWidth / 2 + 0.1);
      const sideWallGeom = new THREE.BoxGeometry(0.2, 2.2, this.shelfDepth + 3);
      const sideWall = new THREE.Mesh(sideWallGeom, tierMats.wall);
      sideWall.position.set(x, lowerY + 1, baseZ + 0.5);
      this.scene.add(sideWall);
      tierMeshes.push(sideWall);

      const sideGlowGeom = new THREE.BoxGeometry(0.08, 0.15, this.shelfDepth + 2);
      const sideGlow = new THREE.Mesh(sideGlowGeom, tierMats.glow);
      sideGlow.position.set(x * 0.95, lowerY + 2, baseZ + 0.5);
      this.scene.add(sideGlow);
      tierMeshes.push(sideGlow);

      if (this.physics) {
        this.physics.createBody({
          shape: "box",
          x: x, y: lowerY + 1, z: baseZ + 0.5,
          width: 0.2,
          height: 2.2,
          depth: this.shelfDepth + 3,
          isStatic: true,
        });
      }
    }

    // Ramp to next tier
    this.createTierRamp(tierIndex, boardWidth, lowerY, frontZ, tierMats, tierMeshes);

    // Store tier info
    this.tiers.push({
      tierIndex: tierIndex,
      meshes: tierMeshes,
      baseY: baseY,
      baseZ: baseZ,
      width: boardWidth,
      frontZ: frontZ,
      lowerShelfZ: lowerShelfZ,
      theme: theme,
    });

    // Bonus zones
    this.createShelfBonusZones(tierIndex, lowerY, lowerShelfZ, boardWidth, tierMats);

    // Themed elements
    this.createTierElements(tierIndex, baseY, baseZ, boardWidth, tierMats, theme);
  },

  // Create decorative edge lights
  createEdgeLights: function (tierIndex, boardWidth, lowerY, lowerShelfZ, tierMats, tierMeshes) {
    const lightCount = Math.floor(boardWidth / 1.5);
    const spacing = boardWidth / lightCount;

    for (let i = 0; i < lightCount; i++) {
      const x = -boardWidth / 2 + spacing / 2 + i * spacing;
      const lightGeom = new THREE.SphereGeometry(0.12, 8, 6);
      const light = new THREE.Mesh(lightGeom, tierMats.glow);
      light.position.set(x, lowerY + 0.2, lowerShelfZ + this.shelfDepth / 2 - 0.2);
      this.scene.add(light);
      tierMeshes.push(light);
      light.userData = { lightIndex: i, tierIndex: tierIndex };
    }
  },

  // Create ramp between tiers - stepped design for reliable coin flow
  createTierRamp: function (tierIndex, boardWidth, lowerY, frontZ, tierMats, tierMeshes) {
    const rampLength = 3.5;
    const rampWidth = boardWidth + 2;
    const guardHeight = 1.2;

    // Visual ramp (tilted mesh)
    const rampGeom = new THREE.BoxGeometry(rampWidth, 0.2, rampLength);
    const ramp = new THREE.Mesh(rampGeom, this.materials.ramp);
    ramp.position.set(0, lowerY - 1.0, frontZ + rampLength / 2);
    ramp.rotation.x = 0.3;
    this.scene.add(ramp);
    tierMeshes.push(ramp);

    // Physics: Create stepped boxes that coins can roll down
    // This is more reliable than a tilted plane
    if (this.physics) {
      const steps = 4;
      const stepDepth = rampLength / steps;
      const stepDrop = 0.6; // Height drop per step

      for (let i = 0; i < steps; i++) {
        const stepZ = frontZ + stepDepth / 2 + i * stepDepth;
        const stepY = lowerY - 0.3 - i * stepDrop;

        this.physics.createBody({
          shape: "box",
          x: 0, y: stepY, z: stepZ,
          width: rampWidth,
          height: 0.15,
          depth: stepDepth + 0.2, // Slight overlap to prevent gaps
          isStatic: true,
        });
      }
    }

    // Side guards
    for (let side = -1; side <= 1; side += 2) {
      const guardGeom = new THREE.BoxGeometry(0.2, guardHeight, rampLength + 0.5);
      const guard = new THREE.Mesh(guardGeom, tierMats.wall);
      guard.position.set(side * rampWidth / 2, lowerY - 0.3, frontZ + rampLength / 2);
      this.scene.add(guard);
      tierMeshes.push(guard);

      if (this.physics) {
        this.physics.createBody({
          shape: "box",
          x: side * rampWidth / 2, y: lowerY - 0.3, z: frontZ + rampLength / 2,
          width: 0.2,
          height: guardHeight,
          depth: rampLength + 0.5,
          isStatic: true,
        });
      }
    }

    // Back guard - lowered and moved back so it doesn't block coins
    const backGuardGeom = new THREE.BoxGeometry(rampWidth, guardHeight * 0.3, 0.2);
    const backGuard = new THREE.Mesh(backGuardGeom, tierMats.wall);
    backGuard.position.set(0, lowerY - 1.0, frontZ - 0.1);
    this.scene.add(backGuard);
    tierMeshes.push(backGuard);

    if (this.physics) {
      this.physics.createBody({
        shape: "box",
        x: 0, y: lowerY - 1.0, z: frontZ - 0.1,
        width: rampWidth,
        height: guardHeight * 0.3,
        depth: 0.2,
        isStatic: true,
      });
    }
  },

  // Create bonus zones on the shelf
  createShelfBonusZones: function (tierIndex, lowerY, lowerShelfZ, boardWidth, tierMats) {
    // Bonus spot on left
    this.createBonusSpot(-boardWidth / 3, lowerY + 0.15, lowerShelfZ, tierMats, "queue");
    // Bonus spot on right
    this.createBonusSpot(boardWidth / 3, lowerY + 0.15, lowerShelfZ, tierMats, "multiplier");
  },

  // Create a single bonus spot
  createBonusSpot: function (x, y, z, tierMats, bonusType) {
    const spotRadius = 0.6;

    const spotGeom = new THREE.CircleGeometry(spotRadius, 16);
    const spotMat = new THREE.MeshPhongMaterial({
      color: bonusType === "queue" ? 0x00e676 : 0xffea00,
      emissive: bonusType === "queue" ? 0x00e676 : 0xffea00,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8,
    });
    const spot = new THREE.Mesh(spotGeom, spotMat);
    spot.position.set(x, y, z);
    spot.rotation.x = -Math.PI / 2;
    this.scene.add(spot);

    this.bonusZones.push({
      x: x,
      y: y,
      z: z,
      radius: spotRadius,
      depth: 1,
      type: bonusType,
      mesh: spot,
    });
  },

  // Create invisible containment walls to keep coins inside the machine bounds
  createContainmentWalls: function () {
    if (!this.physics) return;

    const maxWidth = this.baseBoardWidth + (this.maxTiers - 1) * this.tierWidthIncrease + 6;
    const halfWidth = maxWidth / 2;
    const depth = this.shelfDepth + (this.maxTiers - 1) * this.tierOffsetZ + 20;
    const height = 60;
    const centerY = -5; // Spans well above and below play area

    const createWall = (x) => {
      const body = this.physics.createBody({
        shape: "box",
        x: x,
        y: centerY,
        z: 0,
        width: 0.5,
        height: height,
        depth: depth,
        isStatic: true,
        data: { type: "containment" },
      });
      this.containmentBodies.push(body);
    };

    createWall(-halfWidth);
    createWall(halfWidth);
  },

  // Create themed elements for a tier
  createTierElements: function (tierIndex, baseY, baseZ, boardWidth, tierMats, theme) {
    const elements = theme.elements || [];
    const shelfZ = baseZ + 1.5;

    // Create fancy LED strips along the edges
    this.createLEDStrips(tierIndex, baseY, shelfZ, boardWidth, theme);

    // Always create themed wall decorations (enhanced)
    this.createThemedWallDecorations(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);

    // Create multiple floating themed decorations
    this.createFloatingThemedDecorations(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
    this.createSideFloatingDecorations(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);

    // Create standard elements
    for (const element of elements) {
      switch (element) {
        case "spinner":
          this.createSpinner(tierIndex, baseY + 0.5, shelfZ, boardWidth, tierMats, theme);
          break;
        case "sidePushers":
          this.createSidePushers(tierIndex, baseY + 0.3, shelfZ, boardWidth, tierMats, theme);
          break;
        case "bumpers":
          this.createBumpers(tierIndex, baseY + 0.4, shelfZ, boardWidth, tierMats, theme);
          break;
        // Neon Arcade elements
        case "laserGrid":
          this.createLaserGrid(tierIndex, baseY + 0.5, shelfZ, boardWidth, tierMats, theme);
          break;
        case "pinballFlippers":
          this.createPinballFlippers(tierIndex, baseY + 0.3, shelfZ, boardWidth, tierMats, theme);
          break;
        case "arcadeButtons":
          this.createArcadeButtons(tierIndex, baseY + 0.4, shelfZ, boardWidth, tierMats, theme);
          break;
        // Dino Land elements
        case "volcano":
          this.createVolcano(tierIndex, baseY + 0.3, shelfZ, boardWidth, tierMats, theme);
          break;
        case "bouncyEggs":
          this.createBouncyEggs(tierIndex, baseY + 0.4, shelfZ, boardWidth, tierMats, theme);
          break;
        case "dinoTail":
          this.createDinoTail(tierIndex, baseY + 0.3, shelfZ, boardWidth, tierMats, theme);
          break;
        // Alien Invasion elements
        case "wormhole":
          this.createWormhole(tierIndex, baseY + 0.5, shelfZ, boardWidth, tierMats, theme);
          break;
        case "plasmaTurrets":
          this.createPlasmaTurrets(tierIndex, baseY + 0.4, shelfZ, boardWidth, tierMats, theme);
          break;
        case "alienPods":
          this.createAlienPods(tierIndex, baseY + 0.3, shelfZ, boardWidth, tierMats, theme);
          break;
        // Pirate Cove elements
        case "swingingAnchor":
          this.createSwingingAnchor(tierIndex, baseY + 0.5, shelfZ, boardWidth, tierMats, theme);
          break;
        case "treasureChest":
          this.createTreasureChest(tierIndex, baseY + 0.3, shelfZ, boardWidth, tierMats, theme);
          break;
        case "shipWheel":
          this.createShipWheel(tierIndex, baseY + 0.4, shelfZ, boardWidth, tierMats, theme);
          break;
        // Candy Kingdom elements
        case "lollipopSpinners":
          this.createLollipopSpinners(tierIndex, baseY + 0.5, shelfZ, boardWidth, tierMats, theme);
          break;
        case "peppermintWheels":
          this.createPeppermintWheels(tierIndex, baseY + 0.4, shelfZ, boardWidth, tierMats, theme);
          break;
        case "gummyBounce":
          this.createGummyBounce(tierIndex, baseY + 0.3, shelfZ, boardWidth, tierMats, theme);
          break;
        // Space Station elements
        case "asteroidField":
          this.createAsteroidField(tierIndex, baseY + 0.5, shelfZ, boardWidth, tierMats, theme);
          break;
        case "solarPanels":
          this.createSolarPanels(tierIndex, baseY + 0.4, shelfZ, boardWidth, tierMats, theme);
          break;
        case "plasmaConduit":
          this.createPlasmaConduit(tierIndex, baseY + 0.3, shelfZ, boardWidth, tierMats, theme);
          break;
        // Jungle Safari elements
        case "lilyPads":
          this.createLilyPads(tierIndex, baseY + 0.3, shelfZ, boardWidth, tierMats, theme);
          break;
        case "rollingBoulder":
          this.createRollingBoulder(tierIndex, baseY + 0.5, shelfZ, boardWidth, tierMats, theme);
          break;
        case "monkeySwing":
          this.createMonkeySwing(tierIndex, baseY + 0.4, shelfZ, boardWidth, tierMats, theme);
          break;
        // Robot Factory elements
        case "pistons":
          this.createPistons(tierIndex, baseY + 0.3, shelfZ, boardWidth, tierMats, theme);
          break;
        case "laserScanners":
          this.createLaserScanners(tierIndex, baseY + 0.5, shelfZ, boardWidth, tierMats, theme);
          break;
        case "rotatingGears":
          this.createRotatingGears(tierIndex, baseY + 0.4, shelfZ, boardWidth, tierMats, theme);
          break;
      }
    }

    // Create the theme's unique coin mover
    if (theme.coinMover) {
      this.createCoinMover(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
    }
  },

  // Create LED strips along the board edges
  createLEDStrips: function (tierIndex, baseY, shelfZ, boardWidth, theme) {
    const ledCount = Math.floor(boardWidth / 0.6);
    const ledColor1 = theme.ledColor1 || theme.glow;
    const ledColor2 = theme.ledColor2 || theme.accent;
    const y = baseY + 0.2;
    const frontZ = shelfZ + this.shelfDepth / 2 - 0.3;
    const backZ = shelfZ - this.shelfDepth / 2 + 0.3;

    const ledGroup = new THREE.Group();
    ledGroup.userData = { tierIndex, pulseOffset: tierIndex * 0.5 };

    // Front LED strip
    for (let i = 0; i < ledCount; i++) {
      const x = -boardWidth / 2 + 0.3 + (i / ledCount) * (boardWidth - 0.6);
      const color = i % 2 === 0 ? ledColor1 : ledColor2;

      const ledGeom = new THREE.SphereGeometry(0.08, 6, 4);
      const ledMat = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.9,
      });
      const led = new THREE.Mesh(ledGeom, ledMat);
      led.position.set(x, y, frontZ);
      led.userData = { ledIndex: i, baseColor: color };
      ledGroup.add(led);
    }

    // Side LED strips
    for (let side = -1; side <= 1; side += 2) {
      const x = side * (boardWidth / 2 - 0.15);
      for (let i = 0; i < 8; i++) {
        const z = backZ + (i / 8) * (frontZ - backZ);
        const color = i % 2 === 0 ? ledColor1 : ledColor2;

        const ledGeom = new THREE.SphereGeometry(0.08, 6, 4);
        const ledMat = new THREE.MeshPhongMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.8,
          transparent: true,
          opacity: 0.9,
        });
        const led = new THREE.Mesh(ledGeom, ledMat);
        led.position.set(x, y, z);
        led.userData = { ledIndex: i + side * 10, baseColor: color };
        ledGroup.add(led);
      }
    }

    this.scene.add(ledGroup);
    this.ledStrips.push(ledGroup);
    this.decorations.push(ledGroup);
  },

  // Create side floating decorations (additional themed elements)
  createSideFloatingDecorations: function (tierIndex, baseY, shelfZ, boardWidth, tierMats, theme) {
    const floatY = baseY + 2.5;

    for (let side = -1; side <= 1; side += 2) {
      const x = side * (boardWidth / 2 + 0.8);
      const floatGroup = new THREE.Group();
      floatGroup.position.set(x, floatY, shelfZ + 1);

      const glowMat = new THREE.MeshPhongMaterial({
        color: theme.glow,
        emissive: theme.glow,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.85,
      });

      // Create theme-specific side decoration
      switch (theme.name) {
        case "Neon Arcade":
          // Joystick
          const stickBase = new THREE.CylinderGeometry(0.15, 0.2, 0.1, 8);
          const baseMesh = new THREE.Mesh(stickBase, glowMat);
          floatGroup.add(baseMesh);
          const stick = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6);
          const stickMesh = new THREE.Mesh(stick, tierMats.accent);
          stickMesh.position.y = 0.2;
          stickMesh.rotation.z = side * 0.3;
          floatGroup.add(stickMesh);
          const ball = new THREE.SphereGeometry(0.1, 8, 6);
          const ballMesh = new THREE.Mesh(ball, tierMats.glow);
          ballMesh.position.set(side * 0.12, 0.4, 0);
          floatGroup.add(ballMesh);
          break;

        case "Dino Land":
          // Dino footprint
          const footGeom = new THREE.CylinderGeometry(0.2, 0.15, 0.1, 5);
          const foot = new THREE.Mesh(footGeom, glowMat);
          floatGroup.add(foot);
          for (let t = 0; t < 3; t++) {
            const toe = new THREE.SphereGeometry(0.08, 6, 4);
            const toeMesh = new THREE.Mesh(toe, tierMats.accent);
            toeMesh.position.set(Math.sin(t * 1.0 - 1) * 0.15, 0.05, 0.2);
            floatGroup.add(toeMesh);
          }
          break;

        case "Alien Invasion":
          // Alien eye
          const eyeOuter = new THREE.SphereGeometry(0.2, 12, 8);
          const eyeMesh = new THREE.Mesh(eyeOuter, glowMat);
          floatGroup.add(eyeMesh);
          const pupil = new THREE.SphereGeometry(0.1, 8, 6);
          const pupilMat = new THREE.MeshPhongMaterial({ color: 0x000000 });
          const pupilMesh = new THREE.Mesh(pupil, pupilMat);
          pupilMesh.position.z = 0.12;
          floatGroup.add(pupilMesh);
          break;

        case "Pirate Cove":
          // Gold coin stack
          for (let c = 0; c < 3; c++) {
            const coinGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12);
            const coinMat = new THREE.MeshPhongMaterial({
              color: 0xffd700,
              emissive: 0xaa8800,
              emissiveIntensity: 0.4,
            });
            const coin = new THREE.Mesh(coinGeom, coinMat);
            coin.position.y = c * 0.05;
            coin.rotation.x = Math.PI / 2;
            floatGroup.add(coin);
          }
          break;

        case "Candy Kingdom":
          // Wrapped candy
          const wrapper = new THREE.CylinderGeometry(0.1, 0.1, 0.25, 8);
          const wrapMesh = new THREE.Mesh(wrapper, glowMat);
          floatGroup.add(wrapMesh);
          for (let w = -1; w <= 1; w += 2) {
            const twist = new THREE.ConeGeometry(0.12, 0.15, 6);
            const twistMesh = new THREE.Mesh(twist, tierMats.accent);
            twistMesh.position.y = w * 0.18;
            twistMesh.rotation.z = w * Math.PI;
            floatGroup.add(twistMesh);
          }
          break;

        case "Space Station":
          // Satellite
          const satBody = new THREE.BoxGeometry(0.15, 0.15, 0.15);
          const satMesh = new THREE.Mesh(satBody, glowMat);
          floatGroup.add(satMesh);
          for (let p = -1; p <= 1; p += 2) {
            const panel = new THREE.BoxGeometry(0.25, 0.02, 0.15);
            const panelMesh = new THREE.Mesh(panel, tierMats.accent);
            panelMesh.position.x = p * 0.2;
            floatGroup.add(panelMesh);
          }
          break;

        case "Jungle Safari":
          // Banana - use fallback capsule geometry for compatibility
          const bananaGeom = createCapsuleGeometry(0.06, 0.25, 4, 8);
          const bananaMat = new THREE.MeshPhongMaterial({
            color: 0xffeb3b,
            emissive: 0x998800,
            emissiveIntensity: 0.3,
          });
          const banana = new THREE.Mesh(bananaGeom, bananaMat);
          banana.rotation.z = 0.5;
          floatGroup.add(banana);
          break;

        case "Robot Factory":
          // Gear
          const gearGeom = new THREE.TorusGeometry(0.15, 0.04, 6, 8);
          const gearMesh = new THREE.Mesh(gearGeom, glowMat);
          floatGroup.add(gearMesh);
          for (let g = 0; g < 8; g++) {
            const tooth = new THREE.BoxGeometry(0.04, 0.08, 0.04);
            const toothMesh = new THREE.Mesh(tooth, tierMats.accent);
            const angle = (g / 8) * Math.PI * 2;
            toothMesh.position.set(Math.cos(angle) * 0.18, Math.sin(angle) * 0.18, 0);
            floatGroup.add(toothMesh);
          }
          break;

        default:
          const orb = new THREE.SphereGeometry(0.15, 8, 6);
          const orbMesh = new THREE.Mesh(orb, glowMat);
          floatGroup.add(orbMesh);
      }

      floatGroup.userData = { floatOffset: tierIndex + side * 0.5, floatSpeed: 1.2, spin: true };
      this.scene.add(floatGroup);
      this.decorations.push(floatGroup);
    }
  },

  // Create themed coin mover mechanism
  createCoinMover: function (tierIndex, baseY, shelfZ, boardWidth, tierMats, theme) {
    const y = baseY + 0.4;
    const z = shelfZ + 0.5;

    switch (theme.coinMover) {
      case "wavePusher":
        this.createWavePusher(tierIndex, y, z, boardWidth, tierMats, theme);
        break;
      case "stomper":
        this.createStomper(tierIndex, y, z, boardWidth, tierMats, theme);
        break;
      case "tractorBeam":
        this.createTractorBeam(tierIndex, y, z, boardWidth, tierMats, theme);
        break;
      case "cannonPusher":
        this.createCannonPusher(tierIndex, y, z, boardWidth, tierMats, theme);
        break;
      case "gumballRoller":
        this.createGumballRoller(tierIndex, y, z, boardWidth, tierMats, theme);
        break;
      case "gravityWave":
        this.createGravityWave(tierIndex, y, z, boardWidth, tierMats, theme);
        break;
      case "vineSwing":
        this.createVineSwing(tierIndex, y, z, boardWidth, tierMats, theme);
        break;
      case "conveyorBelt":
        this.createConveyorBelt(tierIndex, y, z, boardWidth, tierMats, theme);
        break;
    }
  },

  // Wave Pusher - oscillating neon bar (Neon Arcade)
  createWavePusher: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const barWidth = boardWidth * 0.6;
    const barGroup = new THREE.Group();
    barGroup.position.set(0, y, z);

    // Main bar
    const barGeom = new THREE.BoxGeometry(barWidth, 0.2, 0.4);
    const barMat = new THREE.MeshPhongMaterial({
      color: theme.glow,
      emissive: theme.glow,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9,
    });
    const bar = new THREE.Mesh(barGeom, barMat);
    barGroup.add(bar);

    // Glow effects on ends
    for (let side = -1; side <= 1; side += 2) {
      const endGlow = new THREE.SphereGeometry(0.15, 8, 6);
      const endMesh = new THREE.Mesh(endGlow, tierMats.accent);
      endMesh.position.x = side * barWidth / 2;
      barGroup.add(endMesh);
    }

    const body = this.physics ? this.physics.createBody({
      shape: "box",
      x: 0, y: y, z: z,
      width: barWidth, height: 0.2, depth: 0.4,
      isStatic: true,
      mesh: barGroup,
    }) : null;

    this.coinMovers.push({
      type: "wavePusher",
      mesh: barGroup,
      body: body,
      baseY: y,
      baseZ: z,
      phase: 0,
      speed: 2.0,
      amplitude: 1.2,
      tierIndex: tierIndex,
    });

    this.scene.add(barGroup);
    this.decorations.push(barGroup);
  },

  // Stomper - dino foot that stomps down (Dino Land)
  createStomper: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const footGroup = new THREE.Group();
    footGroup.position.set(0, y + 1.5, z);

    // Foot base
    const footGeom = new THREE.CylinderGeometry(0.8, 0.6, 0.3, 6);
    const footMat = new THREE.MeshPhongMaterial({
      color: theme.accent,
      emissive: theme.glow,
      emissiveIntensity: 0.4,
    });
    const foot = new THREE.Mesh(footGeom, footMat);
    footGroup.add(foot);

    // Toes
    for (let i = 0; i < 3; i++) {
      const toeGeom = new THREE.SphereGeometry(0.25, 8, 6);
      const toe = new THREE.Mesh(toeGeom, footMat);
      const angle = (i - 1) * 0.5;
      toe.position.set(Math.sin(angle) * 0.5, -0.1, Math.cos(angle) * 0.4 + 0.3);
      footGroup.add(toe);
    }

    // Leg
    const legGeom = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 8);
    const leg = new THREE.Mesh(legGeom, tierMats.wall);
    leg.position.y = 0.9;
    footGroup.add(leg);

    const body = this.physics ? this.physics.createBody({
      shape: "cylinder",
      x: 0, y: y + 1.5, z: z,
      radius: 0.8, height: 0.3,
      isStatic: true,
      mesh: footGroup,
    }) : null;

    this.coinMovers.push({
      type: "stomper",
      mesh: footGroup,
      body: body,
      baseY: y + 1.5,
      baseZ: z,
      phase: 0,
      speed: 1.5,
      stompHeight: 1.2,
      tierIndex: tierIndex,
    });

    this.scene.add(footGroup);
    this.decorations.push(footGroup);
  },

  // Tractor Beam - sweeping UFO beam (Alien Invasion)
  createTractorBeam: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const beamGroup = new THREE.Group();
    beamGroup.position.set(0, y + 2, z);

    // UFO
    const ufoGeom = new THREE.SphereGeometry(0.5, 16, 8);
    ufoGeom.scale(1.5, 0.5, 1);
    const ufoMat = new THREE.MeshPhongMaterial({
      color: theme.wall,
      emissive: theme.glow,
      emissiveIntensity: 0.5,
    });
    const ufo = new THREE.Mesh(ufoGeom, ufoMat);
    beamGroup.add(ufo);

    // Dome
    const domeGeom = new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshPhongMaterial({
      color: theme.accent,
      emissive: theme.accent,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.8,
    });
    const dome = new THREE.Mesh(domeGeom, domeMat);
    dome.position.y = 0.15;
    beamGroup.add(dome);

    // Beam
    const beamGeom = new THREE.ConeGeometry(0.8, 2, 12, 1, true);
    const beamMat = new THREE.MeshPhongMaterial({
      color: theme.glow,
      emissive: theme.glow,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeom, beamMat);
    beam.position.y = -1.2;
    beam.rotation.x = Math.PI;
    beamGroup.add(beam);

    const body = this.physics ? this.physics.createBody({
      shape: "box",
      x: 0, y: y, z: z,
      width: 1.5, height: 0.3, depth: 1.5,
      isStatic: true,
      mesh: beamGroup,
    }) : null;

    this.coinMovers.push({
      type: "tractorBeam",
      mesh: beamGroup,
      body: body,
      beam: beam,
      baseY: y + 2,
      baseZ: z,
      baseX: 0,
      phase: 0,
      speed: 1.2,
      sweepWidth: boardWidth * 0.4,
      tierIndex: tierIndex,
    });

    this.scene.add(beamGroup);
    this.decorations.push(beamGroup);
  },

  // Cannon Pusher - cannon that fires blast waves (Pirate Cove)
  createCannonPusher: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const cannonGroup = new THREE.Group();
    cannonGroup.position.set(0, y + 0.5, z - 1);

    // Cannon barrel
    const barrelGeom = new THREE.CylinderGeometry(0.25, 0.35, 1.2, 12);
    const barrelMat = new THREE.MeshPhongMaterial({
      color: 0x444444,
      metalness: 0.8,
      roughness: 0.3,
    });
    const barrel = new THREE.Mesh(barrelGeom, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.5;
    cannonGroup.add(barrel);

    // Cannon base
    const baseGeom = new THREE.BoxGeometry(0.8, 0.4, 0.8);
    const baseMat = new THREE.MeshPhongMaterial({
      color: theme.accent,
      emissive: theme.glow,
      emissiveIntensity: 0.3,
    });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.y = -0.3;
    cannonGroup.add(base);

    // Blast wave (animated)
    const blastGeom = new THREE.RingGeometry(0.3, 0.5, 16);
    const blastMat = new THREE.MeshPhongMaterial({
      color: theme.glow,
      emissive: theme.glow,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const blast = new THREE.Mesh(blastGeom, blastMat);
    blast.position.z = 1.2;
    blast.rotation.x = -Math.PI / 2;
    cannonGroup.add(blast);

    this.coinMovers.push({
      type: "cannonPusher",
      mesh: cannonGroup,
      blast: blast,
      baseY: y + 0.5,
      baseZ: z - 1,
      phase: 0,
      fireRate: 2.5,
      blastPhase: 0,
      tierIndex: tierIndex,
    });

    this.scene.add(cannonGroup);
    this.decorations.push(cannonGroup);
  },

  // Gumball Roller - giant rolling gumball (Candy Kingdom)
  createGumballRoller: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const gumballGroup = new THREE.Group();

    // Giant gumball
    const gumballGeom = new THREE.SphereGeometry(0.6, 16, 12);
    const gumballMat = new THREE.MeshPhongMaterial({
      color: theme.accent,
      emissive: theme.glow,
      emissiveIntensity: 0.5,
      specular: 0xffffff,
      shininess: 100,
    });
    const gumball = new THREE.Mesh(gumballGeom, gumballMat);
    gumballGroup.add(gumball);

    // Swirl pattern
    const swirlGeom = new THREE.TorusGeometry(0.4, 0.08, 4, 12);
    const swirlMat = new THREE.MeshPhongMaterial({
      color: theme.glow,
      emissive: theme.glow,
      emissiveIntensity: 0.7,
    });
    const swirl = new THREE.Mesh(swirlGeom, swirlMat);
    gumballGroup.add(swirl);

    gumballGroup.position.set(-boardWidth / 3, y + 0.6, z);

    const body = this.physics ? this.physics.createBody({
      shape: "cylinder",
      x: -boardWidth / 3, y: y + 0.6, z: z,
      radius: 0.6, height: 0.6,
      isStatic: true,
      mesh: gumballGroup,
    }) : null;

    this.coinMovers.push({
      type: "gumballRoller",
      mesh: gumballGroup,
      body: body,
      baseY: y + 0.6,
      baseZ: z,
      startX: -boardWidth / 3,
      endX: boardWidth / 3,
      phase: 0,
      speed: 1.0,
      rollSpeed: 3.0,
      tierIndex: tierIndex,
    });

    this.scene.add(gumballGroup);
    this.decorations.push(gumballGroup);
  },

  // Gravity Wave - pulsing energy ring (Space Station)
  createGravityWave: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const waveGroup = new THREE.Group();
    waveGroup.position.set(0, y + 0.3, z);

    // Multiple concentric rings
    for (let i = 0; i < 3; i++) {
      const ringGeom = new THREE.TorusGeometry(0.5 + i * 0.4, 0.08, 8, 24);
      const ringMat = new THREE.MeshPhongMaterial({
        color: theme.glow,
        emissive: theme.glow,
        emissiveIntensity: 0.8 - i * 0.2,
        transparent: true,
        opacity: 0.8 - i * 0.2,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.userData = { ringIndex: i };
      waveGroup.add(ring);
    }

    // Center core
    const coreGeom = new THREE.SphereGeometry(0.2, 12, 8);
    const coreMat = new THREE.MeshPhongMaterial({
      color: theme.accent,
      emissive: theme.accent,
      emissiveIntensity: 1.0,
    });
    const core = new THREE.Mesh(coreGeom, coreMat);
    waveGroup.add(core);

    const body = this.physics ? this.physics.createBody({
      shape: "cylinder",
      x: 0, y: y + 0.3, z: z,
      radius: 1.3, height: 0.2,
      isStatic: true,
      mesh: waveGroup,
    }) : null;

    this.coinMovers.push({
      type: "gravityWave",
      mesh: waveGroup,
      body: body,
      baseY: y + 0.3,
      baseZ: z,
      phase: 0,
      pulseSpeed: 2.0,
      tierIndex: tierIndex,
    });

    this.scene.add(waveGroup);
    this.decorations.push(waveGroup);
  },

  // Vine Swing - swinging vine pusher (Jungle Safari)
  createVineSwing: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const vineGroup = new THREE.Group();
    vineGroup.position.set(0, y + 3, z);

    // Vine anchor
    const anchorGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8);
    const anchorMat = new THREE.MeshPhongMaterial({ color: 0x4a3520 });
    const anchor = new THREE.Mesh(anchorGeom, anchorMat);
    vineGroup.add(anchor);

    // Vine rope
    const vineGeom = new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6);
    const vineMat = new THREE.MeshPhongMaterial({
      color: 0x228b22,
      emissive: theme.glow,
      emissiveIntensity: 0.2,
    });
    const vine = new THREE.Mesh(vineGeom, vineMat);
    vine.position.y = -1.4;
    vineGroup.add(vine);

    // Leaves on vine
    for (let i = 0; i < 4; i++) {
      const leafGeom = new THREE.SphereGeometry(0.15, 6, 4);
      leafGeom.scale(1, 0.3, 1.5);
      const leafMat = new THREE.MeshPhongMaterial({
        color: theme.accent,
        emissive: theme.glow,
        emissiveIntensity: 0.4,
      });
      const leaf = new THREE.Mesh(leafGeom, leafMat);
      leaf.position.set((i % 2 === 0 ? 0.15 : -0.15), -0.5 - i * 0.5, 0);
      leaf.rotation.z = (i % 2 === 0 ? 0.5 : -0.5);
      vineGroup.add(leaf);
    }

    // Push pad at bottom
    const padGeom = new THREE.SphereGeometry(0.4, 12, 8);
    const padMat = new THREE.MeshPhongMaterial({
      color: theme.glow,
      emissive: theme.glow,
      emissiveIntensity: 0.6,
    });
    const pad = new THREE.Mesh(padGeom, padMat);
    pad.position.y = -2.7;
    vineGroup.add(pad);

    const body = this.physics ? this.physics.createBody({
      shape: "cylinder",
      x: 0, y: y + 0.3, z: z,
      radius: 0.4, height: 0.4,
      isStatic: true,
      mesh: vineGroup,
    }) : null;

    this.coinMovers.push({
      type: "vineSwing",
      mesh: vineGroup,
      body: body,
      baseY: y + 3,
      baseZ: z,
      phase: 0,
      swingSpeed: 1.8,
      swingAngle: 0.6,
      tierIndex: tierIndex,
    });

    this.scene.add(vineGroup);
    this.decorations.push(vineGroup);
  },

  // Conveyor Belt - moving belt with rollers (Robot Factory)
  createConveyorBelt: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const beltGroup = new THREE.Group();
    beltGroup.position.set(0, y + 0.15, z);

    const beltWidth = boardWidth * 0.5;
    const beltLength = 2;

    // Belt surface
    const beltGeom = new THREE.BoxGeometry(beltWidth, 0.1, beltLength);
    const beltMat = new THREE.MeshPhongMaterial({
      color: 0x333333,
      emissive: theme.glow,
      emissiveIntensity: 0.2,
    });
    const belt = new THREE.Mesh(beltGeom, beltMat);
    beltGroup.add(belt);

    // Belt stripes (animated)
    const stripeCount = 8;
    for (let i = 0; i < stripeCount; i++) {
      const stripeGeom = new THREE.BoxGeometry(beltWidth - 0.1, 0.02, 0.1);
      const stripeMat = new THREE.MeshPhongMaterial({
        color: theme.accent,
        emissive: theme.accent,
        emissiveIntensity: 0.5,
      });
      const stripe = new THREE.Mesh(stripeGeom, stripeMat);
      stripe.position.set(0, 0.06, -beltLength / 2 + (i / stripeCount) * beltLength + 0.1);
      stripe.userData = { stripeIndex: i };
      beltGroup.add(stripe);
    }

    // Side rails
    for (let side = -1; side <= 1; side += 2) {
      const railGeom = new THREE.BoxGeometry(0.1, 0.2, beltLength);
      const railMat = new THREE.MeshPhongMaterial({
        color: theme.wall,
        emissive: theme.glow,
        emissiveIntensity: 0.3,
      });
      const rail = new THREE.Mesh(railGeom, railMat);
      rail.position.x = side * (beltWidth / 2 + 0.05);
      beltGroup.add(rail);
    }

    // Rollers at ends
    for (let end = -1; end <= 1; end += 2) {
      const rollerGeom = new THREE.CylinderGeometry(0.15, 0.15, beltWidth + 0.2, 12);
      const rollerMat = new THREE.MeshPhongMaterial({
        color: theme.accent,
        emissive: theme.glow,
        emissiveIntensity: 0.4,
      });
      const roller = new THREE.Mesh(rollerGeom, rollerMat);
      roller.rotation.z = Math.PI / 2;
      roller.position.z = end * (beltLength / 2 - 0.1);
      roller.userData = { isRoller: true };
      beltGroup.add(roller);
    }

    const body = this.physics ? this.physics.createBody({
      shape: "box",
      x: 0, y: y + 0.15, z: z,
      width: beltWidth, height: 0.1, depth: beltLength,
      isStatic: true,
      mesh: beltGroup,
    }) : null;

    this.coinMovers.push({
      type: "conveyorBelt",
      mesh: beltGroup,
      body: body,
      baseY: y + 0.15,
      baseZ: z,
      beltLength: beltLength,
      phase: 0,
      beltSpeed: 1.5,
      tierIndex: tierIndex,
    });

    this.scene.add(beltGroup);
    this.decorations.push(beltGroup);
  },

  // Add themed point lights to bathe each tier in its own glow
  createThemeLights: function (tierIndex, baseY, baseZ, boardWidth, theme) {
    const spread = boardWidth / 2 + 1.5;
    const y = baseY + 2.8;
    const z = baseZ + 1.2;

    const left = new THREE.PointLight(theme.glow, 0.7, boardWidth + 8, 2);
    left.position.set(-spread, y, z);
    const right = new THREE.PointLight(theme.accent, 0.65, boardWidth + 8, 2);
    right.position.set(spread, y, z);

    const top = new THREE.SpotLight(theme.pusher, 0.45, 15, Math.PI / 4, 0.35, 1);
    top.position.set(0, y + 3, z - 1);
    top.target.position.set(0, baseY, baseZ + 1);
    this.scene.add(top.target);

    this.scene.add(left);
    this.scene.add(right);
    this.scene.add(top);
    this.decorations.push(left, right, top, top.target);
  },

  // Create a spinning disc
  createSpinner: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const spinnerRadius = 1.2;
    const spinnerHeight = 0.15;

    const discGeom = new THREE.CylinderGeometry(spinnerRadius, spinnerRadius, spinnerHeight, 16);
    const discMat = new THREE.MeshPhongMaterial({
      color: theme.accent,
      emissive: theme.glow,
      emissiveIntensity: 0.4,
      specular: 0xffffff,
      shininess: 100,
    });
    const disc = new THREE.Mesh(discGeom, discMat);
    disc.position.set(0, y, z);
    this.scene.add(disc);

    // Spinner arms
    for (let i = 0; i < 4; i++) {
      const armGeom = new THREE.BoxGeometry(0.15, 0.3, spinnerRadius * 0.8);
      const arm = new THREE.Mesh(armGeom, tierMats.pusher);
      arm.position.set(0, 0.2, spinnerRadius * 0.4);
      arm.rotation.y = (i * Math.PI) / 2;
      disc.add(arm);
    }

    // Center hub
    const hubGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.4, 12);
    const hub = new THREE.Mesh(hubGeom, tierMats.wall);
    hub.position.set(0, 0.15, 0);
    disc.add(hub);

    const spinnerBody = this.physics ? this.physics.createBody({
      shape: "cylinder",
      x: 0, y: y, z: z,
      radius: spinnerRadius,
      height: spinnerHeight + 0.3,
      isStatic: true,
      mesh: disc,
    }) : null;

    this.spinners.push({
      mesh: disc,
      body: spinnerBody,
      y: y,
      z: z,
      speed: 1.5 + Math.random() * 0.5,
      direction: Math.random() > 0.5 ? 1 : -1,
      tierIndex: tierIndex,
    });

    this.decorations.push(disc);
  },

  // Create side pushers
  createSidePushers: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      const pusherWidth = 1.5;
      const pusherHeight = 0.5;
      const pusherDepth = 0.8;
      const baseX = side * (boardWidth / 2 - 1);

      const pusherGeom = new THREE.BoxGeometry(pusherWidth, pusherHeight, pusherDepth);
      const pusherMat = new THREE.MeshPhongMaterial({
        color: theme.accent,
        emissive: theme.glow,
        emissiveIntensity: 0.3,
        specular: 0xffffff,
        shininess: 80,
      });
      const pusher = new THREE.Mesh(pusherGeom, pusherMat);
      pusher.position.set(baseX, y, z);
      this.scene.add(pusher);

      const arrowGeom = new THREE.ConeGeometry(0.2, 0.4, 4);
      const arrow = new THREE.Mesh(arrowGeom, tierMats.wall);
      arrow.rotation.z = side * Math.PI / 2;
      arrow.position.set(-side * 0.5, 0.3, 0);
      pusher.add(arrow);

      const pusherBody = this.physics ? this.physics.createBody({
        shape: "box",
        x: baseX, y: y, z: z,
        width: pusherWidth,
        height: pusherHeight,
        depth: pusherDepth,
        isStatic: true,
        mesh: pusher,
      }) : null;

      this.sidePushers.push({
        mesh: pusher,
        body: pusherBody,
        baseX: baseX,
        y: y,
        z: z,
        side: side,
        position: 0,
        direction: side,
        speed: 0.8 + Math.random() * 0.4,
        minOffset: 0,
        maxOffset: 1.5,
        tierIndex: tierIndex,
      });

      this.decorations.push(pusher);
    }
  },

  // Create bouncy bumpers
  createBumpers: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const bumperPositions = [
      { x: -boardWidth / 4, z: z - 0.5 },
      { x: boardWidth / 4, z: z - 0.5 },
      { x: 0, z: z + 1 },
    ];

    for (let i = 0; i < bumperPositions.length; i++) {
      const pos = bumperPositions[i];
      const bumperRadius = 0.4;

      const bumperGeom = new THREE.SphereGeometry(bumperRadius, 16, 12);
      const bumperMat = new THREE.MeshPhongMaterial({
        color: i === 2 ? 0xff0000 : theme.accent,
        emissive: i === 2 ? 0x880000 : theme.glow,
        emissiveIntensity: 0.5,
        specular: 0xffffff,
        shininess: 100,
      });
      const bumper = new THREE.Mesh(bumperGeom, bumperMat);
      bumper.position.set(pos.x, y, pos.z);
      bumper.scale.y = 0.6;
      this.scene.add(bumper);

      const ringGeom = new THREE.TorusGeometry(bumperRadius + 0.1, 0.05, 8, 16);
      const ring = new THREE.Mesh(ringGeom, tierMats.wall);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.1;
      bumper.add(ring);

      if (this.physics) {
        this.physics.createBody({
          shape: "peg",
          x: pos.x, y: y, z: pos.z,
          radius: bumperRadius,
          isStatic: true,
          restitution: 1.2,
          data: { noSync: true, isBumper: true },
        });
      }

      this.bumpers.push({
        mesh: bumper,
        baseScale: 1,
        hitTime: 0,
        tierIndex: tierIndex,
      });

      this.decorations.push(bumper);
    }
  },

  // ================== NEON ARCADE ELEMENTS ==================

  // Laser Grid - sweeping laser beams that deflect coins
  createLaserGrid: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const gridGroup = new THREE.Group();
    gridGroup.position.set(0, y + 1, z - 0.5);

    // Create horizontal laser beams
    const laserMat = new THREE.MeshPhongMaterial({
      color: theme.glow,
      emissive: theme.glow,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.8,
    });

    for (let i = 0; i < 3; i++) {
      const laserGeom = new THREE.CylinderGeometry(0.03, 0.03, boardWidth * 0.6, 8);
      laserGeom.rotateZ(Math.PI / 2);
      const laser = new THREE.Mesh(laserGeom, laserMat.clone());
      laser.position.set(0, -0.3 + i * 0.3, 0);
      laser.userData = { laserIndex: i };
      gridGroup.add(laser);
    }

    // Emitter boxes on sides
    for (let side = -1; side <= 1; side += 2) {
      const emitterGeom = new THREE.BoxGeometry(0.3, 0.8, 0.3);
      const emitter = new THREE.Mesh(emitterGeom, tierMats.accent);
      emitter.position.set(side * boardWidth * 0.35, 0, 0);
      gridGroup.add(emitter);

      // Glow sphere on emitter
      const glowGeom = new THREE.SphereGeometry(0.12, 8, 6);
      const glow = new THREE.Mesh(glowGeom, laserMat);
      glow.position.set(side * boardWidth * 0.35, 0.5, 0);
      gridGroup.add(glow);
    }

    gridGroup.userData = { rotationSpeed: 0.8 };
    this.scene.add(gridGroup);
    this.decorations.push(gridGroup);

    this.laserGrids.push({
      mesh: gridGroup,
      phase: 0,
      speed: 1.5,
      baseY: y + 1,
      tierIndex: tierIndex,
    });
  },

  // Pinball Flippers - rotating flippers that bat coins
  createPinballFlippers: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      const flipperGroup = new THREE.Group();
      const x = side * boardWidth * 0.25;
      flipperGroup.position.set(x, y, z + 1);

      // Flipper paddle
      const paddleGeom = new THREE.BoxGeometry(1.2, 0.25, 0.4);
      const paddleMat = new THREE.MeshPhongMaterial({
        color: theme.pusher,
        emissive: theme.glow,
        emissiveIntensity: 0.4,
        specular: 0xffffff,
        shininess: 100,
      });
      const paddle = new THREE.Mesh(paddleGeom, paddleMat);
      paddle.position.x = side * 0.5;
      flipperGroup.add(paddle);

      // Pivot point decoration
      const pivotGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 12);
      const pivot = new THREE.Mesh(pivotGeom, tierMats.accent);
      pivot.rotation.x = Math.PI / 2;
      flipperGroup.add(pivot);

      // Physics body for collision
      if (this.physics) {
        this.physics.createBody({
          shape: "box",
          x: x + side * 0.5, y: y, z: z + 1,
          width: 1.2,
          height: 0.25,
          depth: 0.4,
          isStatic: true,
          restitution: 1.3,
          data: { noSync: true, isFlipper: true },
        });
      }

      this.scene.add(flipperGroup);
      this.decorations.push(flipperGroup);

      this.pinballFlippers.push({
        mesh: flipperGroup,
        side: side,
        baseX: x,
        y: y,
        z: z + 1,
        phase: side === -1 ? 0 : Math.PI,
        speed: 3.0,
        maxAngle: 0.5,
        tierIndex: tierIndex,
      });
    }
  },

  // Arcade Buttons - bouncy buttons that pop up when hit
  createArcadeButtons: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const buttonColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
    const buttonCount = 4;

    for (let i = 0; i < buttonCount; i++) {
      const buttonGroup = new THREE.Group();
      const x = -boardWidth * 0.3 + (i / (buttonCount - 1)) * boardWidth * 0.6;
      buttonGroup.position.set(x, y, z + 1.5);

      // Button base
      const baseGeom = new THREE.CylinderGeometry(0.35, 0.4, 0.15, 16);
      const baseMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
      const base = new THREE.Mesh(baseGeom, baseMat);
      buttonGroup.add(base);

      // Button top
      const topGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
      const topMat = new THREE.MeshPhongMaterial({
        color: buttonColors[i],
        emissive: buttonColors[i],
        emissiveIntensity: 0.6,
      });
      const top = new THREE.Mesh(topGeom, topMat);
      top.position.y = 0.15;
      top.userData = { buttonTop: true };
      buttonGroup.add(top);

      if (this.physics) {
        this.physics.createBody({
          shape: "peg",
          x: x, y: y + 0.15, z: z + 1.5,
          radius: 0.3,
          isStatic: true,
          restitution: 1.4,
          data: { noSync: true, isButton: true },
        });
      }

      this.scene.add(buttonGroup);
      this.decorations.push(buttonGroup);

      this.arcadeButtons.push({
        mesh: buttonGroup,
        top: top,
        baseY: y,
        hitTime: 0,
        color: buttonColors[i],
        tierIndex: tierIndex,
      });
    }
  },

  // ================== DINO LAND ELEMENTS ==================

  // Volcano - periodically erupts and pushes coins
  createVolcano: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const volcanoGroup = new THREE.Group();
    volcanoGroup.position.set(0, y, z - 1);

    // Volcano cone
    const coneGeom = new THREE.ConeGeometry(1.0, 1.5, 8);
    const coneMat = new THREE.MeshPhongMaterial({
      color: 0x4a3728,
      emissive: 0x220000,
      emissiveIntensity: 0.3,
    });
    const cone = new THREE.Mesh(coneGeom, coneMat);
    cone.position.y = 0.75;
    volcanoGroup.add(cone);

    // Crater opening
    const craterGeom = new THREE.TorusGeometry(0.3, 0.15, 8, 16);
    const craterMat = new THREE.MeshPhongMaterial({
      color: 0xff4400,
      emissive: 0xff2200,
      emissiveIntensity: 0.8,
    });
    const crater = new THREE.Mesh(craterGeom, craterMat);
    crater.rotation.x = Math.PI / 2;
    crater.position.y = 1.5;
    volcanoGroup.add(crater);

    // Lava glow inside
    const lavaGeom = new THREE.SphereGeometry(0.25, 8, 6);
    const lavaMat = new THREE.MeshPhongMaterial({
      color: 0xff6600,
      emissive: 0xff4400,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.9,
    });
    const lava = new THREE.Mesh(lavaGeom, lavaMat);
    lava.position.y = 1.3;
    lava.userData = { isLava: true };
    volcanoGroup.add(lava);

    // Eruption ring (invisible initially)
    const eruptGeom = new THREE.TorusGeometry(0.5, 0.2, 8, 16);
    const eruptMat = new THREE.MeshPhongMaterial({
      color: 0xff8800,
      emissive: 0xff4400,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0,
    });
    const eruptRing = new THREE.Mesh(eruptGeom, eruptMat);
    eruptRing.rotation.x = Math.PI / 2;
    eruptRing.position.y = 1.6;
    eruptRing.userData = { isEruptRing: true };
    volcanoGroup.add(eruptRing);

    this.scene.add(volcanoGroup);
    this.decorations.push(volcanoGroup);

    this.volcanos.push({
      mesh: volcanoGroup,
      lava: lava,
      eruptRing: eruptRing,
      phase: 0,
      eruptTimer: 0,
      eruptInterval: 3.0,
      isErupting: false,
      baseY: y,
      z: z - 1,
      tierIndex: tierIndex,
    });
  },

  // Bouncy Eggs - dino eggs that bounce coins with high restitution
  createBouncyEggs: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const eggPositions = [
      { x: -boardWidth * 0.3, z: z + 0.5 },
      { x: boardWidth * 0.3, z: z + 0.5 },
      { x: 0, z: z + 1.8 },
    ];
    const eggColors = [0xf5deb3, 0x98fb98, 0xadd8e6];

    for (let i = 0; i < eggPositions.length; i++) {
      const eggGroup = new THREE.Group();
      const pos = eggPositions[i];
      eggGroup.position.set(pos.x, y, pos.z);

      // Egg shape (scaled sphere)
      const eggGeom = new THREE.SphereGeometry(0.35, 12, 8);
      const eggMat = new THREE.MeshPhongMaterial({
        color: eggColors[i],
        emissive: eggColors[i],
        emissiveIntensity: 0.2,
        specular: 0xffffff,
        shininess: 60,
      });
      const egg = new THREE.Mesh(eggGeom, eggMat);
      egg.scale.set(1, 1.3, 1);
      eggGroup.add(egg);

      // Spots on egg
      for (let s = 0; s < 4; s++) {
        const spotGeom = new THREE.SphereGeometry(0.08, 6, 4);
        const spotMat = new THREE.MeshPhongMaterial({
          color: theme.accent,
          emissive: theme.glow,
          emissiveIntensity: 0.4,
        });
        const spot = new THREE.Mesh(spotGeom, spotMat);
        const angle = (s / 4) * Math.PI * 2;
        spot.position.set(Math.sin(angle) * 0.25, Math.cos(angle) * 0.3, 0.2);
        eggGroup.add(spot);
      }

      if (this.physics) {
        this.physics.createBody({
          shape: "peg",
          x: pos.x, y: y, z: pos.z,
          radius: 0.35,
          isStatic: true,
          restitution: 1.5,
          data: { noSync: true, isEgg: true },
        });
      }

      this.scene.add(eggGroup);
      this.decorations.push(eggGroup);

      this.bouncyEggs.push({
        mesh: eggGroup,
        wobblePhase: i * 0.5,
        hitTime: 0,
        tierIndex: tierIndex,
      });
    }
  },

  // Dino Tail - swinging tail that sweeps coins
  createDinoTail: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const tailGroup = new THREE.Group();
    tailGroup.position.set(boardWidth * 0.35, y + 0.5, z - 0.5);

    // Tail segments
    const segmentCount = 4;
    for (let i = 0; i < segmentCount; i++) {
      const segRadius = 0.25 - i * 0.04;
      const segGeom = new THREE.SphereGeometry(segRadius, 8, 6);
      const segMat = new THREE.MeshPhongMaterial({
        color: theme.pusher,
        emissive: theme.glow,
        emissiveIntensity: 0.3,
      });
      const segment = new THREE.Mesh(segGeom, segMat);
      segment.position.x = -i * 0.4;
      segment.scale.set(1, 0.8, 1.2);
      tailGroup.add(segment);
    }

    // Tail spikes
    for (let i = 0; i < 3; i++) {
      const spikeGeom = new THREE.ConeGeometry(0.08, 0.3, 4);
      const spike = new THREE.Mesh(spikeGeom, tierMats.accent);
      spike.position.set(-0.4 - i * 0.4, 0.2, 0);
      spike.rotation.z = -Math.PI / 4;
      tailGroup.add(spike);
    }

    this.scene.add(tailGroup);
    this.decorations.push(tailGroup);

    this.dinoTails.push({
      mesh: tailGroup,
      baseX: boardWidth * 0.35,
      y: y + 0.5,
      z: z - 0.5,
      phase: 0,
      speed: 2.0,
      swingAngle: 0.6,
      tierIndex: tierIndex,
    });
  },

  // ================== ALIEN INVASION ELEMENTS ==================

  // Wormhole - spinning portal that deflects coins
  createWormhole: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const wormholeGroup = new THREE.Group();
    wormholeGroup.position.set(0, y + 0.5, z);

    // Outer ring
    const outerGeom = new THREE.TorusGeometry(0.8, 0.12, 16, 32);
    const outerMat = new THREE.MeshPhongMaterial({
      color: theme.glow,
      emissive: theme.glow,
      emissiveIntensity: 0.9,
    });
    const outer = new THREE.Mesh(outerGeom, outerMat);
    outer.rotation.x = Math.PI / 2;
    wormholeGroup.add(outer);

    // Inner swirl rings
    for (let i = 0; i < 3; i++) {
      const ringRadius = 0.6 - i * 0.15;
      const ringGeom = new THREE.TorusGeometry(ringRadius, 0.05, 8, 24);
      const ringMat = new THREE.MeshPhongMaterial({
        color: theme.accent,
        emissive: theme.accent,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.8 - i * 0.2,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.userData = { swirlRing: true, ringIndex: i };
      wormholeGroup.add(ring);
    }

    // Center vortex
    const vortexGeom = new THREE.SphereGeometry(0.2, 16, 12);
    const vortexMat = new THREE.MeshPhongMaterial({
      color: 0x000022,
      emissive: theme.glow,
      emissiveIntensity: 0.5,
    });
    const vortex = new THREE.Mesh(vortexGeom, vortexMat);
    vortex.scale.y = 0.3;
    wormholeGroup.add(vortex);

    if (this.physics) {
      this.physics.createBody({
        shape: "cylinder",
        x: 0, y: y + 0.5, z: z,
        radius: 0.8,
        height: 0.3,
        isStatic: true,
        restitution: 1.2,
        data: { noSync: true, isWormhole: true },
      });
    }

    this.scene.add(wormholeGroup);
    this.decorations.push(wormholeGroup);

    this.wormholes.push({
      mesh: wormholeGroup,
      phase: 0,
      spinSpeed: 3.0,
      pulsePhase: 0,
      tierIndex: tierIndex,
    });
  },

  // Plasma Turrets - rotating turrets that shoot energy blasts
  createPlasmaTurrets: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      const turretGroup = new THREE.Group();
      const x = side * boardWidth * 0.35;
      turretGroup.position.set(x, y + 0.3, z + 1);

      // Turret base
      const baseGeom = new THREE.CylinderGeometry(0.3, 0.35, 0.25, 8);
      const baseMat = new THREE.MeshPhongMaterial({
        color: 0x333344,
        metalness: 0.7,
      });
      const base = new THREE.Mesh(baseGeom, baseMat);
      turretGroup.add(base);

      // Turret dome
      const domeGeom = new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const domeMat = new THREE.MeshPhongMaterial({
        color: theme.accent,
        emissive: theme.glow,
        emissiveIntensity: 0.5,
      });
      const dome = new THREE.Mesh(domeGeom, domeMat);
      dome.position.y = 0.1;
      turretGroup.add(dome);

      // Barrel
      const barrelGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8);
      const barrel = new THREE.Mesh(barrelGeom, tierMats.wall);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.15, 0.3);
      barrel.userData = { isBarrel: true };
      turretGroup.add(barrel);

      // Plasma ball (projectile visualization)
      const plasmaGeom = new THREE.SphereGeometry(0.1, 8, 6);
      const plasmaMat = new THREE.MeshPhongMaterial({
        color: theme.glow,
        emissive: theme.glow,
        emissiveIntensity: 1.0,
        transparent: true,
        opacity: 0,
      });
      const plasma = new THREE.Mesh(plasmaGeom, plasmaMat);
      plasma.position.z = 0.5;
      plasma.userData = { isPlasma: true };
      turretGroup.add(plasma);

      if (this.physics) {
        this.physics.createBody({
          shape: "peg",
          x: x, y: y + 0.3, z: z + 1,
          radius: 0.35,
          isStatic: true,
          restitution: 1.1,
          data: { noSync: true, isTurret: true },
        });
      }

      this.scene.add(turretGroup);
      this.decorations.push(turretGroup);

      this.plasmaTurrets.push({
        mesh: turretGroup,
        plasma: plasma,
        side: side,
        phase: side === -1 ? 0 : Math.PI,
        rotateSpeed: 1.5,
        fireTimer: 0,
        fireInterval: 2.0,
        tierIndex: tierIndex,
      });
    }
  },

  // Alien Pods - pulsing pods that bounce coins
  createAlienPods: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const podPositions = [
      { x: -boardWidth * 0.2, z: z + 0.8 },
      { x: boardWidth * 0.2, z: z + 0.8 },
    ];

    for (let i = 0; i < podPositions.length; i++) {
      const podGroup = new THREE.Group();
      const pos = podPositions[i];
      podGroup.position.set(pos.x, y, pos.z);

      // Pod body
      const podGeom = new THREE.SphereGeometry(0.4, 16, 12);
      const podMat = new THREE.MeshPhongMaterial({
        color: theme.accent,
        emissive: theme.glow,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.85,
      });
      const pod = new THREE.Mesh(podGeom, podMat);
      pod.scale.y = 0.7;
      podGroup.add(pod);

      // Inner glow
      const innerGeom = new THREE.SphereGeometry(0.25, 12, 8);
      const innerMat = new THREE.MeshPhongMaterial({
        color: theme.glow,
        emissive: theme.glow,
        emissiveIntensity: 1.0,
      });
      const inner = new THREE.Mesh(innerGeom, innerMat);
      inner.scale.y = 0.7;
      inner.userData = { isPodCore: true };
      podGroup.add(inner);

      // Tendrils
      for (let t = 0; t < 4; t++) {
        const tendrilGeom = new THREE.CylinderGeometry(0.03, 0.01, 0.4, 6);
        const tendril = new THREE.Mesh(tendrilGeom, tierMats.wall);
        const angle = (t / 4) * Math.PI * 2;
        tendril.position.set(Math.sin(angle) * 0.35, -0.3, Math.cos(angle) * 0.35);
        tendril.rotation.x = Math.PI / 6;
        tendril.rotation.z = angle;
        podGroup.add(tendril);
      }

      if (this.physics) {
        this.physics.createBody({
          shape: "peg",
          x: pos.x, y: y, z: pos.z,
          radius: 0.4,
          isStatic: true,
          restitution: 1.3,
          data: { noSync: true, isPod: true },
        });
      }

      this.scene.add(podGroup);
      this.decorations.push(podGroup);

      this.alienPods.push({
        mesh: podGroup,
        inner: inner,
        pulsePhase: i * Math.PI,
        tierIndex: tierIndex,
      });
    }
  },

  // ================== PIRATE COVE ELEMENTS ==================

  // Swinging Anchor - pendulum anchor that pushes coins
  createSwingingAnchor: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const anchorGroup = new THREE.Group();
    anchorGroup.position.set(0, y + 2.5, z);

    // Chain
    const chainCount = 6;
    for (let i = 0; i < chainCount; i++) {
      const linkGeom = new THREE.TorusGeometry(0.08, 0.02, 6, 8);
      const linkMat = new THREE.MeshPhongMaterial({ color: 0x888888, metalness: 0.8 });
      const link = new THREE.Mesh(linkGeom, linkMat);
      link.position.y = -i * 0.2;
      link.rotation.x = i % 2 === 0 ? 0 : Math.PI / 2;
      anchorGroup.add(link);
    }

    // Anchor body
    const anchorBody = new THREE.Group();
    anchorBody.position.y = -chainCount * 0.2 - 0.3;

    // Anchor shank
    const shankGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
    const anchorMat = new THREE.MeshPhongMaterial({
      color: 0x444444,
      emissive: theme.glow,
      emissiveIntensity: 0.2,
      metalness: 0.7,
    });
    const shank = new THREE.Mesh(shankGeom, anchorMat);
    anchorBody.add(shank);

    // Anchor crown (top ring)
    const crownGeom = new THREE.TorusGeometry(0.15, 0.04, 8, 16);
    const crown = new THREE.Mesh(crownGeom, anchorMat);
    crown.position.y = 0.35;
    anchorBody.add(crown);

    // Anchor flukes (arms)
    for (let side = -1; side <= 1; side += 2) {
      const armGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6);
      const arm = new THREE.Mesh(armGeom, anchorMat);
      arm.position.set(side * 0.2, -0.2, 0);
      arm.rotation.z = side * 0.5;
      anchorBody.add(arm);

      const flukeGeom = new THREE.ConeGeometry(0.1, 0.2, 4);
      const fluke = new THREE.Mesh(flukeGeom, tierMats.accent);
      fluke.position.set(side * 0.35, -0.35, 0);
      fluke.rotation.z = side * Math.PI / 2;
      anchorBody.add(fluke);
    }

    anchorGroup.add(anchorBody);

    this.scene.add(anchorGroup);
    this.decorations.push(anchorGroup);

    this.swingingAnchors.push({
      mesh: anchorGroup,
      phase: 0,
      speed: 1.8,
      swingAngle: 0.7,
      baseY: y + 2.5,
      z: z,
      tierIndex: tierIndex,
    });
  },

  // Treasure Chest - opens and closes, coins bounce off lid
  createTreasureChest: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const chestGroup = new THREE.Group();
    chestGroup.position.set(-boardWidth * 0.25, y, z + 1.5);

    // Chest body
    const bodyGeom = new THREE.BoxGeometry(0.8, 0.5, 0.5);
    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0x8b4513,
      emissive: 0x331100,
      emissiveIntensity: 0.2,
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.25;
    chestGroup.add(body);

    // Gold trim
    const trimGeom = new THREE.BoxGeometry(0.85, 0.08, 0.55);
    const trimMat = new THREE.MeshPhongMaterial({
      color: 0xffd700,
      emissive: 0xaa8800,
      emissiveIntensity: 0.5,
    });
    const trim = new THREE.Mesh(trimGeom, trimMat);
    trim.position.y = 0.5;
    chestGroup.add(trim);

    // Chest lid (pivots)
    const lidGroup = new THREE.Group();
    lidGroup.position.set(0, 0.55, -0.2);

    const lidGeom = new THREE.BoxGeometry(0.8, 0.15, 0.5);
    const lid = new THREE.Mesh(lidGeom, bodyMat);
    lid.position.set(0, 0.07, 0.1);
    lidGroup.add(lid);

    // Lid curve
    const lidCurveGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.8, 8, 1, false, 0, Math.PI);
    lidCurveGeom.rotateZ(Math.PI / 2);
    const lidCurve = new THREE.Mesh(lidCurveGeom, bodyMat);
    lidCurve.position.set(0, 0.15, 0.1);
    lidGroup.add(lidCurve);

    chestGroup.add(lidGroup);

    // Gold coins inside (visible when open)
    const coinsGeom = new THREE.SphereGeometry(0.15, 8, 6);
    const coinsMat = new THREE.MeshPhongMaterial({
      color: 0xffd700,
      emissive: 0xcc9900,
      emissiveIntensity: 0.6,
    });
    const coins = new THREE.Mesh(coinsGeom, coinsMat);
    coins.position.y = 0.4;
    coins.scale.y = 0.5;
    chestGroup.add(coins);

    if (this.physics) {
      this.physics.createBody({
        shape: "box",
        x: -boardWidth * 0.25, y: y + 0.3, z: z + 1.5,
        width: 0.8,
        height: 0.6,
        depth: 0.5,
        isStatic: true,
        restitution: 1.0,
        data: { noSync: true, isChest: true },
      });
    }

    this.scene.add(chestGroup);
    this.decorations.push(chestGroup);

    this.treasureChests.push({
      mesh: chestGroup,
      lid: lidGroup,
      phase: 0,
      openSpeed: 1.5,
      maxOpen: 1.2,
      tierIndex: tierIndex,
    });
  },

  // Ship Wheel - rotating ship's wheel
  createShipWheel: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(boardWidth * 0.3, y + 0.8, z - 1);

    // Wheel rim
    const rimGeom = new THREE.TorusGeometry(0.6, 0.08, 8, 24);
    const wheelMat = new THREE.MeshPhongMaterial({
      color: 0x8b4513,
      emissive: theme.glow,
      emissiveIntensity: 0.2,
    });
    const rim = new THREE.Mesh(rimGeom, wheelMat);
    wheelGroup.add(rim);

    // Wheel spokes
    const spokeCount = 8;
    for (let i = 0; i < spokeCount; i++) {
      const spokeGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6);
      const spoke = new THREE.Mesh(spokeGeom, wheelMat);
      const angle = (i / spokeCount) * Math.PI * 2;
      spoke.rotation.z = angle;
      wheelGroup.add(spoke);

      // Handle on each spoke
      const handleGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.2, 6);
      const handle = new THREE.Mesh(handleGeom, tierMats.accent);
      handle.position.set(Math.sin(angle) * 0.65, Math.cos(angle) * 0.65, 0.15);
      wheelGroup.add(handle);
    }

    // Center hub
    const hubGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.15, 12);
    const hub = new THREE.Mesh(hubGeom, tierMats.wall);
    hub.rotation.x = Math.PI / 2;
    wheelGroup.add(hub);

    if (this.physics) {
      this.physics.createBody({
        shape: "cylinder",
        x: boardWidth * 0.3, y: y + 0.8, z: z - 1,
        radius: 0.6,
        height: 0.2,
        isStatic: true,
        restitution: 1.1,
        data: { noSync: true, isWheel: true },
      });
    }

    this.scene.add(wheelGroup);
    this.decorations.push(wheelGroup);

    this.shipWheels.push({
      mesh: wheelGroup,
      rotateSpeed: 1.2,
      tierIndex: tierIndex,
    });
  },

  // ================== CANDY KINGDOM ELEMENTS ==================

  // Lollipop Spinners - colorful spinning lollipops
  createLollipopSpinners: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const positions = [
      { x: -boardWidth * 0.25, z: z + 0.5 },
      { x: boardWidth * 0.25, z: z + 0.5 },
    ];
    const colors = [0xff69b4, 0x00ff7f];

    for (let i = 0; i < positions.length; i++) {
      const lolliGroup = new THREE.Group();
      const pos = positions[i];
      lolliGroup.position.set(pos.x, y + 0.5, pos.z);

      // Swirl candy top
      const candyGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 24);
      const candyMat = new THREE.MeshPhongMaterial({
        color: colors[i],
        emissive: colors[i],
        emissiveIntensity: 0.5,
      });
      const candy = new THREE.Mesh(candyGeom, candyMat);
      candy.rotation.x = Math.PI / 2;
      lolliGroup.add(candy);

      // Spiral decoration
      const spiralGeom = new THREE.TorusGeometry(0.25, 0.05, 8, 24, Math.PI * 4);
      const spiralMat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.3,
      });
      const spiral = new THREE.Mesh(spiralGeom, spiralMat);
      spiral.rotation.x = Math.PI / 2;
      lolliGroup.add(spiral);

      // Stick
      const stickGeom = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8);
      const stickMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
      const stick = new THREE.Mesh(stickGeom, stickMat);
      stick.position.y = -0.6;
      lolliGroup.add(stick);

      if (this.physics) {
        this.physics.createBody({
          shape: "cylinder",
          x: pos.x, y: y + 0.5, z: pos.z,
          radius: 0.4,
          height: 0.15,
          isStatic: true,
          restitution: 1.2,
          data: { noSync: true, isLollipop: true },
        });
      }

      this.scene.add(lolliGroup);
      this.decorations.push(lolliGroup);

      this.lollipopSpinners.push({
        mesh: lolliGroup,
        rotateSpeed: 2.0 + i * 0.5,
        direction: i % 2 === 0 ? 1 : -1,
        tierIndex: tierIndex,
      });
    }
  },

  // Peppermint Wheels - red and white spinning wheels
  createPeppermintWheels: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(0, y + 0.6, z - 0.5);

    // Main peppermint disc
    const discGeom = new THREE.CylinderGeometry(0.7, 0.7, 0.12, 32);
    const discMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: 0xff0000,
      emissiveIntensity: 0.3,
    });
    const disc = new THREE.Mesh(discGeom, discMat);
    disc.rotation.x = Math.PI / 2;
    wheelGroup.add(disc);

    // Red stripes
    const stripeCount = 6;
    for (let i = 0; i < stripeCount; i++) {
      const stripeGeom = new THREE.BoxGeometry(0.15, 0.14, 0.65);
      const stripeMat = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0xaa0000,
        emissiveIntensity: 0.4,
      });
      const stripe = new THREE.Mesh(stripeGeom, stripeMat);
      const angle = (i / stripeCount) * Math.PI * 2;
      stripe.position.set(Math.sin(angle) * 0.32, 0, Math.cos(angle) * 0.32);
      stripe.rotation.y = angle;
      wheelGroup.add(stripe);
    }

    if (this.physics) {
      this.physics.createBody({
        shape: "cylinder",
        x: 0, y: y + 0.6, z: z - 0.5,
        radius: 0.7,
        height: 0.12,
        isStatic: true,
        restitution: 1.1,
        data: { noSync: true, isPeppermint: true },
      });
    }

    this.scene.add(wheelGroup);
    this.decorations.push(wheelGroup);

    this.peppermintWheels.push({
      mesh: wheelGroup,
      rotateSpeed: 1.8,
      tierIndex: tierIndex,
    });
  },

  // Gummy Bounce - bouncy gummy bears
  createGummyBounce: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const gummyPositions = [
      { x: -boardWidth * 0.35, z: z + 1.2, color: 0xff0000 },
      { x: 0, z: z + 1.8, color: 0x00ff00 },
      { x: boardWidth * 0.35, z: z + 1.2, color: 0xffff00 },
    ];

    for (let i = 0; i < gummyPositions.length; i++) {
      const gummyGroup = new THREE.Group();
      const pos = gummyPositions[i];
      gummyGroup.position.set(pos.x, y, pos.z);

      const gummyMat = new THREE.MeshPhongMaterial({
        color: pos.color,
        emissive: pos.color,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.85,
      });

      // Gummy body
      const bodyGeom = new THREE.SphereGeometry(0.3, 12, 8);
      const body = new THREE.Mesh(bodyGeom, gummyMat);
      body.scale.set(1, 1.2, 0.8);
      gummyGroup.add(body);

      // Gummy head
      const headGeom = new THREE.SphereGeometry(0.2, 10, 8);
      const head = new THREE.Mesh(headGeom, gummyMat);
      head.position.y = 0.4;
      gummyGroup.add(head);

      // Ears
      for (let e = -1; e <= 1; e += 2) {
        const earGeom = new THREE.SphereGeometry(0.08, 6, 4);
        const ear = new THREE.Mesh(earGeom, gummyMat);
        ear.position.set(e * 0.15, 0.55, 0);
        gummyGroup.add(ear);
      }

      if (this.physics) {
        this.physics.createBody({
          shape: "peg",
          x: pos.x, y: y + 0.2, z: pos.z,
          radius: 0.35,
          isStatic: true,
          restitution: 1.6,
          data: { noSync: true, isGummy: true },
        });
      }

      this.scene.add(gummyGroup);
      this.decorations.push(gummyGroup);

      this.gummyBounces.push({
        mesh: gummyGroup,
        bouncePhase: i * 0.7,
        baseY: y,
        hitTime: 0,
        tierIndex: tierIndex,
      });
    }
  },

  // ================== SPACE STATION ELEMENTS ==================

  // Asteroid Field - floating rocks that deflect coins
  createAsteroidField: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const asteroidCount = 5;
    for (let i = 0; i < asteroidCount; i++) {
      const asteroidGroup = new THREE.Group();
      const x = -boardWidth * 0.35 + (i / (asteroidCount - 1)) * boardWidth * 0.7;
      const offsetZ = (i % 2) * 0.6;
      asteroidGroup.position.set(x, y + 0.4, z + offsetZ);

      // Asteroid rock
      const rockGeom = new THREE.IcosahedronGeometry(0.25 + Math.random() * 0.15, 0);
      const rockMat = new THREE.MeshPhongMaterial({
        color: 0x666666,
        emissive: theme.glow,
        emissiveIntensity: 0.2,
        flatShading: true,
      });
      const rock = new THREE.Mesh(rockGeom, rockMat);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      asteroidGroup.add(rock);

      // Glow ring around asteroid
      const ringGeom = new THREE.TorusGeometry(0.35, 0.03, 8, 16);
      const ringMat = new THREE.MeshPhongMaterial({
        color: theme.accent,
        emissive: theme.accent,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.5,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2;
      asteroidGroup.add(ring);

      if (this.physics) {
        this.physics.createBody({
          shape: "peg",
          x: x, y: y + 0.4, z: z + offsetZ,
          radius: 0.3,
          isStatic: true,
          restitution: 1.2,
          data: { noSync: true, isAsteroid: true },
        });
      }

      this.scene.add(asteroidGroup);
      this.decorations.push(asteroidGroup);

      this.asteroidFields.push({
        mesh: asteroidGroup,
        rock: rock,
        rotateSpeed: 0.5 + Math.random() * 1.0,
        floatPhase: i * 0.8,
        baseY: y + 0.4,
        tierIndex: tierIndex,
      });
    }
  },

  // Solar Panels - tilting panels that redirect coins
  createSolarPanels: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      const panelGroup = new THREE.Group();
      const x = side * boardWidth * 0.3;
      panelGroup.position.set(x, y + 0.5, z + 1);

      // Panel frame
      const frameGeom = new THREE.BoxGeometry(1.0, 0.08, 0.6);
      const frameMat = new THREE.MeshPhongMaterial({
        color: 0x444466,
        metalness: 0.7,
      });
      const frame = new THREE.Mesh(frameGeom, frameMat);
      panelGroup.add(frame);

      // Solar cells
      const cellGeom = new THREE.BoxGeometry(0.9, 0.05, 0.5);
      const cellMat = new THREE.MeshPhongMaterial({
        color: 0x1a1a4e,
        emissive: theme.glow,
        emissiveIntensity: 0.3,
      });
      const cell = new THREE.Mesh(cellGeom, cellMat);
      cell.position.y = 0.02;
      panelGroup.add(cell);

      // Grid lines on panel
      for (let g = 0; g < 3; g++) {
        const lineGeom = new THREE.BoxGeometry(0.02, 0.06, 0.5);
        const line = new THREE.Mesh(lineGeom, frameMat);
        line.position.x = -0.3 + g * 0.3;
        panelGroup.add(line);
      }

      // Support arm
      const armGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6);
      const arm = new THREE.Mesh(armGeom, frameMat);
      arm.position.y = -0.2;
      panelGroup.add(arm);

      panelGroup.rotation.x = side * 0.3;

      if (this.physics) {
        this.physics.createBody({
          shape: "box",
          x: x, y: y + 0.5, z: z + 1,
          width: 1.0,
          height: 0.1,
          depth: 0.6,
          isStatic: true,
          restitution: 0.8,
          data: { noSync: true, isPanel: true },
        });
      }

      this.scene.add(panelGroup);
      this.decorations.push(panelGroup);

      this.solarPanels.push({
        mesh: panelGroup,
        side: side,
        tiltPhase: side === -1 ? 0 : Math.PI,
        tiltSpeed: 1.0,
        maxTilt: 0.4,
        tierIndex: tierIndex,
      });
    }
  },

  // Plasma Conduit - glowing energy tube
  createPlasmaConduit: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const conduitGroup = new THREE.Group();
    conduitGroup.position.set(0, y + 0.3, z - 0.8);

    // Outer tube
    const tubeGeom = new THREE.CylinderGeometry(0.15, 0.15, boardWidth * 0.6, 16, 1, true);
    tubeGeom.rotateZ(Math.PI / 2);
    const tubeMat = new THREE.MeshPhongMaterial({
      color: 0x333344,
      transparent: true,
      opacity: 0.6,
    });
    const tube = new THREE.Mesh(tubeGeom, tubeMat);
    conduitGroup.add(tube);

    // Inner plasma
    const plasmaGeom = new THREE.CylinderGeometry(0.1, 0.1, boardWidth * 0.6, 12);
    plasmaGeom.rotateZ(Math.PI / 2);
    const plasmaMat = new THREE.MeshPhongMaterial({
      color: theme.glow,
      emissive: theme.glow,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.8,
    });
    const plasma = new THREE.Mesh(plasmaGeom, plasmaMat);
    plasma.userData = { isPlasmaCore: true };
    conduitGroup.add(plasma);

    // End caps
    for (let side = -1; side <= 1; side += 2) {
      const capGeom = new THREE.SphereGeometry(0.18, 12, 8);
      const cap = new THREE.Mesh(capGeom, tierMats.accent);
      cap.position.x = side * boardWidth * 0.3;
      conduitGroup.add(cap);
    }

    // Energy rings along conduit
    for (let r = 0; r < 5; r++) {
      const ringGeom = new THREE.TorusGeometry(0.18, 0.03, 8, 16);
      const ringMat = new THREE.MeshPhongMaterial({
        color: theme.accent,
        emissive: theme.accent,
        emissiveIntensity: 0.7,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.x = -boardWidth * 0.25 + (r / 4) * boardWidth * 0.5;
      ring.rotation.y = Math.PI / 2;
      ring.userData = { energyRing: true, ringIndex: r };
      conduitGroup.add(ring);
    }

    if (this.physics) {
      this.physics.createBody({
        shape: "box",
        x: 0, y: y + 0.3, z: z - 0.8,
        width: boardWidth * 0.6,
        height: 0.3,
        depth: 0.3,
        isStatic: true,
        restitution: 1.0,
        data: { noSync: true, isConduit: true },
      });
    }

    this.scene.add(conduitGroup);
    this.decorations.push(conduitGroup);

    this.plasmaConduits.push({
      mesh: conduitGroup,
      plasma: plasma,
      pulsePhase: 0,
      tierIndex: tierIndex,
    });
  },

  // ================== JUNGLE SAFARI ELEMENTS ==================

  // Lily Pads - bouncy floating pads
  createLilyPads: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const padPositions = [
      { x: -boardWidth * 0.3, z: z + 0.8 },
      { x: 0, z: z + 1.5 },
      { x: boardWidth * 0.3, z: z + 0.8 },
    ];

    for (let i = 0; i < padPositions.length; i++) {
      const padGroup = new THREE.Group();
      const pos = padPositions[i];
      padGroup.position.set(pos.x, y, pos.z);

      // Lily pad (flat disc with notch)
      const padGeom = new THREE.CylinderGeometry(0.45, 0.4, 0.08, 16, 1, false, 0.2, Math.PI * 1.8);
      const padMat = new THREE.MeshPhongMaterial({
        color: 0x228b22,
        emissive: theme.glow,
        emissiveIntensity: 0.3,
      });
      const pad = new THREE.Mesh(padGeom, padMat);
      padGroup.add(pad);

      // Pad veins
      for (let v = 0; v < 5; v++) {
        const veinGeom = new THREE.BoxGeometry(0.02, 0.09, 0.35);
        const veinMat = new THREE.MeshPhongMaterial({ color: 0x1a6b1a });
        const vein = new THREE.Mesh(veinGeom, veinMat);
        const angle = (v / 5) * Math.PI * 1.6 + 0.3;
        vein.position.set(Math.sin(angle) * 0.17, 0.01, Math.cos(angle) * 0.17);
        vein.rotation.y = -angle;
        padGroup.add(vein);
      }

      // Flower on one pad
      if (i === 1) {
        const flowerGeom = new THREE.SphereGeometry(0.12, 8, 6);
        const flowerMat = new THREE.MeshPhongMaterial({
          color: 0xff69b4,
          emissive: 0xff1493,
          emissiveIntensity: 0.5,
        });
        const flower = new THREE.Mesh(flowerGeom, flowerMat);
        flower.position.set(0.15, 0.15, 0);
        padGroup.add(flower);
      }

      if (this.physics) {
        this.physics.createBody({
          shape: "cylinder",
          x: pos.x, y: y, z: pos.z,
          radius: 0.45,
          height: 0.1,
          isStatic: true,
          restitution: 1.4,
          data: { noSync: true, isLilyPad: true },
        });
      }

      this.scene.add(padGroup);
      this.decorations.push(padGroup);

      this.lilyPads.push({
        mesh: padGroup,
        bobPhase: i * 0.7,
        baseY: y,
        tierIndex: tierIndex,
      });
    }
  },

  // Rolling Boulder - Indiana Jones style rolling rock
  createRollingBoulder: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const boulderGroup = new THREE.Group();
    boulderGroup.position.set(-boardWidth * 0.35, y + 0.5, z);

    // Boulder rock
    const rockGeom = new THREE.IcosahedronGeometry(0.5, 1);
    const rockMat = new THREE.MeshPhongMaterial({
      color: 0x808080,
      emissive: 0x222222,
      emissiveIntensity: 0.2,
      flatShading: true,
    });
    const rock = new THREE.Mesh(rockGeom, rockMat);
    boulderGroup.add(rock);

    // Moss patches
    for (let m = 0; m < 3; m++) {
      const mossGeom = new THREE.SphereGeometry(0.15, 6, 4);
      const mossMat = new THREE.MeshPhongMaterial({
        color: 0x556b2f,
        emissive: theme.glow,
        emissiveIntensity: 0.2,
      });
      const moss = new THREE.Mesh(mossGeom, mossMat);
      const angle = (m / 3) * Math.PI * 2;
      moss.position.set(Math.sin(angle) * 0.4, Math.cos(angle) * 0.2, 0.3);
      moss.scale.y = 0.5;
      boulderGroup.add(moss);
    }

    this.scene.add(boulderGroup);
    this.decorations.push(boulderGroup);

    this.rollingBoulders.push({
      mesh: boulderGroup,
      startX: -boardWidth * 0.35,
      endX: boardWidth * 0.35,
      phase: 0,
      speed: 1.2,
      y: y + 0.5,
      z: z,
      tierIndex: tierIndex,
    });
  },

  // Monkey Swing - swinging monkey that pushes coins
  createMonkeySwing: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const monkeyGroup = new THREE.Group();
    monkeyGroup.position.set(boardWidth * 0.25, y + 2, z + 0.5);

    // Vine
    const vineGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8);
    const vineMat = new THREE.MeshPhongMaterial({ color: 0x228b22 });
    const vine = new THREE.Mesh(vineGeom, vineMat);
    vine.position.y = -0.5;
    monkeyGroup.add(vine);

    // Leaves on vine
    for (let l = 0; l < 3; l++) {
      const leafGeom = new THREE.SphereGeometry(0.1, 6, 4);
      leafGeom.scale(1, 0.3, 1);
      const leaf = new THREE.Mesh(leafGeom, vineMat);
      leaf.position.set(0.08, -0.2 - l * 0.4, 0);
      leaf.rotation.z = 0.5;
      monkeyGroup.add(leaf);
    }

    // Monkey body
    const monkeyBody = new THREE.Group();
    monkeyBody.position.y = -1.4;

    // Body
    const bodyGeom = new THREE.SphereGeometry(0.25, 10, 8);
    const monkeyMat = new THREE.MeshPhongMaterial({
      color: 0x8b4513,
      emissive: theme.accent,
      emissiveIntensity: 0.2,
    });
    const body = new THREE.Mesh(bodyGeom, monkeyMat);
    body.scale.y = 1.2;
    monkeyBody.add(body);

    // Head
    const headGeom = new THREE.SphereGeometry(0.18, 10, 8);
    const head = new THREE.Mesh(headGeom, monkeyMat);
    head.position.y = 0.35;
    monkeyBody.add(head);

    // Face
    const faceGeom = new THREE.SphereGeometry(0.12, 8, 6);
    const faceMat = new THREE.MeshPhongMaterial({ color: 0xdeb887 });
    const face = new THREE.Mesh(faceGeom, faceMat);
    face.position.set(0, 0.35, 0.1);
    monkeyBody.add(face);

    // Ears
    for (let e = -1; e <= 1; e += 2) {
      const earGeom = new THREE.SphereGeometry(0.08, 6, 4);
      const ear = new THREE.Mesh(earGeom, monkeyMat);
      ear.position.set(e * 0.18, 0.38, 0);
      monkeyBody.add(ear);
    }

    // Tail
    const tailGeom = new THREE.CylinderGeometry(0.03, 0.02, 0.5, 6);
    const tail = new THREE.Mesh(tailGeom, monkeyMat);
    tail.position.set(0, -0.1, -0.2);
    tail.rotation.x = 0.8;
    monkeyBody.add(tail);

    monkeyGroup.add(monkeyBody);

    this.scene.add(monkeyGroup);
    this.decorations.push(monkeyGroup);

    this.monkeySwings.push({
      mesh: monkeyGroup,
      phase: 0,
      speed: 2.2,
      swingAngle: 0.8,
      baseY: y + 2,
      z: z + 0.5,
      tierIndex: tierIndex,
    });
  },

  // ================== ROBOT FACTORY ELEMENTS ==================

  // Pistons - pumping pistons that push coins
  createPistons: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const pistonCount = 3;
    for (let i = 0; i < pistonCount; i++) {
      const pistonGroup = new THREE.Group();
      const x = -boardWidth * 0.3 + (i / (pistonCount - 1)) * boardWidth * 0.6;
      pistonGroup.position.set(x, y, z + 1);

      // Piston housing
      const housingGeom = new THREE.CylinderGeometry(0.25, 0.3, 0.3, 12);
      const housingMat = new THREE.MeshPhongMaterial({
        color: 0x444455,
        metalness: 0.7,
      });
      const housing = new THREE.Mesh(housingGeom, housingMat);
      pistonGroup.add(housing);

      // Piston rod
      const rodGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 10);
      const rodMat = new THREE.MeshPhongMaterial({
        color: theme.accent,
        emissive: theme.glow,
        emissiveIntensity: 0.4,
        metalness: 0.8,
      });
      const rod = new THREE.Mesh(rodGeom, rodMat);
      rod.position.y = 0.5;
      rod.userData = { isPistonRod: true };
      pistonGroup.add(rod);

      // Piston head
      const headGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 12);
      const head = new THREE.Mesh(headGeom, tierMats.wall);
      head.position.y = 0.9;
      head.userData = { isPistonHead: true };
      pistonGroup.add(head);

      if (this.physics) {
        this.physics.createBody({
          shape: "cylinder",
          x: x, y: y + 0.5, z: z + 1,
          radius: 0.2,
          height: 0.8,
          isStatic: true,
          restitution: 1.3,
          data: { noSync: true, isPiston: true },
        });
      }

      this.scene.add(pistonGroup);
      this.decorations.push(pistonGroup);

      this.pistons.push({
        mesh: pistonGroup,
        rod: pistonGroup.children[1],
        head: pistonGroup.children[2],
        phase: i * (Math.PI * 2 / 3),
        speed: 3.0,
        stroke: 0.4,
        baseY: y,
        tierIndex: tierIndex,
      });
    }
  },

  // Laser Scanners - sweeping laser beams
  createLaserScanners: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      const scannerGroup = new THREE.Group();
      const x = side * boardWidth * 0.4;
      scannerGroup.position.set(x, y + 0.8, z - 0.5);

      // Scanner base
      const baseGeom = new THREE.BoxGeometry(0.4, 0.3, 0.4);
      const baseMat = new THREE.MeshPhongMaterial({
        color: 0x333344,
        metalness: 0.6,
      });
      const base = new THREE.Mesh(baseGeom, baseMat);
      scannerGroup.add(base);

      // Scanner head (rotates)
      const headGroup = new THREE.Group();
      headGroup.position.y = 0.2;

      const headGeom = new THREE.BoxGeometry(0.25, 0.2, 0.3);
      const head = new THREE.Mesh(headGeom, tierMats.accent);
      headGroup.add(head);

      // Laser emitter
      const emitterGeom = new THREE.CylinderGeometry(0.05, 0.08, 0.15, 8);
      const emitterMat = new THREE.MeshPhongMaterial({
        color: theme.glow,
        emissive: theme.glow,
        emissiveIntensity: 0.8,
      });
      const emitter = new THREE.Mesh(emitterGeom, emitterMat);
      emitter.rotation.x = Math.PI / 2;
      emitter.position.z = 0.2;
      headGroup.add(emitter);

      // Laser beam
      const beamGeom = new THREE.CylinderGeometry(0.02, 0.02, 2.0, 6);
      const beamMat = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 1.0,
        transparent: true,
        opacity: 0.7,
      });
      const beam = new THREE.Mesh(beamGeom, beamMat);
      beam.rotation.x = Math.PI / 2;
      beam.position.z = 1.2;
      beam.userData = { isLaserBeam: true };
      headGroup.add(beam);

      scannerGroup.add(headGroup);

      this.scene.add(scannerGroup);
      this.decorations.push(scannerGroup);

      this.laserScanners.push({
        mesh: scannerGroup,
        head: headGroup,
        beam: beam,
        side: side,
        phase: side === -1 ? 0 : Math.PI,
        scanSpeed: 2.0,
        scanAngle: 0.6,
        tierIndex: tierIndex,
      });
    }
  },

  // Rotating Gears - interlocking spinning gears
  createRotatingGears: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const gearPositions = [
      { x: -boardWidth * 0.15, z: z + 0.5, size: 0.5, teeth: 10 },
      { x: boardWidth * 0.15, z: z + 0.5, size: 0.4, teeth: 8 },
    ];

    for (let i = 0; i < gearPositions.length; i++) {
      const gearGroup = new THREE.Group();
      const pos = gearPositions[i];
      gearGroup.position.set(pos.x, y + 0.3, pos.z);

      // Gear body
      const gearGeom = new THREE.CylinderGeometry(pos.size, pos.size, 0.15, pos.teeth * 2);
      const gearMat = new THREE.MeshPhongMaterial({
        color: theme.accent,
        emissive: theme.glow,
        emissiveIntensity: 0.3,
        metalness: 0.7,
      });
      const gear = new THREE.Mesh(gearGeom, gearMat);
      gear.rotation.x = Math.PI / 2;
      gearGroup.add(gear);

      // Gear teeth
      for (let t = 0; t < pos.teeth; t++) {
        const toothGeom = new THREE.BoxGeometry(0.08, 0.16, 0.18);
        const tooth = new THREE.Mesh(toothGeom, tierMats.wall);
        const angle = (t / pos.teeth) * Math.PI * 2;
        tooth.position.set(
          Math.sin(angle) * (pos.size + 0.04),
          0,
          Math.cos(angle) * (pos.size + 0.04)
        );
        tooth.rotation.y = -angle;
        gearGroup.add(tooth);
      }

      // Center hub
      const hubGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 8);
      const hub = new THREE.Mesh(hubGeom, tierMats.wall);
      hub.rotation.x = Math.PI / 2;
      gearGroup.add(hub);

      // Hub bolt
      const boltGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.25, 6);
      const boltMat = new THREE.MeshPhongMaterial({ color: 0x888888, metalness: 0.9 });
      const bolt = new THREE.Mesh(boltGeom, boltMat);
      bolt.rotation.x = Math.PI / 2;
      gearGroup.add(bolt);

      if (this.physics) {
        this.physics.createBody({
          shape: "cylinder",
          x: pos.x, y: y + 0.3, z: pos.z,
          radius: pos.size + 0.08,
          height: 0.2,
          isStatic: true,
          restitution: 1.1,
          data: { noSync: true, isGear: true },
        });
      }

      this.scene.add(gearGroup);
      this.decorations.push(gearGroup);

      this.rotatingGears.push({
        mesh: gearGroup,
        rotateSpeed: (i === 0 ? 1.5 : -1.875) * (pos.teeth / 10), // Gears mesh
        tierIndex: tierIndex,
      });
    }
  },

  // Create themed wall decorations (simplified - panels with theme colors)
  createThemedWallDecorations: function (tierIndex, baseY, shelfZ, boardWidth, tierMats, theme) {
    this.createThemedSidePanels(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
  },

  // Create themed side panels
  createThemedSidePanels: function (tierIndex, baseY, shelfZ, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      const panelGroup = new THREE.Group();
      const x = side * (boardWidth / 2 + 0.3);
      panelGroup.position.set(x, baseY + 1.5, shelfZ - 0.5);

      const panelGeom = new THREE.BoxGeometry(0.1, 2, 2);
      const panel = new THREE.Mesh(panelGeom, tierMats.wall);
      panelGroup.add(panel);

      // Glow border
      const borderGeom = new THREE.BoxGeometry(0.12, 2.1, 0.1);
      const border = new THREE.Mesh(borderGeom, tierMats.glow);
      border.position.z = 1;
      panelGroup.add(border);

      panelGroup.userData = { glowPulse: tierIndex + side };
      this.scene.add(panelGroup);
      this.decorations.push(panelGroup);
    }
  },

  // Create floating themed decorations - unique per theme
  createFloatingThemedDecorations: function (tierIndex, baseY, shelfZ, boardWidth, tierMats, theme) {
    const floatY = baseY + 3.5;
    const floatZ = shelfZ + 2;

    const floatGroup = new THREE.Group();
    floatGroup.position.set(0, floatY, floatZ);

    const accentMat = new THREE.MeshPhongMaterial({
      color: theme.accent,
      emissive: theme.glow,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.9,
    });
    const glowMat = new THREE.MeshPhongMaterial({
      color: theme.glow,
      emissive: theme.glow,
      emissiveIntensity: 0.8,
    });

    // Create theme-specific decoration based on theme name
    switch (theme.name) {
      case "Neon Arcade":
        // Arcade cabinet shape
        const cabinet = new THREE.BoxGeometry(0.6, 0.8, 0.3);
        const cabinetMesh = new THREE.Mesh(cabinet, accentMat);
        floatGroup.add(cabinetMesh);
        // Screen
        const screen = new THREE.PlaneGeometry(0.4, 0.35);
        const screenMesh = new THREE.Mesh(screen, glowMat);
        screenMesh.position.set(0, 0.15, 0.16);
        floatGroup.add(screenMesh);
        break;

      case "Dino Land":
        // Dinosaur egg
        const eggGeom = new THREE.SphereGeometry(0.4, 12, 10);
        eggGeom.scale(1, 1.3, 1);
        const egg = new THREE.Mesh(eggGeom, accentMat);
        floatGroup.add(egg);
        // Cracks
        for (let i = 0; i < 3; i++) {
          const crack = new THREE.BoxGeometry(0.05, 0.2, 0.02);
          const crackMesh = new THREE.Mesh(crack, glowMat);
          crackMesh.position.set(Math.sin(i * 2) * 0.3, 0.1, Math.cos(i * 2) * 0.3);
          crackMesh.rotation.z = i * 0.5;
          floatGroup.add(crackMesh);
        }
        break;

      case "Alien Invasion":
        // UFO shape
        const ufoBody = new THREE.SphereGeometry(0.5, 16, 8);
        ufoBody.scale(1, 0.4, 1);
        const ufo = new THREE.Mesh(ufoBody, accentMat);
        floatGroup.add(ufo);
        // Dome
        const dome = new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMesh = new THREE.Mesh(dome, glowMat);
        domeMesh.position.y = 0.1;
        floatGroup.add(domeMesh);
        break;

      case "Pirate Cove":
        // Treasure chest
        const chest = new THREE.BoxGeometry(0.6, 0.4, 0.4);
        const chestMesh = new THREE.Mesh(chest, accentMat);
        floatGroup.add(chestMesh);
        // Lid
        const lid = new THREE.BoxGeometry(0.65, 0.15, 0.45);
        const lidMesh = new THREE.Mesh(lid, tierMats.wall);
        lidMesh.position.y = 0.25;
        lidMesh.rotation.x = -0.3;
        floatGroup.add(lidMesh);
        break;

      case "Candy Kingdom":
        // Lollipop
        const candy = new THREE.SphereGeometry(0.4, 16, 12);
        const candyMesh = new THREE.Mesh(candy, accentMat);
        candyMesh.position.y = 0.3;
        floatGroup.add(candyMesh);
        // Stick
        const stick = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8);
        const stickMesh = new THREE.Mesh(stick, glowMat);
        stickMesh.position.y = -0.2;
        floatGroup.add(stickMesh);
        // Swirl
        const swirl = new THREE.TorusGeometry(0.25, 0.05, 4, 16);
        const swirlMesh = new THREE.Mesh(swirl, glowMat);
        swirlMesh.position.y = 0.3;
        floatGroup.add(swirlMesh);
        break;

      case "Space Station":
        // Planet with ring (the original design fits this theme!)
        const planet = new THREE.SphereGeometry(0.5, 16, 12);
        const planetMesh = new THREE.Mesh(planet, accentMat);
        floatGroup.add(planetMesh);
        const ring = new THREE.TorusGeometry(0.8, 0.05, 8, 24);
        const ringMesh = new THREE.Mesh(ring, glowMat);
        ringMesh.rotation.x = Math.PI / 3;
        floatGroup.add(ringMesh);
        break;

      case "Jungle Safari":
        // Tree/leaf shape
        const trunk = new THREE.CylinderGeometry(0.1, 0.15, 0.5, 8);
        const trunkMesh = new THREE.Mesh(trunk, tierMats.wall);
        trunkMesh.position.y = -0.2;
        floatGroup.add(trunkMesh);
        // Foliage
        const foliage = new THREE.SphereGeometry(0.4, 8, 6);
        const foliageMesh = new THREE.Mesh(foliage, accentMat);
        foliageMesh.position.y = 0.2;
        foliageMesh.scale.y = 0.7;
        floatGroup.add(foliageMesh);
        break;

      case "Robot Factory":
        // Robot head
        const head = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const headMesh = new THREE.Mesh(head, accentMat);
        floatGroup.add(headMesh);
        // Eyes
        for (let side = -1; side <= 1; side += 2) {
          const eye = new THREE.SphereGeometry(0.1, 8, 6);
          const eyeMesh = new THREE.Mesh(eye, glowMat);
          eyeMesh.position.set(side * 0.15, 0.05, 0.26);
          floatGroup.add(eyeMesh);
        }
        // Antenna
        const antenna = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6);
        const antennaMesh = new THREE.Mesh(antenna, glowMat);
        antennaMesh.position.y = 0.4;
        floatGroup.add(antennaMesh);
        break;

      default:
        // Fallback: simple glowing orb
        const orb = new THREE.SphereGeometry(0.4, 12, 10);
        const orbMesh = new THREE.Mesh(orb, accentMat);
        floatGroup.add(orbMesh);
    }

    floatGroup.userData = { floatOffset: tierIndex * 0.7, floatSpeed: 0.8, spin: true };
    this.scene.add(floatGroup);
    this.decorations.push(floatGroup);
  },

  // Create scoring slots
  createScoringSlots: function (baseY, customFrontZ) {
    const boardWidth = this.baseBoardWidth + (this.currentTierCount - 1) * this.tierWidthIncrease;
    const tierPos = this.getTierPosition(this.currentTierCount - 1);
    const frontZ = customFrontZ || (tierPos.z + 1.5 + this.shelfDepth / 2 + 3.5);

    const slotCount = 5;
    const slotWidth = boardWidth / slotCount;
    const slotHeight = 2;

    const slots = [
      { mult: 1, type: "normal" },
      { mult: 2, type: "normal" },
      { mult: 3, type: "bonus" },
      { mult: 2, type: "normal" },
      { mult: 1, type: "normal" },
    ];

    // Back wall
    const slotBackGeom = new THREE.BoxGeometry(boardWidth + 2, slotHeight + 2, 0.3);
    const slotBackMat = new THREE.MeshPhongMaterial({
      color: 0x1a1a2e,
      emissive: 0x0f0f1a,
    });
    const slotBack = new THREE.Mesh(slotBackGeom, slotBackMat);
    slotBack.position.set(0, baseY + slotHeight / 2, frontZ + 2);
    this.scene.add(slotBack);
    this.scoringSlotMeshes.push(slotBack);

    if (this.physics) {
      const backBody = this.physics.createBody({
        shape: "box",
        x: 0, y: baseY + slotHeight / 2, z: frontZ + 2,
        width: boardWidth + 2,
        height: slotHeight + 2,
        depth: 0.3,
        isStatic: true,
      });
      this.scoringSlotBodies.push(backBody);
    }

    // Dividers
    for (let i = 0; i <= slotCount; i++) {
      const x = -boardWidth / 2 + i * slotWidth;

      const divMat = new THREE.MeshPhongMaterial({
        color: 0x7c4dff,
        emissive: 0x5e35b1,
        emissiveIntensity: 0.4,
      });
      const divGeom = new THREE.BoxGeometry(0.1, slotHeight, 2.2);
      const div = new THREE.Mesh(divGeom, divMat);
      div.position.set(x, baseY + slotHeight / 2, frontZ + 1);
      this.scene.add(div);
      this.scoringSlotMeshes.push(div);

      if (this.physics) {
        const divBody = this.physics.createBody({
          shape: "box",
          x: x, y: baseY + slotHeight / 2, z: frontZ + 1,
          width: 0.1,
          height: slotHeight,
          depth: 2.2,
          isStatic: true,
        });
        this.scoringSlotBodies.push(divBody);
      }
    }

    // Slot indicators
    for (let i = 0; i < slotCount; i++) {
      const x = -boardWidth / 2 + slotWidth / 2 + i * slotWidth;
      const slot = slots[i];

      let material = slot.type === "bonus" ? this.materials.slotBonus : this.materials.slotGood;

      const indicatorGeom = new THREE.PlaneGeometry(slotWidth - 0.2, 1.8);
      const indicator = new THREE.Mesh(indicatorGeom, material);
      indicator.position.set(x, baseY + 0.08, frontZ + 1);
      indicator.rotation.x = -Math.PI / 2;
      this.scene.add(indicator);
      this.scoringSlotMeshes.push(indicator);

      this.bonusZones.push({
        x: x,
        y: baseY,
        z: frontZ + 1,
        width: slotWidth - 0.15,
        height: slotHeight,
        depth: 2,
        type: "slot",
        multiplier: slot.mult,
        isBonus: slot.type === "bonus",
        mesh: indicator,
      });
    }

    // Floor
    const floorGeom = new THREE.BoxGeometry(boardWidth + 4, 0.3, 3);
    const floorMat = new THREE.MeshPhongMaterial({ color: 0x1a237e });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.position.set(0, baseY - 0.15, frontZ + 1);
    this.scene.add(floor);
    this.scoringSlotMeshes.push(floor);

    if (this.physics) {
      const floorBody = this.physics.createBody({
        shape: "box",
        x: 0, y: baseY - 0.15, z: frontZ + 1,
        width: boardWidth + 4,
        height: 0.3,
        depth: 3,
        isStatic: true,
      });
      this.scoringSlotBodies.push(floorBody);
    }

    // Side walls
    for (let side = -1; side <= 1; side += 2) {
      const sideWallGeom = new THREE.BoxGeometry(0.3, slotHeight + 1, 3);
      const sideWall = new THREE.Mesh(sideWallGeom, slotBackMat);
      sideWall.position.set(side * (boardWidth / 2 + 1), baseY + slotHeight / 2, frontZ + 1);
      this.scene.add(sideWall);
      this.scoringSlotMeshes.push(sideWall);

      if (this.physics) {
        const sideBody = this.physics.createBody({
          shape: "box",
          x: side * (boardWidth / 2 + 1), y: baseY + slotHeight / 2, z: frontZ + 1,
          width: 0.3,
          height: slotHeight + 1,
          depth: 3,
          isStatic: true,
        });
        this.scoringSlotBodies.push(sideBody);
      }
    }

    this.scoringY = baseY - 1;
  },

  // Spawn starting coins - drop through pachinko zone for fun bouncy start
  spawnStartingCoins: function () {
    const dropZone = this.getDropZone();
    const startingCoins = 30;

    for (let i = 0; i < startingCoins; i++) {
      // Random X position within drop zone
      const x = random(dropZone.minX, dropZone.maxX);
      // Drop from top to go through pachinko pegs
      const y = dropZone.y + random(0, 3); // Stagger heights for spread
      const z = dropZone.z;

      setTimeout(() => {
        if (this.coins) this.coins.spawnCoin(x, y, z, "gold");
      }, i * 80); // Slower stagger for visual effect
    }
  },

  // Update pushers and animations
  update: function (deltaTime) {
    const time = performance.now() * 0.001;

    // Update main pushers
    for (let pusher of this.pushers) {
      this.updatePusher(pusher, deltaTime);
    }

    // Update spinners
    for (let spinner of this.spinners) {
      spinner.mesh.rotation.y += spinner.direction * spinner.speed * deltaTime;
      if (spinner.body) {
        spinner.body.ry = spinner.mesh.rotation.y;
      }
    }

    // Update side pushers
    for (let sidePusher of this.sidePushers) {
      sidePusher.position += sidePusher.direction * sidePusher.speed * deltaTime;

      if (sidePusher.position >= sidePusher.maxOffset) {
        sidePusher.position = sidePusher.maxOffset;
        sidePusher.direction = -sidePusher.side;
      } else if (sidePusher.position <= sidePusher.minOffset) {
        sidePusher.position = sidePusher.minOffset;
        sidePusher.direction = sidePusher.side;
      }

      const newX = sidePusher.baseX - sidePusher.side * sidePusher.position;
      sidePusher.mesh.position.x = newX;
      if (sidePusher.body) sidePusher.body.x = newX;

      if (this.physics) this.physics.wakeRegion(newX, sidePusher.y, sidePusher.z, 2);
    }

    // Animate bumpers
    for (let bumper of this.bumpers) {
      if (bumper.hitTime > 0) {
        bumper.hitTime -= deltaTime;
        const scale = 1 + Math.sin(bumper.hitTime * 20) * 0.2;
        bumper.mesh.scale.set(scale, scale * 0.6, scale);
      } else {
        bumper.mesh.scale.set(1, 0.6, 1);
      }
      bumper.mesh.material.emissiveIntensity = 0.45 + Math.sin(time * 1.5) * 0.1;
    }

    // Animate coin movers
    for (let mover of this.coinMovers) {
      this.updateCoinMover(mover, deltaTime, time);
    }

    // Animate LED strips
    for (let ledGroup of this.ledStrips) {
      if (!ledGroup.userData) continue;
      const offset = ledGroup.userData.pulseOffset || 0;
      ledGroup.children.forEach((led, i) => {
        if (led.material && led.material.emissiveIntensity !== undefined) {
          const pulse = Math.sin(time * 3 + i * 0.3 + offset) * 0.5 + 0.5;
          led.material.emissiveIntensity = 0.4 + pulse * 0.6;
        }
      });
    }

    // Animate decorations
    for (let deco of this.decorations) {
      if (!deco.userData) continue;

      if (deco.userData.floatOffset !== undefined) {
        const speed = deco.userData.floatSpeed || 1.0;
        const floatAmount = Math.sin(time * speed + deco.userData.floatOffset) * 0.08;
        if (!deco.userData.baseY) deco.userData.baseY = deco.position.y;
        deco.position.y = deco.userData.baseY + floatAmount;

        if (deco.userData.spin) {
          deco.rotation.y += deltaTime * 0.5;
        }
      }

      if (deco.userData.rotationSpeed !== undefined) {
        deco.rotation.y += deco.userData.rotationSpeed * deltaTime;
      }

      if (deco.userData.glowPulse !== undefined) {
        deco.children.forEach(child => {
          if (child.material && child.material.emissiveIntensity !== undefined) {
            child.material.emissiveIntensity = 0.5 + Math.sin(time * 1.2 + deco.userData.glowPulse) * 0.2;
          }
        });
      }
    }

    // Animate bonus zones
    for (let i = 0; i < this.bonusZones.length; i++) {
      const zone = this.bonusZones[i];
      if (zone.mesh && zone.mesh.material.emissiveIntensity !== undefined) {
        zone.mesh.material.emissiveIntensity = 0.35 + Math.sin(time * 1.5 + i) * 0.15;
      }
    }

    // Animate pegs
    for (let i = 0; i < this.pegs.length; i++) {
      const peg = this.pegs[i];
      if (peg.baseHue !== undefined) {
        const hue = (peg.baseHue + time * 0.05) % 1;
        peg.mesh.material.color.setHSL(hue, 0.75, 0.55);
        peg.mesh.material.emissive.setHSL(hue, 0.6, 0.25);
      }
      if (peg.isBonus) {
        peg.mesh.material.emissiveIntensity = 0.4 + Math.sin(time * 1.5 + i * 0.3) * 0.15;
      }
    }

    // ================== ANIMATE NEW INTERACTIVE ELEMENTS ==================

    // Animate Laser Grids (Neon Arcade)
    for (let grid of this.laserGrids) {
      grid.phase += deltaTime;
      // Oscillate up/down
      const gridY = grid.baseY + Math.sin(grid.phase * grid.speed) * 0.3;
      grid.mesh.position.y = gridY;
      // Pulse laser brightness
      grid.mesh.children.forEach(child => {
        if (child.material && child.material.emissiveIntensity !== undefined) {
          child.material.emissiveIntensity = 0.7 + Math.sin(time * 5) * 0.3;
        }
      });
      if (this.physics) this.physics.wakeRegion(0, gridY, grid.mesh.position.z, 2);
    }

    // Animate Pinball Flippers (Neon Arcade)
    for (let flipper of this.pinballFlippers) {
      flipper.phase += deltaTime;
      const flipAngle = Math.sin(flipper.phase * flipper.speed) * flipper.maxAngle;
      flipper.mesh.rotation.y = flipper.side * flipAngle;
      if (this.physics) this.physics.wakeRegion(flipper.baseX, flipper.y, flipper.z, 2);
    }

    // Animate Arcade Buttons (Neon Arcade)
    for (let button of this.arcadeButtons) {
      if (button.hitTime > 0) {
        button.hitTime -= deltaTime;
        button.top.position.y = 0.05;
        button.top.material.emissiveIntensity = 1.0;
      } else {
        button.top.position.y = 0.15;
        button.top.material.emissiveIntensity = 0.4 + Math.sin(time * 2) * 0.2;
      }
    }

    // Animate Volcanos (Dino Land)
    for (let volcano of this.volcanos) {
      volcano.eruptTimer += deltaTime;
      // Pulsing lava glow
      volcano.lava.material.emissiveIntensity = 0.7 + Math.sin(time * 3) * 0.3;
      volcano.lava.scale.setScalar(1 + Math.sin(time * 2) * 0.1);

      // Eruption cycle
      if (volcano.eruptTimer >= volcano.eruptInterval) {
        volcano.eruptTimer = 0;
        volcano.isErupting = true;
        volcano.eruptRing.material.opacity = 1;
        volcano.eruptRing.scale.set(1, 1, 1);
        if (this.physics) this.physics.wakeRegion(0, volcano.baseY + 1, volcano.z, 4);
      }

      // Animate eruption ring
      if (volcano.isErupting) {
        volcano.eruptRing.material.opacity -= deltaTime * 1.5;
        const scale = 1 + (1 - volcano.eruptRing.material.opacity) * 3;
        volcano.eruptRing.scale.set(scale, scale, 1);
        if (volcano.eruptRing.material.opacity <= 0) {
          volcano.isErupting = false;
        }
      }
    }

    // Animate Bouncy Eggs (Dino Land)
    for (let egg of this.bouncyEggs) {
      egg.wobblePhase += deltaTime;
      // Gentle wobble
      egg.mesh.rotation.z = Math.sin(egg.wobblePhase * 2) * 0.1;
      egg.mesh.rotation.x = Math.cos(egg.wobblePhase * 1.5) * 0.05;
    }

    // Animate Dino Tails (Dino Land)
    for (let tail of this.dinoTails) {
      tail.phase += deltaTime;
      const swingAngle = Math.sin(tail.phase * tail.speed) * tail.swingAngle;
      tail.mesh.rotation.y = swingAngle;
      if (this.physics) this.physics.wakeRegion(tail.baseX - 0.8, tail.y, tail.z, 2);
    }

    // Animate Wormholes (Alien Invasion)
    for (let wormhole of this.wormholes) {
      wormhole.phase += deltaTime;
      // Spin the whole wormhole
      wormhole.mesh.rotation.y += deltaTime * wormhole.spinSpeed;
      // Animate inner rings at different speeds
      wormhole.mesh.children.forEach(child => {
        if (child.userData && child.userData.swirlRing) {
          child.rotation.z += deltaTime * (2 + child.userData.ringIndex * 0.5);
        }
      });
      // Pulse effect
      wormhole.pulsePhase += deltaTime;
      const pulse = Math.sin(wormhole.pulsePhase * 3) * 0.1;
      wormhole.mesh.scale.setScalar(1 + pulse);
    }

    // Animate Plasma Turrets (Alien Invasion)
    for (let turret of this.plasmaTurrets) {
      turret.phase += deltaTime;
      // Rotate turret head
      turret.mesh.children[3].rotation.y = Math.sin(turret.phase * turret.rotateSpeed) * 0.5;

      // Fire plasma periodically
      turret.fireTimer += deltaTime;
      if (turret.fireTimer >= turret.fireInterval) {
        turret.fireTimer = 0;
        turret.plasma.material.opacity = 1;
        turret.plasma.position.z = 0.5;
        if (this.physics) this.physics.wakeRegion(turret.mesh.position.x, turret.mesh.position.y, turret.mesh.position.z + 1, 2);
      }

      // Animate plasma projectile
      if (turret.plasma.material.opacity > 0) {
        turret.plasma.position.z += deltaTime * 3;
        turret.plasma.material.opacity -= deltaTime * 2;
      }
    }

    // Animate Alien Pods (Alien Invasion)
    for (let pod of this.alienPods) {
      pod.pulsePhase += deltaTime;
      const pulse = Math.sin(pod.pulsePhase * 2);
      pod.mesh.scale.setScalar(1 + pulse * 0.1);
      pod.inner.material.emissiveIntensity = 0.6 + pulse * 0.4;
    }

    // Animate Swinging Anchors (Pirate Cove)
    for (let anchor of this.swingingAnchors) {
      anchor.phase += deltaTime;
      const swingAngle = Math.sin(anchor.phase * anchor.speed) * anchor.swingAngle;
      anchor.mesh.rotation.z = swingAngle;
      // Wake coins at bottom of swing
      const bottomX = Math.sin(swingAngle) * 1.5;
      if (this.physics) this.physics.wakeRegion(bottomX, anchor.baseY - 2, anchor.z, 2);
    }

    // Animate Treasure Chests (Pirate Cove)
    for (let chest of this.treasureChests) {
      chest.phase += deltaTime;
      // Open and close lid
      const openAngle = (Math.sin(chest.phase * chest.openSpeed) + 1) * 0.5 * chest.maxOpen;
      chest.lid.rotation.x = -openAngle;
    }

    // Animate Ship Wheels (Pirate Cove)
    for (let wheel of this.shipWheels) {
      wheel.mesh.rotation.z += deltaTime * wheel.rotateSpeed;
    }

    // Animate Lollipop Spinners (Candy Kingdom)
    for (let lolli of this.lollipopSpinners) {
      lolli.mesh.rotation.y += deltaTime * lolli.rotateSpeed * lolli.direction;
    }

    // Animate Peppermint Wheels (Candy Kingdom)
    for (let wheel of this.peppermintWheels) {
      wheel.mesh.rotation.y += deltaTime * wheel.rotateSpeed;
    }

    // Animate Gummy Bounces (Candy Kingdom)
    for (let gummy of this.gummyBounces) {
      gummy.bouncePhase += deltaTime;
      // Bouncy squish animation
      const squish = Math.sin(gummy.bouncePhase * 3);
      gummy.mesh.scale.y = 1 + squish * 0.1;
      gummy.mesh.scale.x = 1 - squish * 0.05;
      gummy.mesh.position.y = gummy.baseY + Math.abs(squish) * 0.1;
    }

    // Animate Asteroid Fields (Space Station)
    for (let asteroid of this.asteroidFields) {
      asteroid.floatPhase += deltaTime;
      // Tumble rock
      asteroid.rock.rotation.x += deltaTime * asteroid.rotateSpeed;
      asteroid.rock.rotation.y += deltaTime * asteroid.rotateSpeed * 0.7;
      // Float up/down
      asteroid.mesh.position.y = asteroid.baseY + Math.sin(asteroid.floatPhase) * 0.15;
    }

    // Animate Solar Panels (Space Station)
    for (let panel of this.solarPanels) {
      panel.tiltPhase += deltaTime;
      // Tilt back and forth
      const tilt = Math.sin(panel.tiltPhase * panel.tiltSpeed) * panel.maxTilt;
      panel.mesh.rotation.x = panel.side * 0.3 + tilt;
    }

    // Animate Plasma Conduits (Space Station)
    for (let conduit of this.plasmaConduits) {
      conduit.pulsePhase += deltaTime;
      // Pulse plasma brightness
      conduit.plasma.material.emissiveIntensity = 0.6 + Math.sin(conduit.pulsePhase * 4) * 0.4;
      // Animate energy rings
      conduit.mesh.children.forEach(child => {
        if (child.userData && child.userData.energyRing) {
          const ringPulse = Math.sin(conduit.pulsePhase * 3 + child.userData.ringIndex * 0.5);
          child.scale.setScalar(1 + ringPulse * 0.2);
          child.material.emissiveIntensity = 0.5 + ringPulse * 0.3;
        }
      });
    }

    // Animate Lily Pads (Jungle Safari)
    for (let pad of this.lilyPads) {
      pad.bobPhase += deltaTime;
      // Bob up and down
      pad.mesh.position.y = pad.baseY + Math.sin(pad.bobPhase * 1.5) * 0.08;
      // Gentle tilt
      pad.mesh.rotation.x = Math.sin(pad.bobPhase * 1.2) * 0.05;
      pad.mesh.rotation.z = Math.cos(pad.bobPhase * 0.8) * 0.03;
    }

    // Animate Rolling Boulders (Jungle Safari)
    for (let boulder of this.rollingBoulders) {
      boulder.phase += deltaTime;
      // Roll back and forth
      const t = (Math.sin(boulder.phase * boulder.speed) + 1) / 2;
      const newX = boulder.startX + t * (boulder.endX - boulder.startX);
      boulder.mesh.position.x = newX;
      // Roll animation
      boulder.mesh.rotation.z -= deltaTime * boulder.speed * 2;
      if (this.physics) this.physics.wakeRegion(newX, boulder.y, boulder.z, 2);
    }

    // Animate Monkey Swings (Jungle Safari)
    for (let monkey of this.monkeySwings) {
      monkey.phase += deltaTime;
      const swingAngle = Math.sin(monkey.phase * monkey.speed) * monkey.swingAngle;
      monkey.mesh.rotation.z = swingAngle;
      // Wake coins at swing endpoints
      const swingX = Math.sin(swingAngle) * 1.2;
      if (this.physics) this.physics.wakeRegion(monkey.mesh.position.x + swingX, monkey.baseY - 1.5, monkey.z, 2);
    }

    // Animate Pistons (Robot Factory)
    for (let piston of this.pistons) {
      piston.phase += deltaTime;
      // Pump up and down
      const stroke = Math.sin(piston.phase * piston.speed) * piston.stroke;
      piston.rod.position.y = 0.5 + stroke;
      piston.head.position.y = 0.9 + stroke;
      // Wake coins when pushing up
      if (stroke > 0.3 && this.physics) {
        this.physics.wakeRegion(piston.mesh.position.x, piston.baseY + 1, piston.mesh.position.z, 2);
      }
    }

    // Animate Laser Scanners (Robot Factory)
    for (let scanner of this.laserScanners) {
      scanner.phase += deltaTime;
      // Sweep scanner head
      const scanAngle = Math.sin(scanner.phase * scanner.scanSpeed) * scanner.scanAngle;
      scanner.head.rotation.y = scanAngle;
      // Pulse laser beam
      scanner.beam.material.opacity = 0.5 + Math.sin(time * 8) * 0.3;
      scanner.beam.material.emissiveIntensity = 0.7 + Math.sin(time * 8) * 0.3;
    }

    // Animate Rotating Gears (Robot Factory)
    for (let gear of this.rotatingGears) {
      gear.mesh.rotation.y += deltaTime * gear.rotateSpeed;
    }
  },

  // Update single pusher
  updatePusher: function (pusher, deltaTime) {
    const prevZ = pusher.baseZ + pusher.position;

    pusher.position += pusher.direction * pusher.speed * deltaTime;

    if (pusher.position >= pusher.maxZ) {
      pusher.position = pusher.maxZ;
      pusher.direction = -1;
    } else if (pusher.position <= pusher.minZ) {
      pusher.position = pusher.minZ;
      pusher.direction = 1;
    }

    const newZ = pusher.baseZ + pusher.position;
    pusher.mesh.position.z = newZ;
    if (pusher.body) pusher.body.z = newZ;

    const pusherVelocity = (newZ - prevZ) / deltaTime;
    if (this.physics && pusher.body) {
      this.physics.setPusherVelocity(pusher.body.id, pusherVelocity);
    }

    if (this.physics && pusher.body) {
      this.physics.wakeRegion(pusher.body.x, pusher.body.y, newZ, 5);
    }
  },

  // Update coin mover animation
  updateCoinMover: function (mover, deltaTime, time) {
    mover.phase += deltaTime;

    switch (mover.type) {
      case "wavePusher":
        // Oscillate Z position forward and back
        const waveZ = mover.baseZ + Math.sin(mover.phase * mover.speed) * mover.amplitude;
        mover.mesh.position.z = waveZ;
        if (mover.body) mover.body.z = waveZ;
        // Pulse glow
        mover.mesh.children[0].material.emissiveIntensity = 0.6 + Math.sin(time * 4) * 0.3;
        if (this.physics) this.physics.wakeRegion(0, mover.baseY, waveZ, 3);
        break;

      case "stomper":
        // Stomp down periodically
        const stompCycle = mover.phase * mover.speed;
        const stompPhase = stompCycle % (Math.PI * 2);
        let stompY = mover.baseY;
        if (stompPhase < Math.PI * 0.3) {
          // Stomp down fast
          stompY = mover.baseY - (stompPhase / (Math.PI * 0.3)) * mover.stompHeight;
        } else if (stompPhase < Math.PI * 0.5) {
          // Hold down
          stompY = mover.baseY - mover.stompHeight;
          if (this.physics) this.physics.wakeRegion(0, mover.baseY - 1, mover.baseZ, 4);
        } else {
          // Rise back up slowly
          const risePhase = (stompPhase - Math.PI * 0.5) / (Math.PI * 1.5);
          stompY = mover.baseY - mover.stompHeight * (1 - risePhase);
        }
        mover.mesh.position.y = stompY;
        if (mover.body) mover.body.y = stompY;
        break;

      case "tractorBeam":
        // Sweep side to side
        const sweepX = Math.sin(mover.phase * mover.speed) * mover.sweepWidth;
        mover.mesh.position.x = sweepX;
        if (mover.body) mover.body.x = sweepX;
        // Pulse beam
        mover.beam.material.opacity = 0.3 + Math.sin(time * 5) * 0.2;
        mover.beam.scale.set(1 + Math.sin(time * 3) * 0.1, 1, 1 + Math.sin(time * 3) * 0.1);
        if (this.physics) this.physics.wakeRegion(sweepX, mover.baseY - 1, mover.baseZ, 2);
        break;

      case "cannonPusher":
        // Fire periodically
        mover.blastPhase += deltaTime;
        if (mover.blastPhase >= mover.fireRate) {
          mover.blastPhase = 0;
          // Trigger blast animation
          mover.blast.material.opacity = 1;
          mover.blast.scale.set(1, 1, 1);
          if (this.physics) this.physics.wakeRegion(0, mover.baseY, mover.baseZ + 2, 4);
        }
        // Animate blast wave expanding
        if (mover.blast.material.opacity > 0) {
          mover.blast.material.opacity -= deltaTime * 2;
          const blastScale = 1 + (1 - mover.blast.material.opacity) * 3;
          mover.blast.scale.set(blastScale, blastScale, 1);
          mover.blast.position.z = 1.2 + (1 - mover.blast.material.opacity) * 2;
        }
        break;

      case "gumballRoller":
        // Roll back and forth
        const rollT = (Math.sin(mover.phase * mover.speed) + 1) / 2;
        const rollX = mover.startX + rollT * (mover.endX - mover.startX);
        mover.mesh.position.x = rollX;
        if (mover.body) mover.body.x = rollX;
        // Roll animation
        mover.mesh.rotation.z += deltaTime * mover.rollSpeed * (rollT > 0.5 ? 1 : -1);
        if (this.physics) this.physics.wakeRegion(rollX, mover.baseY, mover.baseZ, 2);
        break;

      case "gravityWave":
        // Pulse rings outward
        const pulsePhase = (mover.phase * mover.pulseSpeed) % (Math.PI * 2);
        mover.mesh.children.forEach((child, i) => {
          if (child.userData && child.userData.ringIndex !== undefined) {
            const ringPhase = (pulsePhase + i * 0.5) % (Math.PI * 2);
            const scale = 1 + Math.sin(ringPhase) * 0.3;
            child.scale.set(scale, scale, 1);
            child.material.opacity = 0.4 + Math.sin(ringPhase) * 0.4;
          }
        });
        // Wake coins near center during pulse peak
        if (Math.sin(pulsePhase) > 0.8) {
          if (this.physics) this.physics.wakeRegion(0, mover.baseY, mover.baseZ, 3);
        }
        break;

      case "vineSwing":
        // Swing pendulum motion
        const swingAngle = Math.sin(mover.phase * mover.swingSpeed) * mover.swingAngle;
        mover.mesh.rotation.z = swingAngle;
        // Calculate bottom pad position for physics wake
        const padX = Math.sin(swingAngle) * 2.7;
        const padZ = mover.baseZ + Math.cos(swingAngle) * 0.5;
        if (this.physics) this.physics.wakeRegion(padX, mover.baseY - 2.5, padZ, 2);
        break;

      case "conveyorBelt":
        // Animate belt stripes moving forward
        mover.mesh.children.forEach(child => {
          if (child.userData && child.userData.stripeIndex !== undefined) {
            const stripeOffset = (mover.phase * mover.beltSpeed) % 1;
            const baseZ = -mover.beltLength / 2 + (child.userData.stripeIndex / 8) * mover.beltLength + 0.1;
            child.position.z = baseZ + stripeOffset * (mover.beltLength / 8);
            if (child.position.z > mover.beltLength / 2) {
              child.position.z -= mover.beltLength;
            }
          }
          // Rotate rollers
          if (child.userData && child.userData.isRoller) {
            child.rotation.x += deltaTime * mover.beltSpeed * 2;
          }
        });
        // Wake coins on belt
        if (this.physics) this.physics.wakeRegion(0, mover.baseY, mover.baseZ, 2);
        break;
    }
  },

  // Get drop zone for new coins
  getDropZone: function () {
    return {
      minX: -this.baseBoardWidth / 2 + 1.5,
      maxX: this.baseBoardWidth / 2 - 1.5,
      y: 14,
      z: 0, // Drop directly ON LINE with pegs (at z=0)
    };
  },

  // Expand pyramid with additional tier
  expandPyramid: function () {
    if (this.currentTierCount >= this.maxTiers) {
      if (this.ui) this.ui.showMessage("MAXIMUM PYRAMID!");
      return;
    }

    // Show board selection UI if we have UI reference
    if (this.ui && this.ui.showBoardSelection) {
      this.ui.showBoardSelection(this.usedThemeIndices, (selectedThemeIndex) => {
        this.expandWithTheme(selectedThemeIndex);
      });
    } else {
      // Fallback to sequential themes if no UI
      const themeIndex = this.currentTierCount % this.tierThemes.length;
      this.expandWithTheme(themeIndex);
    }
  },

  // Actually expand with the selected theme
  expandWithTheme: function (themeIndex) {
    this.removeScoringSlots();

    const newTierIndex = this.currentTierCount;
    const tierPos = this.getTierPosition(newTierIndex);
    const normalizedIndex = this.normalizeThemeIndex(themeIndex, newTierIndex);
    const theme = this.tierThemes[normalizedIndex];

    // Debug: Log theme selection
    console.log(`[Board] expandWithTheme called with themeIndex: ${themeIndex}`);
    console.log(`[Board] Theme name: ${theme ? theme.name : 'UNDEFINED!'}`);
    console.log(`[Board] Theme colors - shelf: ${theme ? theme.shelf.toString(16) : 'N/A'}, wall: ${theme ? theme.wall.toString(16) : 'N/A'}`);

    // Track used theme
    if (!this.usedThemeIndices.includes(normalizedIndex)) {
      this.usedThemeIndices.push(normalizedIndex);
    }
    console.log(`[Board] usedThemeIndices now: [${this.usedThemeIndices.join(', ')}]`);

    // Create tier with selected theme
    this.createPusherTierWithTheme(newTierIndex, tierPos.y, tierPos.z, tierPos.width, theme, normalizedIndex);

    // Add background decoration for new theme
    if (this.game && this.game.background) {
      this.game.background.addThemeDecoration(theme);
    }

    this.currentTierCount++;
    if (this.ui) this.ui.updateExpansion(this.currentTierCount);

    if (this.ui) this.ui.showTierUnlock(theme.name + " Unlocked!", theme.icon);

    // Screen shake for tier unlock celebration
    if (this.game && this.game.shake) {
      this.game.shake(1.2, 0.5);
    }

    const newScoringY = this.getScoringY();
    const frontZ = tierPos.z + 1.5 + this.shelfDepth / 2 + 3.5;
    this.createScoringSlots(newScoringY, frontZ);

    this.adjustCamera();

    // Rain coins on new tier
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        const x = random(-tierPos.width / 2 + 1, tierPos.width / 2 - 1);
        const z = tierPos.z + 1.5;
        if (this.coins) this.coins.spawnCoin(x, tierPos.y + 4, z, "gold");
      }, i * 60);
    }

    // Apply theme's powerup focus bonus
    if (this.game && this.game.powerUps && theme.powerupFocus) {
      this.game.powerUps.applyThemeBonus(theme.powerupFocus);
    }

    // Open prize counter after board unlock (tier 2+)
    if (this.currentTierCount >= 2 && this.game && this.game.prizes) {
      setTimeout(() => {
        this.game.prizes.openPrizeCounter(theme, (selectedPrize) => {
          console.log(`[Board] Prize selected: ${selectedPrize.name}`);
        });
      }, 2000); // Wait 2s for tier unlock animation
    }
  },

  // Create tier with specific theme (used by expandWithTheme)
  createPusherTierWithTheme: function (tierIndex, baseY, baseZ, boardWidth, theme, themeIndex) {
    const tierMats = this.createTierMaterialsFromTheme(theme);
    const tierMeshes = [];

    const upperY = baseY + 1.5;
    const lowerY = baseY;
    const upperShelfZ = baseZ - 1;
    const lowerShelfZ = baseZ + 1.5;
    const frontZ = lowerShelfZ + this.shelfDepth / 2;

    // Edge lights
    this.createEdgeLights(tierIndex, boardWidth, lowerY, lowerShelfZ, tierMats, tierMeshes);
    this.createThemeLights(tierIndex, baseY, baseZ, boardWidth, theme);

    // Upper shelf
    const upperShelfGeom = new THREE.BoxGeometry(boardWidth - 1, 0.25, 2.5);
    const upperShelf = new THREE.Mesh(upperShelfGeom, tierMats.shelf);
    upperShelf.position.set(0, upperY, upperShelfZ);
    this.scene.add(upperShelf);
    tierMeshes.push(upperShelf);

    if (this.physics) {
      this.physics.createBody({
        shape: "box",
        x: 0, y: upperY, z: upperShelfZ,
        width: boardWidth - 1,
        height: 0.25,
        depth: 2.5,
        isStatic: true,
      });
    }

    // Upper shelf back wall with glow strip
    // Only create full back wall for the first tier (top tier)
    if (tierIndex === 0) {
        const upperBackGeom = new THREE.BoxGeometry(boardWidth - 1, 1.2, 0.2);
        const upperBack = new THREE.Mesh(upperBackGeom, tierMats.wall);
        upperBack.position.set(0, upperY + 0.7, upperShelfZ - 1.3);
        this.scene.add(upperBack);
        tierMeshes.push(upperBack);

        const glowStripGeom = new THREE.BoxGeometry(boardWidth - 1.5, 0.15, 0.1);
        const glowStrip = new THREE.Mesh(glowStripGeom, tierMats.glow);
        glowStrip.position.set(0, upperY + 1.2, upperShelfZ - 1.2);
        this.scene.add(glowStrip);
        tierMeshes.push(glowStrip);

        if (this.physics) {
            this.physics.createBody({
            shape: "box",
            x: 0, y: upperY + 0.7, z: upperShelfZ - 1.3,
            width: boardWidth - 1,
            height: 1.2,
            depth: 0.2,
            isStatic: true,
            });
        }
    }

    // Pusher
    const pusherWidth = boardWidth - 2;
    const pusherHeight = 0.7;
    const pusherDepth = 1.6;

    const pusherGeom = new THREE.BoxGeometry(pusherWidth, pusherHeight, pusherDepth);
    const pusherMesh = new THREE.Mesh(pusherGeom, tierMats.pusher);
    const pusherY = upperY + 0.12 + pusherHeight / 2;
    const pusherBaseZ = upperShelfZ - 0.3;
    pusherMesh.position.set(0, pusherY, pusherBaseZ);
    this.scene.add(pusherMesh);
    tierMeshes.push(pusherMesh);

    const pusherBody = this.physics ? this.physics.createBody({
      shape: "box",
      x: 0, y: pusherY, z: pusherBaseZ,
      width: pusherWidth,
      height: pusherHeight,
      depth: pusherDepth,
      isStatic: true,
      mesh: pusherMesh,
    }) : null;

    this.pushers.push({
      mesh: pusherMesh,
      body: pusherBody,
      baseY: pusherY,
      baseZ: pusherBaseZ,
      position: 0,
      direction: 1,
      speed: 1.6 + tierIndex * 0.15, // Faster upper pusher
      minZ: -1.2,
      maxZ: 1.8, // Extended range to push coins off upper shelf
      tierIndex: tierIndex,
      theme: theme,
    });

    // Lower shelf
    const lowerShelfGeom = new THREE.BoxGeometry(boardWidth, 0.25, this.shelfDepth);
    const lowerShelf = new THREE.Mesh(lowerShelfGeom, tierMats.shelf);
    lowerShelf.position.set(0, lowerY, lowerShelfZ);
    this.scene.add(lowerShelf);
    tierMeshes.push(lowerShelf);

    if (this.physics) {
      this.physics.createBody({
        shape: "box",
        x: 0, y: lowerY, z: lowerShelfZ,
        width: boardWidth,
        height: 0.25,
        depth: this.shelfDepth,
        isStatic: true,
      });
    }

    // Lower shelf back wall
    const lowerBackGeom = new THREE.BoxGeometry(boardWidth, 1, 0.2);
    const lowerBack = new THREE.Mesh(lowerBackGeom, tierMats.wall);
    lowerBack.position.set(0, lowerY + 0.6, lowerShelfZ - this.shelfDepth / 2);
    this.scene.add(lowerBack);
    tierMeshes.push(lowerBack);

    if (this.physics) {
      this.physics.createBody({
        shape: "box",
        x: 0, y: lowerY + 0.6, z: lowerShelfZ - this.shelfDepth / 2,
        width: boardWidth,
        height: 1,
        depth: 0.2,
        isStatic: true,
      });
    }

    // Lower shelf pusher - pushes coins from lower shelf to front edge
    const lowerPusherWidth = boardWidth - 1;
    const lowerPusherHeight = 0.6;
    const lowerPusherDepth = 1.4;

    const lowerPusherGeom = new THREE.BoxGeometry(lowerPusherWidth, lowerPusherHeight, lowerPusherDepth);
    const lowerPusherMesh = new THREE.Mesh(lowerPusherGeom, tierMats.pusher);
    const lowerPusherY = lowerY + 0.12 + lowerPusherHeight / 2;
    const lowerPusherBaseZ = lowerShelfZ - this.shelfDepth / 2 + 0.8;
    lowerPusherMesh.position.set(0, lowerPusherY, lowerPusherBaseZ);
    this.scene.add(lowerPusherMesh);
    tierMeshes.push(lowerPusherMesh);

    const lowerPusherBody = this.physics ? this.physics.createBody({
      shape: "box",
      x: 0, y: lowerPusherY, z: lowerPusherBaseZ,
      width: lowerPusherWidth,
      height: lowerPusherHeight,
      depth: lowerPusherDepth,
      isStatic: true,
      mesh: lowerPusherMesh,
    }) : null;

    this.pushers.push({
      mesh: lowerPusherMesh,
      body: lowerPusherBody,
      baseY: lowerPusherY,
      baseZ: lowerPusherBaseZ,
      position: 0,
      direction: 1,
      speed: 1.5 + tierIndex * 0.1, // Faster pushing
      minZ: -0.5,
      maxZ: 4.8, // Extended to push coins past front edge
      tierIndex: tierIndex,
      theme: theme,
      isLowerPusher: true,
    });

    // Front lip - very low to allow coins to roll over easily
    const lipGeom = new THREE.BoxGeometry(boardWidth, 0.05, 0.1);
    const lip = new THREE.Mesh(lipGeom, tierMats.accent);
    lip.position.set(0, lowerY + 0.08, frontZ);
    this.scene.add(lip);
    tierMeshes.push(lip);

    if (this.physics) {
      this.physics.createBody({
        shape: "box",
        x: 0, y: lowerY + 0.08, z: frontZ,
        width: boardWidth,
        height: 0.05,
        depth: 0.1,
        isStatic: true,
      });
    }

    // Side walls
    for (let side = -1; side <= 1; side += 2) {
      const x = side * (boardWidth / 2 + 0.1);
      const sideWallGeom = new THREE.BoxGeometry(0.2, 2.2, this.shelfDepth + 3);
      const sideWall = new THREE.Mesh(sideWallGeom, tierMats.wall);
      sideWall.position.set(x, lowerY + 1, baseZ + 0.5);
      this.scene.add(sideWall);
      tierMeshes.push(sideWall);

      const sideGlowGeom = new THREE.BoxGeometry(0.08, 0.15, this.shelfDepth + 2);
      const sideGlow = new THREE.Mesh(sideGlowGeom, tierMats.glow);
      sideGlow.position.set(x * 0.95, lowerY + 2, baseZ + 0.5);
      this.scene.add(sideGlow);
      tierMeshes.push(sideGlow);

      if (this.physics) {
        this.physics.createBody({
          shape: "box",
          x: x, y: lowerY + 1, z: baseZ + 0.5,
          width: 0.2,
          height: 2.2,
          depth: this.shelfDepth + 3,
          isStatic: true,
        });
      }
    }

    // Ramp to next tier
    this.createTierRamp(tierIndex, boardWidth, lowerY, frontZ, tierMats, tierMeshes);

    // Store tier info
    this.tiers.push({
      tierIndex: tierIndex,
      meshes: tierMeshes,
      baseY: baseY,
      baseZ: baseZ,
      width: boardWidth,
      frontZ: frontZ,
      lowerShelfZ: lowerShelfZ,
      theme: theme,
      themeIndex: themeIndex,
    });

    // Bonus zones with theme-specific bonus target
    this.createShelfBonusZonesWithTheme(tierIndex, lowerY, lowerShelfZ, boardWidth, tierMats, theme);

    // Themed elements
    this.createTierElements(tierIndex, baseY, baseZ, boardWidth, tierMats, theme);
  },

  // Create themed materials from theme object
  createTierMaterialsFromTheme: function (theme) {
    // Generate textures if defined
    let shelfTexture = null;
    let wallTexture = null;
    
    if (theme.textureType) {
        // Shelf texture
        shelfTexture = TextureGenerator.createTexture(theme.textureType, {
            color1: theme.shelf,
            color2: theme.wall, // Use wall color as secondary for contrast
            color3: theme.accent
        });
        
        // Wall texture
        wallTexture = TextureGenerator.createTexture(theme.textureType, {
            color1: theme.wall,
            color2: theme.shelf, // Invert or use shelf/accent
            color3: theme.accent
        });
        
        if (theme.textureScale) {
            const s = theme.textureScale / 2;
            shelfTexture.repeat.set(s, s);
            wallTexture.repeat.set(s, s);
        }
    }

    return {
      shelf: new THREE.MeshPhongMaterial({
        color: shelfTexture ? 0xffffff : theme.shelf,
        map: shelfTexture,
      }),
      wall: new THREE.MeshPhongMaterial({
        color: wallTexture ? 0xffffff : theme.wall,
        map: wallTexture,
        emissive: theme.glow,
        emissiveIntensity: theme.ambientGlow || 0.25,
      }),
      pusher: new THREE.MeshPhongMaterial({
        color: theme.pusher,
        emissive: theme.pusher,
        emissiveIntensity: 0.25,
      }),
      accent: new THREE.MeshPhongMaterial({
        color: theme.accent,
        emissive: theme.accent,
        emissiveIntensity: 0.55,
        transparent: true,
        opacity: 0.9,
      }),
      glow: new THREE.MeshPhongMaterial({
        color: theme.glow,
        emissive: theme.glow,
        emissiveIntensity: 0.75,
        transparent: true,
        opacity: 0.8,
      }),
    };
  },

  // Create bonus zones with theme-specific bonus target
  createShelfBonusZonesWithTheme: function (tierIndex, lowerY, lowerShelfZ, boardWidth, tierMats, theme) {
    // Standard bonus spots on left and right
    this.createBonusSpot(-boardWidth / 3, lowerY + 0.15, lowerShelfZ, tierMats, "queue");
    this.createBonusSpot(boardWidth / 3, lowerY + 0.15, lowerShelfZ, tierMats, "multiplier");

    // Theme-specific bonus target in center - gives theme's focused powerup
    this.createThemeBonusTarget(0, lowerY + 0.15, lowerShelfZ + 0.5, tierMats, theme);
  },

  // Create theme-specific bonus target
  createThemeBonusTarget: function (x, y, z, tierMats, theme) {
    const targetRadius = 0.8;

    // Outer ring
    const ringGeom = new THREE.TorusGeometry(targetRadius, 0.1, 8, 24);
    const ringMat = new THREE.MeshPhongMaterial({
      color: theme.particleColor || theme.glow,
      emissive: theme.particleColor || theme.glow,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.9,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.set(x, y + 0.05, z);
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);

    // Inner target
    const targetGeom = new THREE.CircleGeometry(targetRadius * 0.6, 16);
    const targetMat = new THREE.MeshPhongMaterial({
      color: theme.accent,
      emissive: theme.accent,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8,
    });
    const target = new THREE.Mesh(targetGeom, targetMat);
    target.position.set(x, y + 0.02, z);
    target.rotation.x = -Math.PI / 2;
    this.scene.add(target);

    this.bonusZones.push({
      x: x,
      y: y,
      z: z,
      radius: targetRadius,
      depth: 1,
      type: "themeBonus",
      powerupType: theme.powerupFocus,
      mesh: target,
      ring: ring,
      theme: theme,
    });

    this.decorations.push(ring);
  },

  // Remove scoring slots for rebuilding
  removeScoringSlots: function () {
    for (let i = this.bonusZones.length - 1; i >= 0; i--) {
      const zone = this.bonusZones[i];
      if (zone.type === "slot") {
        this.bonusZones.splice(i, 1);
      }
    }

    for (const mesh of this.scoringSlotMeshes) {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    }
    this.scoringSlotMeshes = [];

    for (const body of this.scoringSlotBodies) {
      if (this.physics) this.physics.removeBody(body);
    }
    this.scoringSlotBodies = [];
  },

  // Adjust camera for growing pyramid
  adjustCamera: function () {
    if (this.game && this.game.camera) {
      const camera = this.game.camera;
      const tierCount = this.currentTierCount;

      const bottomY = (tierCount - 1) * this.tierOffsetY;
      const frontZ = (tierCount - 1) * this.tierOffsetZ + this.shelfDepth;

      const aspect = window.innerWidth / window.innerHeight;
      const isMobile = aspect < 1;

      // Pull camera back more to ensure entire board stays visible
      const mobileOffset = isMobile ? 1.5 : 1;
      const targetY = 14 + (tierCount - 1) * 2.5 * mobileOffset;
      const targetZ = 24 + (tierCount - 1) * 6 * mobileOffset;

      // Center the view better on the board
      const lookY = bottomY / 2 + 2;
      const lookZ = frontZ / 2;

      const startY = camera.position.y;
      const startZ = camera.position.z;
      const duration = 1500;
      const startTime = performance.now();

      const animateCamera = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        camera.position.y = startY + (targetY - startY) * easeT;
        camera.position.z = startZ + (targetZ - startZ) * easeT;
        camera.lookAt(0, lookY, lookZ);

        if (t < 1) {
          requestAnimationFrame(animateCamera);
        }
      };
      animateCamera();
    }
  },

  // Cleanup all board elements
  cleanup: function () {
    for (const peg of this.pegs) {
      this.scene.remove(peg.mesh);
    }
    for (const pusher of this.pushers) {
      this.scene.remove(pusher.mesh);
    }
    for (const zone of this.bonusZones) {
      if (zone.mesh) this.scene.remove(zone.mesh);
      if (zone.innerMesh) this.scene.remove(zone.innerMesh);
    }
    for (const tier of this.tiers) {
      if (tier.meshes) {
        for (const mesh of tier.meshes) {
          this.scene.remove(mesh);
        }
      } else if (tier.isMesh) {
        this.scene.remove(tier);
      }
    }
    for (const spinner of this.spinners) {
      this.scene.remove(spinner.mesh);
    }
    for (const sidePusher of this.sidePushers) {
      this.scene.remove(sidePusher.mesh);
    }
    for (const bumper of this.bumpers) {
      this.scene.remove(bumper.mesh);
    }
    for (const deco of this.decorations) {
      this.scene.remove(deco);
    }
    for (const mesh of this.scoringSlotMeshes) {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    }
    for (const body of this.scoringSlotBodies) {
      if (this.physics) this.physics.removeBody(body);
    }
    for (const body of this.containmentBodies) {
      if (this.physics) this.physics.removeBody(body);
    }

    this.pegs = [];
    this.pushers = [];
    this.bonusZones = [];
    this.tiers = [];
    this.spinners = [];
    this.sidePushers = [];
    this.bumpers = [];
    this.decorations = [];
    this.scoringSlotMeshes = [];
    this.scoringSlotBodies = [];
    this.containmentBodies = [];
    this.currentTierCount = 1;
    this.usedThemeIndices = [0]; // Reset on cleanup too

    // Clear new interactive element arrays
    this.laserGrids = [];
    this.pinballFlippers = [];
    this.arcadeButtons = [];
    this.volcanos = [];
    this.bouncyEggs = [];
    this.dinoTails = [];
    this.wormholes = [];
    this.plasmaTurrets = [];
    this.alienPods = [];
    this.swingingAnchors = [];
    this.treasureChests = [];
    this.shipWheels = [];
    this.lollipopSpinners = [];
    this.peppermintWheels = [];
    this.gummyBounces = [];
    this.asteroidFields = [];
    this.solarPanels = [];
    this.plasmaConduits = [];
    this.lilyPads = [];
    this.rollingBoulders = [];
    this.monkeySwings = [];
    this.pistons = [];
    this.laserScanners = [];
    this.rotatingGears = [];
  },

  // Ensure the selected theme index maps to a valid theme, preferring unused options
  normalizeThemeIndex: function (themeIndex, tierIndexForFallback = 0) {
    const parsed = parseInt(themeIndex, 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed < this.tierThemes.length) {
      return parsed;
    }

    return this.getNextThemeIndex(tierIndexForFallback);
  },

  // Prefer first unused theme; otherwise fall back to sequential rotation
  getNextThemeIndex: function (tierIndexForFallback = 0) {
    for (let i = 0; i < this.tierThemes.length; i++) {
      if (!this.usedThemeIndices.includes(i)) {
        return i;
      }
    }
    return tierIndexForFallback % this.tierThemes.length;
  },

  get boardWidth() {
    return this.baseBoardWidth;
  },
};

export default Board;
