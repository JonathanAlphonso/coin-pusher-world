# Coin Pusher World - Refactoring Plan

## Current State Analysis

**Total: 10,148 lines across 12 JS files**

| File | Lines | Notes |
|------|-------|-------|
| board.js | 5,520 | **CRITICAL** - contains ALL 8 themed worlds |
| sound.js | 966 | Audio system + all sound definitions |
| coins.js | 788 | Coin spawning/management |
| physics.js | 543 | Custom physics engine |
| powerups.js | 404 | Power-up system |
| game.js | 380 | Main game loop |
| ui.js | 338 | UI updates |
| collectibles.js | 327 | Collectible items |
| bonuswheel.js | 309 | Bonus wheel minigame |
| jackpot.js | 249 | Jackpot system |
| utils.js | 172 | Utility functions |
| combo.js | 152 | Combo system |

**Main Issue**: `board.js` contains 85+ create* functions for all 8 themed worlds' decorations.

## Target Structure

```
coin-pusher-world/
├── package.json
├── vite.config.js
├── index.html (entry point)
├── public/
│   └── (static assets if needed)
├── src/
│   ├── main.js                 # Entry point, initializes game
│   ├── core/
│   │   ├── Game.js             # Game loop, state management
│   │   ├── Physics.js          # Physics engine
│   │   └── Utils.js            # Utility functions
│   ├── world/
│   │   ├── Board.js            # Core board logic (init, update, tiers)
│   │   ├── Pusher.js           # Pusher mechanics
│   │   ├── PachinkoZone.js     # Pegs and pachinko area
│   │   ├── ScoringSlots.js     # Scoring slot creation/management
│   │   ├── BonusZones.js       # Bonus zone handling
│   │   └── themes/
│   │       ├── index.js        # Theme registry & config
│   │       ├── shared.js       # Shared elements (spinner, bumpers, sidePushers)
│   │       ├── arcade.js       # Neon Arcade decorations
│   │       ├── dino.js         # Dino Land decorations
│   │       ├── alien.js        # Alien Invasion decorations
│   │       ├── pirate.js       # Pirate Cove decorations
│   │       ├── candy.js        # Candy Kingdom decorations
│   │       ├── space.js        # Space Station decorations
│   │       ├── jungle.js       # Jungle Safari decorations
│   │       └── robot.js        # Robot Factory decorations
│   ├── systems/
│   │   ├── Coins.js            # Coin spawning/management
│   │   ├── Combo.js            # Combo tracking
│   │   ├── Jackpot.js          # Jackpot meter
│   │   ├── PowerUps.js         # Power-up system
│   │   ├── BonusWheel.js       # Bonus wheel minigame
│   │   └── Collectibles.js     # Collectible items
│   ├── audio/
│   │   └── Sound.js            # Audio system
│   └── ui/
│       └── UI.js               # UI rendering
├── css/
│   └── styles.css
└── tests/
    └── *.js                    # Test files
```

## Migration Steps

### Phase 1: Setup Vite Project
1. Initialize npm project with Vite
2. Install three.js as npm dependency (replaces CDN)
3. Create vite.config.js
4. Move index.html to root (Vite entry)
5. Update index.html to use ES module entry point

### Phase 2: Convert to ES Modules (in order of dependencies)
1. **Utils** - No dependencies, convert first
2. **Physics** - Depends on Utils only
3. **Sound** - No game dependencies
4. **UI** - Minimal dependencies
5. **Combo** - No dependencies
6. **Jackpot** - Depends on Coins, UI, Sound
7. **BonusWheel** - Depends on Coins, UI, Sound, Game, Board
8. **PowerUps** - Depends on Coins, UI, Sound
9. **Collectibles** - Depends on Board, Coins
10. **Coins** - Depends on Physics, Sound, UI, Board
11. **Board** - Split into modules (see Phase 3)
12. **Game** - Depends on everything, convert last

### Phase 3: Split board.js (Critical)
This is the main refactoring work:

1. **Extract theme configs** (~100 lines)
   - Move `tierThemes` array to `themes/index.js`

2. **Extract shared elements** (~400 lines)
   - `createSpinner` (used by Arcade, Alien, Candy, Jungle)
   - `createSidePushers` (used by Dino, Pirate, Space)
   - `createBumpers` (used by Arcade)

3. **Extract theme decorations** (~3500 lines total)
   Each theme file exports functions for its decorations:

   **arcade.js** (~500 lines):
   - createArcadeCabinets, createNeonSigns, createPixelGhosts
   - createFloatingArcade, createPixelHeart
   - createArcadeWallDecor

   **dino.js** (~500 lines):
   - createVolcano, createDinosaurs, createPalmTrees, createDinoEggs, createFossils
   - createFloatingDino, createFloatingPalmTree
   - createDinoWallDecor

   **alien.js** (~500 lines):
   - createUFO, createAlienCreatures, createAlienPods, createTentacles, createCropCircles
   - createFloatingAlien, createFloatingAlienCreature
   - createAlienWallDecor

   **pirate.js** (~500 lines):
   - createTreasureChest, createCannon, createShipWheel, createAnchor, createSkulls, createBarrels
   - createFloatingPirate, createFloatingTreasure
   - createPirateWallDecor

   **candy.js** (~500 lines):
   - createLollipops, createGumballMachine, createCandyCanes, createCupcakes, createIceCream, createDonuts
   - createFloatingCandy, createFloatingCupcake
   - createCandyWallDecor

   **space.js** (~500 lines):
   - createRockets, createAsteroid, createPlanets, createSatellites, createAstronaut, createSpaceDebris
   - createFloatingSpace, createFloatingStar
   - createSpaceWallDecor

   **jungle.js** (~500 lines):
   - createVines, createAnimals, createJungleTrees, createWaterfall, createRocks, createJunglePlants
   - createFloatingJungle, createFloatingFlower
   - createJungleWallDecor

   **robot.js** (~500 lines):
   - createGears, createConveyor, createRobots, createAssemblyArms, createMonitors, createPipes
   - createFloatingRobot, createFloatingGear
   - createRobotWallDecor

4. **Core Board.js** (~800 lines remaining):
   - init, cleanup
   - createBaseMaterials, createTierMaterials
   - createPusherTier, updatePusher
   - getTierPosition, getDropZone
   - expandPyramid, adjustCamera
   - update

5. **Extract PachinkoZone.js** (~100 lines):
   - createPachinkoZone

6. **Extract ScoringSlots.js** (~200 lines):
   - createScoringSlots, removeScoringSlots

7. **Extract BonusZones.js** (~100 lines):
   - createShelfBonusZones

### Phase 4: Wire Up Theme System
1. Create theme registry in `themes/index.js`
2. Update `createTierElements` to dynamically call theme module
3. Update `createThemedWallDecorations` and `createFloatingThemedDecorations`

### Phase 5: Testing & Verification
1. Run existing playwright tests
2. Manual testing of all 8 tiers
3. Verify no console errors
4. Performance comparison

## Expected Results

| Module | Est. Lines |
|--------|------------|
| Board.js (core) | ~800 |
| themes/index.js | ~100 |
| themes/shared.js | ~400 |
| themes/arcade.js | ~500 |
| themes/dino.js | ~500 |
| themes/alien.js | ~500 |
| themes/pirate.js | ~500 |
| themes/candy.js | ~500 |
| themes/space.js | ~500 |
| themes/jungle.js | ~500 |
| themes/robot.js | ~500 |
| PachinkoZone.js | ~100 |
| ScoringSlots.js | ~200 |
| BonusZones.js | ~100 |

**Result**: No file over 800 lines, themes are isolated and maintainable.

## Module Pattern

Each module will use ES module syntax:

```javascript
// themes/arcade.js
import * as THREE from 'three';
import { createCapsuleGeometry } from '../utils/geometry.js';

export function createArcadeCabinets(tierIndex, y, z, boardWidth, tierMats, theme) {
  // ... implementation
}

export function createNeonSigns(tierIndex, y, z, boardWidth, tierMats, theme) {
  // ... implementation
}
// etc.
```

```javascript
// themes/index.js
import * as arcade from './arcade.js';
import * as dino from './dino.js';
// ... etc

export const themes = [
  { name: "Neon Arcade", ...arcade },
  { name: "Dino Land", ...dino },
  // ...
];
```

## Notes
- Keeping JavaScript (not TypeScript) for simplicity
- Three.js r128 compatibility maintained
- All existing functionality preserved
- Tests should pass without modification
