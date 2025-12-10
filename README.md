# Coin Pusher World

A 3D coin pusher roguelike game optimized for old Android phones, built with Three.js.

## 🎮 Features

### Core Gameplay
- **3D Coin Pusher Mechanics**: Physics-based coin pushing with realistic gravity and collisions
- **8-Board Pyramid Expansion**: Build a cascading pyramid of themed boards (1→2→3→2 layout)
- **Coin Routing**: Coins cascade through multiple boards, accumulating multipliers
- **Auto Queue System**: Automatic coin dropping with configurable speed
- **Manual Drop Control**: Precise coin placement for strategic routing

### 8 Unique Themes (Design Spec Section 5)
- 🕹️ **Neon Arcade** (queueSpeed) - Wave pusher for faster queue refills
- 🦖 **Dino Land** (coinValue) - Stomper increases coin values
- 👽 **Alien Invasion** (luckyCoins) - Tractor beam creates special coins
- 🏴‍☠️ **Pirate Cove** (multiDrop) - Cannon for multi-coin drops
- 🍭 **Candy Kingdom** (queueCapacity) - Expands queue capacity
- 🚀 **Space Station** (widerPusher) - Enhanced pusher coverage
- 🦁 **Jungle Safari** (comboTime) - Extended combo windows
- 🤖 **Robot Factory** (jackpotChance) - Progressive jackpot system

### Prize System (30 Prizes) ✨
- **Rarity Tiers**: Common, Uncommon, Rare, Epic, Legendary
- **Prize Counter**: Select 1 of 6 prizes when unlocking boards
- **Synergies**: Prizes have affinities with theme powerupFocus (highlighted in green)
- **Categories**: Queue, Value, Lucky, Jackpot, Combo, Multi-Drop, Routing, Pusher, Hybrid
- **Strategic Depth**: Build synergistic engines by matching prize affinities with board themes

### Advanced Systems
- **Combo System**: Chain coin scores for massive multipliers (up to 7x)
- **Jackpot System**: Progressive jackpots with burst mechanics
- **Save/Load**: Auto-save every 30s, resume runs in progress
- **Performance Modes**: Normal (50 coins, 60 FPS) or Low (25 coins, 30 FPS)
- **First-Time Tutorial**: Automatic help overlay for new players

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- A modern web browser

### Installation

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

### Playing on Mobile

Simply open the URL on your Android phone's browser. The game is optimized for touch controls and older devices.

## 🎯 How to Play

### Getting Started
1. **Click START GAME** to begin your run
2. **Drop Coins** manually or enable auto-drop
3. Coins are pushed forward and fall through the pyramid
4. When coins exit the bottom row, they are scored

### Strategic Depth
5. **Board Selection**: Choose from 3 theme options when expanding (8 boards max)
6. **Prize Selection**: Pick 1 of 6 prizes from 30-prize pool (up to 8 active)
7. **Build Synergies**: Match prize affinities with board themes (green highlights = synergy!)
8. **Routing**: Direct coins through boards to stack multipliers
9. **Combo Chains**: Score rapidly for exponential bonuses (up to 7x!)
10. **Engine Building**: Create powerful combos like "Queue King" (queueSpeed boards + queue prizes)

### Progression System
- **Score Thresholds**: 10k, 25k, 45k, 70k, 100k, 140k, 190k, 250k
- Each threshold unlocks a new board slot
- Run completes at 8 boards (or manual restart)

## 🛠️ Technical Details

### Performance Optimizations (Design Spec 10.4)

- **WebGL1 Compatible**: Runs on old Android devices
- **Low-Poly Meshes**: Optimized geometry for all objects
- **Object Pooling**: 80-coin pool with efficient reuse
- **Material Optimization**: MeshLambertMaterial for performance
- **No Shadows**: Disabled for better frame rates
- **Performance Modes**:
  - Normal: 50 max coins, 60 FPS target
  - Low: 25 max coins, 30 FPS target (old Android)
- **Auto-Save System**: Persists game state every 30s

### Architecture (Design Spec Section 12)

**Core Systems** (`src/core/`):
- `Game.js` - Main game engine and Three.js setup
- `Physics.js` - Custom lightweight physics for coin pushers
- `GameConfig.js` - Centralized tuning constants (Section 12.2)
- `Storage.js` - LocalStorage wrapper for saves and settings
- `Utils.js` - Utility functions (RNG, seeding, etc.)

**Game Systems** (`src/systems/`):
- `BoardManager.js` - 8-board pyramid structure and routing (Section 6)
- `Coins.js` - Coin spawning, pooling, queue, and auto-drop (Section 9)
- `Prizes.js` - 30+ prize pool with rarity system (Section 8)
- `ThemeEffects.js` - Centralizes powerupFocus mechanics (Section 5)
- `Combo.js` - Combo chain system with time windows
- `Jackpot.js` - Progressive jackpot mechanics
- `Collectibles.js`, `PowerUps.js`, `CoinRain.js`, `Relics.js`, `DailyChallenges.js`

**World & Rendering** (`src/world/`):
- `Board.js` - Individual board geometry and obstacles
- `themes/index.js` - 8 theme definitions with colors and elements
- `TextureGenerator.js` - Procedural textures for themes
- `Background.js` - 3D environment and lighting

**UI & Audio** (`src/ui/`, `src/audio/`):
- `UI.js` - HUD, Prize Counter, settings, help overlay
- `Sound.js` - Audio system (currently minimal)

## 📱 Browser Support

- ✅ Chrome (Android/Desktop)
- ✅ Firefox (Android/Desktop)
- ✅ Safari (iOS/Desktop)
- ✅ Edge (Desktop)

**Optimized for WebGL 1.0** to support older Android devices (as per Design Spec Section 10.4).

## 🧪 Testing

### Running Tests

All tests include timeouts to prevent hanging:

```bash
# Run all tests (50 total)
npm test

# Or run individual test suites
npm run test:comprehensive  # 20 tests - Core game systems
npm run test:pyramid        # 11 tests - Full playthrough (Spec 11.1)
npm run test:ui             # 19 tests - UI overlap & touch targets (Spec 11.3)
```

### Test Coverage (Design Spec Section 11)

✅ **50/50 tests passing**

- **Comprehensive Tests** (20): Game initialization, physics, scoring, all systems
- **8-Board Pyramid** (11): Full playthrough, board expansion, no deadlocks
- **UI Hitbox Tests** (19): 4 viewports (desktop, tablet, mobile, old Android)
  - No overlapping UI elements
  - 44-48px minimum tap targets
  - Viewport bounds validation

## 📚 Documentation

- **[Design Specification](docs/design-spec.md)** - Complete game design document
- **[Implementation Status](docs/implementation-status.md)** - Phase completion tracking

**Current Status**: All 9 phases complete (Phases 0-9) ✅

## 📄 License

MIT License
