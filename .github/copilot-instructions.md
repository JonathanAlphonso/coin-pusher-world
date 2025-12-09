# Coin Pusher World - 3D Roguelike Game

## Project Overview
A 3D coin pusher roguelike game optimized for old Android phones using Three.js with simple graphics for performance.

## Features
- 3D coin pusher mechanics with custom physics
- Pyramid board expansion system
- Automatic coin dropping from bonus spots
- Manual coin drop button
- Power-up system (queue speed, coin count, coin value, multi-drop, lucky coins)
- Touch controls for mobile
- Roguelike progression

## Tech Stack
- HTML5/CSS3
- JavaScript (ES6+)
- Three.js for 3D rendering
- Custom lightweight physics engine

## Project Structure
```
coin-pusher-world/
├── index.html          # Main HTML entry point
├── package.json        # Node.js dependencies
├── README.md           # Project documentation
├── css/
│   └── styles.css      # Mobile-optimized styles
└── js/
    ├── game.js         # Main game engine
    ├── physics.js      # Custom physics engine
    ├── coins.js        # Coin system
    ├── board.js        # Board and pusher
    ├── powerups.js     # Power-up system
    ├── ui.js           # UI management
    └── utils.js        # Utility functions
```

## Development Guidelines
- Keep graphics simple for old Android phone performance
- Use touch events for mobile controls
- Optimize for WebGL 1.0 compatibility
- Keep draw calls minimal
- Use low-poly models and simple textures

## Running the Game
1. `npm install` - Install dependencies
2. `npm start` - Start development server
3. Open http://localhost:8080 in browser

## Progress
- [x] Project requirements clarified
- [x] Scaffold the project
- [x] Create game files
- [x] Install required extensions
- [x] Compile/test the project
- [x] Create run task
- [x] Launch the project
- [x] Documentation complete
