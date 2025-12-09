/**
 * Coin Pusher Board System
 * Pyramid-shaped coin pusher with themed tiers that expands at score milestones
 * Coins cascade from tier to tier - never falling into the abyss!
 */

// Helper function to create capsule-like geometry (CapsuleGeometry not in Three.js r128)
// Creates a rounded cylinder using cylinder body + hemisphere caps
function createCapsuleGeometry(radius, length, capSegments, radialSegments) {
  // Use a cylinder with rounded look - simpler but effective for decorations
  // CapsuleGeometry params: (radius, length, capSegments, radialSegments)
  // We approximate with a cylinder that includes the cap length
  const cylinderHeight = length + radius * 2; // Add cap radius to both ends
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
  tierOffsetY: -3.5,    // How much each tier drops down
  tierOffsetZ: 4,       // How much each tier moves forward (enough to catch coins!)
  tierWidthIncrease: 3, // How much wider each tier gets

  // Pusher tiers
  pushers: [],
  tiers: [],

  // Pegs for pachinko sections
  pegs: [],

  // Bonus zones
  bonusZones: [],

  // Scoring slot elements (meshes and physics bodies to clean up on expansion)
  scoringSlotMeshes: [],
  scoringSlotBodies: [],

  // Current tier count
  currentTierCount: 1,
  maxTiers: 8,

  // Scoring threshold
  scoringY: -25,

  // Tier themes - fun themed worlds!
  tierThemes: [
    {
      name: "🎮 Neon Arcade",
      shelf: 0x1a1a2e, wall: 0xff00ff, pusher: 0x00ffff, accent: 0xffff00, glow: 0xff00ff,
      elements: ["spinner", "bumpers", "arcadeCabinets", "neonSigns", "pixelGhosts"],
      icon: "🕹️"
    },
    {
      name: "🦖 Dino Land",
      shelf: 0x2d5016, wall: 0x8bc34a, pusher: 0xffeb3b, accent: 0xff5722, glow: 0x4caf50,
      elements: ["sidePushers", "volcano", "dinosaurs", "palmTrees", "dinoEggs", "fossils"],
      icon: "🦕"
    },
    {
      name: "👽 Alien Invasion",
      shelf: 0x0a1628, wall: 0x00ff88, pusher: 0x88ff00, accent: 0x00ffff, glow: 0x00ff44,
      elements: ["spinner", "ufo", "alienCreatures", "alienPods", "tentacles", "cropCircles"],
      icon: "🛸"
    },
    {
      name: "🏴‍☠️ Pirate Cove",
      shelf: 0x3e2723, wall: 0xffd54f, pusher: 0x8d6e63, accent: 0x00bcd4, glow: 0xffb300,
      elements: ["sidePushers", "cannon", "treasure", "shipWheel", "anchor", "skulls", "barrels"],
      icon: "💰"
    },
    {
      name: "🍭 Candy Kingdom",
      shelf: 0xfce4ec, wall: 0xff4081, pusher: 0x7c4dff, accent: 0x00e5ff, glow: 0xff80ab,
      elements: ["spinner", "lollipops", "gumball", "candyCanes", "cupcakes", "iceCream", "donuts"],
      icon: "🍬"
    },
    {
      name: "🚀 Space Station",
      shelf: 0x0d1b2a, wall: 0x3f51b5, pusher: 0x00bcd4, accent: 0xff5722, glow: 0x536dfe,
      elements: ["sidePushers", "rockets", "asteroid", "planets", "satellites", "astronaut", "spaceDebris"],
      icon: "🌟"
    },
    {
      name: "🌴 Jungle Safari",
      shelf: 0x1b4332, wall: 0x66bb6a, pusher: 0xffca28, accent: 0x8d6e63, glow: 0x81c784,
      elements: ["spinner", "vines", "animals", "jungleTrees", "waterfall", "rocks", "junglePlants"],
      icon: "🦁"
    },
    {
      name: "🤖 Robot Factory",
      shelf: 0x263238, wall: 0x78909c, pusher: 0xff6f00, accent: 0x00e676, glow: 0xb0bec5,
      elements: ["sidePushers", "gears", "conveyor", "robots", "assemblyArms", "monitors", "pipes"],
      icon: "⚙️"
    },
  ],

  // Dynamic elements arrays
  spinners: [],
  sidePushers: [],
  bumpers: [],
  decorations: [],

  // Initialize board
  init: function (scene) {
    this.scene = scene;
    this.pushers = [];
    this.tiers = [];
    this.pegs = [];
    this.bonusZones = [];
    this.spinners = [];
    this.sidePushers = [];
    this.bumpers = [];
    this.decorations = [];
    this.scoringSlotMeshes = [];
    this.scoringSlotBodies = [];
    this.currentTierCount = 1;

    // Create base materials
    this.createBaseMaterials();

    // Build the machine layout
    this.createPachinkoZone(12, 4);
    this.createPusherTier(0, 0, 0, this.baseBoardWidth);
    this.createScoringSlots(this.getScoringY());

    // Pre-populate with starting coins
    this.spawnStartingCoins();
  },

  // Add collision body for a decoration (for coins to bounce off)
  addDecorationCollision: function (x, y, z, radius, shape) {
    shape = shape || "peg";
    Physics.createBody({
      shape: shape,
      x: x,
      y: y,
      z: z,
      radius: radius,
      isStatic: true,
      restitution: 0.5,  // Moderate bounce
      data: { noSync: true, isDecoration: true },
    });
  },

  // Create base materials
  createBaseMaterials: function () {
    this.materials = {
      peg: new THREE.MeshPhongMaterial({
        color: 0xff5722,
        emissive: 0x331100,
        specular: 0xffab91,
        shininess: 70,
      }),
      pegBonus: new THREE.MeshPhongMaterial({
        color: 0x00e676,
        emissive: 0x003311,
        specular: 0x69f0ae,
        shininess: 80,
      }),
      divider: new THREE.MeshPhongMaterial({
        color: 0x7c4dff,
        emissive: 0x1a0033,
        specular: 0xb388ff,
        shininess: 50,
      }),
      slotGood: new THREE.MeshPhongMaterial({
        color: 0x00e676,
        emissive: 0x00e676,
        emissiveIntensity: 0.5,
      }),
      slotBad: new THREE.MeshPhongMaterial({
        color: 0xff1744,
        emissive: 0xff1744,
        emissiveIntensity: 0.4,
      }),
      slotBonus: new THREE.MeshPhongMaterial({
        color: 0xffea00,
        emissive: 0xffea00,
        emissiveIntensity: 0.6,
      }),
      ramp: new THREE.MeshPhongMaterial({
        color: 0x37474f,
        specular: 0x90a4ae,
        shininess: 60,
      }),
    };
  },

  // Create themed materials for a specific tier
  createTierMaterials: function (tierIndex) {
    const theme = this.tierThemes[tierIndex % this.tierThemes.length];
    return {
      shelf: new THREE.MeshPhongMaterial({
        color: theme.shelf,
        specular: 0x444444,
        shininess: 40,
      }),
      wall: new THREE.MeshPhongMaterial({
        color: theme.wall,
        emissive: theme.glow,
        emissiveIntensity: 0.2,
        specular: 0xffffff,
        shininess: 60,
      }),
      pusher: new THREE.MeshPhongMaterial({
        color: theme.pusher,
        emissive: theme.pusher,
        emissiveIntensity: 0.15,
        specular: 0xffffff,
        shininess: 100,
      }),
      accent: new THREE.MeshPhongMaterial({
        color: theme.accent,
        emissive: theme.accent,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.9,
      }),
      glow: new THREE.MeshPhongMaterial({
        color: theme.glow,
        emissive: theme.glow,
        emissiveIntensity: 0.6,
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

      Physics.createBody({
        shape: "box",
        x: x, y: 8, z: 0,
        width: 0.3,
        height: 12,
        depth: 4,
        isStatic: true,
      });
    }

    // Create pegs with rainbow colors
    for (let row = 0; row < rows; row++) {
      const y = startY - row * spacingY;
      const pegsInRow = row % 2 === 0 ? 7 : 8;
      const offsetX = row % 2 === 0 ? 0 : spacingX / 2;

      for (let i = 0; i < pegsInRow; i++) {
        const x = (i - (pegsInRow - 1) / 2) * spacingX + offsetX;

        // Rainbow hue based on position
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

        const pegGeom = new THREE.SphereGeometry(pegRadius, 12, 8);
        const peg = new THREE.Mesh(pegGeom, pegMat);
        peg.position.set(x, y, 0);
        this.scene.add(peg);

        Physics.createBody({
          shape: "peg",
          x: x, y: y, z: 0,
          radius: pegRadius,
          isStatic: true,
          restitution: 0.6,
          data: { noSync: true, isBonus: isBonus },
        });

        this.pegs.push({ mesh: peg, isBonus: isBonus, baseHue: hue });
      }
    }

    // Funnel walls at bottom of pachinko zone
    for (let side = -1; side <= 1; side += 2) {
      const funnelMat = new THREE.MeshPhongMaterial({
        color: 0x9c27b0,
        emissive: 0x4a148c,
        emissiveIntensity: 0.3,
      });
      const funnelGeom = new THREE.BoxGeometry(2.5, 0.25, 2.5);
      const funnel = new THREE.Mesh(funnelGeom, funnelMat);
      funnel.position.set(side * 3.5, endY - 0.5, 0);
      funnel.rotation.z = side * -0.35;
      this.scene.add(funnel);

      Physics.createBody({
        shape: "box",
        x: side * 3.5, y: endY - 0.5, z: 0,
        width: 2.5, height: 0.3, depth: 2.5,
        isStatic: true,
      });
    }
  },

  // Create a themed pusher tier with proper connections
  createPusherTier: function (tierIndex, baseY, baseZ, boardWidth) {
    const tierMats = this.createTierMaterials(tierIndex);
    const theme = this.tierThemes[tierIndex % this.tierThemes.length];
    const tierMeshes = [];

    const upperY = baseY + 1.5;
    const lowerY = baseY;
    const upperShelfZ = baseZ - 1;
    const lowerShelfZ = baseZ + 1.5;
    const frontZ = lowerShelfZ + this.shelfDepth / 2;

    // === DECORATIVE EDGE LIGHTS ===
    this.createEdgeLights(tierIndex, boardWidth, lowerY, lowerShelfZ, tierMats, tierMeshes);

    // === UPPER SHELF (where coins land from above) ===
    const upperShelfGeom = new THREE.BoxGeometry(boardWidth - 1, 0.25, 2.5);
    const upperShelf = new THREE.Mesh(upperShelfGeom, tierMats.shelf);
    upperShelf.position.set(0, upperY, upperShelfZ);
    this.scene.add(upperShelf);
    tierMeshes.push(upperShelf);

    Physics.createBody({
      shape: "box",
      x: 0, y: upperY, z: upperShelfZ,
      width: boardWidth - 1,
      height: 0.25,
      depth: 2.5,
      isStatic: true,
    });

    // Upper shelf back wall with glow strip
    const upperBackGeom = new THREE.BoxGeometry(boardWidth - 1, 1.2, 0.2);
    const upperBack = new THREE.Mesh(upperBackGeom, tierMats.wall);
    upperBack.position.set(0, upperY + 0.7, upperShelfZ - 1.3);
    this.scene.add(upperBack);
    tierMeshes.push(upperBack);

    // Glow strip on back wall
    const glowStripGeom = new THREE.BoxGeometry(boardWidth - 1.5, 0.15, 0.1);
    const glowStrip = new THREE.Mesh(glowStripGeom, tierMats.glow);
    glowStrip.position.set(0, upperY + 1.2, upperShelfZ - 1.2);
    this.scene.add(glowStrip);
    tierMeshes.push(glowStrip);

    Physics.createBody({
      shape: "box",
      x: 0, y: upperY + 0.7, z: upperShelfZ - 1.3,
      width: boardWidth - 1,
      height: 1.2,
      depth: 0.2,
      isStatic: true,
    });

    // === PUSHER with glow effect ===
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

    const pusherBody = Physics.createBody({
      shape: "box",
      x: 0, y: pusherY, z: pusherBaseZ,
      width: pusherWidth,
      height: pusherHeight,
      depth: pusherDepth,
      isStatic: true,
      mesh: pusherMesh,
    });

    this.pushers.push({
      mesh: pusherMesh,
      body: pusherBody,
      baseY: pusherY,
      baseZ: pusherBaseZ,
      position: 0,
      direction: 1,
      speed: 1.4 + tierIndex * 0.15,
      minZ: -1.2,
      maxZ: 1.0,
      tierIndex: tierIndex,
      theme: theme,
    });

    // === LOWER SHELF (main coin field) ===
    const lowerShelfGeom = new THREE.BoxGeometry(boardWidth, 0.25, this.shelfDepth);
    const lowerShelf = new THREE.Mesh(lowerShelfGeom, tierMats.shelf);
    lowerShelf.position.set(0, lowerY, lowerShelfZ);
    this.scene.add(lowerShelf);
    tierMeshes.push(lowerShelf);

    Physics.createBody({
      shape: "box",
      x: 0, y: lowerY, z: lowerShelfZ,
      width: boardWidth,
      height: 0.25,
      depth: this.shelfDepth,
      isStatic: true,
    });

    // Lower shelf back wall
    const lowerBackGeom = new THREE.BoxGeometry(boardWidth, 1, 0.2);
    const lowerBack = new THREE.Mesh(lowerBackGeom, tierMats.wall);
    lowerBack.position.set(0, lowerY + 0.6, lowerShelfZ - this.shelfDepth / 2);
    this.scene.add(lowerBack);
    tierMeshes.push(lowerBack);

    Physics.createBody({
      shape: "box",
      x: 0, y: lowerY + 0.6, z: lowerShelfZ - this.shelfDepth / 2,
      width: boardWidth,
      height: 1,
      depth: 0.2,
      isStatic: true,
    });

    // Small lip at front edge
    const lipGeom = new THREE.BoxGeometry(boardWidth, 0.1, 0.1);
    const lip = new THREE.Mesh(lipGeom, tierMats.accent);
    lip.position.set(0, lowerY + 0.15, frontZ);
    this.scene.add(lip);
    tierMeshes.push(lip);

    Physics.createBody({
      shape: "box",
      x: 0, y: lowerY + 0.15, z: frontZ,
      width: boardWidth,
      height: 0.1,
      depth: 0.1,
      isStatic: true,
    });

    // === SIDE WALLS with glow strips ===
    for (let side = -1; side <= 1; side += 2) {
      const x = side * (boardWidth / 2 + 0.1);
      const sideWallGeom = new THREE.BoxGeometry(0.2, 2.2, this.shelfDepth + 3);
      const sideWall = new THREE.Mesh(sideWallGeom, tierMats.wall);
      sideWall.position.set(x, lowerY + 1, baseZ + 0.5);
      this.scene.add(sideWall);
      tierMeshes.push(sideWall);

      // Glow strip on side wall
      const sideGlowGeom = new THREE.BoxGeometry(0.08, 0.15, this.shelfDepth + 2);
      const sideGlow = new THREE.Mesh(sideGlowGeom, tierMats.glow);
      sideGlow.position.set(x * 0.95, lowerY + 2, baseZ + 0.5);
      this.scene.add(sideGlow);
      tierMeshes.push(sideGlow);

      Physics.createBody({
        shape: "box",
        x: x, y: lowerY + 1, z: baseZ + 0.5,
        width: 0.2,
        height: 2.2,
        depth: this.shelfDepth + 3,
        isStatic: true,
      });
    }

    // === RAMP TO NEXT TIER (if not bottom tier) ===
    // This catches coins from the front edge and guides them to the next tier
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

    // Create bonus zones on the lower shelf
    this.createShelfBonusZones(tierIndex, lowerY, lowerShelfZ, boardWidth, tierMats);

    // Create themed elements (spinners, bumpers, side pushers, decorations)
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

      // Store for animation
      light.userData = { lightIndex: i, tierIndex: tierIndex };
    }
  },

  // Create ramp between tiers
  createTierRamp: function (tierIndex, boardWidth, lowerY, frontZ, tierMats, tierMeshes) {
    // Ramp that catches coins and guides them forward/down
    const rampLength = 3.5;
    const rampWidth = boardWidth + 2; // Wider to catch more coins
    const guardHeight = 1.2; // Taller guards to prevent coins bouncing over

    // Main ramp surface (angled down and forward)
    const rampGeom = new THREE.BoxGeometry(rampWidth, 0.2, rampLength);
    const ramp = new THREE.Mesh(rampGeom, this.materials.ramp);
    ramp.position.set(0, lowerY - 0.8, frontZ + rampLength / 2);
    ramp.rotation.x = 0.2; // Gentle angle down toward next tier
    this.scene.add(ramp);
    tierMeshes.push(ramp);

    Physics.createBody({
      shape: "box",
      x: 0, y: lowerY - 0.8, z: frontZ + rampLength / 2,
      width: rampWidth,
      height: 0.2,
      depth: rampLength,
      isStatic: true,
    });

    // Taller side guards on ramp to contain coins
    for (let side = -1; side <= 1; side += 2) {
      const guardGeom = new THREE.BoxGeometry(0.2, guardHeight, rampLength + 0.5);
      const guard = new THREE.Mesh(guardGeom, tierMats.wall);
      guard.position.set(side * rampWidth / 2, lowerY - 0.3, frontZ + rampLength / 2);
      this.scene.add(guard);
      tierMeshes.push(guard);

      Physics.createBody({
        shape: "box",
        x: side * rampWidth / 2, y: lowerY - 0.3, z: frontZ + rampLength / 2,
        width: 0.2,
        height: guardHeight,
        depth: rampLength + 0.5,
        isStatic: true,
      });
    }

    // Back guard at start of ramp to catch bouncing coins
    const backGuardGeom = new THREE.BoxGeometry(rampWidth, guardHeight * 0.7, 0.2);
    const backGuard = new THREE.Mesh(backGuardGeom, tierMats.wall);
    backGuard.position.set(0, lowerY - 0.4, frontZ - 0.1);
    this.scene.add(backGuard);
    tierMeshes.push(backGuard);

    Physics.createBody({
      shape: "box",
      x: 0, y: lowerY - 0.4, z: frontZ - 0.1,
      width: rampWidth,
      height: guardHeight * 0.7,
      depth: 0.2,
      isStatic: true,
    });
  },

  // Create themed elements for a tier
  createTierElements: function (tierIndex, baseY, baseZ, boardWidth, tierMats, theme) {
    const elements = theme.elements || [];
    const shelfZ = baseZ + 1.5;
    const frontZ = shelfZ + this.shelfDepth / 2; // Front edge of shelf

    // ALWAYS create themed wall decorations for every tier (highly visible)
    this.createThemedWallDecorations(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);

    // Create LARGE floating decorations above the tier (always visible, never covered)
    this.createFloatingThemedDecorations(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);

    for (const element of elements) {
      switch (element) {
        // === SHARED MECHANICS ===
        case "spinner":
          this.createSpinner(tierIndex, baseY + 0.5, shelfZ, boardWidth, tierMats, theme);
          break;
        case "sidePushers":
          this.createSidePushers(tierIndex, baseY + 0.3, shelfZ, boardWidth, tierMats, theme);
          break;
        case "bumpers":
          this.createBumpers(tierIndex, baseY + 0.4, shelfZ, boardWidth, tierMats, theme);
          break;

        // === NEON ARCADE ===
        case "arcadeCabinets":
          this.createArcadeCabinets(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "neonSigns":
          this.createNeonSigns(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "pixelGhosts":
          this.createPixelGhosts(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;

        // === DINO LAND ===
        case "volcano":
          this.createVolcano(tierIndex, baseY, shelfZ, tierMats, theme);
          break;
        case "dinosaurs":
          this.createDinosaurs(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "palmTrees":
          this.createPalmTrees(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "dinoEggs":
          this.createDinoEggs(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "fossils":
          this.createFossils(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;

        // === ALIEN INVASION ===
        case "ufo":
          this.createUFO(tierIndex, baseY + 2, shelfZ, tierMats, theme);
          break;
        case "alienCreatures":
          this.createAlienCreatures(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "alienPods":
          this.createAlienPods(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "tentacles":
          this.createTentacles(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "cropCircles":
          this.createCropCircles(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;

        // === PIRATE COVE ===
        case "cannon":
          this.createCannon(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "treasure":
          this.createTreasureChest(tierIndex, baseY + 0.3, shelfZ, tierMats, theme);
          break;
        case "shipWheel":
          this.createShipWheel(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "anchor":
          this.createAnchor(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "skulls":
          this.createSkulls(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "barrels":
          this.createBarrels(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;

        // === CANDY KINGDOM ===
        case "lollipops":
          this.createLollipops(tierIndex, baseY + 0.3, shelfZ, boardWidth, tierMats, theme);
          break;
        case "gumball":
          this.createGumballMachine(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "candyCanes":
          this.createCandyCanes(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "cupcakes":
          this.createCupcakes(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "iceCream":
          this.createIceCream(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "donuts":
          this.createDonuts(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;

        // === SPACE STATION ===
        case "rockets":
          this.createRockets(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "asteroid":
          this.createAsteroid(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "planets":
          this.createPlanets(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "satellites":
          this.createSatellites(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "astronaut":
          this.createAstronaut(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "spaceDebris":
          this.createSpaceDebris(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;

        // === JUNGLE SAFARI ===
        case "vines":
          this.createVines(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "animals":
          this.createAnimals(tierIndex, baseY + 0.3, shelfZ, boardWidth, tierMats, theme);
          break;
        case "jungleTrees":
          this.createJungleTrees(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "waterfall":
          this.createWaterfall(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "rocks":
          this.createRocks(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "junglePlants":
          this.createJunglePlants(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;

        // === ROBOT FACTORY ===
        case "gears":
          this.createGears(tierIndex, baseY + 0.5, shelfZ, boardWidth, tierMats, theme);
          break;
        case "conveyor":
          this.createConveyor(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "robots":
          this.createRobots(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "assemblyArms":
          this.createAssemblyArms(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "monitors":
          this.createMonitors(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
        case "pipes":
          this.createPipes(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
          break;
      }
    }
  },

  // Create a spinning disc that deflects coins
  createSpinner: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const spinnerRadius = 1.2;
    const spinnerHeight = 0.15;

    // Main spinning disc
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

    // Add spinner arms/paddles
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

    // Physics body for the spinner
    const spinnerBody = Physics.createBody({
      shape: "cylinder",
      x: 0, y: y, z: z,
      radius: spinnerRadius,
      height: spinnerHeight + 0.3,
      isStatic: true,
      mesh: disc,
    });

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

  // Create side pushers that push coins sideways
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

      // Add arrow decoration
      const arrowGeom = new THREE.ConeGeometry(0.2, 0.4, 4);
      const arrow = new THREE.Mesh(arrowGeom, tierMats.wall);
      arrow.rotation.z = side * Math.PI / 2;
      arrow.position.set(-side * 0.5, 0.3, 0);
      pusher.add(arrow);

      const pusherBody = Physics.createBody({
        shape: "box",
        x: baseX, y: y, z: z,
        width: pusherWidth,
        height: pusherHeight,
        depth: pusherDepth,
        isStatic: true,
        mesh: pusher,
      });

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

      // Bumper dome
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
      bumper.scale.y = 0.6; // Flatten slightly
      this.scene.add(bumper);

      // Ring around bumper
      const ringGeom = new THREE.TorusGeometry(bumperRadius + 0.1, 0.05, 8, 16);
      const ring = new THREE.Mesh(ringGeom, tierMats.wall);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.1;
      bumper.add(ring);

      Physics.createBody({
        shape: "peg",
        x: pos.x, y: y, z: pos.z,
        radius: bumperRadius,
        isStatic: true,
        restitution: 1.2, // Extra bouncy!
        data: { noSync: true, isBumper: true },
      });

      this.bumpers.push({
        mesh: bumper,
        baseScale: 1,
        hitTime: 0,
        tierIndex: tierIndex,
      });

      this.decorations.push(bumper);
    }
  },

  // Create volcano decoration (Dino Land)
  createVolcano: function (tierIndex, y, z, tierMats, theme) {
    const volcanoGeom = new THREE.ConeGeometry(0.8, 1.2, 8);
    const volcanoMat = new THREE.MeshPhongMaterial({
      color: 0x5d4037,
      emissive: 0x331100,
    });
    const volcano = new THREE.Mesh(volcanoGeom, volcanoMat);
    volcano.position.set(0, y + 0.6, z - 1);
    this.scene.add(volcano);

    // Lava glow at top
    const lavaGeom = new THREE.SphereGeometry(0.3, 8, 6);
    const lavaMat = new THREE.MeshPhongMaterial({
      color: 0xff4400,
      emissive: 0xff2200,
      emissiveIntensity: 0.8,
    });
    const lava = new THREE.Mesh(lavaGeom, lavaMat);
    lava.position.set(0, 0.5, 0);
    lava.scale.y = 0.5;
    volcano.add(lava);

    this.decorations.push(volcano);
  },

  // Create UFO decoration (Alien Invasion)
  createUFO: function (tierIndex, y, z, tierMats, theme) {
    const ufoGroup = new THREE.Group();
    ufoGroup.position.set(0, y, z);

    // UFO body (disc)
    const bodyGeom = new THREE.CylinderGeometry(1, 1.2, 0.3, 16);
    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0x888888,
      specular: 0xffffff,
      shininess: 100,
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    ufoGroup.add(body);

    // UFO dome
    const domeGeom = new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshPhongMaterial({
      color: 0x00ff88,
      emissive: 0x00ff44,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.7,
    });
    const dome = new THREE.Mesh(domeGeom, domeMat);
    dome.position.y = 0.15;
    ufoGroup.add(dome);

    // UFO lights
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const lightGeom = new THREE.SphereGeometry(0.1, 8, 6);
      const lightMat = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 0.8,
      });
      const light = new THREE.Mesh(lightGeom, lightMat);
      light.position.set(Math.cos(angle) * 1, -0.1, Math.sin(angle) * 1);
      ufoGroup.add(light);
    }

    this.scene.add(ufoGroup);
    ufoGroup.userData = { floatOffset: Math.random() * Math.PI * 2 };
    this.decorations.push(ufoGroup);
  },

  // Create treasure chest (Pirate Cove)
  createTreasureChest: function (tierIndex, y, z, tierMats, theme) {
    const chestGroup = new THREE.Group();
    chestGroup.position.set(0, y, z - 1);

    // Chest body
    const bodyGeom = new THREE.BoxGeometry(0.8, 0.5, 0.5);
    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0x8d6e63,
      specular: 0x4e342e,
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    chestGroup.add(body);

    // Chest lid
    const lidGeom = new THREE.BoxGeometry(0.85, 0.25, 0.55);
    const lid = new THREE.Mesh(lidGeom, bodyMat);
    lid.position.set(0, 0.35, 0);
    chestGroup.add(lid);

    // Gold trim
    const trimGeom = new THREE.BoxGeometry(0.9, 0.08, 0.6);
    const trimMat = new THREE.MeshPhongMaterial({
      color: 0xffd700,
      emissive: 0x886600,
      emissiveIntensity: 0.3,
    });
    const trim = new THREE.Mesh(trimGeom, trimMat);
    trim.position.set(0, 0.22, 0);
    chestGroup.add(trim);

    this.scene.add(chestGroup);
    this.decorations.push(chestGroup);
  },

  // Create lollipops (Candy Kingdom)
  createLollipops: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const colors = [0xff4081, 0x7c4dff, 0x00e5ff, 0xffeb3b, 0x76ff03];

    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * (boardWidth / 5);
      const posZ = z - 1.5 + Math.random() * 0.5;
      const lolliGroup = new THREE.Group();
      lolliGroup.position.set(x, y, posZ);

      // Stick
      const stickGeom = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
      const stickMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
      const stick = new THREE.Mesh(stickGeom, stickMat);
      stick.position.y = 0.5;
      lolliGroup.add(stick);

      // Candy swirl
      const candyGeom = new THREE.SphereGeometry(0.3, 12, 8);
      const candyMat = new THREE.MeshPhongMaterial({
        color: colors[i % colors.length],
        emissive: colors[i % colors.length],
        emissiveIntensity: 0.3,
      });
      const candy = new THREE.Mesh(candyGeom, candyMat);
      candy.position.y = 1.1;
      lolliGroup.add(candy);

      // Add collision for the candy part
      this.addDecorationCollision(x, y + 0.5, posZ, 0.35);

      this.scene.add(lolliGroup);
      this.decorations.push(lolliGroup);
    }
  },

  // Create rockets (Space Station)
  createRockets: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      const posX = side * (boardWidth / 3);
      const posZ = z - 1.5;
      const rocketGroup = new THREE.Group();
      rocketGroup.position.set(posX, y, posZ);

      // Rocket body
      const bodyGeom = new THREE.CylinderGeometry(0.2, 0.25, 1, 8);
      const bodyMat = new THREE.MeshPhongMaterial({
        color: 0xeceff1,
        specular: 0xffffff,
        shininess: 100,
      });
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      body.position.y = 0.5;
      rocketGroup.add(body);

      // Nose cone
      const noseGeom = new THREE.ConeGeometry(0.2, 0.4, 8);
      const noseMat = new THREE.MeshPhongMaterial({
        color: 0xff5722,
        emissive: 0x882200,
      });
      const nose = new THREE.Mesh(noseGeom, noseMat);
      nose.position.y = 1.2;
      rocketGroup.add(nose);

      // Flame
      const flameGeom = new THREE.ConeGeometry(0.15, 0.4, 8);
      const flameMat = new THREE.MeshPhongMaterial({
        color: 0xff8800,
        emissive: 0xff4400,
        emissiveIntensity: 0.8,
      });
      const flame = new THREE.Mesh(flameGeom, flameMat);
      flame.rotation.x = Math.PI;
      flame.position.y = -0.2;
      rocketGroup.add(flame);

      // Add collision for rocket body
      this.addDecorationCollision(posX, y + 0.5, posZ, 0.3);

      rocketGroup.userData = { flameOffset: Math.random() * Math.PI * 2 };
      this.scene.add(rocketGroup);
      this.decorations.push(rocketGroup);
    }
  },

  // Create gears (Robot Factory)
  createGears: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const gearPositions = [
      { x: -boardWidth / 4, size: 0.6, speed: 1 },
      { x: boardWidth / 4, size: 0.5, speed: -1.5 },
      { x: 0, size: 0.8, speed: 0.8 },
    ];

    for (const gearInfo of gearPositions) {
      const gearGeom = new THREE.CylinderGeometry(gearInfo.size, gearInfo.size, 0.15, 12);
      const gearMat = new THREE.MeshPhongMaterial({
        color: 0x78909c,
        specular: 0xffffff,
        shininess: 80,
      });
      const gear = new THREE.Mesh(gearGeom, gearMat);
      gear.position.set(gearInfo.x, y, z - 1);

      // Gear teeth
      const teethCount = 8;
      for (let i = 0; i < teethCount; i++) {
        const angle = (i / teethCount) * Math.PI * 2;
        const toothGeom = new THREE.BoxGeometry(0.12, 0.2, gearInfo.size * 0.3);
        const tooth = new THREE.Mesh(toothGeom, gearMat);
        tooth.position.set(
          Math.cos(angle) * gearInfo.size,
          0,
          Math.sin(angle) * gearInfo.size
        );
        tooth.rotation.y = angle;
        gear.add(tooth);
      }

      gear.userData = { rotationSpeed: gearInfo.speed };
      this.scene.add(gear);
      this.decorations.push(gear);
    }
  },

  // Create animals (Jungle Safari)
  createAnimals: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    // Simple stylized animal shapes
    const animals = [
      { x: -boardWidth / 3, type: "lion", color: 0xffb300 },
      { x: boardWidth / 3, type: "elephant", color: 0x9e9e9e },
    ];

    for (const animal of animals) {
      const animalGroup = new THREE.Group();
      animalGroup.position.set(animal.x, y, z - 1.5);

      // Body
      const bodyGeom = new THREE.SphereGeometry(0.35, 12, 8);
      const bodyMat = new THREE.MeshPhongMaterial({
        color: animal.color,
        specular: 0x444444,
      });
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      body.scale.set(1, 0.8, 1.2);
      body.position.y = 0.35;
      animalGroup.add(body);

      // Head
      const headGeom = new THREE.SphereGeometry(0.25, 10, 8);
      const head = new THREE.Mesh(headGeom, bodyMat);
      head.position.set(0, 0.55, 0.3);
      animalGroup.add(head);

      // Eyes
      for (let side = -1; side <= 1; side += 2) {
        const eyeGeom = new THREE.SphereGeometry(0.05, 6, 4);
        const eyeMat = new THREE.MeshPhongMaterial({ color: 0x000000 });
        const eye = new THREE.Mesh(eyeGeom, eyeMat);
        eye.position.set(side * 0.1, 0.6, 0.48);
        animalGroup.add(eye);
      }

      this.scene.add(animalGroup);
      this.decorations.push(animalGroup);
    }
  },

  // =============================================
  // THEMED WALL DECORATIONS (Always Visible on Side Walls)
  // =============================================

  // Create themed wall decorations based on tier theme - these are always visible!
  createThemedWallDecorations: function (tierIndex, baseY, shelfZ, boardWidth, tierMats, theme) {
    const themeName = theme.name;

    // Create glowing themed panels on side walls (always visible)
    this.createThemedSidePanels(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);

    // Create theme-specific large decorations on the walls
    if (themeName.includes("Arcade")) {
      this.createArcadeWallDecor(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
    } else if (themeName.includes("Dino")) {
      this.createDinoWallDecor(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
    } else if (themeName.includes("Alien")) {
      this.createAlienWallDecor(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
    } else if (themeName.includes("Pirate")) {
      this.createPirateWallDecor(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
    } else if (themeName.includes("Candy")) {
      this.createCandyWallDecor(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
    } else if (themeName.includes("Space")) {
      this.createSpaceWallDecor(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
    } else if (themeName.includes("Jungle")) {
      this.createJungleWallDecor(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
    } else if (themeName.includes("Robot")) {
      this.createRobotWallDecor(tierIndex, baseY, shelfZ, boardWidth, tierMats, theme);
    }
  },

  // =============================================
  // LARGE FLOATING DECORATIONS (Above Play Area - Always Visible!)
  // =============================================

  // Create large floating themed decorations above the tier
  createFloatingThemedDecorations: function (tierIndex, baseY, shelfZ, boardWidth, tierMats, theme) {
    const themeName = theme.name;
    // Position floating decorations ABOVE and IN FRONT of the tier so they're always visible
    const floatY = baseY + 3.5; // High above the tier
    const floatZ = shelfZ + 2; // In front so not blocked

    if (themeName.includes("Arcade")) {
      this.createFloatingArcade(tierIndex, floatY, floatZ, boardWidth, theme);
    } else if (themeName.includes("Dino")) {
      this.createFloatingDino(tierIndex, floatY, floatZ, boardWidth, theme);
    } else if (themeName.includes("Alien")) {
      this.createFloatingAlien(tierIndex, floatY, floatZ, boardWidth, theme);
    } else if (themeName.includes("Pirate")) {
      this.createFloatingPirate(tierIndex, floatY, floatZ, boardWidth, theme);
    } else if (themeName.includes("Candy")) {
      this.createFloatingCandy(tierIndex, floatY, floatZ, boardWidth, theme);
    } else if (themeName.includes("Space")) {
      this.createFloatingSpace(tierIndex, floatY, floatZ, boardWidth, theme);
    } else if (themeName.includes("Jungle")) {
      this.createFloatingJungle(tierIndex, floatY, floatZ, boardWidth, theme);
    } else if (themeName.includes("Robot")) {
      this.createFloatingRobot(tierIndex, floatY, floatZ, boardWidth, theme);
    }
  },

  // ARCADE: Giant floating neon controller and arcade symbols
  createFloatingArcade: function (tierIndex, y, z, boardWidth, theme) {
    // Giant floating game controller
    const controller = new THREE.Group();
    controller.position.set(0, y, z);

    // Controller body - LARGE
    const bodyGeom = new THREE.BoxGeometry(2.5, 0.6, 1.2);
    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0x1a1a2e,
      emissive: 0x0a0a15,
      emissiveIntensity: 0.3,
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    controller.add(body);

    // D-pad on left
    const dpadMat = new THREE.MeshPhongMaterial({
      color: 0x333333,
      emissive: theme.glow,
      emissiveIntensity: 0.3,
    });
    const dpadH = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.15), dpadMat);
    dpadH.position.set(-0.7, 0.35, 0.2);
    controller.add(dpadH);
    const dpadV = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.5), dpadMat);
    dpadV.position.set(-0.7, 0.35, 0.2);
    controller.add(dpadV);

    // Action buttons on right - glowing!
    const btnColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
    for (let i = 0; i < 4; i++) {
      const btnGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12);
      const btnMat = new THREE.MeshPhongMaterial({
        color: btnColors[i],
        emissive: btnColors[i],
        emissiveIntensity: 0.8,
      });
      const btn = new THREE.Mesh(btnGeom, btnMat);
      btn.rotation.x = Math.PI / 2;
      const bx = i % 2 === 0 ? 0.5 : 0.8;
      const bz = i < 2 ? 0.1 : 0.35;
      btn.position.set(bx, 0.35, bz);
      controller.add(btn);
    }

    // Glowing edge strip
    const edgeGeom = new THREE.BoxGeometry(2.6, 0.08, 1.3);
    const edgeMat = new THREE.MeshPhongMaterial({
      color: theme.glow,
      emissive: theme.glow,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.8,
    });
    const edge = new THREE.Mesh(edgeGeom, edgeMat);
    edge.position.y = -0.3;
    controller.add(edge);

    controller.userData = { floatOffset: tierIndex * 0.7, floatSpeed: 0.8 };
    this.scene.add(controller);
    this.decorations.push(controller);

    // Floating pixel hearts on sides
    for (let side = -1; side <= 1; side += 2) {
      const heart = this.createPixelHeart(theme.accent);
      heart.position.set(side * (boardWidth / 2 - 0.5), y - 0.5, z + 0.5);
      heart.scale.set(0.8, 0.8, 0.8);
      heart.userData = { floatOffset: tierIndex + side, floatSpeed: 1.2 };
      this.scene.add(heart);
      this.decorations.push(heart);
    }
  },

  // Helper: Create a pixelated heart shape
  createPixelHeart: function (color) {
    const heart = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.7,
    });
    // Pixel heart pattern
    const pixels = [
      [-1, 2], [0, 2], [2, 2], [3, 2],
      [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
      [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
      [-1, -1], [0, -1], [1, -1], [2, -1], [3, -1],
      [0, -2], [1, -2], [2, -2],
      [1, -3]
    ];
    const size = 0.12;
    pixels.forEach(p => {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(size, size, size * 0.5), mat);
      cube.position.set(p[0] * size, p[1] * size, 0);
      heart.add(cube);
    });
    return heart;
  },

  // DINO: Giant floating T-Rex head and palm trees
  createFloatingDino: function (tierIndex, y, z, boardWidth, theme) {
    // GIANT T-Rex head floating above
    const trexHead = new THREE.Group();
    trexHead.position.set(0, y, z);

    const headMat = new THREE.MeshPhongMaterial({
      color: 0x2e7d32,
      emissive: 0x1b5e20,
      emissiveIntensity: 0.3,
    });

    // Large head dome
    const headGeom = new THREE.SphereGeometry(1.0, 12, 10);
    const head = new THREE.Mesh(headGeom, headMat);
    head.scale.set(0.8, 0.7, 1.2);
    trexHead.add(head);

    // Large snout
    const snoutGeom = new THREE.BoxGeometry(0.6, 0.5, 1.0);
    const snout = new THREE.Mesh(snoutGeom, headMat);
    snout.position.set(0, -0.2, 0.9);
    trexHead.add(snout);

    // Giant glowing eyes
    const eyeMat = new THREE.MeshPhongMaterial({
      color: 0xffeb3b,
      emissive: 0xffeb3b,
      emissiveIntensity: 1.0,
    });
    for (let side = -1; side <= 1; side += 2) {
      const eyeGeom = new THREE.SphereGeometry(0.2, 10, 8);
      const eye = new THREE.Mesh(eyeGeom, eyeMat);
      eye.position.set(side * 0.45, 0.25, 0.6);
      trexHead.add(eye);

      // Pupil
      const pupilGeom = new THREE.SphereGeometry(0.1, 8, 6);
      const pupilMat = new THREE.MeshPhongMaterial({ color: 0x000000 });
      const pupil = new THREE.Mesh(pupilGeom, pupilMat);
      pupil.position.set(side * 0.45, 0.25, 0.78);
      trexHead.add(pupil);
    }

    // Big teeth
    const toothMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    for (let i = 0; i < 6; i++) {
      const toothGeom = new THREE.ConeGeometry(0.08, 0.3, 4);
      const tooth = new THREE.Mesh(toothGeom, toothMat);
      tooth.position.set(-0.2 + i * 0.1, -0.45, 1.0);
      tooth.rotation.z = Math.PI;
      trexHead.add(tooth);
    }

    // Nostrils with steam effect
    const steamMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: 0xcccccc,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.6,
    });
    for (let side = -1; side <= 1; side += 2) {
      const steamGeom = new THREE.SphereGeometry(0.15, 8, 6);
      const steam = new THREE.Mesh(steamGeom, steamMat);
      steam.position.set(side * 0.15, 0, 1.4);
      steam.userData = { steamPuff: side };
      trexHead.add(steam);
    }

    trexHead.userData = { floatOffset: tierIndex, floatSpeed: 0.6, headBob: true };
    this.scene.add(trexHead);
    this.decorations.push(trexHead);

    // Floating palm trees on sides
    for (let side = -1; side <= 1; side += 2) {
      const palm = this.createFloatingPalmTree();
      palm.position.set(side * (boardWidth / 2 - 1), y - 1, z + 1);
      palm.rotation.z = side * 0.15;
      palm.userData = { floatOffset: tierIndex + side * 0.5, floatSpeed: 0.9, sway: true };
      this.scene.add(palm);
      this.decorations.push(palm);
    }
  },

  // Helper: Create a floating palm tree
  createFloatingPalmTree: function () {
    const palm = new THREE.Group();
    const trunkMat = new THREE.MeshPhongMaterial({ color: 0x8d6e63 });
    const leafMat = new THREE.MeshPhongMaterial({
      color: 0x4caf50,
      emissive: 0x2e7d32,
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
    });

    // Trunk
    const trunkGeom = new THREE.CylinderGeometry(0.1, 0.15, 1.5, 8);
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    palm.add(trunk);

    // Leaves
    for (let i = 0; i < 6; i++) {
      const leafGeom = new THREE.ConeGeometry(0.15, 1.0, 4);
      const leaf = new THREE.Mesh(leafGeom, leafMat);
      const angle = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(angle) * 0.3, 0.8, Math.sin(angle) * 0.3);
      leaf.rotation.z = -0.5;
      leaf.rotation.y = angle;
      palm.add(leaf);
    }

    return palm;
  },

  // ALIEN: Giant floating UFO with beam and alien creatures
  createFloatingAlien: function (tierIndex, y, z, boardWidth, theme) {
    // GIANT UFO floating above
    const ufo = new THREE.Group();
    ufo.position.set(0, y + 0.5, z);

    // Large UFO disc
    const discGeom = new THREE.CylinderGeometry(1.8, 2.2, 0.5, 24);
    const discMat = new THREE.MeshPhongMaterial({
      color: 0x607d8b,
      specular: 0xffffff,
      shininess: 100,
    });
    const disc = new THREE.Mesh(discGeom, discMat);
    ufo.add(disc);

    // Dome on top
    const domeGeom = new THREE.SphereGeometry(0.8, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshPhongMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.7,
    });
    const dome = new THREE.Mesh(domeGeom, domeMat);
    dome.position.y = 0.25;
    ufo.add(dome);

    // Ring of lights around the UFO
    for (let i = 0; i < 12; i++) {
      const lightGeom = new THREE.SphereGeometry(0.15, 8, 6);
      const lightMat = new THREE.MeshPhongMaterial({
        color: i % 2 === 0 ? 0x00ffff : 0xff00ff,
        emissive: i % 2 === 0 ? 0x00ffff : 0xff00ff,
        emissiveIntensity: 1.0,
      });
      const light = new THREE.Mesh(lightGeom, lightMat);
      const angle = (i / 12) * Math.PI * 2;
      light.position.set(Math.cos(angle) * 1.9, -0.1, Math.sin(angle) * 1.9);
      light.userData = { lightIndex: i };
      ufo.add(light);
    }

    // Tractor beam
    const beamGeom = new THREE.CylinderGeometry(0.3, 1.2, 3, 16, 1, true);
    const beamMat = new THREE.MeshPhongMaterial({
      color: 0x00ff44,
      emissive: 0x00ff44,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeom, beamMat);
    beam.position.y = -1.7;
    beam.userData = { beamPulse: 0 };
    ufo.add(beam);

    ufo.userData = { floatOffset: tierIndex, floatSpeed: 0.5, spin: true };
    this.scene.add(ufo);
    this.decorations.push(ufo);

    // Floating alien creatures on sides
    for (let side = -1; side <= 1; side += 2) {
      const alien = this.createFloatingAlienCreature();
      alien.position.set(side * (boardWidth / 2 - 1), y - 1, z + 1);
      alien.userData = { floatOffset: tierIndex + side, floatSpeed: 1.0, wobble: true };
      this.scene.add(alien);
      this.decorations.push(alien);
    }
  },

  // Helper: Create floating alien creature
  createFloatingAlienCreature: function () {
    const alien = new THREE.Group();
    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0x76ff03,
      emissive: 0x64dd17,
      emissiveIntensity: 0.4,
    });

    // Head (large)
    const headGeom = new THREE.SphereGeometry(0.5, 12, 10);
    const head = new THREE.Mesh(headGeom, bodyMat);
    head.scale.set(1, 1.2, 0.8);
    alien.add(head);

    // Giant eyes
    const eyeMat = new THREE.MeshPhongMaterial({
      color: 0x000000,
      emissive: 0x004400,
      emissiveIntensity: 0.5,
    });
    for (let side = -1; side <= 1; side += 2) {
      const eyeGeom = new THREE.SphereGeometry(0.25, 10, 8);
      const eye = new THREE.Mesh(eyeGeom, eyeMat);
      eye.position.set(side * 0.25, 0.15, 0.35);
      alien.add(eye);
    }

    // Small body
    const bodyGeom = new THREE.CylinderGeometry(0.2, 0.15, 0.4, 8);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = -0.5;
    alien.add(body);

    return alien;
  },

  // PIRATE: Giant floating skull with crossed swords and treasure
  createFloatingPirate: function (tierIndex, y, z, boardWidth, theme) {
    // GIANT skull and crossbones
    const skull = new THREE.Group();
    skull.position.set(0, y, z);

    // Large skull
    const skullMat = new THREE.MeshPhongMaterial({
      color: 0xf5f5dc,
      emissive: 0xffd54f,
      emissiveIntensity: 0.2,
    });
    const skullGeom = new THREE.SphereGeometry(0.9, 14, 12);
    const skullHead = new THREE.Mesh(skullGeom, skullMat);
    skullHead.scale.set(1, 1.1, 0.9);
    skull.add(skullHead);

    // Eye sockets with glowing flames
    const socketMat = new THREE.MeshPhongMaterial({
      color: 0xff4444,
      emissive: 0xff0000,
      emissiveIntensity: 1.0,
    });
    for (let side = -1; side <= 1; side += 2) {
      const socketGeom = new THREE.SphereGeometry(0.25, 10, 8);
      const socket = new THREE.Mesh(socketGeom, socketMat);
      socket.position.set(side * 0.35, 0.2, 0.7);
      skull.add(socket);
    }

    // Nose hole
    const noseGeom = new THREE.ConeGeometry(0.12, 0.2, 3);
    const noseMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const nose = new THREE.Mesh(noseGeom, noseMat);
    nose.position.set(0, -0.1, 0.85);
    nose.rotation.x = Math.PI;
    skull.add(nose);

    // Teeth
    for (let i = 0; i < 6; i++) {
      const toothGeom = new THREE.BoxGeometry(0.1, 0.15, 0.08);
      const tooth = new THREE.Mesh(toothGeom, skullMat);
      tooth.position.set(-0.25 + i * 0.1, -0.4, 0.8);
      skull.add(tooth);
    }

    // Giant crossed swords behind skull
    const bladeMat = new THREE.MeshPhongMaterial({
      color: 0xc0c0c0,
      specular: 0xffffff,
      shininess: 100,
    });
    for (let s = 0; s < 2; s++) {
      const sword = new THREE.Group();
      sword.rotation.z = s === 0 ? 0.5 : -0.5;

      const bladeGeom = new THREE.BoxGeometry(0.12, 2.5, 0.05);
      const blade = new THREE.Mesh(bladeGeom, bladeMat);
      sword.add(blade);

      const guardGeom = new THREE.BoxGeometry(0.5, 0.1, 0.1);
      const guardMat = new THREE.MeshPhongMaterial({
        color: 0xffd700,
        emissive: 0xffd700,
        emissiveIntensity: 0.4,
      });
      const guard = new THREE.Mesh(guardGeom, guardMat);
      guard.position.y = -1.2;
      sword.add(guard);

      sword.position.z = -0.3;
      skull.add(sword);
    }

    skull.userData = { floatOffset: tierIndex, floatSpeed: 0.6, eyeFlicker: true };
    this.scene.add(skull);
    this.decorations.push(skull);

    // Floating treasure chests on sides
    for (let side = -1; side <= 1; side += 2) {
      const chest = this.createFloatingTreasure();
      chest.position.set(side * (boardWidth / 2 - 1), y - 1, z + 1);
      chest.userData = { floatOffset: tierIndex + side * 0.5, floatSpeed: 0.8, goldGlint: true };
      this.scene.add(chest);
      this.decorations.push(chest);
    }
  },

  // Helper: Create floating treasure chest
  createFloatingTreasure: function () {
    const chest = new THREE.Group();
    const woodMat = new THREE.MeshPhongMaterial({ color: 0x5d4037 });
    const goldMat = new THREE.MeshPhongMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.5,
    });

    // Chest body
    const bodyGeom = new THREE.BoxGeometry(0.8, 0.5, 0.5);
    const body = new THREE.Mesh(bodyGeom, woodMat);
    chest.add(body);

    // Gold trim
    const trimGeom = new THREE.BoxGeometry(0.85, 0.08, 0.55);
    const trim = new THREE.Mesh(trimGeom, goldMat);
    trim.position.y = 0.2;
    chest.add(trim);

    // Gold coins spilling out
    for (let i = 0; i < 5; i++) {
      const coinGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.03, 12);
      const coin = new THREE.Mesh(coinGeom, goldMat);
      coin.position.set(-0.2 + i * 0.1, 0.35 + Math.random() * 0.1, 0.1);
      coin.rotation.x = Math.PI / 2;
      coin.rotation.z = Math.random();
      chest.add(coin);
    }

    return chest;
  },

  // CANDY: Giant floating lollipop, cupcake, and candy pieces
  createFloatingCandy: function (tierIndex, y, z, boardWidth, theme) {
    // GIANT spiral lollipop
    const lollipop = new THREE.Group();
    lollipop.position.set(0, y, z);

    // Giant candy swirl
    const swirlGeom = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 32);
    const swirlMat = new THREE.MeshPhongMaterial({
      color: 0xff4081,
      emissive: 0xff4081,
      emissiveIntensity: 0.5,
    });
    const swirl = new THREE.Mesh(swirlGeom, swirlMat);
    swirl.rotation.x = Math.PI / 2;
    lollipop.add(swirl);

    // Spiral pattern
    for (let i = 0; i < 8; i++) {
      const spiralGeom = new THREE.TorusGeometry(0.2 + i * 0.12, 0.05, 8, 32, Math.PI);
      const spiralMat = new THREE.MeshPhongMaterial({
        color: i % 2 === 0 ? 0xffffff : 0x7c4dff,
        emissive: i % 2 === 0 ? 0xffffff : 0x7c4dff,
        emissiveIntensity: 0.4,
      });
      const spiral = new THREE.Mesh(spiralGeom, spiralMat);
      spiral.rotation.x = Math.PI / 2;
      spiral.rotation.z = i * 0.4;
      spiral.position.z = 0.16;
      lollipop.add(spiral);
    }

    // Stick
    const stickGeom = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
    const stickMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const stick = new THREE.Mesh(stickGeom, stickMat);
    stick.position.y = -1.2;
    lollipop.add(stick);

    lollipop.userData = { floatOffset: tierIndex, floatSpeed: 0.7, spin: true };
    this.scene.add(lollipop);
    this.decorations.push(lollipop);

    // Floating cupcakes on sides
    for (let side = -1; side <= 1; side += 2) {
      const cupcake = this.createFloatingCupcake(side);
      cupcake.position.set(side * (boardWidth / 2 - 1), y - 0.8, z + 1);
      cupcake.userData = { floatOffset: tierIndex + side * 0.7, floatSpeed: 1.0 };
      this.scene.add(cupcake);
      this.decorations.push(cupcake);
    }
  },

  // Helper: Create floating cupcake
  createFloatingCupcake: function (colorVariant) {
    const cupcake = new THREE.Group();

    // Wrapper
    const wrapperGeom = new THREE.CylinderGeometry(0.3, 0.25, 0.4, 12);
    const wrapperMat = new THREE.MeshPhongMaterial({
      color: colorVariant > 0 ? 0xff80ab : 0x80d8ff,
    });
    const wrapper = new THREE.Mesh(wrapperGeom, wrapperMat);
    cupcake.add(wrapper);

    // Frosting
    const frostGeom = new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const frostMat = new THREE.MeshPhongMaterial({
      color: colorVariant > 0 ? 0xf8bbd9 : 0xb2ebf2,
      emissive: colorVariant > 0 ? 0xf48fb1 : 0x80deea,
      emissiveIntensity: 0.3,
    });
    const frost = new THREE.Mesh(frostGeom, frostMat);
    frost.position.y = 0.25;
    cupcake.add(frost);

    // Cherry on top
    const cherryGeom = new THREE.SphereGeometry(0.12, 8, 6);
    const cherryMat = new THREE.MeshPhongMaterial({
      color: 0xff1744,
      emissive: 0xff1744,
      emissiveIntensity: 0.5,
    });
    const cherry = new THREE.Mesh(cherryGeom, cherryMat);
    cherry.position.y = 0.55;
    cupcake.add(cherry);

    return cupcake;
  },

  // SPACE: Giant floating planet with rings and stars
  createFloatingSpace: function (tierIndex, y, z, boardWidth, theme) {
    // GIANT ringed planet
    const planet = new THREE.Group();
    planet.position.set(0, y, z);

    // Planet sphere
    const planetGeom = new THREE.SphereGeometry(1.0, 24, 20);
    const planetMat = new THREE.MeshPhongMaterial({
      color: 0x3f51b5,
      emissive: 0x1a237e,
      emissiveIntensity: 0.3,
    });
    const planetMesh = new THREE.Mesh(planetGeom, planetMat);
    planet.add(planetMesh);

    // Rings
    const ringGeom = new THREE.TorusGeometry(1.8, 0.3, 2, 64);
    const ringMat = new THREE.MeshPhongMaterial({
      color: 0xffd54f,
      emissive: 0xffc107,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2.5;
    planet.add(ring);

    // Inner ring
    const innerRingGeom = new THREE.TorusGeometry(1.4, 0.15, 2, 64);
    const innerRingMat = new THREE.MeshPhongMaterial({
      color: 0xff8a65,
      emissive: 0xff5722,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const innerRing = new THREE.Mesh(innerRingGeom, innerRingMat);
    innerRing.rotation.x = Math.PI / 2.5;
    planet.add(innerRing);

    // Surface details (craters/spots)
    for (let i = 0; i < 5; i++) {
      const spotGeom = new THREE.SphereGeometry(0.2, 8, 6);
      const spotMat = new THREE.MeshPhongMaterial({
        color: 0x5c6bc0,
        emissive: 0x3949ab,
        emissiveIntensity: 0.2,
      });
      const spot = new THREE.Mesh(spotGeom, spotMat);
      const phi = Math.random() * Math.PI;
      const theta = Math.random() * Math.PI * 2;
      spot.position.set(
        Math.sin(phi) * Math.cos(theta) * 0.95,
        Math.sin(phi) * Math.sin(theta) * 0.95,
        Math.cos(phi) * 0.95
      );
      planet.add(spot);
    }

    planet.userData = { floatOffset: tierIndex, floatSpeed: 0.4, spin: true };
    this.scene.add(planet);
    this.decorations.push(planet);

    // Floating stars on sides
    for (let side = -1; side <= 1; side += 2) {
      const star = this.createFloatingStar();
      star.position.set(side * (boardWidth / 2 - 0.8), y - 0.5, z + 1);
      star.scale.set(0.6, 0.6, 0.6);
      star.userData = { floatOffset: tierIndex + side, floatSpeed: 1.1, twinkle: true };
      this.scene.add(star);
      this.decorations.push(star);
    }
  },

  // Helper: Create floating star
  createFloatingStar: function () {
    const star = new THREE.Group();
    const starMat = new THREE.MeshPhongMaterial({
      color: 0xffeb3b,
      emissive: 0xffeb3b,
      emissiveIntensity: 1.0,
    });

    // 5-pointed star using cones
    for (let i = 0; i < 5; i++) {
      const pointGeom = new THREE.ConeGeometry(0.15, 0.6, 4);
      const point = new THREE.Mesh(pointGeom, starMat);
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      point.position.set(Math.cos(angle) * 0.25, Math.sin(angle) * 0.25, 0);
      point.rotation.z = angle + Math.PI / 2;
      star.add(point);
    }

    // Center
    const centerGeom = new THREE.SphereGeometry(0.2, 10, 8);
    const center = new THREE.Mesh(centerGeom, starMat);
    star.add(center);

    return star;
  },

  // JUNGLE: Giant floating toucan and tropical flowers
  createFloatingJungle: function (tierIndex, y, z, boardWidth, theme) {
    // GIANT toucan bird
    const toucan = new THREE.Group();
    toucan.position.set(0, y, z);

    const featherMat = new THREE.MeshPhongMaterial({
      color: 0x212121,
      emissive: 0x000000,
      specular: 0x444444,
    });

    // Body
    const bodyGeom = new THREE.SphereGeometry(0.7, 12, 10);
    const body = new THREE.Mesh(bodyGeom, featherMat);
    body.scale.set(0.8, 1, 1.2);
    toucan.add(body);

    // Head
    const headGeom = new THREE.SphereGeometry(0.45, 10, 8);
    const head = new THREE.Mesh(headGeom, featherMat);
    head.position.set(0, 0.6, 0.5);
    toucan.add(head);

    // Giant colorful beak!
    const beakMat = new THREE.MeshPhongMaterial({
      color: 0xff9800,
      emissive: 0xf57c00,
      emissiveIntensity: 0.4,
    });
    const beakGeom = new THREE.ConeGeometry(0.25, 1.2, 8);
    const beak = new THREE.Mesh(beakGeom, beakMat);
    beak.position.set(0, 0.5, 1.1);
    beak.rotation.x = Math.PI / 2;
    toucan.add(beak);

    // Beak stripe
    const stripeMat = new THREE.MeshPhongMaterial({
      color: 0xffeb3b,
      emissive: 0xffc107,
      emissiveIntensity: 0.3,
    });
    const stripeGeom = new THREE.BoxGeometry(0.05, 0.6, 0.3);
    const stripe = new THREE.Mesh(stripeGeom, stripeMat);
    stripe.position.set(0, 0.5, 0.9);
    toucan.add(stripe);

    // Eyes
    const eyeMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
    });
    for (let side = -1; side <= 1; side += 2) {
      const eyeGeom = new THREE.SphereGeometry(0.12, 8, 6);
      const eye = new THREE.Mesh(eyeGeom, eyeMat);
      eye.position.set(side * 0.25, 0.7, 0.7);
      toucan.add(eye);

      const pupilGeom = new THREE.SphereGeometry(0.06, 6, 4);
      const pupilMat = new THREE.MeshPhongMaterial({ color: 0x000000 });
      const pupil = new THREE.Mesh(pupilGeom, pupilMat);
      pupil.position.set(side * 0.25, 0.7, 0.8);
      toucan.add(pupil);
    }

    // White chest
    const chestMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const chestGeom = new THREE.SphereGeometry(0.4, 8, 6);
    const chest = new THREE.Mesh(chestGeom, chestMat);
    chest.position.set(0, 0.1, 0.5);
    chest.scale.set(0.6, 0.8, 0.5);
    toucan.add(chest);

    toucan.userData = { floatOffset: tierIndex, floatSpeed: 0.7, birdBob: true };
    this.scene.add(toucan);
    this.decorations.push(toucan);

    // Floating tropical flowers on sides
    for (let side = -1; side <= 1; side += 2) {
      const flower = this.createFloatingFlower(side);
      flower.position.set(side * (boardWidth / 2 - 1), y - 0.8, z + 1);
      flower.userData = { floatOffset: tierIndex + side * 0.5, floatSpeed: 0.9, petalSpin: true };
      this.scene.add(flower);
      this.decorations.push(flower);
    }
  },

  // Helper: Create floating tropical flower
  createFloatingFlower: function (colorVariant) {
    const flower = new THREE.Group();
    const petalColor = colorVariant > 0 ? 0xff4081 : 0xffeb3b;
    const petalMat = new THREE.MeshPhongMaterial({
      color: petalColor,
      emissive: petalColor,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
    });

    // Petals
    for (let i = 0; i < 6; i++) {
      const petalGeom = new THREE.SphereGeometry(0.3, 8, 6);
      const petal = new THREE.Mesh(petalGeom, petalMat);
      const angle = (i / 6) * Math.PI * 2;
      petal.position.set(Math.cos(angle) * 0.35, Math.sin(angle) * 0.35, 0);
      petal.scale.set(0.6, 1, 0.3);
      flower.add(petal);
    }

    // Center
    const centerGeom = new THREE.SphereGeometry(0.2, 10, 8);
    const centerMat = new THREE.MeshPhongMaterial({
      color: 0xffc107,
      emissive: 0xffa000,
      emissiveIntensity: 0.5,
    });
    const center = new THREE.Mesh(centerGeom, centerMat);
    flower.add(center);

    return flower;
  },

  // ROBOT: Giant floating robot head with spinning gears
  createFloatingRobot: function (tierIndex, y, z, boardWidth, theme) {
    // GIANT robot head
    const robotHead = new THREE.Group();
    robotHead.position.set(0, y, z);

    // Main head box
    const headGeom = new THREE.BoxGeometry(1.6, 1.4, 1.2);
    const headMat = new THREE.MeshPhongMaterial({
      color: 0x607d8b,
      specular: 0xffffff,
      shininess: 80,
    });
    const head = new THREE.Mesh(headGeom, headMat);
    robotHead.add(head);

    // Screen face
    const screenGeom = new THREE.BoxGeometry(1.3, 0.8, 0.1);
    const screenMat = new THREE.MeshPhongMaterial({
      color: 0x000000,
      emissive: 0x00e676,
      emissiveIntensity: 0.5,
    });
    const screen = new THREE.Mesh(screenGeom, screenMat);
    screen.position.z = 0.6;
    robotHead.add(screen);

    // LED eyes
    const eyeMat = new THREE.MeshPhongMaterial({
      color: 0xff6f00,
      emissive: 0xff6f00,
      emissiveIntensity: 1.0,
    });
    for (let side = -1; side <= 1; side += 2) {
      const eyeGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.12, 12);
      const eye = new THREE.Mesh(eyeGeom, eyeMat);
      eye.rotation.x = Math.PI / 2;
      eye.position.set(side * 0.4, 0.15, 0.65);
      robotHead.add(eye);
    }

    // Antenna
    for (let side = -1; side <= 1; side += 2) {
      const antGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
      const antMat = new THREE.MeshPhongMaterial({ color: 0x455a64 });
      const ant = new THREE.Mesh(antGeom, antMat);
      ant.position.set(side * 0.5, 0.9, 0);
      robotHead.add(ant);

      const tipGeom = new THREE.SphereGeometry(0.1, 8, 6);
      const tipMat = new THREE.MeshPhongMaterial({
        color: side > 0 ? 0xff0000 : 0x00ff00,
        emissive: side > 0 ? 0xff0000 : 0x00ff00,
        emissiveIntensity: 0.8,
      });
      const tip = new THREE.Mesh(tipGeom, tipMat);
      tip.position.set(side * 0.5, 1.15, 0);
      robotHead.add(tip);
    }

    // Mouth grid
    const mouthMat = new THREE.MeshPhongMaterial({
      color: 0x263238,
      emissive: 0x00bcd4,
      emissiveIntensity: 0.3,
    });
    for (let i = 0; i < 4; i++) {
      const barGeom = new THREE.BoxGeometry(0.8, 0.06, 0.1);
      const bar = new THREE.Mesh(barGeom, mouthMat);
      bar.position.set(0, -0.2 - i * 0.08, 0.65);
      robotHead.add(bar);
    }

    robotHead.userData = { floatOffset: tierIndex, floatSpeed: 0.5, eyeBlink: true };
    this.scene.add(robotHead);
    this.decorations.push(robotHead);

    // Floating gears on sides
    for (let side = -1; side <= 1; side += 2) {
      const gear = this.createFloatingGear();
      gear.position.set(side * (boardWidth / 2 - 0.8), y - 0.5, z + 1);
      gear.userData = { floatOffset: tierIndex + side, floatSpeed: 0.8, gearSpin: side };
      this.scene.add(gear);
      this.decorations.push(gear);
    }
  },

  // Helper: Create floating gear
  createFloatingGear: function () {
    const gear = new THREE.Group();
    const gearMat = new THREE.MeshPhongMaterial({
      color: 0x78909c,
      specular: 0xffffff,
      shininess: 100,
    });

    // Main gear body
    const bodyGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 24);
    const body = new THREE.Mesh(bodyGeom, gearMat);
    body.rotation.x = Math.PI / 2;
    gear.add(body);

    // Teeth
    for (let i = 0; i < 12; i++) {
      const toothGeom = new THREE.BoxGeometry(0.12, 0.2, 0.18);
      const tooth = new THREE.Mesh(toothGeom, gearMat);
      const angle = (i / 12) * Math.PI * 2;
      tooth.position.set(Math.cos(angle) * 0.55, Math.sin(angle) * 0.55, 0);
      tooth.rotation.z = angle;
      gear.add(tooth);
    }

    // Center hole (glowing)
    const holeGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.2, 12);
    const holeMat = new THREE.MeshPhongMaterial({
      color: 0xff6f00,
      emissive: 0xff6f00,
      emissiveIntensity: 0.7,
    });
    const hole = new THREE.Mesh(holeGeom, holeMat);
    hole.rotation.x = Math.PI / 2;
    gear.add(hole);

    return gear;
  },

  // Create glowing themed panels on side walls - LARGE for visibility
  createThemedSidePanels: function (tierIndex, baseY, shelfZ, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      // LARGE glowing panel on each side wall
      const panelGroup = new THREE.Group();
      const x = side * (boardWidth / 2 + 0.2);
      panelGroup.position.set(x, baseY + 1.5, shelfZ + 1.5);

      // Main glowing panel - MUCH LARGER
      const panelGeom = new THREE.BoxGeometry(0.15, 2.8, 4.5);
      const panelMat = new THREE.MeshPhongMaterial({
        color: theme.glow,
        emissive: theme.glow,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.85,
      });
      const panel = new THREE.Mesh(panelGeom, panelMat);
      panelGroup.add(panel);

      // Larger accent strips with more glow
      for (let i = 0; i < 4; i++) {
        const stripGeom = new THREE.BoxGeometry(0.18, 0.2, 4.2);
        const stripMat = new THREE.MeshPhongMaterial({
          color: theme.accent,
          emissive: theme.accent,
          emissiveIntensity: 1.0,
        });
        const strip = new THREE.Mesh(stripGeom, stripMat);
        strip.position.y = -1.0 + i * 0.7;
        panelGroup.add(strip);
      }

      // Add corner glow orbs for extra visibility
      const orbPositions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      orbPositions.forEach(pos => {
        const orbGeom = new THREE.SphereGeometry(0.2, 10, 8);
        const orbMat = new THREE.MeshPhongMaterial({
          color: theme.accent,
          emissive: theme.accent,
          emissiveIntensity: 1.0,
        });
        const orb = new THREE.Mesh(orbGeom, orbMat);
        orb.position.set(0.1 * side, pos[0] * 1.2, pos[1] * 2);
        panelGroup.add(orb);
      });

      panelGroup.userData = { glowPulse: tierIndex * 0.5 };
      this.scene.add(panelGroup);
      this.decorations.push(panelGroup);
    }
  },

  // ARCADE wall decorations - LARGE neon signs and pixel art on walls
  createArcadeWallDecor: function (tierIndex, baseY, shelfZ, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      // LARGE joystick on wall - 2x size
      const joystick = new THREE.Group();
      joystick.position.set(side * (boardWidth / 2 + 0.25), baseY + 1.8, shelfZ + 2.5);
      joystick.rotation.y = -side * Math.PI / 2;
      joystick.scale.set(2, 2, 2); // Scale up 2x!

      const baseGeom = new THREE.CylinderGeometry(0.25, 0.3, 0.15, 12);
      const baseMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
      const base = new THREE.Mesh(baseGeom, baseMat);
      joystick.add(base);

      const stickGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8);
      const stickMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
      const stick = new THREE.Mesh(stickGeom, stickMat);
      stick.position.y = 0.3;
      stick.rotation.z = side * 0.3;
      joystick.add(stick);

      const ballGeom = new THREE.SphereGeometry(0.15, 10, 8);
      const ballMat = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.8,
      });
      const ball = new THREE.Mesh(ballGeom, ballMat);
      ball.position.y = 0.55;
      ball.position.x = side * 0.15;
      joystick.add(ball);

      this.scene.add(joystick);
      this.decorations.push(joystick);

      // LARGE Neon arrow pointing down - 2.5x size
      const arrow = new THREE.Group();
      arrow.position.set(side * (boardWidth / 2 + 0.25), baseY + 0.6, shelfZ + 1.5);
      arrow.rotation.y = -side * Math.PI / 2;
      arrow.scale.set(2.5, 2.5, 2.5);

      const arrowMat = new THREE.MeshPhongMaterial({
        color: theme.accent,
        emissive: theme.accent,
        emissiveIntensity: 1.0,
      });
      const arrowBody = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.18), arrowMat);
      arrow.add(arrowBody);

      const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.35, 4), arrowMat);
      arrowHead.position.y = -0.4;
      arrowHead.rotation.z = Math.PI;
      arrow.add(arrowHead);

      arrow.userData = { bounceOffset: side, floatOffset: tierIndex + side, floatSpeed: 1.5 };
      this.scene.add(arrow);
      this.decorations.push(arrow);
    }
  },

  // DINO wall decorations - LARGE dino silhouettes and bones
  createDinoWallDecor: function (tierIndex, baseY, shelfZ, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      // LARGE dino head silhouette - 2.5x bigger
      const dinoHead = new THREE.Group();
      dinoHead.position.set(side * (boardWidth / 2 + 0.25), baseY + 1.5, shelfZ + 2);
      dinoHead.rotation.y = -side * Math.PI / 2;
      dinoHead.scale.set(2.5, 2.5, 2.5); // Scale up!

      const headMat = new THREE.MeshPhongMaterial({
        color: 0x4caf50,
        emissive: 0x2e7d32,
        emissiveIntensity: 0.5,
      });

      // Head shape
      const headGeom = new THREE.SphereGeometry(0.4, 8, 6);
      const head = new THREE.Mesh(headGeom, headMat);
      head.scale.set(0.3, 0.8, 1.2);
      dinoHead.add(head);

      // Snout
      const snoutGeom = new THREE.BoxGeometry(0.15, 0.25, 0.5);
      const snout = new THREE.Mesh(snoutGeom, headMat);
      snout.position.set(0, -0.1, 0.5);
      dinoHead.add(snout);

      // Eye - glowing!
      const eyeGeom = new THREE.SphereGeometry(0.1, 6, 4);
      const eyeMat = new THREE.MeshPhongMaterial({
        color: 0xffeb3b,
        emissive: 0xffeb3b,
        emissiveIntensity: 1.0,
      });
      const eye = new THREE.Mesh(eyeGeom, eyeMat);
      eye.position.set(0, 0.15, 0.3);
      dinoHead.add(eye);

      // Teeth
      for (let t = 0; t < 4; t++) {
        const toothGeom = new THREE.ConeGeometry(0.04, 0.12, 4);
        const toothMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
        const tooth = new THREE.Mesh(toothGeom, toothMat);
        tooth.position.set(0, -0.25, 0.3 + t * 0.1);
        tooth.rotation.z = Math.PI;
        dinoHead.add(tooth);
      }

      dinoHead.userData = { floatOffset: tierIndex + side, floatSpeed: 0.8 };
      this.scene.add(dinoHead);
      this.decorations.push(dinoHead);

      // LARGE Bone decoration - 2x bigger
      const bone = new THREE.Group();
      bone.position.set(side * (boardWidth / 2 + 0.2), baseY + 0.5, shelfZ + 3);
      bone.rotation.y = -side * Math.PI / 2;
      bone.rotation.z = 0.3 * side;
      bone.scale.set(2, 2, 2);

      const boneMat = new THREE.MeshPhongMaterial({
        color: 0xf5f5dc,
        emissive: 0xf5f5dc,
        emissiveIntensity: 0.2,
      });
      const boneShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), boneMat);
      boneShaft.rotation.z = Math.PI / 2;
      bone.add(boneShaft);

      for (let end = -1; end <= 1; end += 2) {
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), boneMat);
        knob.position.x = end * 0.3;
        bone.add(knob);
      }

      this.scene.add(bone);
      this.decorations.push(bone);
    }
  },

  // ALIEN wall decorations - LARGE glowing alien eyes and tentacles
  createAlienWallDecor: function (tierIndex, baseY, shelfZ, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      // GIANT alien eye on wall - 3x bigger
      const alienEye = new THREE.Group();
      alienEye.position.set(side * (boardWidth / 2 + 0.25), baseY + 1.5, shelfZ + 2);
      alienEye.rotation.y = -side * Math.PI / 2;
      alienEye.scale.set(3, 3, 3); // Scale up!

      const eyeOuterGeom = new THREE.SphereGeometry(0.35, 12, 8);
      const eyeOuterMat = new THREE.MeshPhongMaterial({
        color: 0x000000,
        specular: 0x444444,
        shininess: 100,
      });
      const eyeOuter = new THREE.Mesh(eyeOuterGeom, eyeOuterMat);
      eyeOuter.scale.set(0.3, 0.8, 1);
      alienEye.add(eyeOuter);

      // Inner glow - brighter!
      const eyeInnerGeom = new THREE.SphereGeometry(0.22, 10, 6);
      const eyeInnerMat = new THREE.MeshPhongMaterial({
        color: 0x00ff88,
        emissive: 0x00ff88,
        emissiveIntensity: 1.0,
      });
      const eyeInner = new THREE.Mesh(eyeInnerGeom, eyeInnerMat);
      eyeInner.scale.set(0.3, 0.6, 0.8);
      eyeInner.position.z = 0.1;
      alienEye.add(eyeInner);

      alienEye.userData = { pulseOffset: side * Math.PI, floatOffset: tierIndex + side, floatSpeed: 0.9 };
      this.scene.add(alienEye);
      this.decorations.push(alienEye);

      // LARGE Wall tentacle - 2.5x bigger
      const tentacle = new THREE.Group();
      tentacle.position.set(side * (boardWidth / 2 + 0.15), baseY + 0.5, shelfZ + 2.5);
      tentacle.scale.set(2.5, 2.5, 2.5);

      const tentMat = new THREE.MeshPhongMaterial({
        color: 0x7b1fa2,
        emissive: 0x4a148c,
        emissiveIntensity: 0.6,
      });

      for (let s = 0; s < 6; s++) {
        const segGeom = new THREE.SphereGeometry(0.14 - s * 0.015, 8, 6);
        const seg = new THREE.Mesh(segGeom, tentMat);
        seg.position.set(-side * s * 0.15, Math.sin(s * 0.8) * 0.15, s * 0.12);
        tentacle.add(seg);
      }

      tentacle.userData = { waveOffset: tierIndex, floatOffset: tierIndex * 0.5, floatSpeed: 1.1 };
      this.scene.add(tentacle);
      this.decorations.push(tentacle);
    }
  },

  // PIRATE wall decorations - LARGE crossed swords and treasure
  createPirateWallDecor: function (tierIndex, baseY, shelfZ, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      // LARGE Crossed swords on wall - 2.5x bigger
      const swords = new THREE.Group();
      swords.position.set(side * (boardWidth / 2 + 0.25), baseY + 1.6, shelfZ + 2);
      swords.rotation.y = -side * Math.PI / 2;
      swords.scale.set(2.5, 2.5, 2.5); // Scale up!

      const bladeMat = new THREE.MeshPhongMaterial({
        color: 0xc0c0c0,
        specular: 0xffffff,
        shininess: 100,
        emissive: 0xc0c0c0,
        emissiveIntensity: 0.2,
      });
      const handleMat = new THREE.MeshPhongMaterial({ color: 0x5d4037 });
      const goldMat = new THREE.MeshPhongMaterial({
        color: 0xffd700,
        emissive: 0xffd700,
        emissiveIntensity: 0.5,
      });

      for (let s = 0; s < 2; s++) {
        const sword = new THREE.Group();
        sword.rotation.z = s === 0 ? 0.5 : -0.5;

        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.025), bladeMat);
        sword.add(blade);

        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.25, 6), handleMat);
        handle.position.y = -0.5;
        sword.add(handle);

        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 0.04), goldMat);
        guard.position.y = -0.4;
        sword.add(guard);

        swords.add(sword);
      }

      swords.userData = { floatOffset: tierIndex + side, floatSpeed: 0.7 };
      this.scene.add(swords);
      this.decorations.push(swords);

      // LARGE Gold coins on wall - 2x bigger
      const coinStack = new THREE.Group();
      coinStack.position.set(side * (boardWidth / 2 + 0.2), baseY + 0.5, shelfZ + 3);
      coinStack.rotation.y = -side * Math.PI / 2;
      coinStack.scale.set(2, 2, 2);

      for (let c = 0; c < 5; c++) {
        const coinGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12);
        const coin = new THREE.Mesh(coinGeom, goldMat);
        coin.position.set((c % 2) * 0.1, c * 0.05, Math.floor(c / 2) * 0.1);
        coin.rotation.x = Math.PI / 2;
        coinStack.add(coin);
      }

      this.scene.add(coinStack);
      this.decorations.push(coinStack);
    }
  },

  // CANDY wall decorations - LARGE lollipops and candy
  createCandyWallDecor: function (tierIndex, baseY, shelfZ, boardWidth, tierMats, theme) {
    const candyColors = [0xff4081, 0x7c4dff, 0x00e5ff, 0xffeb3b, 0x76ff03];

    for (let side = -1; side <= 1; side += 2) {
      // LARGE spiral lollipop on wall - 2.5x bigger
      const lollipop = new THREE.Group();
      lollipop.position.set(side * (boardWidth / 2 + 0.25), baseY + 1.6, shelfZ + 2);
      lollipop.rotation.y = -side * Math.PI / 2;
      lollipop.scale.set(2.5, 2.5, 2.5); // Scale up!

      // Swirl candy - glowing!
      const swirlGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.12, 24);
      const swirlMat = new THREE.MeshPhongMaterial({
        color: side > 0 ? 0xff4081 : 0x7c4dff,
        emissive: side > 0 ? 0xff4081 : 0x7c4dff,
        emissiveIntensity: 0.6,
      });
      const swirl = new THREE.Mesh(swirlGeom, swirlMat);
      lollipop.add(swirl);

      // Spiral lines
      for (let i = 0; i < 6; i++) {
        const lineGeom = new THREE.TorusGeometry(0.12 + i * 0.045, 0.025, 4, 12, Math.PI);
        const lineMat = new THREE.MeshPhongMaterial({
          color: 0xffffff,
          emissive: 0xffffff,
          emissiveIntensity: 0.3,
        });
        const line = new THREE.Mesh(lineGeom, lineMat);
        line.rotation.x = Math.PI / 2;
        line.rotation.z = i * 0.5;
        line.position.z = 0.06;
        lollipop.add(line);
      }

      // Stick
      const stickGeom = new THREE.CylinderGeometry(0.035, 0.035, 0.6, 6);
      const stickMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
      const stick = new THREE.Mesh(stickGeom, stickMat);
      stick.position.y = -0.4;
      lollipop.add(stick);

      lollipop.userData = { spinSpeed: 0.5 * side, floatOffset: tierIndex + side, floatSpeed: 0.8 };
      this.scene.add(lollipop);
      this.decorations.push(lollipop);

      // LARGE Wrapped candy - 2x bigger
      const candy = new THREE.Group();
      candy.position.set(side * (boardWidth / 2 + 0.2), baseY + 0.5, shelfZ + 3);
      candy.rotation.y = -side * Math.PI / 2;
      candy.rotation.z = 0.3;
      candy.scale.set(2, 2, 2);

      const candyBodyGeom = new THREE.SphereGeometry(0.18, 8, 6);
      const candyBodyMat = new THREE.MeshPhongMaterial({
        color: candyColors[(tierIndex + side + 5) % 5],
        emissive: candyColors[(tierIndex + side + 5) % 5],
        emissiveIntensity: 0.5,
      });
      const candyBody = new THREE.Mesh(candyBodyGeom, candyBodyMat);
      candy.add(candyBody);

      // Wrapper ends
      for (let w = -1; w <= 1; w += 2) {
        const wrapperGeom = new THREE.ConeGeometry(0.1, 0.25, 6);
        const wrapper = new THREE.Mesh(wrapperGeom, candyBodyMat);
        wrapper.position.x = w * 0.25;
        wrapper.rotation.z = w * Math.PI / 2;
        candy.add(wrapper);
      }

      this.scene.add(candy);
      this.decorations.push(candy);
    }
  },

  // SPACE wall decorations - LARGE stars, moons, and rockets
  createSpaceWallDecor: function (tierIndex, baseY, shelfZ, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      // LARGE Moon/planet on wall - 3x bigger
      const moon = new THREE.Group();
      moon.position.set(side * (boardWidth / 2 + 0.25), baseY + 1.6, shelfZ + 2);
      moon.rotation.y = -side * Math.PI / 2;
      moon.scale.set(3, 3, 3); // Scale up!

      const moonGeom = new THREE.SphereGeometry(0.35, 12, 8);
      const moonMat = new THREE.MeshPhongMaterial({
        color: side > 0 ? 0xffd54f : 0x90caf9,
        emissive: side > 0 ? 0xffd54f : 0x90caf9,
        emissiveIntensity: 0.5,
      });
      const moonMesh = new THREE.Mesh(moonGeom, moonMat);
      moonMesh.scale.set(0.4, 1, 1);
      moon.add(moonMesh);

      // Craters
      const craterMat = new THREE.MeshPhongMaterial({
        color: side > 0 ? 0xc9a000 : 0x5c92c4,
      });
      for (let c = 0; c < 3; c++) {
        const craterGeom = new THREE.SphereGeometry(0.07, 6, 4);
        const crater = new THREE.Mesh(craterGeom, craterMat);
        crater.position.set(0.02, 0.12 - c * 0.14, 0.28);
        crater.scale.y = 0.3;
        moon.add(crater);
      }

      moon.userData = { floatOffset: tierIndex + side, floatSpeed: 0.6 };
      this.scene.add(moon);
      this.decorations.push(moon);

      // LARGE Star burst - 2.5x bigger
      const star = new THREE.Group();
      star.position.set(side * (boardWidth / 2 + 0.2), baseY + 0.6, shelfZ + 3);
      star.rotation.y = -side * Math.PI / 2;
      star.scale.set(2.5, 2.5, 2.5);

      const starMat = new THREE.MeshPhongMaterial({
        color: 0xffeb3b,
        emissive: 0xffeb3b,
        emissiveIntensity: 1.0,
      });

      for (let p = 0; p < 5; p++) {
        const pointGeom = new THREE.ConeGeometry(0.05, 0.2, 4);
        const point = new THREE.Mesh(pointGeom, starMat);
        const angle = (p / 5) * Math.PI * 2;
        point.position.set(Math.cos(angle) * 0.12, Math.sin(angle) * 0.12, 0);
        point.rotation.z = angle - Math.PI / 2;
        star.add(point);
      }

      const starCenter = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), starMat);
      star.add(starCenter);

      star.userData = { twinkle: tierIndex * 0.5 + side, floatOffset: tierIndex, floatSpeed: 1.0 };
      this.scene.add(star);
      this.decorations.push(star);
    }
  },

  // JUNGLE wall decorations - LARGE leaves and animal faces
  createJungleWallDecor: function (tierIndex, baseY, shelfZ, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      // LARGE tropical leaf - 3x bigger
      const leafGroup = new THREE.Group();
      leafGroup.position.set(side * (boardWidth / 2 + 0.2), baseY + 1.5, shelfZ + 2);
      leafGroup.rotation.y = -side * Math.PI / 2;
      leafGroup.rotation.z = side * 0.3;
      leafGroup.scale.set(3, 3, 3); // Scale up!

      const leafMat = new THREE.MeshPhongMaterial({
        color: 0x4caf50,
        emissive: 0x2e7d32,
        emissiveIntensity: 0.4,
        side: THREE.DoubleSide,
      });

      // Main leaf
      const leafGeom = new THREE.CircleGeometry(0.4, 8);
      const leaf = new THREE.Mesh(leafGeom, leafMat);
      leaf.scale.set(0.5, 1, 1);
      leafGroup.add(leaf);

      // Leaf veins
      const veinMat = new THREE.MeshPhongMaterial({ color: 0x388e3c });
      for (let v = 0; v < 5; v++) {
        const veinGeom = new THREE.BoxGeometry(0.015, 0.3 - v * 0.04, 0.015);
        const vein = new THREE.Mesh(veinGeom, veinMat);
        vein.position.set(0, -0.05, 0.01);
        vein.rotation.z = (v - 2) * 0.25;
        leafGroup.add(vein);
      }

      leafGroup.userData = { floatOffset: tierIndex + side, floatSpeed: 0.7, sway: true };
      this.scene.add(leafGroup);
      this.decorations.push(leafGroup);

      // LARGE Animal face (lion or monkey) - 2.5x bigger
      const face = new THREE.Group();
      face.position.set(side * (boardWidth / 2 + 0.25), baseY + 0.6, shelfZ + 3);
      face.rotation.y = -side * Math.PI / 2;
      face.scale.set(2.5, 2.5, 2.5);

      const faceColor = side > 0 ? 0xffb300 : 0x8d6e63;
      const faceMat = new THREE.MeshPhongMaterial({
        color: faceColor,
        emissive: faceColor,
        emissiveIntensity: 0.2,
      });

      const faceGeom = new THREE.SphereGeometry(0.25, 10, 8);
      const faceMain = new THREE.Mesh(faceGeom, faceMat);
      faceMain.scale.set(0.5, 1, 1);
      face.add(faceMain);

      // Eyes - glowing!
      const eyeMat = new THREE.MeshPhongMaterial({
        color: 0x000000,
        emissive: 0x222222,
        emissiveIntensity: 0.3,
      });
      for (let e = -1; e <= 1; e += 2) {
        const eyeGeom = new THREE.SphereGeometry(0.05, 6, 4);
        const eye = new THREE.Mesh(eyeGeom, eyeMat);
        eye.position.set(0, 0.08, e * 0.1);
        face.add(eye);
      }

      // Nose
      const noseGeom = new THREE.SphereGeometry(0.06, 6, 4);
      const noseMat = new THREE.MeshPhongMaterial({ color: 0x5d4037 });
      const nose = new THREE.Mesh(noseGeom, noseMat);
      nose.position.set(0.1, -0.02, 0);
      face.add(nose);

      // Ears for lion
      if (side > 0) {
        for (let ear = -1; ear <= 1; ear += 2) {
          const earGeom = new THREE.SphereGeometry(0.1, 6, 4);
          const earMesh = new THREE.Mesh(earGeom, faceMat);
          earMesh.position.set(-0.06, 0.18, ear * 0.18);
          face.add(earMesh);
        }
      }

      face.userData = { floatOffset: tierIndex * 0.7, floatSpeed: 0.9 };
      this.scene.add(face);
      this.decorations.push(face);
    }
  },

  // ROBOT wall decorations - LARGE gears, screens, and mechanical parts
  createRobotWallDecor: function (tierIndex, baseY, shelfZ, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      // LARGE gear on wall - 2.5x bigger
      const gearGroup = new THREE.Group();
      gearGroup.position.set(side * (boardWidth / 2 + 0.2), baseY + 1.5, shelfZ + 2);
      gearGroup.rotation.y = -side * Math.PI / 2;
      gearGroup.scale.set(2.5, 2.5, 2.5); // Scale up!

      const gearMat = new THREE.MeshPhongMaterial({
        color: 0x78909c,
        specular: 0xffffff,
        shininess: 100,
        emissive: 0x78909c,
        emissiveIntensity: 0.2,
      });

      const gearGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.1, 16);
      const gear = new THREE.Mesh(gearGeom, gearMat);
      gear.rotation.x = Math.PI / 2;
      gearGroup.add(gear);

      // Gear teeth
      for (let t = 0; t < 12; t++) {
        const toothGeom = new THREE.BoxGeometry(0.1, 0.14, 0.12);
        const tooth = new THREE.Mesh(toothGeom, gearMat);
        const angle = (t / 12) * Math.PI * 2;
        tooth.position.set(Math.sin(angle) * 0.38, Math.cos(angle) * 0.38, 0);
        tooth.rotation.z = -angle;
        gearGroup.add(tooth);
      }

      // Center hole - glowing!
      const holeGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.12, 8);
      const holeMat = new THREE.MeshPhongMaterial({
        color: 0xff6f00,
        emissive: 0xff6f00,
        emissiveIntensity: 0.9,
      });
      const hole = new THREE.Mesh(holeGeom, holeMat);
      hole.rotation.x = Math.PI / 2;
      gearGroup.add(hole);

      gearGroup.userData = { rotationSpeed: 0.4 * side, floatOffset: tierIndex + side, floatSpeed: 0.6 };
      this.scene.add(gearGroup);
      this.decorations.push(gearGroup);

      // LARGE LED display - 2x bigger
      const display = new THREE.Group();
      display.position.set(side * (boardWidth / 2 + 0.22), baseY + 0.5, shelfZ + 3);
      display.rotation.y = -side * Math.PI / 2;
      display.scale.set(2, 2, 2);

      const screenGeom = new THREE.BoxGeometry(0.06, 0.25, 0.4);
      const screenMat = new THREE.MeshPhongMaterial({
        color: 0x000000,
        emissive: 0x00e676,
        emissiveIntensity: 0.6,
      });
      const screen = new THREE.Mesh(screenGeom, screenMat);
      display.add(screen);

      // LED bars - glowing!
      for (let b = 0; b < 5; b++) {
        const barGeom = new THREE.BoxGeometry(0.07, 0.04, 0.32);
        const barMat = new THREE.MeshPhongMaterial({
          color: 0x00e676,
          emissive: 0x00e676,
          emissiveIntensity: 1.0,
        });
        const bar = new THREE.Mesh(barGeom, barMat);
        bar.position.y = -0.1 + b * 0.055;
        display.add(bar);
      }

      display.userData = { flickerRate: tierIndex + side, floatOffset: tierIndex * 0.5, floatSpeed: 0.8 };
      this.scene.add(display);
      this.decorations.push(display);
    }
  },

  // =============================================
  // NEON ARCADE DECORATIONS
  // =============================================

  // Create retro arcade cabinet decorations
  createArcadeCabinets: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      const cabinet = new THREE.Group();
      cabinet.position.set(side * (boardWidth / 2.5), y + 0.8, z - 2);
      cabinet.rotation.y = -side * 0.3;

      // Cabinet body
      const bodyGeom = new THREE.BoxGeometry(0.8, 1.4, 0.6);
      const bodyMat = new THREE.MeshPhongMaterial({
        color: 0x1a1a2e,
        specular: 0x333333,
      });
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      cabinet.add(body);

      // Screen
      const screenGeom = new THREE.BoxGeometry(0.6, 0.5, 0.05);
      const screenMat = new THREE.MeshPhongMaterial({
        color: 0x000000,
        emissive: side > 0 ? 0x00ff00 : 0x0088ff,
        emissiveIntensity: 0.8,
      });
      const screen = new THREE.Mesh(screenGeom, screenMat);
      screen.position.set(0, 0.3, 0.33);
      cabinet.add(screen);

      // Screen glow border
      const borderGeom = new THREE.BoxGeometry(0.7, 0.6, 0.02);
      const borderMat = new THREE.MeshPhongMaterial({
        color: theme.accent,
        emissive: theme.accent,
        emissiveIntensity: 0.6,
      });
      const border = new THREE.Mesh(borderGeom, borderMat);
      border.position.set(0, 0.3, 0.31);
      cabinet.add(border);

      // Control panel
      const panelGeom = new THREE.BoxGeometry(0.6, 0.2, 0.3);
      const panel = new THREE.Mesh(panelGeom, bodyMat);
      panel.position.set(0, -0.2, 0.4);
      panel.rotation.x = -0.3;
      cabinet.add(panel);

      // Joystick
      const stickGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8);
      const stickMat = new THREE.MeshPhongMaterial({ color: 0xff0000 });
      const stick = new THREE.Mesh(stickGeom, stickMat);
      stick.position.set(-0.1, -0.05, 0.45);
      cabinet.add(stick);

      // Joystick ball
      const ballGeom = new THREE.SphereGeometry(0.05, 8, 6);
      const ball = new THREE.Mesh(ballGeom, stickMat);
      ball.position.set(-0.1, 0.03, 0.45);
      cabinet.add(ball);

      // Buttons
      const buttonColors = [0xff0000, 0x00ff00, 0x0000ff];
      for (let i = 0; i < 3; i++) {
        const btnGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.03, 8);
        const btnMat = new THREE.MeshPhongMaterial({
          color: buttonColors[i],
          emissive: buttonColors[i],
          emissiveIntensity: 0.4,
        });
        const btn = new THREE.Mesh(btnGeom, btnMat);
        btn.position.set(0.05 + i * 0.08, -0.05, 0.45);
        btn.rotation.x = -0.3;
        cabinet.add(btn);
      }

      // Top marquee
      const marqueeGeom = new THREE.BoxGeometry(0.75, 0.2, 0.1);
      const marqueeMat = new THREE.MeshPhongMaterial({
        color: theme.glow,
        emissive: theme.glow,
        emissiveIntensity: 0.7,
      });
      const marquee = new THREE.Mesh(marqueeGeom, marqueeMat);
      marquee.position.set(0, 0.7, 0.25);
      cabinet.add(marquee);

      cabinet.userData = { screenPulse: Math.random() * Math.PI * 2 };
      this.scene.add(cabinet);
      this.decorations.push(cabinet);
    }
  },

  // Create glowing neon signs
  createNeonSigns: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const signGroup = new THREE.Group();
    signGroup.position.set(0, y + 2.5, z - 2.5);

    // "PLAY" sign frame
    const frameGeom = new THREE.TorusGeometry(0.8, 0.08, 8, 4);
    const frameMat = new THREE.MeshPhongMaterial({
      color: theme.wall,
      emissive: theme.wall,
      emissiveIntensity: 0.8,
    });
    const frame = new THREE.Mesh(frameGeom, frameMat);
    frame.rotation.x = Math.PI / 2;
    frame.rotation.z = Math.PI / 4;
    signGroup.add(frame);

    // Inner star burst
    for (let i = 0; i < 8; i++) {
      const rayGeom = new THREE.BoxGeometry(0.08, 0.5, 0.05);
      const rayMat = new THREE.MeshPhongMaterial({
        color: theme.accent,
        emissive: theme.accent,
        emissiveIntensity: 0.9,
      });
      const ray = new THREE.Mesh(rayGeom, rayMat);
      ray.rotation.z = (i / 8) * Math.PI * 2;
      ray.position.set(Math.cos((i / 8) * Math.PI * 2) * 0.25, Math.sin((i / 8) * Math.PI * 2) * 0.25, 0);
      signGroup.add(ray);
    }

    // Center circle
    const centerGeom = new THREE.SphereGeometry(0.2, 12, 8);
    const centerMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: theme.glow,
      emissiveIntensity: 1.0,
    });
    const center = new THREE.Mesh(centerGeom, centerMat);
    signGroup.add(center);

    signGroup.userData = { neonPulse: 0 };
    this.scene.add(signGroup);
    this.decorations.push(signGroup);

    // Side neon tubes
    for (let side = -1; side <= 1; side += 2) {
      const tubeGroup = new THREE.Group();
      tubeGroup.position.set(side * (boardWidth / 2 - 0.5), y + 1.5, z - 2);

      for (let i = 0; i < 3; i++) {
        const tubeGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8);
        const colors = [0xff00ff, 0x00ffff, 0xffff00];
        const tubeMat = new THREE.MeshPhongMaterial({
          color: colors[i],
          emissive: colors[i],
          emissiveIntensity: 0.7,
        });
        const tube = new THREE.Mesh(tubeGeom, tubeMat);
        tube.position.y = i * 0.3 - 0.3;
        tube.rotation.z = Math.PI / 2;
        tubeGroup.add(tube);
      }

      this.scene.add(tubeGroup);
      this.decorations.push(tubeGroup);
    }
  },

  // Create floating pixel-style ghosts (pac-man inspired)
  createPixelGhosts: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const ghostColors = [0xff0000, 0x00ffff, 0xff69b4, 0xffa500];

    for (let i = 0; i < 4; i++) {
      const ghost = new THREE.Group();
      const x = (i - 1.5) * (boardWidth / 5);
      ghost.position.set(x, y + 1.2, z + 1);

      // Ghost body (dome + wavy bottom)
      const bodyGeom = new THREE.SphereGeometry(0.25, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const bodyMat = new THREE.MeshPhongMaterial({
        color: ghostColors[i],
        emissive: ghostColors[i],
        emissiveIntensity: 0.4,
      });
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      body.rotation.x = Math.PI;
      body.position.y = 0.25;
      ghost.add(body);

      // Ghost skirt (wavy bottom)
      const skirtGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 8);
      const skirt = new THREE.Mesh(skirtGeom, bodyMat);
      skirt.position.y = 0.15;
      ghost.add(skirt);

      // Wavy bottom segments
      for (let j = 0; j < 4; j++) {
        const segGeom = new THREE.SphereGeometry(0.1, 6, 4);
        const seg = new THREE.Mesh(segGeom, bodyMat);
        const angle = (j / 4) * Math.PI * 2 + Math.PI / 4;
        seg.position.set(Math.cos(angle) * 0.15, 0, Math.sin(angle) * 0.15);
        ghost.add(seg);
      }

      // Eyes (white)
      for (let side = -1; side <= 1; side += 2) {
        const eyeGeom = new THREE.SphereGeometry(0.08, 6, 4);
        const eyeMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
        const eye = new THREE.Mesh(eyeGeom, eyeMat);
        eye.position.set(side * 0.1, 0.25, 0.2);
        ghost.add(eye);

        // Pupils
        const pupilGeom = new THREE.SphereGeometry(0.04, 6, 4);
        const pupilMat = new THREE.MeshPhongMaterial({ color: 0x0000ff });
        const pupil = new THREE.Mesh(pupilGeom, pupilMat);
        pupil.position.set(side * 0.1, 0.25, 0.26);
        ghost.add(pupil);
      }

      ghost.userData = { floatOffset: i * Math.PI / 2, ghostIndex: i };
      this.scene.add(ghost);
      this.decorations.push(ghost);
    }
  },

  // =============================================
  // DINO LAND DECORATIONS
  // =============================================

  // Create dinosaur figures
  createDinosaurs: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    // T-Rex on left
    const trex = new THREE.Group();
    trex.position.set(-boardWidth / 3, y + 0.3, z - 2);

    // T-Rex body
    const trexBodyGeom = new THREE.SphereGeometry(0.4, 10, 8);
    const trexMat = new THREE.MeshPhongMaterial({
      color: 0x2e7d32,
      specular: 0x1b5e20,
    });
    const trexBody = new THREE.Mesh(trexBodyGeom, trexMat);
    trexBody.scale.set(1, 0.8, 1.3);
    trexBody.position.y = 0.4;
    trex.add(trexBody);

    // T-Rex head
    const trexHeadGeom = new THREE.SphereGeometry(0.25, 8, 6);
    const trexHead = new THREE.Mesh(trexHeadGeom, trexMat);
    trexHead.scale.set(1.2, 0.8, 1.5);
    trexHead.position.set(0, 0.7, 0.5);
    trex.add(trexHead);

    // T-Rex jaw
    const jawGeom = new THREE.BoxGeometry(0.2, 0.1, 0.35);
    const jaw = new THREE.Mesh(jawGeom, trexMat);
    jaw.position.set(0, 0.55, 0.6);
    trex.add(jaw);

    // T-Rex eyes
    for (let side = -1; side <= 1; side += 2) {
      const eyeGeom = new THREE.SphereGeometry(0.06, 6, 4);
      const eyeMat = new THREE.MeshPhongMaterial({ color: 0xffff00, emissive: 0x888800 });
      const eye = new THREE.Mesh(eyeGeom, eyeMat);
      eye.position.set(side * 0.15, 0.75, 0.6);
      trex.add(eye);
    }

    // T-Rex tiny arms
    for (let side = -1; side <= 1; side += 2) {
      const armGeom = new THREE.CylinderGeometry(0.04, 0.03, 0.15, 6);
      const arm = new THREE.Mesh(armGeom, trexMat);
      arm.position.set(side * 0.25, 0.35, 0.3);
      arm.rotation.z = side * 0.5;
      arm.rotation.x = 0.3;
      trex.add(arm);
    }

    // T-Rex legs
    for (let side = -1; side <= 1; side += 2) {
      const legGeom = new THREE.CylinderGeometry(0.08, 0.06, 0.4, 6);
      const leg = new THREE.Mesh(legGeom, trexMat);
      leg.position.set(side * 0.2, 0.1, 0);
      trex.add(leg);
    }

    // T-Rex tail
    const tailGeom = new THREE.ConeGeometry(0.15, 0.6, 6);
    const tail = new THREE.Mesh(tailGeom, trexMat);
    tail.position.set(0, 0.3, -0.5);
    tail.rotation.x = Math.PI / 2 + 0.3;
    trex.add(tail);

    this.scene.add(trex);
    this.decorations.push(trex);

    // Triceratops on right
    const trike = new THREE.Group();
    trike.position.set(boardWidth / 3, y + 0.3, z - 2);
    trike.rotation.y = -0.3;

    // Triceratops body
    const trikeBodyGeom = new THREE.SphereGeometry(0.45, 10, 8);
    const trikeMat = new THREE.MeshPhongMaterial({
      color: 0x8d6e63,
      specular: 0x5d4037,
    });
    const trikeBody = new THREE.Mesh(trikeBodyGeom, trikeMat);
    trikeBody.scale.set(1, 0.7, 1.2);
    trikeBody.position.y = 0.35;
    trike.add(trikeBody);

    // Triceratops head with frill
    const trikeHeadGeom = new THREE.SphereGeometry(0.25, 8, 6);
    const trikeHead = new THREE.Mesh(trikeHeadGeom, trikeMat);
    trikeHead.position.set(0, 0.5, 0.45);
    trike.add(trikeHead);

    // Frill (shield)
    const frillGeom = new THREE.CircleGeometry(0.35, 12);
    const frillMat = new THREE.MeshPhongMaterial({
      color: 0xa1887f,
      side: THREE.DoubleSide,
    });
    const frill = new THREE.Mesh(frillGeom, frillMat);
    frill.position.set(0, 0.6, 0.25);
    frill.rotation.x = -0.3;
    trike.add(frill);

    // Horns
    const hornGeom = new THREE.ConeGeometry(0.04, 0.3, 6);
    const hornMat = new THREE.MeshPhongMaterial({ color: 0xfff8e1 });
    // Nose horn
    const noseHorn = new THREE.Mesh(hornGeom, hornMat);
    noseHorn.position.set(0, 0.5, 0.7);
    noseHorn.rotation.x = -Math.PI / 4;
    trike.add(noseHorn);
    // Side horns
    for (let side = -1; side <= 1; side += 2) {
      const sideHorn = new THREE.Mesh(hornGeom, hornMat);
      sideHorn.position.set(side * 0.2, 0.65, 0.4);
      sideHorn.rotation.x = -Math.PI / 3;
      sideHorn.rotation.z = side * 0.3;
      trike.add(sideHorn);
    }

    // Legs
    for (let i = 0; i < 4; i++) {
      const legGeom = new THREE.CylinderGeometry(0.06, 0.05, 0.25, 6);
      const leg = new THREE.Mesh(legGeom, trikeMat);
      const xOff = (i % 2 === 0 ? -1 : 1) * 0.25;
      const zOff = (i < 2 ? 1 : -1) * 0.2;
      leg.position.set(xOff, 0.1, zOff);
      trike.add(leg);
    }

    this.scene.add(trike);
    this.decorations.push(trike);
  },

  // Create palm trees
  createPalmTrees: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      const posX = side * (boardWidth / 2.2);
      const posZ = z - 2.5;
      const palm = new THREE.Group();
      palm.position.set(posX, y, posZ);

      // Trunk (curved using multiple segments)
      const trunkMat = new THREE.MeshPhongMaterial({ color: 0x6d4c41 });
      for (let i = 0; i < 5; i++) {
        const segGeom = new THREE.CylinderGeometry(0.12 - i * 0.015, 0.12 - (i - 1) * 0.015, 0.4, 8);
        const seg = new THREE.Mesh(segGeom, trunkMat);
        seg.position.set(side * i * 0.05, i * 0.38, 0);
        palm.add(seg);
      }

      // Palm fronds (leaves)
      const frondMat = new THREE.MeshPhongMaterial({
        color: 0x33691e,
        side: THREE.DoubleSide,
      });
      for (let i = 0; i < 7; i++) {
        const frondGeom = new THREE.ConeGeometry(0.15, 0.8, 4);
        const frond = new THREE.Mesh(frondGeom, frondMat);
        const angle = (i / 7) * Math.PI * 2;
        frond.position.set(
          Math.cos(angle) * 0.2 + side * 0.25,
          1.9,
          Math.sin(angle) * 0.2
        );
        frond.rotation.x = Math.PI / 2 + 0.5;
        frond.rotation.z = angle;
        palm.add(frond);
      }

      // Coconuts
      const coconutMat = new THREE.MeshPhongMaterial({ color: 0x5d4037 });
      for (let i = 0; i < 3; i++) {
        const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), coconutMat);
        const angle = (i / 3) * Math.PI * 2;
        coconut.position.set(
          Math.cos(angle) * 0.12 + side * 0.2,
          1.7,
          Math.sin(angle) * 0.12
        );
        palm.add(coconut);
      }

      // Add collision for trunk base
      this.addDecorationCollision(posX, y + 0.5, posZ, 0.2);

      this.scene.add(palm);
      this.decorations.push(palm);
    }
  },

  // Create dinosaur eggs in nest
  createDinoEggs: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const nest = new THREE.Group();
    nest.position.set(0, y + 0.15, z + 1.5);

    // Nest base (twigs)
    const nestMat = new THREE.MeshPhongMaterial({ color: 0x5d4037 });
    for (let i = 0; i < 12; i++) {
      const twigGeom = new THREE.CylinderGeometry(0.03, 0.02, 0.5, 4);
      const twig = new THREE.Mesh(twigGeom, nestMat);
      const angle = (i / 12) * Math.PI * 2;
      twig.position.set(Math.cos(angle) * 0.4, 0, Math.sin(angle) * 0.4);
      twig.rotation.z = Math.PI / 2;
      twig.rotation.y = angle;
      nest.add(twig);
    }

    // Eggs with spots
    const eggColors = [0xf5f5dc, 0xe8f5e9, 0xfff8e1];
    for (let i = 0; i < 4; i++) {
      const eggGeom = new THREE.SphereGeometry(0.12, 8, 6);
      const eggMat = new THREE.MeshPhongMaterial({
        color: eggColors[i % eggColors.length],
        specular: 0xffffff,
        shininess: 60,
      });
      const egg = new THREE.Mesh(eggGeom, eggMat);
      egg.scale.set(0.8, 1, 0.8);
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      egg.position.set(Math.cos(angle) * 0.2, 0.15, Math.sin(angle) * 0.2);
      nest.add(egg);

      // Spots on eggs
      const spotMat = new THREE.MeshPhongMaterial({ color: 0x8d6e63 });
      for (let j = 0; j < 3; j++) {
        const spotGeom = new THREE.SphereGeometry(0.02, 4, 3);
        const spot = new THREE.Mesh(spotGeom, spotMat);
        const spotAngle = j * Math.PI * 0.5;
        spot.position.set(
          egg.position.x + Math.cos(spotAngle) * 0.08,
          egg.position.y + 0.05,
          egg.position.z + Math.sin(spotAngle) * 0.08
        );
        nest.add(spot);
      }
    }

    // One cracking egg
    const crackEgg = new THREE.Group();
    crackEgg.position.set(0, 0.18, 0);

    const bottomGeom = new THREE.SphereGeometry(0.12, 8, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const eggMat = new THREE.MeshPhongMaterial({ color: 0xf5f5dc });
    const bottom = new THREE.Mesh(bottomGeom, eggMat);
    bottom.scale.set(0.8, 1, 0.8);
    crackEgg.add(bottom);

    // Baby dino head poking out
    const babyHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 4),
      new THREE.MeshPhongMaterial({ color: 0x81c784 })
    );
    babyHead.position.y = 0.08;
    crackEgg.add(babyHead);

    // Baby eyes
    for (let side = -1; side <= 1; side += 2) {
      const babyEye = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 4, 3),
        new THREE.MeshPhongMaterial({ color: 0x000000 })
      );
      babyEye.position.set(side * 0.03, 0.1, 0.05);
      crackEgg.add(babyEye);
    }

    nest.add(crackEgg);

    // Add collision for the nest
    this.addDecorationCollision(0, y + 0.3, z + 1.5, 0.5);

    this.scene.add(nest);
    this.decorations.push(nest);
  },

  // Create fossil decorations
  createFossils: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const fossilMat = new THREE.MeshPhongMaterial({
      color: 0xd7ccc8,
      specular: 0xbcaaa4,
    });

    // Fossil embedded in rock on back wall
    const fossilGroup = new THREE.Group();
    fossilGroup.position.set(boardWidth / 4, y + 1.8, z - 2.8);

    // Rock background
    const rockGeom = new THREE.DodecahedronGeometry(0.5, 0);
    const rockMat = new THREE.MeshPhongMaterial({ color: 0x8d6e63 });
    const rock = new THREE.Mesh(rockGeom, rockMat);
    rock.scale.set(1.2, 1, 0.3);
    fossilGroup.add(rock);

    // Spine bones
    for (let i = 0; i < 8; i++) {
      const boneGeom = new THREE.BoxGeometry(0.08, 0.15, 0.05);
      const bone = new THREE.Mesh(boneGeom, fossilMat);
      bone.position.set(-0.35 + i * 0.1, 0, 0.15);
      bone.rotation.z = Math.sin(i * 0.5) * 0.2;
      fossilGroup.add(bone);
    }

    // Ribs
    for (let i = 0; i < 4; i++) {
      const ribGeom = new THREE.TorusGeometry(0.1, 0.02, 4, 8, Math.PI);
      const rib = new THREE.Mesh(ribGeom, fossilMat);
      rib.position.set(-0.2 + i * 0.12, -0.1, 0.16);
      rib.rotation.x = Math.PI / 2;
      fossilGroup.add(rib);
    }

    // Skull
    const skullGeom = new THREE.SphereGeometry(0.12, 6, 4);
    const skull = new THREE.Mesh(skullGeom, fossilMat);
    skull.scale.set(1.3, 0.8, 1);
    skull.position.set(0.45, 0.05, 0.16);
    fossilGroup.add(skull);

    this.scene.add(fossilGroup);
    this.decorations.push(fossilGroup);

    // Footprint fossils on the ground
    for (let i = 0; i < 3; i++) {
      const footprint = new THREE.Group();
      footprint.position.set(-boardWidth / 4 + i * 0.8, y + 0.13, z + 0.5 + i * 0.3);
      footprint.rotation.x = -Math.PI / 2;
      footprint.rotation.z = 0.2 * (i % 2 === 0 ? 1 : -1);

      const mainGeom = new THREE.CircleGeometry(0.15, 8);
      const main = new THREE.Mesh(mainGeom, fossilMat);
      main.scale.set(0.8, 1.2, 1);
      footprint.add(main);

      // Toes
      for (let t = 0; t < 3; t++) {
        const toeGeom = new THREE.CircleGeometry(0.05, 6);
        const toe = new THREE.Mesh(toeGeom, fossilMat);
        toe.position.set((t - 1) * 0.1, 0.18, 0.01);
        footprint.add(toe);
      }

      this.scene.add(footprint);
      this.decorations.push(footprint);
    }
  },

  // =============================================
  // ALIEN INVASION DECORATIONS
  // =============================================

  // Create alien creatures
  createAlienCreatures: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    // Main alien figure
    const alien = new THREE.Group();
    alien.position.set(-boardWidth / 4, y + 0.5, z - 1.5);

    // Alien body (elongated)
    const bodyGeom = createCapsuleGeometry(0.2, 0.5, 8, 12);
    const alienMat = new THREE.MeshPhongMaterial({
      color: 0x90a4ae,
      emissive: 0x37474f,
      emissiveIntensity: 0.2,
    });
    const body = new THREE.Mesh(bodyGeom, alienMat);
    body.position.y = 0.4;
    alien.add(body);

    // Large alien head
    const headGeom = new THREE.SphereGeometry(0.3, 12, 8);
    const head = new THREE.Mesh(headGeom, alienMat);
    head.scale.set(1, 1.3, 1);
    head.position.y = 1;
    alien.add(head);

    // Large black eyes
    for (let side = -1; side <= 1; side += 2) {
      const eyeGeom = new THREE.SphereGeometry(0.12, 8, 6);
      const eyeMat = new THREE.MeshPhongMaterial({
        color: 0x000000,
        specular: 0x666666,
        shininess: 100,
      });
      const eye = new THREE.Mesh(eyeGeom, eyeMat);
      eye.scale.set(0.7, 1, 0.5);
      eye.position.set(side * 0.12, 1.05, 0.2);
      eye.rotation.y = side * 0.3;
      alien.add(eye);
    }

    // Thin arms
    for (let side = -1; side <= 1; side += 2) {
      const armGeom = createCapsuleGeometry(0.04, 0.4, 4, 8);
      const arm = new THREE.Mesh(armGeom, alienMat);
      arm.position.set(side * 0.25, 0.5, 0);
      arm.rotation.z = side * 0.5;
      alien.add(arm);

      // Long fingers
      for (let f = 0; f < 3; f++) {
        const fingerGeom = new THREE.CylinderGeometry(0.015, 0.01, 0.12, 4);
        const finger = new THREE.Mesh(fingerGeom, alienMat);
        finger.position.set(side * 0.4, 0.3, (f - 1) * 0.05);
        finger.rotation.z = side * 0.8;
        alien.add(finger);
      }
    }

    alien.userData = { floatOffset: Math.random() * Math.PI * 2 };
    this.scene.add(alien);
    this.decorations.push(alien);

    // Small alien companion
    const smallAlien = new THREE.Group();
    smallAlien.position.set(boardWidth / 4, y + 0.3, z - 1);
    smallAlien.scale.set(0.5, 0.5, 0.5);

    const smallBody = new THREE.Mesh(bodyGeom, alienMat);
    smallBody.position.y = 0.4;
    smallAlien.add(smallBody);

    const smallHead = new THREE.Mesh(headGeom, alienMat);
    smallHead.scale.set(1.2, 1.5, 1);
    smallHead.position.y = 1;
    smallAlien.add(smallHead);

    for (let side = -1; side <= 1; side += 2) {
      const smallEye = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 6),
        new THREE.MeshPhongMaterial({ color: 0x000000, specular: 0x666666 })
      );
      smallEye.scale.set(0.7, 1, 0.5);
      smallEye.position.set(side * 0.15, 1.1, 0.22);
      smallAlien.add(smallEye);
    }

    smallAlien.userData = { floatOffset: Math.random() * Math.PI * 2 + 1 };
    this.scene.add(smallAlien);
    this.decorations.push(smallAlien);
  },

  // Create alien pods/cocoons
  createAlienPods: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    for (let i = 0; i < 3; i++) {
      const pod = new THREE.Group();
      pod.position.set((i - 1) * (boardWidth / 4), y + 0.3, z + 1.2);

      // Pod shell
      const shellGeom = new THREE.SphereGeometry(0.25, 8, 6);
      const shellMat = new THREE.MeshPhongMaterial({
        color: 0x1b5e20,
        emissive: 0x00ff44,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.8,
      });
      const shell = new THREE.Mesh(shellGeom, shellMat);
      shell.scale.set(0.8, 1.2, 0.8);
      pod.add(shell);

      // Inner glow
      const innerGeom = new THREE.SphereGeometry(0.15, 6, 4);
      const innerMat = new THREE.MeshPhongMaterial({
        color: 0x00ff88,
        emissive: 0x00ff88,
        emissiveIntensity: 0.8,
      });
      const inner = new THREE.Mesh(innerGeom, innerMat);
      inner.position.y = 0.05;
      pod.add(inner);

      // Tendrils at base
      for (let t = 0; t < 4; t++) {
        const tendrilGeom = new THREE.CylinderGeometry(0.02, 0.01, 0.15, 4);
        const tendrilMat = new THREE.MeshPhongMaterial({ color: 0x2e7d32 });
        const tendril = new THREE.Mesh(tendrilGeom, tendrilMat);
        const angle = (t / 4) * Math.PI * 2;
        tendril.position.set(Math.cos(angle) * 0.15, -0.2, Math.sin(angle) * 0.15);
        tendril.rotation.x = 0.5;
        tendril.rotation.z = angle;
        pod.add(tendril);
      }

      pod.userData = { pulseOffset: i * Math.PI / 2 };
      this.scene.add(pod);
      this.decorations.push(pod);
    }
  },

  // Create alien tentacles coming from edges
  createTentacles: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      const tentacleGroup = new THREE.Group();
      tentacleGroup.position.set(side * (boardWidth / 2 - 0.3), y + 0.5, z);

      const tentacleMat = new THREE.MeshPhongMaterial({
        color: 0x4a148c,
        emissive: 0x7b1fa2,
        emissiveIntensity: 0.3,
      });

      // Multiple tentacle segments creating a curve
      for (let t = 0; t < 3; t++) {
        const tentacle = new THREE.Group();
        tentacle.position.set(0, t * 0.3, t * 0.2);

        for (let s = 0; s < 6; s++) {
          const segGeom = new THREE.SphereGeometry(0.1 - s * 0.012, 6, 4);
          const seg = new THREE.Mesh(segGeom, tentacleMat);
          seg.position.set(-side * s * 0.12, Math.sin(s * 0.5) * 0.1, s * 0.05);
          tentacle.add(seg);
        }

        // Suction cups
        for (let s = 0; s < 4; s++) {
          const cupGeom = new THREE.TorusGeometry(0.03, 0.01, 4, 8);
          const cupMat = new THREE.MeshPhongMaterial({ color: 0x9c27b0 });
          const cup = new THREE.Mesh(cupGeom, cupMat);
          cup.position.set(-side * (s + 1) * 0.12, -0.05, s * 0.05);
          cup.rotation.x = Math.PI / 2;
          tentacle.add(cup);
        }

        tentacleGroup.add(tentacle);
      }

      tentacleGroup.userData = { waveOffset: side * Math.PI };
      this.scene.add(tentacleGroup);
      this.decorations.push(tentacleGroup);
    }
  },

  // Create glowing crop circles on the ground
  createCropCircles: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const circleGroup = new THREE.Group();
    circleGroup.position.set(0, y + 0.13, z + 0.5);
    circleGroup.rotation.x = -Math.PI / 2;

    const circleMat = new THREE.MeshPhongMaterial({
      color: 0x00ff44,
      emissive: 0x00ff44,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.6,
    });

    // Outer ring
    const outerGeom = new THREE.RingGeometry(0.8, 0.9, 24);
    const outer = new THREE.Mesh(outerGeom, circleMat);
    circleGroup.add(outer);

    // Inner rings
    for (let i = 0; i < 3; i++) {
      const ringGeom = new THREE.RingGeometry(0.2 + i * 0.2, 0.25 + i * 0.2, 16);
      const ring = new THREE.Mesh(ringGeom, circleMat);
      circleGroup.add(ring);
    }

    // Center dot
    const centerGeom = new THREE.CircleGeometry(0.1, 12);
    const center = new THREE.Mesh(centerGeom, circleMat);
    circleGroup.add(center);

    // Connecting lines
    for (let i = 0; i < 4; i++) {
      const lineGeom = new THREE.PlaneGeometry(0.05, 0.4);
      const line = new THREE.Mesh(lineGeom, circleMat);
      line.rotation.z = (i / 4) * Math.PI * 2;
      line.position.set(Math.cos((i / 4) * Math.PI * 2) * 0.5, Math.sin((i / 4) * Math.PI * 2) * 0.5, 0);
      circleGroup.add(line);
    }

    circleGroup.userData = { glowPulse: 0 };
    this.scene.add(circleGroup);
    this.decorations.push(circleGroup);
  },

  // =============================================
  // PIRATE COVE DECORATIONS
  // =============================================

  // Create pirate cannon
  createCannon: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      const cannon = new THREE.Group();
      cannon.position.set(side * (boardWidth / 3), y + 0.3, z - 1.5);
      cannon.rotation.y = -side * 0.4;

      // Cannon barrel
      const barrelGeom = new THREE.CylinderGeometry(0.12, 0.15, 0.7, 12);
      const barrelMat = new THREE.MeshPhongMaterial({
        color: 0x37474f,
        specular: 0x607d8b,
        shininess: 60,
      });
      const barrel = new THREE.Mesh(barrelGeom, barrelMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = 0.35;
      cannon.add(barrel);

      // Barrel opening ring
      const ringGeom = new THREE.TorusGeometry(0.13, 0.03, 8, 16);
      const ring = new THREE.Mesh(ringGeom, barrelMat);
      ring.position.z = 0.7;
      cannon.add(ring);

      // Cannon base/carriage
      const baseGeom = new THREE.BoxGeometry(0.35, 0.15, 0.5);
      const baseMat = new THREE.MeshPhongMaterial({ color: 0x5d4037 });
      const base = new THREE.Mesh(baseGeom, baseMat);
      base.position.y = -0.1;
      base.position.z = 0.15;
      cannon.add(base);

      // Wheels
      for (let w = -1; w <= 1; w += 2) {
        const wheelGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12);
        const wheelMat = new THREE.MeshPhongMaterial({ color: 0x3e2723 });
        const wheel = new THREE.Mesh(wheelGeom, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(w * 0.22, -0.1, 0.1);
        cannon.add(wheel);

        // Wheel spokes
        for (let s = 0; s < 4; s++) {
          const spokeGeom = new THREE.BoxGeometry(0.02, 0.2, 0.02);
          const spoke = new THREE.Mesh(spokeGeom, wheelMat);
          spoke.rotation.z = (s / 4) * Math.PI;
          spoke.position.set(w * 0.22, -0.1, 0.1);
          cannon.add(spoke);
        }
      }

      // Cannonball stack nearby
      const ballMat = new THREE.MeshPhongMaterial({ color: 0x212121 });
      for (let b = 0; b < 3; b++) {
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), ballMat);
        ball.position.set(-side * 0.3, 0.06, -0.1 + b * 0.13);
        cannon.add(ball);
      }

      this.scene.add(cannon);
      this.decorations.push(cannon);
    }
  },

  // Create ship's wheel
  createShipWheel: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const wheel = new THREE.Group();
    wheel.position.set(0, y + 1.5, z - 2.5);

    // Wheel rim
    const rimGeom = new THREE.TorusGeometry(0.5, 0.05, 8, 24);
    const woodMat = new THREE.MeshPhongMaterial({
      color: 0x5d4037,
      specular: 0x3e2723,
    });
    const rim = new THREE.Mesh(rimGeom, woodMat);
    wheel.add(rim);

    // Inner rim
    const innerRimGeom = new THREE.TorusGeometry(0.2, 0.04, 8, 16);
    const innerRim = new THREE.Mesh(innerRimGeom, woodMat);
    wheel.add(innerRim);

    // Spokes with handles
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;

      // Spoke
      const spokeGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6);
      const spoke = new THREE.Mesh(spokeGeom, woodMat);
      spoke.position.set(Math.cos(angle) * 0.35, Math.sin(angle) * 0.35, 0);
      spoke.rotation.z = angle + Math.PI / 2;
      wheel.add(spoke);

      // Handle
      const handleGeom = new THREE.CylinderGeometry(0.03, 0.025, 0.15, 6);
      const handle = new THREE.Mesh(handleGeom, woodMat);
      handle.position.set(Math.cos(angle) * 0.6, Math.sin(angle) * 0.6, 0);
      wheel.add(handle);
    }

    // Center hub
    const hubGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 12);
    const hub = new THREE.Mesh(hubGeom, woodMat);
    hub.rotation.x = Math.PI / 2;
    wheel.add(hub);

    // Gold center cap
    const capGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8);
    const capMat = new THREE.MeshPhongMaterial({
      color: 0xffd700,
      emissive: 0x886600,
      emissiveIntensity: 0.3,
    });
    const cap = new THREE.Mesh(capGeom, capMat);
    cap.rotation.x = Math.PI / 2;
    wheel.add(cap);

    wheel.userData = { rotationSpeed: 0.3 };
    this.scene.add(wheel);
    this.decorations.push(wheel);
  },

  // Create anchor decoration
  createAnchor: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const anchor = new THREE.Group();
    anchor.position.set(boardWidth / 3.5, y + 0.8, z - 2.2);
    anchor.rotation.z = 0.2;

    const anchorMat = new THREE.MeshPhongMaterial({
      color: 0x37474f,
      specular: 0x607d8b,
    });

    // Main shaft
    const shaftGeom = new THREE.CylinderGeometry(0.06, 0.06, 1, 8);
    const shaft = new THREE.Mesh(shaftGeom, anchorMat);
    anchor.add(shaft);

    // Ring at top
    const ringGeom = new THREE.TorusGeometry(0.12, 0.03, 8, 16);
    const ring = new THREE.Mesh(ringGeom, anchorMat);
    ring.position.y = 0.55;
    anchor.add(ring);

    // Cross bar
    const crossGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8);
    const cross = new THREE.Mesh(crossGeom, anchorMat);
    cross.rotation.z = Math.PI / 2;
    cross.position.y = 0.35;
    anchor.add(cross);

    // Curved flukes (arms)
    for (let side = -1; side <= 1; side += 2) {
      const flukeGeom = new THREE.TorusGeometry(0.2, 0.04, 8, 12, Math.PI / 2);
      const fluke = new THREE.Mesh(flukeGeom, anchorMat);
      fluke.position.set(side * 0.15, -0.4, 0);
      fluke.rotation.z = side > 0 ? 0 : Math.PI;
      fluke.rotation.y = Math.PI / 2;
      anchor.add(fluke);

      // Fluke point
      const pointGeom = new THREE.ConeGeometry(0.06, 0.15, 6);
      const point = new THREE.Mesh(pointGeom, anchorMat);
      point.position.set(side * 0.35, -0.4, 0);
      point.rotation.z = -side * Math.PI / 3;
      anchor.add(point);
    }

    this.scene.add(anchor);
    this.decorations.push(anchor);
  },

  // Create skull and crossbones
  createSkulls: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    // Main skull on back wall
    const skullGroup = new THREE.Group();
    skullGroup.position.set(-boardWidth / 4, y + 1.8, z - 2.8);

    const boneMat = new THREE.MeshPhongMaterial({
      color: 0xf5f5dc,
      specular: 0xffffff,
    });

    // Skull
    const skullGeom = new THREE.SphereGeometry(0.25, 10, 8);
    const skull = new THREE.Mesh(skullGeom, boneMat);
    skull.scale.set(1, 1.1, 0.9);
    skullGroup.add(skull);

    // Eye sockets
    const socketMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
    for (let side = -1; side <= 1; side += 2) {
      const socket = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), socketMat);
      socket.position.set(side * 0.1, 0.05, 0.2);
      skullGroup.add(socket);
    }

    // Nose hole
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.06, 3), socketMat);
    nose.rotation.x = Math.PI;
    nose.position.set(0, -0.05, 0.22);
    skullGroup.add(nose);

    // Jaw
    const jawGeom = new THREE.SphereGeometry(0.15, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const jaw = new THREE.Mesh(jawGeom, boneMat);
    jaw.position.y = -0.15;
    jaw.rotation.x = Math.PI;
    skullGroup.add(jaw);

    // Crossbones
    for (let i = 0; i < 2; i++) {
      const boneGeom = createCapsuleGeometry(0.04, 0.5, 4, 8);
      const bone = new THREE.Mesh(boneGeom, boneMat);
      bone.rotation.z = i === 0 ? 0.5 : -0.5;
      bone.position.y = -0.3;
      skullGroup.add(bone);

      // Bone ends
      for (let end = -1; end <= 1; end += 2) {
        const endGeom = new THREE.SphereGeometry(0.05, 6, 4);
        const endMesh = new THREE.Mesh(endGeom, boneMat);
        const angle = i === 0 ? 0.5 : -0.5;
        endMesh.position.set(Math.cos(angle + Math.PI / 2) * end * 0.3, -0.3 + Math.sin(angle + Math.PI / 2) * end * 0.3, 0);
        skullGroup.add(endMesh);
      }
    }

    this.scene.add(skullGroup);
    this.decorations.push(skullGroup);
  },

  // Create wooden barrels
  createBarrels: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const positions = [
      { x: -boardWidth / 2.5, rot: 0 },
      { x: boardWidth / 2.5, rot: 0.3 },
    ];

    for (const pos of positions) {
      const barrel = new THREE.Group();
      barrel.position.set(pos.x, y + 0.35, z + 1);
      barrel.rotation.z = pos.rot;

      // Barrel body
      const bodyGeom = new THREE.CylinderGeometry(0.22, 0.2, 0.5, 12);
      const bodyMat = new THREE.MeshPhongMaterial({ color: 0x6d4c41 });
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      barrel.add(body);

      // Metal bands
      const bandMat = new THREE.MeshPhongMaterial({ color: 0x5d4037 });
      for (let b = -1; b <= 1; b++) {
        const bandGeom = new THREE.TorusGeometry(0.21 + Math.abs(b) * 0.01, 0.015, 8, 16);
        const band = new THREE.Mesh(bandGeom, bandMat);
        band.position.y = b * 0.18;
        band.rotation.x = Math.PI / 2;
        barrel.add(band);
      }

      // Wood grain lines
      for (let i = 0; i < 8; i++) {
        const lineGeom = new THREE.BoxGeometry(0.01, 0.48, 0.01);
        const lineMat = new THREE.MeshPhongMaterial({ color: 0x4e342e });
        const line = new THREE.Mesh(lineGeom, lineMat);
        const angle = (i / 8) * Math.PI * 2;
        line.position.set(Math.cos(angle) * 0.2, 0, Math.sin(angle) * 0.2);
        barrel.add(line);
      }

      this.scene.add(barrel);
      this.decorations.push(barrel);
    }
  },

  // =============================================
  // CANDY KINGDOM DECORATIONS
  // =============================================

  // Create gumball machine
  createGumballMachine: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const machine = new THREE.Group();
    machine.position.set(0, y + 0.5, z - 2);

    // Base
    const baseGeom = new THREE.CylinderGeometry(0.3, 0.35, 0.3, 12);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0xff1744 });
    const base = new THREE.Mesh(baseGeom, baseMat);
    machine.add(base);

    // Glass globe
    const globeGeom = new THREE.SphereGeometry(0.4, 16, 12);
    const globeMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      specular: 0xffffff,
      shininess: 100,
    });
    const globe = new THREE.Mesh(globeGeom, globeMat);
    globe.position.y = 0.5;
    machine.add(globe);

    // Gumballs inside
    const gumballColors = [0xff4081, 0x7c4dff, 0x00e5ff, 0xffeb3b, 0x76ff03, 0xff5722];
    for (let i = 0; i < 15; i++) {
      const gumball = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 6),
        new THREE.MeshPhongMaterial({
          color: gumballColors[i % gumballColors.length],
          emissive: gumballColors[i % gumballColors.length],
          emissiveIntensity: 0.2,
        })
      );
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.25;
      const height = 0.3 + Math.random() * 0.4;
      gumball.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      machine.add(gumball);
    }

    // Top cap
    const capGeom = new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const cap = new THREE.Mesh(capGeom, baseMat);
    cap.position.y = 0.9;
    machine.add(cap);

    // Coin slot
    const slotGeom = new THREE.BoxGeometry(0.08, 0.15, 0.05);
    const slotMat = new THREE.MeshPhongMaterial({ color: 0xffd700 });
    const slot = new THREE.Mesh(slotGeom, slotMat);
    slot.position.set(0, 0.05, 0.33);
    machine.add(slot);

    this.scene.add(machine);
    this.decorations.push(machine);
  },

  // Create candy canes
  createCandyCanes: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      const posX = side * (boardWidth / 2.5);
      const posZ = z - 1.5;
      const cane = new THREE.Group();
      cane.position.set(posX, y + 0.6, posZ);

      // Straight part
      const straightGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8);
      const whiteMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
      const straight = new THREE.Mesh(straightGeom, whiteMat);
      straight.position.y = 0.4;
      cane.add(straight);

      // Curved hook
      const hookGeom = new THREE.TorusGeometry(0.15, 0.08, 8, 12, Math.PI);
      const hook = new THREE.Mesh(hookGeom, whiteMat);
      hook.position.set(-0.15, 0.8, 0);
      hook.rotation.z = Math.PI / 2;
      cane.add(hook);

      // Red stripes
      const redMat = new THREE.MeshPhongMaterial({ color: 0xff1744 });
      for (let i = 0; i < 6; i++) {
        const stripeGeom = new THREE.TorusGeometry(0.085, 0.02, 4, 8);
        const stripe = new THREE.Mesh(stripeGeom, redMat);
        stripe.position.y = 0.1 + i * 0.12;
        stripe.rotation.x = Math.PI / 2;
        cane.add(stripe);
      }

      // Add collision for the candy cane
      this.addDecorationCollision(posX, y + 0.9, posZ, 0.15);

      this.scene.add(cane);
      this.decorations.push(cane);
    }
  },

  // Create cupcakes
  createCupcakes: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const positions = [-boardWidth / 4, boardWidth / 4];
    const frostingColors = [0xff80ab, 0x82b1ff, 0xb388ff];

    for (let i = 0; i < positions.length; i++) {
      const cupcake = new THREE.Group();
      cupcake.position.set(positions[i], y + 0.25, z + 0.8);

      // Wrapper (ridged cup)
      const wrapperGeom = new THREE.CylinderGeometry(0.2, 0.15, 0.25, 12);
      const wrapperMat = new THREE.MeshPhongMaterial({ color: 0xff4081 });
      const wrapper = new THREE.Mesh(wrapperGeom, wrapperMat);
      cupcake.add(wrapper);

      // Wrapper ridges
      for (let r = 0; r < 12; r++) {
        const ridgeGeom = new THREE.BoxGeometry(0.02, 0.25, 0.08);
        const ridge = new THREE.Mesh(ridgeGeom, wrapperMat);
        const angle = (r / 12) * Math.PI * 2;
        ridge.position.set(Math.cos(angle) * 0.18, 0, Math.sin(angle) * 0.18);
        ridge.rotation.y = angle;
        cupcake.add(ridge);
      }

      // Frosting swirl
      const frostingMat = new THREE.MeshPhongMaterial({
        color: frostingColors[i % frostingColors.length],
        emissive: frostingColors[i % frostingColors.length],
        emissiveIntensity: 0.2,
      });
      const frostingGeom = new THREE.SphereGeometry(0.18, 12, 8);
      const frosting = new THREE.Mesh(frostingGeom, frostingMat);
      frosting.scale.y = 0.8;
      frosting.position.y = 0.2;
      cupcake.add(frosting);

      // Frosting peak
      const peakGeom = new THREE.ConeGeometry(0.1, 0.15, 8);
      const peak = new THREE.Mesh(peakGeom, frostingMat);
      peak.position.y = 0.35;
      cupcake.add(peak);

      // Cherry on top
      const cherryGeom = new THREE.SphereGeometry(0.06, 8, 6);
      const cherryMat = new THREE.MeshPhongMaterial({
        color: 0xff1744,
        specular: 0xffffff,
        shininess: 100,
      });
      const cherry = new THREE.Mesh(cherryGeom, cherryMat);
      cherry.position.y = 0.45;
      cupcake.add(cherry);

      // Sprinkles
      for (let s = 0; s < 8; s++) {
        const sprinkleGeom = new THREE.CylinderGeometry(0.01, 0.01, 0.04, 4);
        const sprinkleColors = [0xffeb3b, 0x00e5ff, 0x76ff03, 0xff5722];
        const sprinkleMat = new THREE.MeshPhongMaterial({ color: sprinkleColors[s % 4] });
        const sprinkle = new THREE.Mesh(sprinkleGeom, sprinkleMat);
        const angle = (s / 8) * Math.PI * 2;
        sprinkle.position.set(Math.cos(angle) * 0.12, 0.25, Math.sin(angle) * 0.12);
        sprinkle.rotation.z = Math.random() * Math.PI;
        cupcake.add(sprinkle);
      }

      this.scene.add(cupcake);
      this.decorations.push(cupcake);
    }
  },

  // Create ice cream cones
  createIceCream: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const cone = new THREE.Group();
    cone.position.set(boardWidth / 3, y + 0.5, z - 1);

    // Waffle cone
    const coneGeom = new THREE.ConeGeometry(0.2, 0.5, 12);
    const coneMat = new THREE.MeshPhongMaterial({ color: 0xd4a574 });
    const coneMesh = new THREE.Mesh(coneGeom, coneMat);
    cone.add(coneMesh);

    // Cone waffle pattern
    for (let i = 0; i < 8; i++) {
      const lineGeom = new THREE.CylinderGeometry(0.005, 0.005, 0.5, 4);
      const lineMat = new THREE.MeshPhongMaterial({ color: 0xb8860b });
      const line = new THREE.Mesh(lineGeom, lineMat);
      const angle = (i / 8) * Math.PI * 2;
      line.position.set(Math.cos(angle) * 0.12, 0, Math.sin(angle) * 0.12);
      cone.add(line);
    }

    // Ice cream scoops
    const scoopColors = [0xffc0cb, 0x8b4513, 0xf5f5dc]; // Pink, chocolate, vanilla
    for (let s = 0; s < 3; s++) {
      const scoopGeom = new THREE.SphereGeometry(0.18 - s * 0.02, 12, 8);
      const scoopMat = new THREE.MeshPhongMaterial({
        color: scoopColors[s],
        specular: 0xffffff,
        shininess: 30,
      });
      const scoop = new THREE.Mesh(scoopGeom, scoopMat);
      scoop.position.y = 0.35 + s * 0.25;
      cone.add(scoop);
    }

    // Chocolate drizzle
    const drizzleMat = new THREE.MeshPhongMaterial({ color: 0x5d4037 });
    for (let d = 0; d < 5; d++) {
      const drizzleGeom = new THREE.CylinderGeometry(0.015, 0.01, 0.1, 4);
      const drizzle = new THREE.Mesh(drizzleGeom, drizzleMat);
      const angle = (d / 5) * Math.PI * 2;
      drizzle.position.set(Math.cos(angle) * 0.1, 0.8, Math.sin(angle) * 0.1);
      drizzle.rotation.z = Math.random() * 0.5;
      cone.add(drizzle);
    }

    this.scene.add(cone);
    this.decorations.push(cone);
  },

  // Create donuts
  createDonuts: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const donutColors = [0xff80ab, 0x82b1ff, 0xffeb3b];

    for (let i = 0; i < 3; i++) {
      const donut = new THREE.Group();
      donut.position.set(-boardWidth / 3 + i * 0.5, y + 0.25, z + 1.5);
      donut.rotation.x = Math.PI / 2 + (i - 1) * 0.2;

      // Donut base
      const baseGeom = new THREE.TorusGeometry(0.15, 0.08, 12, 16);
      const baseMat = new THREE.MeshPhongMaterial({ color: 0xd4a574 });
      const base = new THREE.Mesh(baseGeom, baseMat);
      donut.add(base);

      // Frosting
      const frostingGeom = new THREE.TorusGeometry(0.15, 0.06, 12, 16);
      const frostingMat = new THREE.MeshPhongMaterial({
        color: donutColors[i],
        emissive: donutColors[i],
        emissiveIntensity: 0.2,
      });
      const frosting = new THREE.Mesh(frostingGeom, frostingMat);
      frosting.position.z = 0.03;
      donut.add(frosting);

      // Sprinkles on donut
      for (let s = 0; s < 10; s++) {
        const sprinkleGeom = new THREE.BoxGeometry(0.015, 0.04, 0.01);
        const sprinkleColors = [0xff1744, 0xffeb3b, 0x00e5ff, 0x76ff03];
        const sprinkleMat = new THREE.MeshPhongMaterial({ color: sprinkleColors[s % 4] });
        const sprinkle = new THREE.Mesh(sprinkleGeom, sprinkleMat);
        const angle = (s / 10) * Math.PI * 2;
        sprinkle.position.set(Math.cos(angle) * 0.15, Math.sin(angle) * 0.15, 0.08);
        sprinkle.rotation.z = Math.random() * Math.PI;
        donut.add(sprinkle);
      }

      this.scene.add(donut);
      this.decorations.push(donut);
    }
  },

  // =============================================
  // SPACE STATION DECORATIONS
  // =============================================

  // Create asteroid
  createAsteroid: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const asteroid = new THREE.Group();
    asteroid.position.set(0, y + 1.5, z - 2);

    // Main asteroid body (irregular shape)
    const asteroidGeom = new THREE.DodecahedronGeometry(0.5, 1);
    const asteroidMat = new THREE.MeshPhongMaterial({
      color: 0x5d4037,
      specular: 0x3e2723,
      flatShading: true,
    });
    const main = new THREE.Mesh(asteroidGeom, asteroidMat);
    main.scale.set(1.2, 0.8, 1);
    asteroid.add(main);

    // Craters
    const craterMat = new THREE.MeshPhongMaterial({ color: 0x3e2723 });
    for (let i = 0; i < 5; i++) {
      const craterGeom = new THREE.SphereGeometry(0.08 + Math.random() * 0.05, 8, 6);
      const crater = new THREE.Mesh(craterGeom, craterMat);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      crater.position.set(
        Math.sin(phi) * Math.cos(theta) * 0.45,
        Math.sin(phi) * Math.sin(theta) * 0.35,
        Math.cos(phi) * 0.45
      );
      crater.scale.y = 0.3;
      asteroid.add(crater);
    }

    asteroid.userData = { rotationSpeed: 0.2 };
    this.scene.add(asteroid);
    this.decorations.push(asteroid);
  },

  // Create planets
  createPlanets: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    // Saturn-like planet
    const saturn = new THREE.Group();
    saturn.position.set(-boardWidth / 3, y + 2, z - 2.5);
    saturn.rotation.z = 0.3;

    const planetGeom = new THREE.SphereGeometry(0.35, 16, 12);
    const planetMat = new THREE.MeshPhongMaterial({
      color: 0xffd54f,
      emissive: 0x886600,
      emissiveIntensity: 0.1,
    });
    const planet = new THREE.Mesh(planetGeom, planetMat);
    saturn.add(planet);

    // Saturn's rings
    const ringGeom = new THREE.RingGeometry(0.5, 0.75, 32);
    const ringMat = new THREE.MeshPhongMaterial({
      color: 0xd4a574,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    saturn.add(ring);

    saturn.userData = { rotationSpeed: 0.1 };
    this.scene.add(saturn);
    this.decorations.push(saturn);

    // Small blue planet
    const bluePlanet = new THREE.Group();
    bluePlanet.position.set(boardWidth / 3, y + 1.8, z - 2.2);

    const blueGeom = new THREE.SphereGeometry(0.25, 12, 8);
    const blueMat = new THREE.MeshPhongMaterial({
      color: 0x2196f3,
      emissive: 0x0d47a1,
      emissiveIntensity: 0.2,
    });
    const blue = new THREE.Mesh(blueGeom, blueMat);
    bluePlanet.add(blue);

    // Clouds/atmosphere
    const cloudGeom = new THREE.SphereGeometry(0.27, 12, 8);
    const cloudMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
    });
    const clouds = new THREE.Mesh(cloudGeom, cloudMat);
    bluePlanet.add(clouds);

    bluePlanet.userData = { rotationSpeed: 0.15 };
    this.scene.add(bluePlanet);
    this.decorations.push(bluePlanet);
  },

  // Create satellites
  createSatellites: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const satellite = new THREE.Group();
    satellite.position.set(boardWidth / 4, y + 2.5, z - 1);

    // Satellite body
    const bodyGeom = new THREE.BoxGeometry(0.3, 0.2, 0.2);
    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0xeceff1,
      specular: 0xffffff,
      shininess: 80,
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    satellite.add(body);

    // Solar panels
    for (let side = -1; side <= 1; side += 2) {
      const panelGeom = new THREE.BoxGeometry(0.5, 0.02, 0.3);
      const panelMat = new THREE.MeshPhongMaterial({
        color: 0x1a237e,
        emissive: 0x3f51b5,
        emissiveIntensity: 0.3,
      });
      const panel = new THREE.Mesh(panelGeom, panelMat);
      panel.position.set(side * 0.4, 0, 0);
      satellite.add(panel);

      // Panel grid lines
      for (let g = 0; g < 4; g++) {
        const gridGeom = new THREE.BoxGeometry(0.5, 0.025, 0.01);
        const gridMat = new THREE.MeshPhongMaterial({ color: 0x0d47a1 });
        const grid = new THREE.Mesh(gridGeom, gridMat);
        grid.position.set(side * 0.4, 0.015, -0.1 + g * 0.07);
        satellite.add(grid);
      }
    }

    // Antenna dish
    const dishGeom = new THREE.SphereGeometry(0.1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const dishMat = new THREE.MeshPhongMaterial({ color: 0xbdbdbd });
    const dish = new THREE.Mesh(dishGeom, dishMat);
    dish.rotation.x = -Math.PI / 4;
    dish.position.set(0, 0.15, 0.1);
    satellite.add(dish);

    satellite.userData = { floatOffset: Math.random() * Math.PI * 2, orbitSpeed: 0.2 };
    this.scene.add(satellite);
    this.decorations.push(satellite);
  },

  // Create astronaut
  createAstronaut: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const astronaut = new THREE.Group();
    astronaut.position.set(-boardWidth / 4, y + 1, z - 0.5);
    astronaut.scale.set(0.6, 0.6, 0.6);

    const suitMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      specular: 0xffffff,
      shininess: 30,
    });

    // Helmet
    const helmetGeom = new THREE.SphereGeometry(0.3, 12, 8);
    const helmet = new THREE.Mesh(helmetGeom, suitMat);
    helmet.position.y = 0.8;
    astronaut.add(helmet);

    // Visor
    const visorGeom = new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const visorMat = new THREE.MeshPhongMaterial({
      color: 0xffd700,
      emissive: 0x886600,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.7,
    });
    const visor = new THREE.Mesh(visorGeom, visorMat);
    visor.position.set(0, 0.8, 0.1);
    visor.rotation.x = Math.PI / 2;
    astronaut.add(visor);

    // Body/torso
    const torsoGeom = createCapsuleGeometry(0.25, 0.4, 8, 12);
    const torso = new THREE.Mesh(torsoGeom, suitMat);
    torso.position.y = 0.3;
    astronaut.add(torso);

    // Backpack
    const packGeom = new THREE.BoxGeometry(0.35, 0.4, 0.2);
    const pack = new THREE.Mesh(packGeom, suitMat);
    pack.position.set(0, 0.3, -0.25);
    astronaut.add(pack);

    // Arms
    for (let side = -1; side <= 1; side += 2) {
      const armGeom = createCapsuleGeometry(0.08, 0.3, 4, 8);
      const arm = new THREE.Mesh(armGeom, suitMat);
      arm.position.set(side * 0.35, 0.35, 0);
      arm.rotation.z = side * 0.5;
      astronaut.add(arm);
    }

    // Legs
    for (let side = -1; side <= 1; side += 2) {
      const legGeom = createCapsuleGeometry(0.1, 0.35, 4, 8);
      const leg = new THREE.Mesh(legGeom, suitMat);
      leg.position.set(side * 0.15, -0.2, 0);
      astronaut.add(leg);
    }

    astronaut.userData = { floatOffset: Math.random() * Math.PI * 2 };
    this.scene.add(astronaut);
    this.decorations.push(astronaut);
  },

  // Create space debris
  createSpaceDebris: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const debrisMat = new THREE.MeshPhongMaterial({
      color: 0x607d8b,
      specular: 0x90a4ae,
    });

    for (let i = 0; i < 5; i++) {
      const debris = new THREE.Group();
      debris.position.set(
        (Math.random() - 0.5) * boardWidth * 0.8,
        y + 1 + Math.random() * 1.5,
        z - 1 + Math.random() * 2
      );

      // Random debris shapes
      let geom;
      const shapeType = i % 3;
      if (shapeType === 0) {
        geom = new THREE.BoxGeometry(0.15, 0.1, 0.2);
      } else if (shapeType === 1) {
        geom = new THREE.CylinderGeometry(0.05, 0.05, 0.25, 6);
      } else {
        geom = new THREE.TetrahedronGeometry(0.1);
      }

      const piece = new THREE.Mesh(geom, debrisMat);
      debris.add(piece);

      debris.userData = {
        rotationSpeed: (Math.random() - 0.5) * 2,
        floatOffset: Math.random() * Math.PI * 2,
      };
      this.scene.add(debris);
      this.decorations.push(debris);
    }
  },

  // =============================================
  // JUNGLE SAFARI DECORATIONS
  // =============================================

  // Create hanging vines
  createVines: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      const vineGroup = new THREE.Group();
      vineGroup.position.set(side * (boardWidth / 2 - 0.5), y + 2, z - 1);

      const vineMat = new THREE.MeshPhongMaterial({ color: 0x2e7d32 });

      // Multiple vine strands
      for (let v = 0; v < 3; v++) {
        const vine = new THREE.Group();
        vine.position.x = v * 0.15 * side;

        // Vine segments
        for (let s = 0; s < 8; s++) {
          const segGeom = new THREE.CylinderGeometry(0.03, 0.025, 0.2, 6);
          const seg = new THREE.Mesh(segGeom, vineMat);
          seg.position.set(Math.sin(s * 0.5) * 0.1 * side, -s * 0.18, 0);
          seg.rotation.z = Math.sin(s * 0.5) * 0.3 * side;
          vine.add(seg);
        }

        // Leaves along vine
        const leafMat = new THREE.MeshPhongMaterial({
          color: 0x4caf50,
          side: THREE.DoubleSide,
        });
        for (let l = 0; l < 4; l++) {
          const leafGeom = new THREE.CircleGeometry(0.08, 6);
          const leaf = new THREE.Mesh(leafGeom, leafMat);
          leaf.position.set(
            Math.sin(l * 0.7) * 0.15 * side,
            -l * 0.35 - 0.1,
            0.05
          );
          leaf.rotation.y = side * 0.5;
          leaf.scale.set(0.6, 1, 1);
          vine.add(leaf);
        }

        vineGroup.add(vine);
      }

      vineGroup.userData = { swayOffset: side * Math.PI };
      this.scene.add(vineGroup);
      this.decorations.push(vineGroup);
    }
  },

  // Create jungle trees
  createJungleTrees: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      const tree = new THREE.Group();
      tree.position.set(side * (boardWidth / 2.3), y, z - 2.5);

      // Trunk
      const trunkGeom = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 8);
      const trunkMat = new THREE.MeshPhongMaterial({ color: 0x5d4037 });
      const trunk = new THREE.Mesh(trunkGeom, trunkMat);
      trunk.position.y = 0.75;
      tree.add(trunk);

      // Bark texture (vertical lines)
      for (let i = 0; i < 6; i++) {
        const barkGeom = new THREE.BoxGeometry(0.02, 1.4, 0.02);
        const barkMat = new THREE.MeshPhongMaterial({ color: 0x4e342e });
        const bark = new THREE.Mesh(barkGeom, barkMat);
        const angle = (i / 6) * Math.PI * 2;
        bark.position.set(Math.cos(angle) * 0.16, 0.75, Math.sin(angle) * 0.16);
        tree.add(bark);
      }

      // Foliage layers
      const leafMat = new THREE.MeshPhongMaterial({
        color: 0x2e7d32,
        emissive: 0x1b5e20,
        emissiveIntensity: 0.1,
      });
      for (let layer = 0; layer < 3; layer++) {
        const foliageGeom = new THREE.SphereGeometry(0.5 - layer * 0.1, 8, 6);
        const foliage = new THREE.Mesh(foliageGeom, leafMat);
        foliage.position.y = 1.5 + layer * 0.3;
        foliage.scale.set(1.2, 0.6, 1.2);
        tree.add(foliage);
      }

      this.scene.add(tree);
      this.decorations.push(tree);
    }
  },

  // Create waterfall
  createWaterfall: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const waterfall = new THREE.Group();
    waterfall.position.set(0, y + 1, z - 2.8);

    // Rock formation
    const rockMat = new THREE.MeshPhongMaterial({ color: 0x5d4037 });
    for (let i = 0; i < 5; i++) {
      const rockGeom = new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.2, 0);
      const rock = new THREE.Mesh(rockGeom, rockMat);
      rock.position.set((i - 2) * 0.35, 0.3 + Math.abs(i - 2) * 0.2, 0);
      rock.scale.set(1, 0.7, 0.5);
      waterfall.add(rock);
    }

    // Water stream
    const waterMat = new THREE.MeshPhongMaterial({
      color: 0x4fc3f7,
      emissive: 0x0288d1,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.7,
    });

    const streamGeom = new THREE.BoxGeometry(0.4, 1, 0.1);
    const stream = new THREE.Mesh(streamGeom, waterMat);
    stream.position.set(0, -0.2, 0.2);
    waterfall.add(stream);

    // Water splash at bottom
    for (let i = 0; i < 6; i++) {
      const splashGeom = new THREE.SphereGeometry(0.08, 6, 4);
      const splash = new THREE.Mesh(splashGeom, waterMat);
      const angle = (i / 6) * Math.PI * 2;
      splash.position.set(Math.cos(angle) * 0.25, -0.65, Math.sin(angle) * 0.15 + 0.2);
      waterfall.add(splash);
    }

    // Pool at base
    const poolGeom = new THREE.CylinderGeometry(0.5, 0.4, 0.1, 12);
    const pool = new THREE.Mesh(poolGeom, waterMat);
    pool.position.set(0, -0.75, 0.15);
    waterfall.add(pool);

    waterfall.userData = { waterFlow: 0 };
    this.scene.add(waterfall);
    this.decorations.push(waterfall);
  },

  // Create rocks
  createRocks: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const rockMat = new THREE.MeshPhongMaterial({
      color: 0x757575,
      specular: 0x424242,
      flatShading: true,
    });

    const positions = [
      { x: -boardWidth / 4, scale: 0.8 },
      { x: boardWidth / 4, scale: 0.6 },
      { x: 0, scale: 0.5 },
    ];

    for (const pos of positions) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.25 * pos.scale, 0),
        rockMat
      );
      rock.position.set(pos.x, y + 0.15 * pos.scale, z + 1);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.scale.set(1.2, 0.7, 1);

      // Add collision for rocks
      this.addDecorationCollision(pos.x, y + 0.15 * pos.scale, z + 1, 0.25 * pos.scale);

      this.scene.add(rock);
      this.decorations.push(rock);
    }
  },

  // Create jungle plants
  createJunglePlants: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const plantPositions = [-boardWidth / 3, 0, boardWidth / 3];

    for (let i = 0; i < plantPositions.length; i++) {
      const plant = new THREE.Group();
      plant.position.set(plantPositions[i], y + 0.15, z + 0.5);

      // Fern-like leaves
      const leafMat = new THREE.MeshPhongMaterial({
        color: 0x4caf50,
        side: THREE.DoubleSide,
      });

      for (let l = 0; l < 6; l++) {
        const leafGroup = new THREE.Group();
        leafGroup.rotation.y = (l / 6) * Math.PI * 2;

        // Main leaf stem
        for (let s = 0; s < 5; s++) {
          const segGeom = new THREE.BoxGeometry(0.02, 0.15, 0.04 + s * 0.02);
          const seg = new THREE.Mesh(segGeom, leafMat);
          seg.position.set(0, s * 0.12, 0.1 + s * 0.05);
          seg.rotation.x = -0.3;
          leafGroup.add(seg);
        }

        plant.add(leafGroup);
      }

      // Center unfurling leaf
      const furlGeom = new THREE.ConeGeometry(0.05, 0.3, 6);
      const furlMat = new THREE.MeshPhongMaterial({ color: 0x81c784 });
      const furl = new THREE.Mesh(furlGeom, furlMat);
      furl.position.y = 0.4;
      plant.add(furl);

      this.scene.add(plant);
      this.decorations.push(plant);
    }
  },

  // =============================================
  // ROBOT FACTORY DECORATIONS
  // =============================================

  // Create conveyor belt
  createConveyor: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const conveyor = new THREE.Group();
    conveyor.position.set(0, y + 0.15, z + 0.5);

    // Belt surface
    const beltGeom = new THREE.BoxGeometry(boardWidth * 0.6, 0.05, 1);
    const beltMat = new THREE.MeshPhongMaterial({ color: 0x37474f });
    const belt = new THREE.Mesh(beltGeom, beltMat);
    conveyor.add(belt);

    // Belt treads
    for (let i = 0; i < 8; i++) {
      const treadGeom = new THREE.BoxGeometry(boardWidth * 0.6, 0.02, 0.05);
      const treadMat = new THREE.MeshPhongMaterial({ color: 0x263238 });
      const tread = new THREE.Mesh(treadGeom, treadMat);
      tread.position.set(0, 0.035, -0.4 + i * 0.12);
      conveyor.add(tread);
    }

    // Side rails
    for (let side = -1; side <= 1; side += 2) {
      const railGeom = new THREE.BoxGeometry(0.05, 0.15, 1.1);
      const railMat = new THREE.MeshPhongMaterial({
        color: 0xff6f00,
        emissive: 0xff6f00,
        emissiveIntensity: 0.2,
      });
      const rail = new THREE.Mesh(railGeom, railMat);
      rail.position.set(side * boardWidth * 0.31, 0.05, 0);
      conveyor.add(rail);
    }

    // Rollers at ends
    for (let end = -1; end <= 1; end += 2) {
      const rollerGeom = new THREE.CylinderGeometry(0.08, 0.08, boardWidth * 0.6, 12);
      const rollerMat = new THREE.MeshPhongMaterial({ color: 0x455a64 });
      const roller = new THREE.Mesh(rollerGeom, rollerMat);
      roller.rotation.z = Math.PI / 2;
      roller.position.set(0, -0.02, end * 0.55);
      conveyor.add(roller);
    }

    conveyor.userData = { beltSpeed: 0.5 };
    this.scene.add(conveyor);
    this.decorations.push(conveyor);
  },

  // Create robot figures
  createRobots: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      const robot = new THREE.Group();
      robot.position.set(side * (boardWidth / 3.5), y + 0.5, z - 1.5);

      const metalMat = new THREE.MeshPhongMaterial({
        color: 0x78909c,
        specular: 0xffffff,
        shininess: 80,
      });

      // Robot head (boxy)
      const headGeom = new THREE.BoxGeometry(0.35, 0.3, 0.3);
      const head = new THREE.Mesh(headGeom, metalMat);
      head.position.y = 0.7;
      robot.add(head);

      // Antenna
      const antennaGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6);
      const antenna = new THREE.Mesh(antennaGeom, metalMat);
      antenna.position.set(0, 0.95, 0);
      robot.add(antenna);

      // Antenna ball
      const ballGeom = new THREE.SphereGeometry(0.04, 8, 6);
      const ballMat = new THREE.MeshPhongMaterial({
        color: 0xff1744,
        emissive: 0xff1744,
        emissiveIntensity: 0.5,
      });
      const ball = new THREE.Mesh(ballGeom, ballMat);
      ball.position.set(0, 1.05, 0);
      robot.add(ball);

      // Eyes (LED)
      for (let eyeSide = -1; eyeSide <= 1; eyeSide += 2) {
        const eyeGeom = new THREE.BoxGeometry(0.08, 0.06, 0.05);
        const eyeMat = new THREE.MeshPhongMaterial({
          color: 0x00e676,
          emissive: 0x00e676,
          emissiveIntensity: 0.8,
        });
        const eye = new THREE.Mesh(eyeGeom, eyeMat);
        eye.position.set(eyeSide * 0.1, 0.72, 0.15);
        robot.add(eye);
      }

      // Body
      const bodyGeom = new THREE.BoxGeometry(0.4, 0.5, 0.3);
      const body = new THREE.Mesh(bodyGeom, metalMat);
      body.position.y = 0.3;
      robot.add(body);

      // Chest panel
      const panelGeom = new THREE.BoxGeometry(0.25, 0.3, 0.02);
      const panelMat = new THREE.MeshPhongMaterial({
        color: 0x263238,
        emissive: 0x00e676,
        emissiveIntensity: 0.2,
      });
      const panel = new THREE.Mesh(panelGeom, panelMat);
      panel.position.set(0, 0.32, 0.16);
      robot.add(panel);

      // Panel buttons
      for (let b = 0; b < 3; b++) {
        const btnGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8);
        const btnColors = [0xff1744, 0xffeb3b, 0x00e676];
        const btnMat = new THREE.MeshPhongMaterial({
          color: btnColors[b],
          emissive: btnColors[b],
          emissiveIntensity: 0.5,
        });
        const btn = new THREE.Mesh(btnGeom, btnMat);
        btn.rotation.x = Math.PI / 2;
        btn.position.set(-0.06 + b * 0.06, 0.38, 0.18);
        robot.add(btn);
      }

      // Arms
      for (let armSide = -1; armSide <= 1; armSide += 2) {
        const armGeom = new THREE.BoxGeometry(0.1, 0.35, 0.1);
        const arm = new THREE.Mesh(armGeom, metalMat);
        arm.position.set(armSide * 0.28, 0.25, 0);
        robot.add(arm);

        // Claw hand
        const clawGeom = new THREE.BoxGeometry(0.12, 0.08, 0.06);
        const claw = new THREE.Mesh(clawGeom, metalMat);
        claw.position.set(armSide * 0.28, 0.02, 0);
        robot.add(claw);
      }

      robot.userData = { bobOffset: side * Math.PI };
      this.scene.add(robot);
      this.decorations.push(robot);
    }
  },

  // Create assembly arms
  createAssemblyArms: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    for (let side = -1; side <= 1; side += 2) {
      const arm = new THREE.Group();
      arm.position.set(side * (boardWidth / 2 - 0.5), y + 1.5, z - 0.5);

      const armMat = new THREE.MeshPhongMaterial({
        color: 0xff6f00,
        specular: 0xffffff,
        shininess: 60,
      });

      // Base mount
      const baseGeom = new THREE.CylinderGeometry(0.15, 0.18, 0.2, 12);
      const base = new THREE.Mesh(baseGeom, armMat);
      arm.add(base);

      // Upper arm segment
      const upperGeom = new THREE.BoxGeometry(0.12, 0.6, 0.12);
      const upper = new THREE.Mesh(upperGeom, armMat);
      upper.position.set(-side * 0.1, 0.35, 0);
      upper.rotation.z = side * 0.3;
      arm.add(upper);

      // Joint
      const jointGeom = new THREE.SphereGeometry(0.08, 8, 6);
      const joint = new THREE.Mesh(jointGeom, armMat);
      joint.position.set(-side * 0.25, 0.6, 0);
      arm.add(joint);

      // Lower arm segment
      const lowerGeom = new THREE.BoxGeometry(0.1, 0.5, 0.1);
      const lower = new THREE.Mesh(lowerGeom, armMat);
      lower.position.set(-side * 0.35, 0.35, 0.2);
      lower.rotation.x = 0.5;
      arm.add(lower);

      // Gripper
      const gripperMat = new THREE.MeshPhongMaterial({ color: 0x37474f });
      for (let g = -1; g <= 1; g += 2) {
        const fingerGeom = new THREE.BoxGeometry(0.04, 0.15, 0.04);
        const finger = new THREE.Mesh(fingerGeom, gripperMat);
        finger.position.set(-side * 0.35 + g * 0.05, 0.05, 0.4);
        arm.add(finger);
      }

      arm.userData = { armAngle: 0, armSide: side };
      this.scene.add(arm);
      this.decorations.push(arm);
    }
  },

  // Create monitor screens
  createMonitors: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const monitor = new THREE.Group();
    monitor.position.set(0, y + 1.8, z - 2.8);

    // Monitor frame
    const frameGeom = new THREE.BoxGeometry(1.2, 0.8, 0.1);
    const frameMat = new THREE.MeshPhongMaterial({ color: 0x263238 });
    const frame = new THREE.Mesh(frameGeom, frameMat);
    monitor.add(frame);

    // Screen
    const screenGeom = new THREE.BoxGeometry(1, 0.6, 0.02);
    const screenMat = new THREE.MeshPhongMaterial({
      color: 0x000000,
      emissive: 0x00e676,
      emissiveIntensity: 0.3,
    });
    const screen = new THREE.Mesh(screenGeom, screenMat);
    screen.position.z = 0.06;
    monitor.add(screen);

    // Screen content (data lines)
    for (let i = 0; i < 5; i++) {
      const lineGeom = new THREE.BoxGeometry(0.8 - i * 0.1, 0.03, 0.01);
      const lineMat = new THREE.MeshPhongMaterial({
        color: 0x00e676,
        emissive: 0x00e676,
        emissiveIntensity: 0.8,
      });
      const line = new THREE.Mesh(lineGeom, lineMat);
      line.position.set(-0.05 + (i % 2) * 0.1, 0.2 - i * 0.1, 0.08);
      monitor.add(line);
    }

    // Status indicators
    for (let i = 0; i < 3; i++) {
      const indicatorGeom = new THREE.CircleGeometry(0.04, 8);
      const indicatorColors = [0x00e676, 0xffeb3b, 0xff1744];
      const indicatorMat = new THREE.MeshPhongMaterial({
        color: indicatorColors[i],
        emissive: indicatorColors[i],
        emissiveIntensity: i === 0 ? 0.8 : 0.3,
      });
      const indicator = new THREE.Mesh(indicatorGeom, indicatorMat);
      indicator.position.set(-0.4 + i * 0.15, -0.35, 0.06);
      monitor.add(indicator);
    }

    monitor.userData = { screenFlicker: 0 };
    this.scene.add(monitor);
    this.decorations.push(monitor);
  },

  // Create industrial pipes
  createPipes: function (tierIndex, y, z, boardWidth, tierMats, theme) {
    const pipeMat = new THREE.MeshPhongMaterial({
      color: 0x546e7a,
      specular: 0x90a4ae,
      shininess: 60,
    });

    // Horizontal pipes along back
    for (let i = 0; i < 2; i++) {
      const pipeGeom = new THREE.CylinderGeometry(0.08, 0.08, boardWidth * 0.8, 12);
      const pipe = new THREE.Mesh(pipeGeom, pipeMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, y + 2.2 + i * 0.3, z - 2.5);
      this.scene.add(pipe);
      this.decorations.push(pipe);

      // Pipe joints
      for (let j = -1; j <= 1; j += 2) {
        const jointGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 12);
        const joint = new THREE.Mesh(jointGeom, pipeMat);
        joint.rotation.z = Math.PI / 2;
        joint.position.set(j * boardWidth * 0.35, y + 2.2 + i * 0.3, z - 2.5);
        this.scene.add(joint);
        this.decorations.push(joint);
      }
    }

    // Vertical connector pipes
    for (let side = -1; side <= 1; side += 2) {
      const vertPipeGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 10);
      const vertPipe = new THREE.Mesh(vertPipeGeom, pipeMat);
      vertPipe.position.set(side * boardWidth * 0.35, y + 2.35, z - 2.5);
      this.scene.add(vertPipe);
      this.decorations.push(vertPipe);

      // Steam vent
      const ventGeom = new THREE.ConeGeometry(0.08, 0.15, 8);
      const ventMat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4,
      });
      const vent = new THREE.Mesh(ventGeom, ventMat);
      vent.position.set(side * boardWidth * 0.35, y + 2.6, z - 2.5);
      vent.userData = { steamPuff: Math.random() * Math.PI * 2 };
      this.scene.add(vent);
      this.decorations.push(vent);
    }
  },

  // Create bonus zones on shelf with themed styling
  createShelfBonusZones: function (tierIndex, shelfY, shelfZ, boardWidth, tierMats) {
    const types = ["queue", "multiplier", "powerup"];
    const colors = [0x29b6f6, 0xffee58, 0xce93d8];
    const zoneSpacing = Math.min(boardWidth / 4, 3.5);

    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * zoneSpacing;
      const z = shelfZ;
      const color = colors[i];

      const zoneMat = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.8,
      });

      // Outer ring
      const ringGeom = new THREE.TorusGeometry(0.5, 0.08, 8, 24);
      const ring = new THREE.Mesh(ringGeom, zoneMat);
      ring.position.set(x, shelfY + 0.15, z);
      ring.rotation.x = Math.PI / 2;
      this.scene.add(ring);

      // Inner circle
      const circleGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16);
      const circle = new THREE.Mesh(circleGeom, zoneMat);
      circle.position.set(x, shelfY + 0.15, z);
      this.scene.add(circle);

      this.bonusZones.push({
        x: x,
        y: shelfY,
        z: z,
        radius: 0.6,
        type: types[i],
        mesh: ring,
        innerMesh: circle,
        tierIndex: tierIndex,
      });
    }
  },

  // Create scoring slots at the bottom
  createScoringSlots: function (baseY, frontZ) {
    const slotCount = 7;
    const bottomTierWidth = this.baseBoardWidth + (this.currentTierCount - 1) * this.tierWidthIncrease;
    const boardWidth = bottomTierWidth + 2; // Slightly wider to catch everything
    const slotWidth = boardWidth / slotCount;
    const slotHeight = 2.5;

    if (frontZ === undefined) {
      const bottomTierZ = (this.currentTierCount - 1) * this.tierOffsetZ;
      frontZ = bottomTierZ + 1.5 + this.shelfDepth / 2 + 3.5; // After ramp
    }

    // Fun slot configuration with better odds
    const slots = [
      { label: "3X", mult: 3, type: "good" },
      { label: "5X", mult: 5, type: "bonus" },
      { label: "2X", mult: 2, type: "good" },
      { label: "10X", mult: 10, type: "bonus" },
      { label: "2X", mult: 2, type: "good" },
      { label: "5X", mult: 5, type: "bonus" },
      { label: "3X", mult: 3, type: "good" },
    ];

    // Catch-all back wall
    const slotBackGeom = new THREE.BoxGeometry(boardWidth + 2, slotHeight + 2, 0.3);
    const slotBackMat = new THREE.MeshPhongMaterial({
      color: 0x1a1a2e,
      emissive: 0x0f0f1a,
    });
    const slotBack = new THREE.Mesh(slotBackGeom, slotBackMat);
    slotBack.position.set(0, baseY + slotHeight / 2, frontZ + 2);
    this.scene.add(slotBack);
    this.scoringSlotMeshes.push(slotBack);

    const backBody = Physics.createBody({
      shape: "box",
      x: 0, y: baseY + slotHeight / 2, z: frontZ + 2,
      width: boardWidth + 2,
      height: slotHeight + 2,
      depth: 0.3,
      isStatic: true,
    });
    this.scoringSlotBodies.push(backBody);

    // Create slot dividers with glow
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

      const divBody = Physics.createBody({
        shape: "box",
        x: x, y: baseY + slotHeight / 2, z: frontZ + 1,
        width: 0.1,
        height: slotHeight,
        depth: 2.2,
        isStatic: true,
      });
      this.scoringSlotBodies.push(divBody);
    }

    // Create slot indicators
    for (let i = 0; i < slotCount; i++) {
      const x = -boardWidth / 2 + slotWidth / 2 + i * slotWidth;
      const slot = slots[i];

      let material = slot.type === "bonus" ? this.materials.slotBonus : this.materials.slotGood;

      // Slot floor indicator
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

    // Floor catches all coins
    const floorGeom = new THREE.BoxGeometry(boardWidth + 4, 0.3, 3);
    const floorMat = new THREE.MeshPhongMaterial({ color: 0x1a237e });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.position.set(0, baseY - 0.15, frontZ + 1);
    this.scene.add(floor);
    this.scoringSlotMeshes.push(floor);

    const floorBody = Physics.createBody({
      shape: "box",
      x: 0, y: baseY - 0.15, z: frontZ + 1,
      width: boardWidth + 4,
      height: 0.3,
      depth: 3,
      isStatic: true,
    });
    this.scoringSlotBodies.push(floorBody);

    // Side walls to prevent escape
    for (let side = -1; side <= 1; side += 2) {
      const sideWallGeom = new THREE.BoxGeometry(0.3, slotHeight + 1, 3);
      const sideWall = new THREE.Mesh(sideWallGeom, slotBackMat);
      sideWall.position.set(side * (boardWidth / 2 + 1), baseY + slotHeight / 2, frontZ + 1);
      this.scene.add(sideWall);
      this.scoringSlotMeshes.push(sideWall);

      const sideBody = Physics.createBody({
        shape: "box",
        x: side * (boardWidth / 2 + 1), y: baseY + slotHeight / 2, z: frontZ + 1,
        width: 0.3,
        height: slotHeight + 1,
        depth: 3,
        isStatic: true,
      });
      this.scoringSlotBodies.push(sideBody);
    }

    this.scoringY = baseY - 1;
  },

  // Spawn starting coins
  spawnStartingCoins: function () {
    const shelfY = 0.5;
    const shelfZ = 1.5;
    const startingCoins = 30;
    const boardWidth = this.baseBoardWidth;

    for (let i = 0; i < startingCoins; i++) {
      const x = Utils.random(-boardWidth / 2 + 1, boardWidth / 2 - 1);
      const z = shelfZ + Utils.random(-this.shelfDepth / 2 + 0.5, this.shelfDepth / 2 - 0.5);
      const y = shelfY + 0.3 + Math.random() * 0.4;

      setTimeout(() => {
        Coins.spawnCoin(x, y, z, "gold");
      }, i * 40);
    }
  },

  // Update pushers and animations
  update: function (deltaTime) {
    const time = performance.now() * 0.001;

    // Update main pushers
    for (let pusher of this.pushers) {
      this.updatePusher(pusher, deltaTime);
    }

    // Update spinners (rotate continuously)
    for (let spinner of this.spinners) {
      spinner.mesh.rotation.y += spinner.direction * spinner.speed * deltaTime;
      // Update physics body rotation for collision
      if (spinner.body) {
        spinner.body.ry = spinner.mesh.rotation.y;
      }
    }

    // Update side pushers (oscillate side to side)
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
      sidePusher.body.x = newX;

      // Wake nearby coins
      Physics.wakeRegion(newX, sidePusher.y, sidePusher.z, 2);
    }

    // Animate bumpers (pulse when hit)
    for (let bumper of this.bumpers) {
      if (bumper.hitTime > 0) {
        bumper.hitTime -= deltaTime;
        const scale = 1 + Math.sin(bumper.hitTime * 20) * 0.2;
        bumper.mesh.scale.set(scale, scale * 0.6, scale);
      } else {
        bumper.mesh.scale.set(1, 0.6, 1);
      }
      // Gentle idle glow pulse (slow breathing effect)
      bumper.mesh.material.emissiveIntensity = 0.45 + Math.sin(time * 1.5) * 0.1;
    }

    // Animate decorations
    for (let deco of this.decorations) {
      if (!deco.userData) continue;

      // NEW: Enhanced floating animation with floatSpeed
      if (deco.userData.floatOffset !== undefined) {
        const speed = deco.userData.floatSpeed || 1.0;
        // Larger, more visible floating motion
        const floatAmount = Math.sin(time * speed + deco.userData.floatOffset) * 0.08;
        if (!deco.userData.baseY) deco.userData.baseY = deco.position.y;
        deco.position.y = deco.userData.baseY + floatAmount;

        // Spinning animation (UFO, lollipop, planet)
        if (deco.userData.spin) {
          deco.rotation.y += deltaTime * 0.5;
        }

        // Swaying animation (palm trees)
        if (deco.userData.sway) {
          deco.rotation.z = Math.sin(time * 0.8 + deco.userData.floatOffset) * 0.1;
        }

        // Wobble animation (alien creatures)
        if (deco.userData.wobble) {
          deco.rotation.x = Math.sin(time * 1.2 + deco.userData.floatOffset) * 0.15;
          deco.rotation.z = Math.cos(time * 1.0 + deco.userData.floatOffset) * 0.1;
        }

        // Head bob animation (T-Rex, bird)
        if (deco.userData.headBob || deco.userData.birdBob) {
          deco.rotation.x = Math.sin(time * 0.7 + deco.userData.floatOffset) * 0.08;
        }

        // Gear spinning
        if (deco.userData.gearSpin) {
          deco.rotation.z += deltaTime * deco.userData.gearSpin * 1.5;
        }

        // Petal spin (flowers)
        if (deco.userData.petalSpin) {
          deco.rotation.z += deltaTime * 0.3;
        }

        // Twinkle effect (stars) - scale pulsing
        if (deco.userData.twinkle) {
          const twinkle = 0.9 + Math.sin(time * 3 + deco.userData.floatOffset) * 0.2;
          deco.scale.set(twinkle, twinkle, twinkle);
        }
      }

      // Gear rotation (existing)
      if (deco.userData.rotationSpeed !== undefined) {
        deco.rotation.y += deco.userData.rotationSpeed * deltaTime;
      }

      // Rocket flame glow (gentle, not flickering)
      if (deco.userData.flameOffset !== undefined) {
        const flame = deco.children.find(c => c.material && c.material.emissiveIntensity > 0.5);
        if (flame) {
          flame.scale.y = 1 + Math.sin(time * 3 + deco.userData.flameOffset) * 0.15;
        }
      }

      // Ghost floating animation
      if (deco.userData.ghostIndex !== undefined) {
        if (!deco.userData.baseY) deco.userData.baseY = deco.position.y;
        deco.position.y = deco.userData.baseY + Math.sin(time * 1.5 + deco.userData.floatOffset) * 0.15;
        deco.position.x += Math.sin(time * 0.8 + deco.userData.ghostIndex) * 0.003;
      }

      // Neon pulse effect
      if (deco.userData.neonPulse !== undefined) {
        deco.children.forEach(child => {
          if (child.material && child.material.emissiveIntensity !== undefined) {
            child.material.emissiveIntensity = 0.6 + Math.sin(time * 2) * 0.3;
          }
        });
      }

      // Screen pulse effect
      if (deco.userData.screenPulse !== undefined) {
        deco.children.forEach(child => {
          if (child.material && child.material.emissive) {
            child.material.emissiveIntensity = 0.5 + Math.sin(time * 1.5 + deco.userData.screenPulse) * 0.3;
          }
        });
      }

      // Glow pulse for panels
      if (deco.userData.glowPulse !== undefined) {
        deco.children.forEach(child => {
          if (child.material && child.material.emissiveIntensity !== undefined) {
            child.material.emissiveIntensity = 0.5 + Math.sin(time * 1.2 + deco.userData.glowPulse) * 0.2;
          }
        });
      }
    }

    // Animate bonus zones with gentle pulsing
    for (let i = 0; i < this.bonusZones.length; i++) {
      const zone = this.bonusZones[i];
      if (zone.mesh && zone.mesh.material.emissiveIntensity !== undefined) {
        zone.mesh.material.emissiveIntensity = 0.35 + Math.sin(time * 1.5 + i) * 0.15;
        if (zone.innerMesh) {
          zone.innerMesh.rotation.y = time * 0.8 + i;
        }
      }
    }

    // Animate pegs with slow color wave (no flashing)
    for (let i = 0; i < this.pegs.length; i++) {
      const peg = this.pegs[i];
      if (peg.baseHue !== undefined) {
        // Very slow hue shift for smooth wave effect
        const hue = (peg.baseHue + time * 0.05) % 1;
        peg.mesh.material.color.setHSL(hue, 0.75, 0.55);
        peg.mesh.material.emissive.setHSL(hue, 0.6, 0.25);
      }
      if (peg.isBonus) {
        // Gentle breathing glow for bonus pegs
        peg.mesh.material.emissiveIntensity = 0.4 + Math.sin(time * 1.5 + i * 0.3) * 0.15;
      }
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
    pusher.body.z = newZ;

    // Track pusher velocity for momentum transfer to coins
    const pusherVelocity = (newZ - prevZ) / deltaTime;
    Physics.setPusherVelocity(pusher.body.id, pusherVelocity);

    Physics.wakeRegion(pusher.body.x, pusher.body.y, newZ, 5);
  },

  // Get drop zone for new coins
  getDropZone: function () {
    return {
      minX: -this.baseBoardWidth / 2 + 1.5,
      maxX: this.baseBoardWidth / 2 - 1.5,
      y: 14,
      z: -0.5,
    };
  },

  // Expand pyramid with additional tier
  expandPyramid: function () {
    if (this.currentTierCount >= this.maxTiers) {
      UI.showMessage("MAXIMUM PYRAMID!");
      return;
    }

    this.removeScoringSlots();

    const newTierIndex = this.currentTierCount;
    const tierPos = this.getTierPosition(newTierIndex);
    const theme = this.tierThemes[newTierIndex % this.tierThemes.length];

    this.createPusherTier(newTierIndex, tierPos.y, tierPos.z, tierPos.width);

    this.currentTierCount++;
    UI.updateExpansion(this.currentTierCount);

    // Show tier unlock animation with theme icon and name
    UI.showTierUnlock(theme.name + " Unlocked!", theme.icon);

    const newScoringY = this.getScoringY();
    const frontZ = tierPos.z + 1.5 + this.shelfDepth / 2 + 3.5;
    this.createScoringSlots(newScoringY, frontZ);

    this.adjustCamera();

    // Rain coins on new tier
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        const x = Utils.random(-tierPos.width / 2 + 1, tierPos.width / 2 - 1);
        const z = tierPos.z + 1.5;
        Coins.spawnCoin(x, tierPos.y + 4, z, "gold");
      }, i * 60);
    }
  },

  // Remove scoring slots for rebuilding
  removeScoringSlots: function () {
    // Remove slot bonus zones
    for (let i = this.bonusZones.length - 1; i >= 0; i--) {
      const zone = this.bonusZones[i];
      if (zone.type === "slot") {
        this.bonusZones.splice(i, 1);
      }
    }

    // Remove all scoring slot meshes from the scene
    for (const mesh of this.scoringSlotMeshes) {
      this.scene.remove(mesh);
      // Dispose of geometry and material to free memory
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    }
    this.scoringSlotMeshes = [];

    // Remove all scoring slot physics bodies
    for (const body of this.scoringSlotBodies) {
      Physics.removeBody(body);
    }
    this.scoringSlotBodies = [];
  },

  // Adjust camera for growing pyramid
  adjustCamera: function () {
    if (Game && Game.camera) {
      const camera = Game.camera;
      const tierCount = this.currentTierCount;

      // Calculate pyramid bounds
      const bottomY = (tierCount - 1) * this.tierOffsetY; // Lowest tier Y
      const frontZ = (tierCount - 1) * this.tierOffsetZ + this.shelfDepth; // Furthest Z

      // Position camera to see entire pyramid
      // Camera pulls back and up as pyramid grows
      const aspect = window.innerWidth / window.innerHeight;
      const isMobile = aspect < 1;

      // Base positions adjusted for mobile
      const mobileOffset = isMobile ? 1.3 : 1;
      const targetY = 10 + (tierCount - 1) * 2 * mobileOffset;
      const targetZ = 20 + (tierCount - 1) * 5 * mobileOffset;

      // Look at center of pyramid (halfway between top and bottom tiers)
      const lookY = bottomY / 2 - 1;
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
    // Clean up spinners
    for (const spinner of this.spinners) {
      this.scene.remove(spinner.mesh);
    }
    // Clean up side pushers
    for (const sidePusher of this.sidePushers) {
      this.scene.remove(sidePusher.mesh);
    }
    // Clean up bumpers
    for (const bumper of this.bumpers) {
      this.scene.remove(bumper.mesh);
    }
    // Clean up decorations
    for (const deco of this.decorations) {
      this.scene.remove(deco);
    }
    // Clean up scoring slots
    for (const mesh of this.scoringSlotMeshes) {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    }
    for (const body of this.scoringSlotBodies) {
      Physics.removeBody(body);
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
    this.currentTierCount = 1;
  },

  get boardWidth() {
    return this.baseBoardWidth;
  },
};

window.Board = Board;
