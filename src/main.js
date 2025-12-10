/**
 * Main Entry Point for Coin Pusher World
 * Vite-bundled version with ES modules
 */

// Core modules
import Game from './core/Game.js';
import Physics from './core/Physics.js';
import Storage from './core/Storage.js';
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
import DailyChallenges from './systems/DailyChallenges.js';
import Prizes from './systems/Prizes.js';
import BoardManager from './systems/BoardManager.js';
import ThemeEffects from './systems/ThemeEffects.js';

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

  // Initialize ThemeEffects first (needed for Coins)
  ThemeEffects.init();
  Game.themeEffects = ThemeEffects;

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
    themeEffects: ThemeEffects,
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

  // Connect Storage to Game
  Game.storage = Storage;

  // Load and apply saved settings
  const savedSettings = Storage.getSettings();
  Sound.masterVolume = savedSettings.masterVolume;
  Sound.musicVolume = savedSettings.musicVolume;
  Sound.sfxVolume = savedSettings.sfxVolume;
  Sound.musicEnabled = savedSettings.musicEnabled;
  Sound.enabled = savedSettings.sfxEnabled;

  // Apply performance mode setting (design spec 10.4)
  if (savedSettings.lowPerformanceMode) {
    Game.lowPerformanceMode = true;
    console.log('Low performance mode enabled from saved settings');
  }

  // Auto-mute sounds for tests (check URL parameter)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('mute') || urlParams.has('test')) {
    Sound.mute();
    console.log('Sound muted for testing');
  }

  // Initialize Combo with UI, Sound, and ThemeEffects
  Combo.init(UI, Sound, ThemeEffects);

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
    themeEffects: ThemeEffects,
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

  // Wire Storage and Sound to Game and UI
  Game.storage = Storage;
  UI.storage = Storage;
  UI.sound = Sound;

  // Initialize Daily Challenges
  DailyChallenges.init({
    storage: Storage,
    ui: UI,
    sound: Sound,
    game: Game,
  });
  Game.dailyChallenges = DailyChallenges;

  // Initialize Prizes
  Prizes.init({
    ui: UI,
    game: Game,
    sound: Sound,
  });
  Game.prizes = Prizes;

  // Initialize BoardManager with ThemeEffects reference (already initialized above)
  BoardManager.init(scene, Board, ThemeEffects);
  Game.boardManager = BoardManager;

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
    Storage,
    DailyChallenges,
    Prizes,
    BoardManager,
    ThemeEffects,
  });

  console.log('Game initialized successfully!');
});
