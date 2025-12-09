/**
 * Main Entry Point for Coin Pusher World
 * Vite-bundled version with ES modules
 */

// Core modules
import Game from './core/Game.js';
import Physics from './core/Physics.js';
import { random, randomInt, clamp, formatNumber } from './core/Utils.js';

// UI and Audio
import UI from './ui/UI.js';
import Sound from './audio/Sound.js';

// Game systems
import Combo from './systems/Combo.js';
import Jackpot from './systems/Jackpot.js';
import PowerUps from './systems/PowerUps.js';
import CoinRain from './systems/CoinRain.js';
import Collectibles from './systems/Collectibles.js';
import Coins from './systems/Coins.js';
import Relics from './systems/Relics.js';

// World
import Board from './world/Board.js';

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
  console.log('Coin Pusher World - Vite Build');

  // Initialize Game first to get the scene
  const scene = Game.init({
    physics: Physics,
    ui: UI,
    board: Board,
    coins: Coins,
    powerUps: PowerUps,
    sound: Sound,
    combo: Combo,
    coinRain: CoinRain,
    jackpot: Jackpot,
    collectibles: Collectibles,
  });

  // Initialize Physics with Board reference
  Physics.init(Board);

  // Initialize UI with Game reference
  UI.init(Game);

  // Initialize Board with scene and references
  Board.init(scene, {
    physics: Physics,
    coins: Coins,
    ui: UI,
    game: Game,
  });

  // Initialize Coins with scene and all system references
  Coins.init(scene, {
    physics: Physics,
    board: Board,
    ui: UI,
    sound: Sound,
    combo: Combo,
    jackpot: Jackpot,
    coinRain: CoinRain,
    powerUps: PowerUps,
    collectibles: Collectibles,
    game: Game,
  });

  // Initialize PowerUps
  PowerUps.init({
    ui: UI,
    sound: Sound,
    game: Game,
    coins: Coins,
    board: Board,
    collectibles: Collectibles,
  });

  // Initialize Sound
  Sound.init();

  // Auto-mute sounds for tests (check URL parameter)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('mute') || urlParams.has('test')) {
    Sound.mute();
    console.log('Sound muted for testing');
  }

  // Initialize Combo with UI and Sound
  Combo.init(UI, Sound);

  // Initialize CoinRain
  CoinRain.init({
    game: Game,
    sound: Sound,
    ui: UI,
    coins: Coins,
    board: Board,
    jackpot: Jackpot,
  });

  // Initialize Jackpot
  Jackpot.init(scene, {
    game: Game,
    ui: UI,
    sound: Sound,
    coins: Coins,
    board: Board,
  });

  // Initialize Collectibles
  Collectibles.init(scene, {
    physics: Physics,
    powerUps: PowerUps,
    ui: UI,
    game: Game,
    sound: Sound,
    coinRain: CoinRain,
    board: Board,
  });

  // Initialize Relics
  Relics.init(scene, {
    physics: Physics,
    board: Board,
    ui: UI,
    sound: Sound,
    game: Game,
    coins: Coins,
  });

  // Wire up remaining cross-references after init
  Game.physics = Physics;
  Game.ui = UI;
  Game.board = Board;
  Game.coins = Coins;
  Game.powerUps = PowerUps;
  Game.sound = Sound;
  Game.combo = Combo;
  Game.coinRain = CoinRain;
  Game.jackpot = Jackpot;
  Game.collectibles = Collectibles;
  Game.relics = Relics;

  // Wire Relics to Coins for drop checks
  Coins.relics = Relics;

  // Expose for console debugging and automated tests
  Object.assign(window, {
    Game,
    Physics,
    UI,
    Board,
    Coins,
    PowerUps,
    Sound,
    Combo,
    CoinRain,
    Jackpot,
    Collectibles,
    Relics,
  });

  console.log('Game initialized successfully!');
});
