/**
 * Storage System for Coin Pusher World
 * Handles persistent save data and high scores using LocalStorage
 */

const STORAGE_KEY = 'coinPusherWorld';
const HIGH_SCORES_KEY = 'coinPusherWorld_highScores';
const SETTINGS_KEY = 'coinPusherWorld_settings';
const LIFETIME_STATS_KEY = 'coinPusherWorld_lifetimeStats';
const DAILY_CHALLENGES_KEY = 'coinPusherWorld_dailyChallenges';
const CHALLENGE_BONUS_KEY = 'coinPusherWorld_challengeBonus';
const FIRST_TIME_KEY = 'coinPusherWorld_hasPlayed';
const MAX_HIGH_SCORES = 10;

const Storage = {
  // Default settings
  defaultSettings: {
    masterVolume: 0.6,
    musicVolume: 0.4,
    sfxVolume: 0.7,
    musicEnabled: true,
    sfxEnabled: true,
    lowPerformanceMode: false, // Design spec 10.4 - performance mode for old devices
  },

  // Check if localStorage is available
  isAvailable: function () {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  },

  // Save game state
  saveGame: function (gameData) {
    if (!this.isAvailable()) return false;

    try {
      const saveData = {
        ...gameData,
        timestamp: Date.now(),
        version: 1,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
      return true;
    } catch (e) {
      console.warn('Failed to save game:', e);
      return false;
    }
  },

  // Load game state
  loadGame: function () {
    if (!this.isAvailable()) return null;

    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to load game:', e);
      return null;
    }
  },

  // Clear saved game
  clearGame: function () {
    if (!this.isAvailable()) return false;

    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  },

  // Get high scores
  getHighScores: function () {
    if (!this.isAvailable()) return [];

    try {
      const data = localStorage.getItem(HIGH_SCORES_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to load high scores:', e);
      return [];
    }
  },

  // Add a new high score
  addHighScore: function (score, tier, date = null) {
    if (!this.isAvailable()) return { added: false, rank: -1 };

    try {
      const scores = this.getHighScores();
      const newEntry = {
        score: score,
        tier: tier,
        date: date || new Date().toISOString(),
      };

      // Add new score and sort
      scores.push(newEntry);
      scores.sort((a, b) => b.score - a.score);

      // Keep only top scores
      const trimmedScores = scores.slice(0, MAX_HIGH_SCORES);

      // Find rank of new score
      const rank = trimmedScores.findIndex(
        (s) => s.score === score && s.date === newEntry.date
      );

      // Save updated scores
      localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(trimmedScores));

      return {
        added: rank !== -1,
        rank: rank !== -1 ? rank + 1 : -1,
        isNewBest: rank === 0,
      };
    } catch (e) {
      console.warn('Failed to add high score:', e);
      return { added: false, rank: -1 };
    }
  },

  // Check if score would be a high score
  isHighScore: function (score) {
    const scores = this.getHighScores();
    if (scores.length < MAX_HIGH_SCORES) return true;
    return score > scores[scores.length - 1].score;
  },

  // Get the best score
  getBestScore: function () {
    const scores = this.getHighScores();
    return scores.length > 0 ? scores[0].score : 0;
  },

  // Clear all high scores
  clearHighScores: function () {
    if (!this.isAvailable()) return false;

    try {
      localStorage.removeItem(HIGH_SCORES_KEY);
      return true;
    } catch (e) {
      return false;
    }
  },

  // Get settings
  getSettings: function () {
    if (!this.isAvailable()) return { ...this.defaultSettings };

    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (!data) return { ...this.defaultSettings };
      return { ...this.defaultSettings, ...JSON.parse(data) };
    } catch (e) {
      console.warn('Failed to load settings:', e);
      return { ...this.defaultSettings };
    }
  },

  // Save settings
  saveSettings: function (settings) {
    if (!this.isAvailable()) return false;

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (e) {
      console.warn('Failed to save settings:', e);
      return false;
    }
  },

  // Update a single setting
  updateSetting: function (key, value) {
    const settings = this.getSettings();
    settings[key] = value;
    return this.saveSettings(settings);
  },

  // Reset settings to defaults
  resetSettings: function () {
    return this.saveSettings({ ...this.defaultSettings });
  },

  // Get all stats for display
  getStats: function () {
    const scores = this.getHighScores();
    return {
      gamesPlayed: scores.length,
      bestScore: scores.length > 0 ? scores[0].score : 0,
      bestTier: scores.length > 0 ? Math.max(...scores.map((s) => s.tier || 1)) : 0,
      totalScore: scores.reduce((sum, s) => sum + s.score, 0),
    };
  },

  // Default lifetime stats
  defaultLifetimeStats: {
    gamesPlayed: 0,
    totalScore: 0,
    totalCoinsDropped: 0,
    totalCoinsScored: 0,
    bestScore: 0,
    bestCombo: 0,
    bestTier: 0,
    jackpotBursts: 0,
    collectiblesFound: 0,
    powerUpsEarned: 0,
  },

  // Get lifetime stats
  getLifetimeStats: function () {
    if (!this.isAvailable()) return { ...this.defaultLifetimeStats };

    try {
      const data = localStorage.getItem(LIFETIME_STATS_KEY);
      if (!data) return { ...this.defaultLifetimeStats };
      return { ...this.defaultLifetimeStats, ...JSON.parse(data) };
    } catch (e) {
      console.warn('Failed to load lifetime stats:', e);
      return { ...this.defaultLifetimeStats };
    }
  },

  // Save lifetime stats
  saveLifetimeStats: function (stats) {
    if (!this.isAvailable()) return false;

    try {
      localStorage.setItem(LIFETIME_STATS_KEY, JSON.stringify(stats));
      return true;
    } catch (e) {
      console.warn('Failed to save lifetime stats:', e);
      return false;
    }
  },

  // Update lifetime stats after a game session
  updateLifetimeStats: function (sessionStats) {
    const lifetime = this.getLifetimeStats();

    lifetime.gamesPlayed++;
    lifetime.totalScore += sessionStats.score || 0;
    lifetime.totalCoinsDropped += sessionStats.coinsDropped || 0;
    lifetime.totalCoinsScored += sessionStats.coinsScored || 0;
    lifetime.jackpotBursts += sessionStats.jackpotBursts || 0;
    lifetime.collectiblesFound += sessionStats.collectiblesFound || 0;
    lifetime.powerUpsEarned += sessionStats.powerUpsEarned || 0;

    // Update best records
    if (sessionStats.score > lifetime.bestScore) {
      lifetime.bestScore = sessionStats.score;
    }
    if (sessionStats.bestCombo > lifetime.bestCombo) {
      lifetime.bestCombo = sessionStats.bestCombo;
    }
    if (sessionStats.tier > lifetime.bestTier) {
      lifetime.bestTier = sessionStats.tier;
    }

    this.saveLifetimeStats(lifetime);
    return lifetime;
  },

  // Get daily challenges data
  getDailyChallenges: function () {
    if (!this.isAvailable()) return null;

    try {
      const data = localStorage.getItem(DAILY_CHALLENGES_KEY);
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to load daily challenges:', e);
      return null;
    }
  },

  // Save daily challenges data
  saveDailyChallenges: function (data) {
    if (!this.isAvailable()) return false;

    try {
      localStorage.setItem(DAILY_CHALLENGES_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('Failed to save daily challenges:', e);
      return false;
    }
  },

  // Get challenge bonus coins (rewards from completed challenges)
  getChallengeBonus: function () {
    if (!this.isAvailable()) return 0;

    try {
      const data = localStorage.getItem(CHALLENGE_BONUS_KEY);
      return data ? parseInt(data, 10) : 0;
    } catch (e) {
      return 0;
    }
  },

  // Set challenge bonus coins
  setChallengeBonus: function (amount) {
    if (!this.isAvailable()) return false;

    try {
      localStorage.setItem(CHALLENGE_BONUS_KEY, String(amount));
      return true;
    } catch (e) {
      return false;
    }
  },

  // Check if player has played before (Phase 9 - first-time tutorial)
  hasPlayedBefore: function () {
    if (!this.isAvailable()) return true; // Default to true if no storage

    try {
      const value = localStorage.getItem(FIRST_TIME_KEY);
      return value === 'true';
    } catch (e) {
      return true;
    }
  },

  // Mark player as having played (Phase 9 - first-time tutorial)
  markAsPlayed: function () {
    if (!this.isAvailable()) return false;

    try {
      localStorage.setItem(FIRST_TIME_KEY, 'true');
      return true;
    } catch (e) {
      return false;
    }
  },
};

export default Storage;
