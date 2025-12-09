/**
 * Storage System for Coin Pusher World
 * Handles persistent save data and high scores using LocalStorage
 */

const STORAGE_KEY = 'coinPusherWorld';
const HIGH_SCORES_KEY = 'coinPusherWorld_highScores';
const SETTINGS_KEY = 'coinPusherWorld_settings';
const MAX_HIGH_SCORES = 10;

const Storage = {
  // Default settings
  defaultSettings: {
    masterVolume: 0.6,
    musicVolume: 0.4,
    sfxVolume: 0.7,
    musicEnabled: true,
    sfxEnabled: true,
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
};

export default Storage;
