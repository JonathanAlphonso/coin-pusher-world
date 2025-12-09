/**
 * Theme Configuration Index
 * Exports all tier themes with their colors, elements, and powerup focuses
 */

// Theme configurations - each with distinct visuals, coin movers, and powerup focus
export const tierThemes = [
  {
    name: "Neon Arcade",
    shelf: 0x1a1a2e,
    wall: 0xff00ff,
    pusher: 0x00ffff,
    accent: 0xffff00,
    glow: 0xff00ff,
    elements: ["spinner", "bumpers", "laserGrid", "pinballFlippers", "arcadeButtons"],
    coinMover: "wavePusher", // Oscillating neon bar pushes coins forward
    icon: "🕹️",
    powerupFocus: "queueSpeed",
    focusLabel: "Speed Boost",
    description: "Neon wave pusher sweeps coins forward",
    particleColor: 0xff00ff,
    ambientGlow: 0.5,
    ledColor1: 0xff00ff,
    ledColor2: 0x00ffff,
    textureType: "grid",
    textureScale: 4,
  },
  {
    name: "Dino Land",
    shelf: 0x2d5016,
    wall: 0x8bc34a,
    pusher: 0xffeb3b,
    accent: 0xff5722,
    glow: 0x4caf50,
    elements: ["sidePushers", "bumpers", "volcano", "bouncyEggs", "dinoTail"],
    coinMover: "stomper", // Dino foot stomps down periodically
    icon: "🦖",
    powerupFocus: "coinValue",
    focusLabel: "Coin Value",
    description: "Dino stomper shakes coins loose",
    particleColor: 0xff5722,
    ambientGlow: 0.35,
    ledColor1: 0x4caf50,
    ledColor2: 0xff5722,
    textureType: "scales",
    textureScale: 3,
  },
  {
    name: "Alien Invasion",
    shelf: 0x0a1628,
    wall: 0x00ff88,
    pusher: 0x88ff00,
    accent: 0x00ffff,
    glow: 0x00ff44,
    elements: ["spinner", "bumpers", "wormhole", "plasmaTurrets", "alienPods"],
    coinMover: "tractorBeam", // UFO beam pulls/pushes coins
    icon: "👽",
    powerupFocus: "luckyCoins",
    focusLabel: "Lucky Coins",
    description: "Tractor beam sweeps coins to the edge",
    particleColor: 0x00ff88,
    ambientGlow: 0.55,
    ledColor1: 0x00ff44,
    ledColor2: 0x00ffff,
    textureType: "circuit",
    textureScale: 2,
  },
  {
    name: "Pirate Cove",
    shelf: 0x3e2723,
    wall: 0xffd54f,
    pusher: 0x8d6e63,
    accent: 0x00bcd4,
    glow: 0xffb300,
    elements: ["sidePushers", "bumpers", "swingingAnchor", "treasureChest", "shipWheel"],
    coinMover: "cannonPusher", // Cannon blast pushes coins
    icon: "🏴‍☠️",
    powerupFocus: "multiDrop",
    focusLabel: "Multi-Drop",
    description: "Cannon blasts push coins off the edge",
    particleColor: 0xffd700,
    ambientGlow: 0.4,
    ledColor1: 0xffb300,
    ledColor2: 0x00bcd4,
    textureType: "wood",
    textureScale: 3,
  },
  {
    name: "Candy Kingdom",
    shelf: 0xfce4ec,
    wall: 0xff4081,
    pusher: 0x7c4dff,
    accent: 0x00e5ff,
    glow: 0xff80ab,
    elements: ["spinner", "bumpers", "lollipopSpinners", "peppermintWheels", "gummyBounce"],
    coinMover: "gumballRoller", // Rolling gumball pushes coins
    icon: "🍭",
    powerupFocus: "queueCapacity",
    focusLabel: "Queue Size",
    description: "Giant gumball rolls coins forward",
    particleColor: 0xff80ab,
    ambientGlow: 0.5,
    ledColor1: 0xff80ab,
    ledColor2: 0x00e5ff,
    textureType: "stripes",
    textureScale: 5,
  },
  {
    name: "Space Station",
    shelf: 0x0d1b2a,
    wall: 0x3f51b5,
    pusher: 0x00bcd4,
    accent: 0xff5722,
    glow: 0x536dfe,
    elements: ["sidePushers", "bumpers", "asteroidField", "solarPanels", "plasmaConduit"],
    coinMover: "gravityWave", // Pulsing gravity wave pushes coins
    icon: "🚀",
    powerupFocus: "widerPusher",
    focusLabel: "Wide Pusher",
    description: "Gravity waves pulse coins forward",
    particleColor: 0x536dfe,
    ambientGlow: 0.45,
    ledColor1: 0x536dfe,
    ledColor2: 0xff5722,
    textureType: "panels",
    textureScale: 2,
  },
  {
    name: "Jungle Safari",
    shelf: 0x1b4332,
    wall: 0x66bb6a,
    pusher: 0xffca28,
    accent: 0x8d6e63,
    glow: 0x81c784,
    elements: ["spinner", "bumpers", "lilyPads", "rollingBoulder", "monkeySwing"],
    coinMover: "vineSwing", // Swinging vine pushes coins
    icon: "🦁",
    powerupFocus: "comboTime",
    focusLabel: "Combo Time",
    description: "Swinging vines sweep coins off",
    particleColor: 0x81c784,
    ambientGlow: 0.4,
    ledColor1: 0x81c784,
    ledColor2: 0xffca28,
    textureType: "leaves",
    textureScale: 3,
  },
  {
    name: "Robot Factory",
    shelf: 0x263238,
    wall: 0x78909c,
    pusher: 0xff6f00,
    accent: 0x00e676,
    glow: 0xb0bec5,
    elements: ["sidePushers", "bumpers", "pistons", "laserScanners", "rotatingGears"],
    coinMover: "conveyorBelt", // Moving conveyor pushes coins
    icon: "🤖",
    powerupFocus: "jackpotChance",
    focusLabel: "Jackpot Chance",
    description: "Conveyor belt pushes coins forward",
    particleColor: 0xff6f00,
    ambientGlow: 0.35,
    ledColor1: 0xff6f00,
    ledColor2: 0x00e676,
    textureType: "metal",
    textureScale: 4,
  },
];

// Get 3 theme options for board selection (varied from available themes)
export function getThemeOptions(excludeIndices = []) {
  const available = tierThemes
    .map((theme, index) => ({ theme, index }))
    .filter(t => !excludeIndices.includes(t.index));

  // Shuffle and pick 3
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

// Get theme by powerup focus
export function getThemeByFocus(focus) {
  return tierThemes.find(t => t.powerupFocus === focus);
}

export default tierThemes;
