/**
 * UI System for Coin Pusher World
 * Handles all UI updates and interactions
 */

const UI = {
  // UI elements
  elements: {},

  // Score animation
  scoreDisplay: 0,
  targetScore: 0,

  // Message queue
  messages: [],
  messageTimer: 0,

  // Initialize UI
  init: function () {
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
    };

    this.scoreDisplay = 0;
    this.targetScore = 0;
    this.messages = [];

    this.setupEventListeners();
  },

  // Setup event listeners
  setupEventListeners: function () {
    const self = this;

    // Drop button
    this.elements.dropButton.addEventListener("click", function (e) {
      e.preventDefault();
      Game.dropCoin();
    });

    // Touch support for drop button
    this.elements.dropButton.addEventListener("touchstart", function (e) {
      e.preventDefault();
      Game.dropCoin();
    });

    // Start button
    this.elements.startButton.addEventListener("click", function (e) {
      e.preventDefault();
      self.hideStartScreen();
      Game.start();
    });

    // Restart button
    this.elements.restartButton.addEventListener("click", function (e) {
      e.preventDefault();
      self.hideGameOver();
      Game.restart();
    });

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
  },

  // Show help overlay
  showHelp: function () {
    if (this.elements.helpOverlay) {
      this.elements.helpOverlay.classList.remove("hidden");
      if (Game && Game.isRunning) {
        Game.pause();
      }
    }
  },

  // Hide help overlay
  hideHelp: function () {
    if (this.elements.helpOverlay) {
      this.elements.helpOverlay.classList.add("hidden");
      if (Game && Game.isPaused) {
        Game.resume();
      }
    }
  },

  // Show stats overlay
  showStats: function () {
    if (this.elements.statsOverlay) {
      this.populateStats();
      this.elements.statsOverlay.classList.remove("hidden");
      if (Game && Game.isRunning) {
        Game.pause();
      }
    }
  },

  // Hide stats overlay
  hideStats: function () {
    if (this.elements.statsOverlay) {
      this.elements.statsOverlay.classList.add("hidden");
      if (Game && Game.isPaused) {
        Game.resume();
      }
    }
  },

  // Populate stats grid with current game data
  populateStats: function () {
    if (!this.elements.statsGrid) return;

    const stats = [];

    // Core game stats
    stats.push({ icon: "🏆", label: "Score", value: Utils.formatNumber(Game.score) });
    stats.push({ icon: "🎯", label: "Current Tier", value: Game.currentExpansionIndex + 1 });
    stats.push({ icon: "📦", label: "Coins in Queue", value: Coins.queue });

    // Jackpot info
    if (Jackpot) {
      const jackpotPercent = Math.floor((Jackpot.value / Jackpot.maxValue) * 100);
      stats.push({ icon: "💎", label: "Jackpot Meter", value: jackpotPercent + "%" });
      stats.push({ icon: "💰", label: "Jackpot Value", value: Utils.formatNumber(Jackpot.value) });
    }

    // Combo info
    if (Combo) {
      stats.push({ icon: "🔥", label: "Best Combo", value: Combo.bestCombo + "x" });
    }

    // Power-up levels
    if (PowerUps && PowerUps.levels) {
      const powerupStats = [];
      for (const key in PowerUps.types) {
        const type = PowerUps.types[key];
        const level = PowerUps.levels[key] || 0;
        if (level > 0) {
          powerupStats.push({ icon: type.icon, label: type.name, value: "Lv " + level, isPowerup: true });
        }
      }
      stats.push(...powerupStats);
    }

    // Active coins on board
    if (Coins && Coins.activeCoins) {
      stats.push({ icon: "🪙", label: "Coins on Board", value: Coins.activeCoins.length });
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

    this.elements.statsGrid.innerHTML = html;
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
      this.elements.scoreValue.textContent = Utils.formatNumber(
        this.scoreDisplay
      );
    }
  },

  // Update queue display
  updateQueue: function (count) {
    this.elements.queueValue.textContent = count;
  },

  // Update expansion display
  updateExpansion: function (boardCount) {
    this.elements.expansionValue.textContent = boardCount;
  },

  // Update power-up display (now just logs since display was removed)
  updatePowerUp: function (powerUpId, level) {
    // Power-up display was removed - stats overlay shows this info now
  },

  // Show coin score popup
  showCoinScore: function (value, position) {
    // Create floating score element
    const scoreEl = document.createElement("div");
    scoreEl.className = "coin-scored";
    scoreEl.textContent = "+" + Utils.formatNumber(value);

    // Position based on 3D position (simplified)
    const container = document.getElementById("game-container");
    scoreEl.style.left = "50%";
    scoreEl.style.top = "60%";

    container.appendChild(scoreEl);

    // Remove after animation
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

    // Create message element
    const msgEl = document.createElement("div");
    msgEl.className = "coin-scored";
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
    this.elements.startScreen.classList.remove("hidden");
  },

  // Hide start screen
  hideStartScreen: function () {
    this.elements.startScreen.classList.add("hidden");
  },

  // Show game over screen
  showGameOver: function (finalScore) {
    this.elements.finalScore.textContent = Utils.formatNumber(finalScore);
    this.elements.gameoverScreen.classList.remove("hidden");
  },

  // Hide game over screen
  hideGameOver: function () {
    this.elements.gameoverScreen.classList.add("hidden");
  },

  // Reset UI
  reset: function () {
    this.scoreDisplay = 0;
    this.targetScore = 0;
    this.elements.scoreValue.textContent = "0";
    this.elements.queueValue.textContent = "0";
    this.elements.expansionValue.textContent = "1";
  },

  // Show tier unlock animation
  showTierUnlock: function (themeName, themeIcon) {
    const overlay = this.elements.tierUnlockOverlay;
    if (!overlay) return;

    // Set the icon and text
    const iconEl = overlay.querySelector(".tier-unlock-icon");
    const textEl = overlay.querySelector(".tier-unlock-text");
    const starsContainer = overlay.querySelector(".tier-unlock-stars");

    if (iconEl) iconEl.textContent = themeIcon || "🎉";
    if (textEl) textEl.textContent = themeName || "New Tier!";

    // Clear previous stars
    if (starsContainer) {
      starsContainer.innerHTML = "";

      // Create flying stars/sparkles
      const starEmojis = ["⭐", "✨", "💫", "🌟", "⚡"];
      const starColors = ["#ffd700", "#ff00ff", "#00ffff", "#ff8800", "#88ff00"];

      for (let i = 0; i < 20; i++) {
        const star = document.createElement("span");
        star.className = "unlock-star";
        star.textContent = starEmojis[Math.floor(Math.random() * starEmojis.length)];
        star.style.color = starColors[Math.floor(Math.random() * starColors.length)];

        // Random start position from center
        const angle = (Math.random() * 360) * (Math.PI / 180);
        const distance = 150 + Math.random() * 200;
        const endX = Math.cos(angle) * distance;
        const endY = Math.sin(angle) * distance;

        star.style.left = "50%";
        star.style.top = "50%";
        star.style.setProperty("--end-x", endX + "px");
        star.style.setProperty("--end-y", endY + "px");
        star.style.animationDelay = (Math.random() * 0.3) + "s";

        // Custom animation for each star
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

    // Show overlay
    overlay.classList.remove("hidden");

    // Force reflow to restart animation
    const content = overlay.querySelector(".tier-unlock-content");
    if (content) {
      content.style.animation = "none";
      content.offsetHeight; // Trigger reflow
      content.style.animation = "";
    }

    // Hide after animation completes
    setTimeout(() => {
      overlay.classList.add("hidden");
      if (starsContainer) starsContainer.innerHTML = "";
    }, 2500);
  },

  // Update method called each frame
  update: function (deltaTime) {
    this.animateScore();
  },
};

// Make available globally
window.UI = UI;
