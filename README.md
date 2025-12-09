# Coin Pusher World

A 3D coin pusher roguelike game optimized for old Android phones, built with Three.js.

## 🎮 Features

- **3D Coin Pusher Mechanics**: Push coins off the edge to score points
- **Pyramid Expansion**: As you score, add more boards in a pyramid pattern
- **Automatic Coin Dropping**: Hit bonus zones to queue up automatic coin drops
- **Manual Coin Drop**: Tap the button to drop coins manually
- **Power-Up System**:
  - ⚡ Queue Speed - Coins drop faster from queue
  - 📦 Queue Size - Hold more coins in queue
  - 💰 Coin Value - All coins worth more points
  - 🎯 Multi Drop - Drop multiple coins at once
  - 🍀 Lucky Coins - Higher chance of special coins

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
npm start
```

3. Open your browser to `http://localhost:8080`

### Playing on Mobile

Simply open the URL on your Android phone's browser. The game is optimized for touch controls and older devices.

## 🎯 How to Play

1. **Tap START GAME** to begin
2. **Tap DROP COIN** to drop coins onto the board
3. Coins pushed off the **front edge** score points
4. Hit **bonus zones** (orange circles) for special effects:
   - Add coins to your queue
   - Double coin values
   - Choose a power-up upgrade
5. As you reach score thresholds, the pyramid **expands** with more boards
6. **Upgrade power-ups** wisely to maximize your score!

## 🛠️ Technical Details

### Performance Optimizations

- Simple flat-shaded materials
- Low polygon count for all objects
- Object pooling for coins
- Sleep system for stationary physics bodies
- Reduced pixel ratio capping
- No shadows for better performance
- WebGL 1.0 compatible

### Architecture

- `game.js` - Main game engine and Three.js setup
- `physics.js` - Lightweight custom physics engine
- `coins.js` - Coin spawning, pooling, and scoring
- `board.js` - Pusher boards and pyramid expansion
- `powerups.js` - Power-up system and upgrades
- `ui.js` - User interface management
- `utils.js` - Utility functions

## 📱 Browser Support

- Chrome (Android/Desktop)
- Firefox (Android/Desktop)
- Safari (iOS/Desktop)
- Edge (Desktop)

Optimized for WebGL 1.0 to support older Android devices.

## 📄 License

MIT License
