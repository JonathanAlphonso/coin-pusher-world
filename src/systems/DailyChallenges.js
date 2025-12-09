/**
 * Daily Challenges System for Coin Pusher World
 * Provides daily goals for players to complete
 */

import { formatNumber } from '../core/Utils.js';

const DailyChallenges = {
  // Challenge definitions
  challengeTypes: [
    {
      id: 'score_target',
      name: 'High Scorer',
      description: 'Reach {target} points in a single game',
      icon: '🎯',
      getTarget: (difficulty) => [50000, 100000, 200000][difficulty],
      check: (stats, target) => stats.score >= target,
      reward: (difficulty) => [500, 1000, 2000][difficulty],
    },
    {
      id: 'coins_dropped',
      name: 'Coin Collector',
      description: 'Drop {target} coins',
      icon: '🪙',
      getTarget: (difficulty) => [100, 250, 500][difficulty],
      check: (stats, target) => stats.coinsDropped >= target,
      reward: (difficulty) => [300, 600, 1200][difficulty],
    },
    {
      id: 'combo_master',
      name: 'Combo Master',
      description: 'Achieve a {target}x combo',
      icon: '🔥',
      getTarget: (difficulty) => [10, 20, 30][difficulty],
      check: (stats, target) => stats.bestCombo >= target,
      reward: (difficulty) => [400, 800, 1500][difficulty],
    },
    {
      id: 'tier_climber',
      name: 'Tier Climber',
      description: 'Reach tier {target}',
      icon: '🏔️',
      getTarget: (difficulty) => [3, 5, 7][difficulty],
      check: (stats, target) => stats.tier >= target,
      reward: (difficulty) => [600, 1200, 2500][difficulty],
    },
    {
      id: 'jackpot_hunter',
      name: 'Jackpot Hunter',
      description: 'Trigger {target} jackpot burst(s)',
      icon: '🎰',
      getTarget: (difficulty) => [1, 2, 3][difficulty],
      check: (stats, target) => stats.jackpotBursts >= target,
      reward: (difficulty) => [500, 1000, 2000][difficulty],
    },
    {
      id: 'collectible_seeker',
      name: 'Treasure Seeker',
      description: 'Find {target} collectibles',
      icon: '💎',
      getTarget: (difficulty) => [3, 6, 10][difficulty],
      check: (stats, target) => stats.collectiblesFound >= target,
      reward: (difficulty) => [400, 800, 1600][difficulty],
    },
    {
      id: 'powerup_collector',
      name: 'Power Player',
      description: 'Earn {target} power-ups',
      icon: '⚡',
      getTarget: (difficulty) => [3, 5, 8][difficulty],
      check: (stats, target) => stats.powerUpsEarned >= target,
      reward: (difficulty) => [350, 700, 1400][difficulty],
    },
  ],

  // Active challenges for today
  activeChallenges: [],

  // Challenge progress
  progress: {},

  // Completed challenge IDs today
  completedToday: [],

  // References
  storage: null,
  ui: null,
  sound: null,
  game: null,

  // Initialize
  init: function (refs = {}) {
    this.storage = refs.storage;
    this.ui = refs.ui;
    this.sound = refs.sound;
    this.game = refs.game;

    this.loadChallenges();
    this.createUI();
  },

  // Load or generate daily challenges
  loadChallenges: function () {
    const today = this.getTodayKey();
    const saved = this.storage ? this.storage.getDailyChallenges() : null;

    if (saved && saved.date === today) {
      // Load existing challenges for today
      this.activeChallenges = saved.challenges;
      this.progress = saved.progress || {};
      this.completedToday = saved.completed || [];
    } else {
      // Generate new challenges for today
      this.generateNewChallenges();
      this.progress = {};
      this.completedToday = [];
      this.saveChallenges();
    }
  },

  // Generate 3 new challenges for today
  generateNewChallenges: function () {
    const today = this.getTodayKey();
    // Use date as seed for consistent daily challenges
    const seed = this.hashString(today);

    // Shuffle challenge types using seeded random
    const shuffled = [...this.challengeTypes];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.seededRandom(seed + i) % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Pick 3 challenges with varying difficulties
    this.activeChallenges = [
      { ...shuffled[0], difficulty: 0, target: shuffled[0].getTarget(0) }, // Easy
      { ...shuffled[1], difficulty: 1, target: shuffled[1].getTarget(1) }, // Medium
      { ...shuffled[2], difficulty: 2, target: shuffled[2].getTarget(2) }, // Hard
    ];
  },

  // Get today's date key
  getTodayKey: function () {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  // Simple hash function for seeding
  hashString: function (str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  },

  // Seeded random number generator
  seededRandom: function (seed) {
    const x = Math.sin(seed) * 10000;
    return Math.floor((x - Math.floor(x)) * 1000000);
  },

  // Save challenges to storage
  saveChallenges: function () {
    if (!this.storage) return;

    this.storage.saveDailyChallenges({
      date: this.getTodayKey(),
      challenges: this.activeChallenges,
      progress: this.progress,
      completed: this.completedToday,
    });
  },

  // Update progress based on game stats
  updateProgress: function (sessionStats) {
    if (!sessionStats) return;

    let anyCompleted = false;

    for (const challenge of this.activeChallenges) {
      if (this.completedToday.includes(challenge.id)) continue;

      // Check if challenge is completed
      if (challenge.check(sessionStats, challenge.target)) {
        this.completedToday.push(challenge.id);
        anyCompleted = true;

        // Award bonus coins
        const rewardAmount = challenge.reward(challenge.difficulty);

        if (this.ui) {
          this.ui.showMessage(`${challenge.icon} Challenge Complete!\n+${formatNumber(rewardAmount)} bonus!`);
        }
        if (this.sound) {
          this.sound.play('levelup');
        }

        // Add reward to next game's starting queue
        if (this.storage) {
          const currentBonus = this.storage.getChallengeBonus() || 0;
          this.storage.setChallengeBonus(currentBonus + rewardAmount);
        }
      }
    }

    if (anyCompleted) {
      this.saveChallenges();
      this.updateUI();
    }
  },

  // Get bonus coins from completed challenges
  claimBonus: function () {
    if (!this.storage) return 0;
    const bonus = this.storage.getChallengeBonus() || 0;
    this.storage.setChallengeBonus(0);
    return bonus;
  },

  // Create UI elements
  createUI: function () {
    const container = document.createElement('div');
    container.id = 'daily-challenges-container';
    container.innerHTML = `
      <div class="challenges-header">
        <span class="challenges-icon">📅</span>
        <span class="challenges-title">Daily Challenges</span>
      </div>
      <div class="challenges-list" id="challenges-list"></div>
    `;

    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      gameContainer.appendChild(container);
    }

    this.updateUI();
  },

  // Update UI display
  updateUI: function () {
    const list = document.getElementById('challenges-list');
    if (!list) return;

    let html = '';
    const difficultyLabels = ['Easy', 'Medium', 'Hard'];
    const difficultyColors = ['#88ff88', '#ffcc44', '#ff6666'];

    for (const challenge of this.activeChallenges) {
      const isCompleted = this.completedToday.includes(challenge.id);
      const completedClass = isCompleted ? 'completed' : '';
      const desc = challenge.description.replace('{target}', formatNumber(challenge.target));
      const reward = challenge.reward(challenge.difficulty);

      html += `
        <div class="challenge-item ${completedClass}">
          <div class="challenge-icon">${challenge.icon}</div>
          <div class="challenge-info">
            <div class="challenge-name">${challenge.name}</div>
            <div class="challenge-desc">${desc}</div>
            <div class="challenge-meta">
              <span class="challenge-difficulty" style="color: ${difficultyColors[challenge.difficulty]}">${difficultyLabels[challenge.difficulty]}</span>
              <span class="challenge-reward">+${formatNumber(reward)}</span>
            </div>
          </div>
          <div class="challenge-status">${isCompleted ? '✅' : '⬜'}</div>
        </div>
      `;
    }

    list.innerHTML = html;
  },

  // Get time until next challenge refresh
  getTimeUntilRefresh: function () {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const diff = tomorrow - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  },

  // Check if all challenges are completed
  allCompleted: function () {
    return this.completedToday.length >= this.activeChallenges.length;
  },
};

export default DailyChallenges;
