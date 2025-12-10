/**
 * UI System for Coin Pusher World
 * Handles all UI updates and interactions
 */

import * as THREE from 'three';
import { formatNumber } from '../core/Utils.js';
import { tierThemes, getThemeOptions } from '../world/themes/index.js';

const UI = {
  // UI elements
  elements: {},

  // Score animation
  scoreDisplay: 0,
  targetScore: 0,

  // Message queue
  messages: [],
  messageTimer: 0,

  // Board selection callback
  boardSelectionCallback: null,

  // References (set during init)
  game: null,
  storage: null,
  sound: null,

  // Initialize UI
  init: function (game = null) {
    this.game = game;
    this.elements = {
      scoreValue: document.getElementById("score-value"),
      queueValue: document.getElementById("queue-value"),
      expansionValue: document.getElementById("expansion-value"),
      dropButton: document.getElementById("drop-button"),
      startScreen: document.getElementById("start-screen"),
      startButton: document.getElementById("start-button"),
      gameoverScreen: document.getElementById("gameover-screen"),
      finalScore: document.getElementById("final-score"),
      restartButton: document.getElementById("restart-button"),
      helpButton: document.getElementById("help-button"),
      helpOverlay: document.getElementById("help-overlay"),
      closeHelp: document.getElementById("close-help"),
      tierUnlockOverlay: document.getElementById("tier-unlock-overlay"),
      statsButton: document.getElementById("stats-button"),
      statsOverlay: document.getElementById("stats-overlay"),
      statsGrid: document.getElementById("stats-grid"),
      closeStats: document.getElementById("close-stats"),
      autoDropButton: document.getElementById("auto-drop-button"),
      tierProgressContainer: document.getElementById("tier-progress-container"),
      tierProgressFill: document.getElementById("tier-progress-fill"),
      tierProgressLabel: document.getElementById("tier-progress-label"),
      boardSelectionOverlay: null, // Created dynamically
      highScoresOverlay: document.getElementById("high-scores-overlay"),
      highScoresList: document.getElementById("high-scores-list"),
      viewScoresButton: document.getElementById("view-scores-button"),
      closeHighScores: document.getElementById("close-high-scores"),
      settingsButton: document.getElementById("settings-button"),
      settingsOverlay: document.getElementById("settings-overlay"),
      closeSettings: document.getElementById("close-settings"),
      masterVolumeSlider: document.getElementById("master-volume"),
      masterVolumeValue: document.getElementById("master-volume-value"),
      musicVolumeSlider: document.getElementById("music-volume"),
      musicVolumeValue: document.getElementById("music-volume-value"),
      sfxVolumeSlider: document.getElementById("sfx-volume"),
      sfxVolumeValue: document.getElementById("sfx-volume-value"),
      musicToggle: document.getElementById("music-toggle"),
      sfxToggle: document.getElementById("sfx-toggle"),
    };

    this.createBoardSelectionUI();
    this.scoreDisplay = 0;
    this.targetScore = 0;
    this.messages = [];

    this.setupEventListeners();
  },

  // Setup event listeners
  setupEventListeners: function () {
    const self = this;

    // Drop button
    if (this.elements.dropButton) {
      this.elements.dropButton.addEventListener("click", function (e) {
        e.preventDefault();
        if (self.game) self.game.dropCoin();
      });

      this.elements.dropButton.addEventListener("touchstart", function (e) {
        e.preventDefault();
        if (self.game) self.game.dropCoin();
      });
    }

    // Start button
    if (this.elements.startButton) {
      this.elements.startButton.addEventListener("click", function (e) {
        e.preventDefault();
        self.hideStartScreen();
        if (self.game) self.game.start();
      });
    }

    // Restart button
    if (this.elements.restartButton) {
      this.elements.restartButton.addEventListener("click", function (e) {
        e.preventDefault();
        self.hideGameOver();
        if (self.game) self.game.restart();
      });
    }

    // Help button
    if (this.elements.helpButton) {
      this.elements.helpButton.addEventListener("click", function (e) {
        e.preventDefault();
        self.showHelp();
      });
    }

    // Close help button
    if (this.elements.closeHelp) {
      this.elements.closeHelp.addEventListener("click", function (e) {
        e.preventDefault();
        self.hideHelp();
      });
    }

    // Stats button
    if (this.elements.statsButton) {
      this.elements.statsButton.addEventListener("click", function (e) {
        e.preventDefault();
        self.showStats();
      });
    }

    // Close stats button
    if (this.elements.closeStats) {
      this.elements.closeStats.addEventListener("click", function (e) {
        e.preventDefault();
        self.hideStats();
      });
    }

    // Auto-drop button
    if (this.elements.autoDropButton) {
      this.elements.autoDropButton.addEventListener("click", function (e) {
        e.preventDefault();
        if (self.game) self.game.toggleAutoDrop();
      });

      this.elements.autoDropButton.addEventListener("touchstart", function (e) {
        e.preventDefault();
        if (self.game) self.game.toggleAutoDrop();
      });
    }

    // View high scores button
    if (this.elements.viewScoresButton) {
      this.elements.viewScoresButton.addEventListener("click", function (e) {
        e.preventDefault();
        self.showHighScores();
      });
    }

    // Close high scores button
    if (this.elements.closeHighScores) {
      this.elements.closeHighScores.addEventListener("click", function (e) {
        e.preventDefault();
        self.hideHighScores();
      });
    }

    // Settings button
    if (this.elements.settingsButton) {
      this.elements.settingsButton.addEventListener("click", function (e) {
        e.preventDefault();
        self.showSettings();
      });
    }

    // Close settings button
    if (this.elements.closeSettings) {
      this.elements.closeSettings.addEventListener("click", function (e) {
        e.preventDefault();
        self.hideSettings();
      });
    }

    // Volume sliders
    this.setupVolumeSliders();
  },

  // Setup volume slider event listeners
  setupVolumeSliders: function () {
    const self = this;

    // Master volume
    if (this.elements.masterVolumeSlider) {
      this.elements.masterVolumeSlider.addEventListener("input", function (e) {
        const value = parseInt(e.target.value);
        self.updateMasterVolume(value);
      });
    }

    // Music volume
    if (this.elements.musicVolumeSlider) {
      this.elements.musicVolumeSlider.addEventListener("input", function (e) {
        const value = parseInt(e.target.value);
        self.updateMusicVolume(value);
      });
    }

    // SFX volume
    if (this.elements.sfxVolumeSlider) {
      this.elements.sfxVolumeSlider.addEventListener("input", function (e) {
        const value = parseInt(e.target.value);
        self.updateSfxVolume(value);
      });
    }

    // Music toggle
    if (this.elements.musicToggle) {
      this.elements.musicToggle.addEventListener("click", function (e) {
        e.preventDefault();
        self.toggleMusic();
      });
    }

    // SFX toggle
    if (this.elements.sfxToggle) {
      this.elements.sfxToggle.addEventListener("click", function (e) {
        e.preventDefault();
        self.toggleSfx();
      });
    }

    // Performance toggle
    const performanceToggle = document.getElementById('performance-toggle');
    if (performanceToggle) {
      performanceToggle.addEventListener("click", function (e) {
        e.preventDefault();
        if (self.game) {
          const newMode = self.game.togglePerformanceMode();
          performanceToggle.textContent = newMode ? "ON" : "OFF";
          performanceToggle.classList.toggle("active", newMode);
        }
      });
    }
  },

  // Update auto-drop button state
  updateAutoDropButton: function (isEnabled) {
    if (this.elements.autoDropButton) {
      this.elements.autoDropButton.textContent = isEnabled ? "AUTO: ON" : "AUTO: OFF";
      this.elements.autoDropButton.classList.toggle("active", isEnabled);
    }
  },

  // Update performance mode button state
  updatePerformanceMode: function (isLowPerf) {
    const performanceToggle = document.getElementById('performance-toggle');
    if (performanceToggle) {
      performanceToggle.textContent = isLowPerf ? "ON" : "OFF";
      performanceToggle.classList.toggle("active", isLowPerf);
    }
  },

  // Show help overlay
  showHelp: function () {
    if (this.elements.helpOverlay) {
      this.elements.helpOverlay.classList.remove("hidden");
      if (this.game && this.game.isRunning) {
        this.game.pause();
      }
    }
  },

  // Hide help overlay
  hideHelp: function () {
    if (this.elements.helpOverlay) {
      this.elements.helpOverlay.classList.add("hidden");
      if (this.game && this.game.isPaused) {
        this.game.resume();
      }
    }
  },

  // Show stats overlay
  showStats: function () {
    if (this.elements.statsOverlay) {
      this.populateStats();
      this.elements.statsOverlay.classList.remove("hidden");
      if (this.game && this.game.isRunning) {
        this.game.pause();
      }
    }
  },

  // Hide stats overlay
  hideStats: function () {
    if (this.elements.statsOverlay) {
      this.elements.statsOverlay.classList.add("hidden");
      if (this.game && this.game.isPaused) {
        this.game.resume();
      }
    }
  },

  // Show high scores overlay
  showHighScores: function () {
    if (this.elements.highScoresOverlay) {
      this.populateHighScores();
      this.elements.highScoresOverlay.classList.remove("hidden");
    }
  },

  // Hide high scores overlay
  hideHighScores: function () {
    if (this.elements.highScoresOverlay) {
      this.elements.highScoresOverlay.classList.add("hidden");
    }
  },

  // Populate high scores list
  populateHighScores: function () {
    if (!this.elements.highScoresList || !this.storage) return;

    const scores = this.storage.getHighScores();
    let html = "";

    if (scores.length === 0) {
      html = '<div class="no-scores">No high scores yet!</div>';
    } else {
      scores.forEach((entry, index) => {
        const date = new Date(entry.date);
        const dateStr = date.toLocaleDateString();
        const rankClass = index < 3 ? `rank-${index + 1}` : "";
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`;

        html += `
          <div class="high-score-entry ${rankClass}">
            <span class="high-score-rank">${medal}</span>
            <span class="high-score-value">${formatNumber(entry.score)}</span>
            <span class="high-score-tier">Tier ${entry.tier || 1}</span>
            <span class="high-score-date">${dateStr}</span>
          </div>
        `;
      });
    }

    this.elements.highScoresList.innerHTML = html;
  },

  // Show settings overlay
  showSettings: function () {
    if (this.elements.settingsOverlay) {
      this.loadSettingsUI();
      this.elements.settingsOverlay.classList.remove("hidden");
      if (this.game && this.game.isRunning) {
        this.game.pause();
      }
    }
  },

  // Hide settings overlay
  hideSettings: function () {
    if (this.elements.settingsOverlay) {
      this.elements.settingsOverlay.classList.add("hidden");
      if (this.game && this.game.isPaused) {
        this.game.resume();
      }
    }
  },

  // Load current settings into UI
  loadSettingsUI: function () {
    if (!this.sound) return;

    // Set slider values
    if (this.elements.masterVolumeSlider) {
      const masterVal = Math.round(this.sound.masterVolume * 100);
      this.elements.masterVolumeSlider.value = masterVal;
      if (this.elements.masterVolumeValue) {
        this.elements.masterVolumeValue.textContent = masterVal + "%";
      }
    }

    if (this.elements.musicVolumeSlider) {
      const musicVal = Math.round(this.sound.musicVolume * 100);
      this.elements.musicVolumeSlider.value = musicVal;
      if (this.elements.musicVolumeValue) {
        this.elements.musicVolumeValue.textContent = musicVal + "%";
      }
    }

    if (this.elements.sfxVolumeSlider) {
      const sfxVal = Math.round(this.sound.sfxVolume * 100);
      this.elements.sfxVolumeSlider.value = sfxVal;
      if (this.elements.sfxVolumeValue) {
        this.elements.sfxVolumeValue.textContent = sfxVal + "%";
      }
    }

    // Set toggle states
    if (this.elements.musicToggle) {
      this.elements.musicToggle.textContent = this.sound.musicEnabled ? "ON" : "OFF";
      this.elements.musicToggle.classList.toggle("active", this.sound.musicEnabled);
    }

    if (this.elements.sfxToggle) {
      this.elements.sfxToggle.textContent = this.sound.enabled ? "ON" : "OFF";
      this.elements.sfxToggle.classList.toggle("active", this.sound.enabled);
    }
  },

  // Update master volume
  updateMasterVolume: function (value) {
    if (!this.sound) return;

    const volume = value / 100;
    this.sound.masterVolume = volume;
    this.sound.setVolume(volume);

    if (this.elements.masterVolumeValue) {
      this.elements.masterVolumeValue.textContent = value + "%";
    }

    // Save to storage
    if (this.storage) {
      this.storage.updateSetting("masterVolume", volume);
    }
  },

  // Update music volume
  updateMusicVolume: function (value) {
    if (!this.sound) return;

    const volume = value / 100;
    this.sound.musicVolume = volume;

    // Update master gain if available
    if (this.sound.masterGain) {
      this.sound.masterGain.gain.value = this.sound.musicVolume * this.sound.masterVolume;
    }

    if (this.elements.musicVolumeValue) {
      this.elements.musicVolumeValue.textContent = value + "%";
    }

    // Save to storage
    if (this.storage) {
      this.storage.updateSetting("musicVolume", volume);
    }
  },

  // Update SFX volume
  updateSfxVolume: function (value) {
    if (!this.sound) return;

    const volume = value / 100;
    this.sound.sfxVolume = volume;

    if (this.elements.sfxVolumeValue) {
      this.elements.sfxVolumeValue.textContent = value + "%";
    }

    // Save to storage
    if (this.storage) {
      this.storage.updateSetting("sfxVolume", volume);
    }
  },

  // Toggle music
  toggleMusic: function () {
    if (!this.sound) return;

    this.sound.musicEnabled = !this.sound.musicEnabled;

    if (this.sound.musicEnabled) {
      if (this.game && this.game.isRunning) {
        this.sound.playMusic();
      }
    } else {
      this.sound.stopMusic();
    }

    if (this.elements.musicToggle) {
      this.elements.musicToggle.textContent = this.sound.musicEnabled ? "ON" : "OFF";
      this.elements.musicToggle.classList.toggle("active", this.sound.musicEnabled);
    }

    // Save to storage
    if (this.storage) {
      this.storage.updateSetting("musicEnabled", this.sound.musicEnabled);
    }
  },

  // Toggle SFX
  toggleSfx: function () {
    if (!this.sound) return;

    this.sound.enabled = !this.sound.enabled;

    if (this.elements.sfxToggle) {
      this.elements.sfxToggle.textContent = this.sound.enabled ? "ON" : "OFF";
      this.elements.sfxToggle.classList.toggle("active", this.sound.enabled);
    }

    // Save to storage
    if (this.storage) {
      this.storage.updateSetting("sfxEnabled", this.sound.enabled);
    }
  },

  // Populate stats grid with current game data
  populateStats: function () {
    if (!this.elements.statsGrid || !this.game) return;

    // Refresh game reference just in case
    // this.game should be valid if init was called correctly

    const stats = [];

    // Core game stats
    stats.push({ icon: "SCORE", label: "Total Score", value: formatNumber(this.game.score || 0) });
    stats.push({ icon: "TIER", label: "World Tier", value: (this.game.board?.currentTierCount || 1) }); 

    // Queue info - check various possible locations for queue count
    let queueValue = 0;
    if (this.game.coins) {
        queueValue = this.game.coins.queue || 0;
    }
    stats.push({ icon: "QUEUE", label: "Coins in Queue", value: queueValue });

    // Jackpot info
    if (this.game.jackpot) {
      const jackpotPercent = Math.floor((this.game.jackpot.value / this.game.jackpot.maxValue) * 100);
      stats.push({ icon: "JACKPOT", label: "Jackpot Meter", value: jackpotPercent + "%" });
      stats.push({ icon: "VALUE", label: "Jackpot Prize", value: formatNumber(this.game.jackpot.value) });
    }

    // Combo info
    if (this.game.combo) {
        // Ensure we're reading the right property
      stats.push({ icon: "COMBO", label: "Best Combo", value: (this.game.combo.maxCombo || this.game.combo.bestCombo || 0) + "x" });
    }

    // Collectibles (Relics) Stats
    if (this.game.collectibles) {
        const sets = this.game.collectibles.sets;
        const collection = this.game.collectibles.collection;
        let totalCollected = 0;
        let totalItems = 0;
        
        for(let key in sets) {
            totalItems += sets[key].items.length;
            if(collection[key]) {
                 for(let itemId in collection[key]) {
                     if(collection[key][itemId] > 0) totalCollected++;
                 }
            }
        }
        stats.push({ icon: "💎", label: "Relics Found", value: `${totalCollected}/${totalItems}` });
    }

    // Active coins on board - useful debug/stat
    if (this.game.coins && this.game.coins.coins) {
        // activeCoins might be a group or array, let's use the array length safely
        const count = this.game.coins.coins.length || 0;
        stats.push({ icon: "COINS", label: "Coins on Board", value: count });
    }

    // Build the HTML
    let html = "";
    for (const stat of stats) {
      const powerupClass = stat.isPowerup ? " powerup" : "";
      html += `
        <div class="stat-row${powerupClass}">
          <div class="stat-label">
            <span class="stat-icon">${stat.icon}</span>
            <span>${stat.label}</span>
          </div>
          <div class="stat-value">${stat.value}</div>
        </div>
      `;
    }

    // Add explicit Power-ups section if available
    if (this.game.powerUps && this.game.powerUps.levels) {
         html += `<div class="stats-header" style="margin-top: 15px; margin-bottom: 10px;"><h2>Power Ups</h2></div>`;
         for (const key in this.game.powerUps.types) {
            const type = this.game.powerUps.types[key];
            const level = this.game.powerUps.levels[key] || 0;
            if (level > 0) {
              html += `
                <div class="stat-row powerup">
                  <div class="stat-label">
                    <span class="stat-icon">${type.icon}</span>
                    <span>${type.name}</span>
                  </div>
                  <div class="stat-value">Lv ${level}</div>
                </div>
              `;
            }
         }
    }

    this.elements.statsGrid.innerHTML = html;
  },

  // Add click listener for 3D world interaction (Raycasting for relics)
  // This needs to be set up in init or setupEventListeners
  setupRaycaster: function(camera, scene, collectiblesSystem) {
      if(!camera || !collectiblesSystem) return;
      
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      
      window.addEventListener('click', (event) => {
          // Calculate mouse position in normalized device coordinates
          mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
          mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
          
          raycaster.setFromCamera(mouse, camera);
          
          // Check for intersections with collectible meshes
          const intersects = raycaster.intersectObjects(scene.children, true);
          
          for (let i = 0; i < intersects.length; i++) {
              // Traverse up to find the main mesh if we hit a child
              let obj = intersects[i].object;
              // Check if this object belongs to a collectible
              const collectible = collectiblesSystem.activeItems.find(c => c.mesh === obj || c.mesh === obj.parent);
              
              if (collectible) {
                  this.showRelicInfo(collectible.item);
                  break; // Only show info for the first hit
              }
          }
      });
  },

  // Show detailed info for a relic
  showRelicInfo: function(item) {
      this.showMessage(`${item.icon} ${item.name}\nRarity: ${item.rarity.toUpperCase()}\nValue: ${item.value}`);
  },

  // Update score display
  updateScore: function (score) {
    this.targetScore = score;
  },

  // Animate score (called each frame)
  animateScore: function () {
    if (this.scoreDisplay < this.targetScore) {
      const diff = this.targetScore - this.scoreDisplay;
      const step = Math.max(1, Math.floor(diff * 0.1));
      this.scoreDisplay = Math.min(this.scoreDisplay + step, this.targetScore);
      if (this.elements.scoreValue) {
        this.elements.scoreValue.textContent = formatNumber(this.scoreDisplay);
      }
    }
  },

  // Update queue display
  updateQueue: function (count) {
    if (this.elements.queueValue) {
      this.elements.queueValue.textContent = count;
    }
  },

  // Update expansion display
  updateExpansion: function (boardCount) {
    if (this.elements.expansionValue) {
      this.elements.expansionValue.textContent = boardCount;
    }
  },

  // Update tier progress bar
  updateTierProgress: function (progress) {
    if (this.elements.tierProgressFill) {
      const percent = Math.floor(progress * 100);
      this.elements.tierProgressFill.style.width = percent + '%';

      // Change color as progress increases
      if (progress >= 0.9) {
        this.elements.tierProgressFill.style.background = 'linear-gradient(90deg, #00ff88, #88ff00)';
      } else if (progress >= 0.7) {
        this.elements.tierProgressFill.style.background = 'linear-gradient(90deg, #ffaa00, #00ff88)';
      } else {
        this.elements.tierProgressFill.style.background = 'linear-gradient(90deg, #ffd700, #ffaa00)';
      }
    }

    // Update the label with next threshold
    if (this.elements.tierProgressLabel && this.game) {
      const nextThreshold = this.game.getNextTierThreshold();
      if (nextThreshold) {
        this.elements.tierProgressLabel.textContent = 'Next: ' + formatNumber(nextThreshold);
      } else {
        this.elements.tierProgressLabel.textContent = 'MAX TIER!';
        if (this.elements.tierProgressContainer) {
          this.elements.tierProgressContainer.classList.add('max-tier');
        }
      }
    }
  },

  // Update power-up display (now handled by stats overlay)
  updatePowerUp: function (powerUpId, level) {
    // Power-up display was removed - stats overlay shows this info now
  },

  // Show coin score popup
  showCoinScore: function (value, position) {
    const scoreEl = document.createElement("div");
    scoreEl.className = "coin-scored";
    scoreEl.textContent = "+" + formatNumber(value);

    const container = document.getElementById("game-container");
    scoreEl.style.left = "50%";
    scoreEl.style.top = "60%";

    container.appendChild(scoreEl);

    setTimeout(() => {
      container.removeChild(scoreEl);
    }, 1000);
  },

  // Show message
  showMessage: function (text) {
    this.messages.push({
      text: text,
      time: 2000,
    });

    this.displayNextMessage();
  },

  // Display next message in queue
  displayNextMessage: function () {
    if (this.messages.length === 0) return;
    if (this.messageTimer > 0) return;

    const msg = this.messages.shift();

    const msgEl = document.createElement("div");
    msgEl.className = "coin-scored";
    msgEl.style.left = "50%";
    msgEl.style.top = "40%";
    msgEl.style.fontSize = "28px";
    msgEl.textContent = msg.text;

    const container = document.getElementById("game-container");
    container.appendChild(msgEl);

    this.messageTimer = msg.time;

    setTimeout(() => {
      container.removeChild(msgEl);
      this.messageTimer = 0;
      this.displayNextMessage();
    }, msg.time);
  },

  // Show start screen
  showStartScreen: function () {
    if (this.elements.startScreen) {
      this.elements.startScreen.classList.remove("hidden");
    }
  },

  // Hide start screen
  hideStartScreen: function () {
    if (this.elements.startScreen) {
      this.elements.startScreen.classList.add("hidden");
    }
  },

  // Show game over screen
  showGameOver: function (finalScore, highScoreResult = null, sessionStats = null) {
    if (this.elements.finalScore) {
      this.elements.finalScore.textContent = formatNumber(finalScore);
    }

    // Update high score display
    const highScoreInfo = document.getElementById("high-score-info");
    if (highScoreInfo && highScoreResult) {
      if (highScoreResult.isNewBest) {
        highScoreInfo.innerHTML = '<span class="new-best">NEW HIGH SCORE!</span>';
        highScoreInfo.classList.add("celebration");
      } else if (highScoreResult.added && highScoreResult.rank > 0) {
        highScoreInfo.innerHTML = `Rank #${highScoreResult.rank} on leaderboard!`;
        highScoreInfo.classList.remove("celebration");
      } else {
        highScoreInfo.innerHTML = '';
        highScoreInfo.classList.remove("celebration");
      }
    }

    // Show best score
    const bestScoreEl = document.getElementById("best-score");
    if (bestScoreEl && this.storage) {
      const bestScore = this.storage.getBestScore();
      bestScoreEl.textContent = `Best: ${formatNumber(bestScore)}`;
    }

    // Show session stats
    if (sessionStats) {
      const coinsDropped = document.getElementById("stat-coins-dropped");
      const coinsScored = document.getElementById("stat-coins-scored");
      const bestCombo = document.getElementById("stat-best-combo");
      const tierReached = document.getElementById("stat-tier");

      if (coinsDropped) coinsDropped.textContent = formatNumber(sessionStats.coinsDropped || 0);
      if (coinsScored) coinsScored.textContent = formatNumber(sessionStats.coinsScored || 0);
      if (bestCombo) bestCombo.textContent = (sessionStats.bestCombo || 0) + "x";
      if (tierReached) tierReached.textContent = sessionStats.tier || 1;
    }

    if (this.elements.gameoverScreen) {
      this.elements.gameoverScreen.classList.remove("hidden");
    }
  },

  // Hide game over screen
  hideGameOver: function () {
    if (this.elements.gameoverScreen) {
      this.elements.gameoverScreen.classList.add("hidden");
    }
  },

  // Reset UI
  reset: function () {
    this.scoreDisplay = 0;
    this.targetScore = 0;
    if (this.elements.scoreValue) {
      this.elements.scoreValue.textContent = "0";
    }
    if (this.elements.queueValue) {
      this.elements.queueValue.textContent = "0";
    }
    if (this.elements.expansionValue) {
      this.elements.expansionValue.textContent = "1";
    }
  },

  // Show tier unlock animation
  showTierUnlock: function (themeName, themeIcon) {
    const overlay = this.elements.tierUnlockOverlay;
    if (!overlay) return;

    const iconEl = overlay.querySelector(".tier-unlock-icon");
    const textEl = overlay.querySelector(".tier-unlock-text");
    const starsContainer = overlay.querySelector(".tier-unlock-stars");

    if (iconEl) iconEl.textContent = themeIcon || "🎉";
    if (textEl) textEl.textContent = themeName || "New Tier!";

    if (starsContainer) {
      starsContainer.innerHTML = "";

      const starEmojis = ["⭐", "✨", "💫", "🌟", "⚡"];
      const starColors = ["#ffd700", "#ff00ff", "#00ffff", "#ff8800", "#88ff00"];

      for (let i = 0; i < 20; i++) {
        const star = document.createElement("span");
        star.className = "unlock-star";
        star.textContent = starEmojis[Math.floor(Math.random() * starEmojis.length)];
        star.style.color = starColors[Math.floor(Math.random() * starColors.length)];

        const angle = (Math.random() * 360) * (Math.PI / 180);
        const distance = 150 + Math.random() * 200;
        const endX = Math.cos(angle) * distance;
        const endY = Math.sin(angle) * distance;

        star.style.left = "50%";
        star.style.top = "50%";
        star.style.setProperty("--end-x", endX + "px");
        star.style.setProperty("--end-y", endY + "px");
        star.style.animationDelay = (Math.random() * 0.3) + "s";

        star.animate([
          { transform: "translate(-50%, -50%) scale(0)", opacity: 0 },
          { transform: "translate(-50%, -50%) scale(1)", opacity: 1, offset: 0.2 },
          { transform: `translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(0.5)`, opacity: 0 }
        ], {
          duration: 1500,
          easing: "ease-out",
          delay: Math.random() * 300
        });

        starsContainer.appendChild(star);
      }
    }

    overlay.classList.remove("hidden");

    const content = overlay.querySelector(".tier-unlock-content");
    if (content) {
      content.style.animation = "none";
      content.offsetHeight;
      content.style.animation = "";
    }

    setTimeout(() => {
      overlay.classList.add("hidden");
      if (starsContainer) starsContainer.innerHTML = "";
    }, 2500);
  },

  // Create board selection UI
  createBoardSelectionUI: function () {
    const overlay = document.createElement("div");
    overlay.id = "board-selection-overlay";
    overlay.className = "hidden";
    overlay.innerHTML = `
      <div class="board-selection-modal">
        <h2 class="board-selection-title">Choose Your Next Board!</h2>
        <p class="board-selection-subtitle">Each board focuses on a different powerup</p>
        <div class="board-options" id="board-options"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.elements.boardSelectionOverlay = overlay;
  },

  // Show board selection with 3 options
  showBoardSelection: function (usedThemeIndices, callback) {
    const overlay = this.elements.boardSelectionOverlay;
    if (!overlay) return;

    console.log(`[UI] showBoardSelection called, usedThemeIndices: [${usedThemeIndices.join(', ')}]`);

    this.boardSelectionCallback = callback;
    const options = getThemeOptions(usedThemeIndices);
    const optionsContainer = document.getElementById("board-options");

    console.log(`[UI] Theme options available:`, options.map(o => `${o.index}: ${o.theme.name}`));

    if (!optionsContainer) return;

    optionsContainer.innerHTML = "";

    for (const opt of options) {
      const theme = opt.theme;
      const optionEl = document.createElement("div");
      optionEl.className = "board-option";
      optionEl.dataset.themeIndex = opt.index;
      optionEl.innerHTML = `
        <div class="board-option-icon">${theme.icon}</div>
        <div class="board-option-name">${theme.name}</div>
        <div class="board-option-focus">${theme.focusLabel}</div>
        <div class="board-option-elements">${theme.description}</div>
      `;

      optionEl.addEventListener("click", () => {
        this.selectBoard(opt.index);
      });

      optionsContainer.appendChild(optionEl);
    }

    overlay.classList.remove("hidden");
    if (this.game) this.game.pause();
  },

  // Handle board selection
  selectBoard: function (themeIndex) {
    console.log(`[UI] selectBoard called with themeIndex: ${themeIndex}`);

    const numericIndex = Number(themeIndex);
    const resolvedIndex = Number.isInteger(numericIndex) ? numericIndex : themeIndex;

    const overlay = this.elements.boardSelectionOverlay;
    if (overlay) {
      overlay.classList.add("hidden");
    }

    if (this.boardSelectionCallback) {
      console.log(`[UI] Calling boardSelectionCallback with themeIndex: ${resolvedIndex}`);
      this.boardSelectionCallback(resolvedIndex);
      this.boardSelectionCallback = null;
    }

    if (this.game) this.game.resume();
  },

  // Create prize counter UI
  createPrizeCounterUI: function () {
    const overlay = document.createElement("div");
    overlay.id = "prize-counter-overlay";
    overlay.className = "hidden";
    overlay.innerHTML = `
      <div class="prize-counter-modal">
        <h2 class="prize-counter-title">Choose Your Prize!</h2>
        <p class="prize-counter-subtitle">Select one passive bonus for the rest of the run</p>
        <div class="prize-options" id="prize-options"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.elements.prizeCounterOverlay = overlay;
  },

  // Show prize counter with 6 options
  showPrizeCounter: function (prizes, callback) {
    // Create UI if it doesn't exist
    if (!this.elements.prizeCounterOverlay) {
      this.createPrizeCounterUI();
    }

    const overlay = this.elements.prizeCounterOverlay;
    if (!overlay) return;

    this.prizeSelectionCallback = callback;
    const optionsContainer = document.getElementById("prize-options");

    if (!optionsContainer) return;

    optionsContainer.innerHTML = "";

    // Create prize options
    prizes.forEach((prize, index) => {
      const optionEl = document.createElement("div");
      optionEl.className = `prize-option prize-${prize.rarity}`;
      optionEl.dataset.prizeId = prize.id;

      // Rarity colors
      const rarityColors = {
        common: '#aaaaaa',
        uncommon: '#4488ff',
        rare: '#ff44ff',
        legendary: '#ffaa00',
      };
      const rarityColor = rarityColors[prize.rarity] || '#ffffff';

      // Build affinity display
      let affinityHTML = '';
      if (prize.affinities && prize.affinities.length > 0) {
        const affinityNames = {
          queueSpeed: 'Neon',
          coinValue: 'Dino',
          luckyCoins: 'Alien',
          multiDrop: 'Pirate',
          queueCapacity: 'Candy',
          widerPusher: 'Space',
          comboTime: 'Jungle',
          jackpotChance: 'Robot'
        };
        const affinityIcons = prize.affinities
          .map(a => affinityNames[a] || a)
          .join(', ');
        affinityHTML = `<div class="prize-affinity">⚡ ${affinityIcons}</div>`;
      }

      optionEl.innerHTML = `
        <div class="prize-option-icon">${prize.icon || '🎁'}</div>
        <div class="prize-option-header" style="border-color: ${rarityColor}">
          <div class="prize-option-name" style="color: ${rarityColor}">${prize.name}</div>
          <div class="prize-option-rarity" style="color: ${rarityColor}">${prize.rarity.toUpperCase()}</div>
        </div>
        <div class="prize-option-summary">${prize.summary}</div>
        ${affinityHTML}
        <div class="prize-option-tags">${prize.tags.map(t => `<span class="prize-tag">${t}</span>`).join('')}</div>
      `;

      // Click handler
      optionEl.addEventListener("click", () => {
        if (this.prizeSelectionCallback) {
          this.prizeSelectionCallback(prize);
          this.prizeSelectionCallback = null;
        }
      });

      optionsContainer.appendChild(optionEl);
    });

    // Show overlay
    overlay.classList.remove("hidden");

    // Pause game
    if (this.game) this.game.pause();

    console.log('[UI] Prize counter shown with', prizes.length, 'options');
  },

  // Hide prize counter
  hidePrizeCounter: function () {
    const overlay = this.elements.prizeCounterOverlay;
    if (overlay) {
      overlay.classList.add("hidden");
    }

    if (this.game) this.game.resume();
  },

  // Update method called each frame
  update: function (deltaTime) {
    this.animateScore();
  },
};

export default UI;
