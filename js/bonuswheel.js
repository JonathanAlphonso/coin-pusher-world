/**
 * Bonus Wheel System for Coin Pusher World
 * Big spinning wheel for exciting rewards!
 */

const BonusWheel = {
  // DOM elements
  container: null,
  wheel: null,
  pointer: null,

  // Wheel configuration
  segments: [
    { label: "+10 Coins", icon: "🪙", type: "coins", value: 10, color: "#ffd700" },
    { label: "2x Score 30s", icon: "✨", type: "multiplier", value: 2, color: "#ff00ff" },
    { label: "+25 Coins", icon: "💰", type: "coins", value: 25, color: "#ffaa00" },
    { label: "Coin Shower!", icon: "🌧️", type: "coinShower", value: 30, color: "#00ffff" },
    { label: "+50 Coins", icon: "💎", type: "coins", value: 50, color: "#00ff88" },
    { label: "FRENZY MODE!", icon: "🔥", type: "frenzy", value: 15, color: "#ff4444" },
    { label: "+100 Coins", icon: "👑", type: "coins", value: 100, color: "#ff00ff" },
    { label: "JACKPOT!", icon: "🎰", type: "jackpot", value: 0, color: "#ffd700" },
  ],

  // State
  isSpinning: false,
  currentRotation: 0,
  coinsDropped: 0,
  coinsForSpin: 50, // Coins needed for a free spin

  // Initialize
  init: function () {
    this.createWheelUI();
    this.coinsDropped = 0;
  },

  // Get responsive canvas size based on viewport
  getCanvasSize: function () {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Use smaller dimension, leave room for title/button
    const maxSize = Math.min(vw * 0.85, vh * 0.55, 300);
    return Math.max(180, maxSize); // Minimum 180px
  },

  // Create the wheel UI
  createWheelUI: function () {
    const canvasSize = this.getCanvasSize();

    // Main container
    this.container = document.createElement("div");
    this.container.id = "bonus-wheel-container";
    this.container.className = "hidden";
    this.container.innerHTML = `
      <div class="bonus-wheel-overlay"></div>
      <div class="bonus-wheel-modal">
        <h2 class="wheel-title">🎡 BONUS WHEEL! 🎡</h2>
        <div class="wheel-wrapper">
          <div class="wheel-pointer"></div>
          <canvas id="bonus-wheel-canvas" width="${canvasSize}" height="${canvasSize}"></canvas>
        </div>
        <button id="spin-wheel-btn" class="spin-btn">🎰 SPIN!</button>
        <div class="wheel-result hidden" id="wheel-result"></div>
      </div>
    `;
    document.body.appendChild(this.container);

    // Draw the wheel
    this.drawWheel();

    // Event listeners
    document.getElementById("spin-wheel-btn").addEventListener("click", () => {
      this.spin();
    });

    // Update canvas size on resize
    window.addEventListener("resize", () => {
      this.updateCanvasSize();
    });
  },

  // Update canvas size for responsive design
  updateCanvasSize: function () {
    const canvas = document.getElementById("bonus-wheel-canvas");
    if (!canvas) return;

    const newSize = this.getCanvasSize();
    canvas.width = newSize;
    canvas.height = newSize;
    this.drawWheel();
  },

  // Draw the wheel on canvas
  drawWheel: function () {
    const canvas = document.getElementById("bonus-wheel-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    // Scale radius based on canvas size (140 at 300px)
    const scale = canvas.width / 300;
    const radius = 140 * scale;
    const fontSize = Math.max(10, Math.floor(12 * scale));
    const centerRadius = 25 * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const segmentAngle = (2 * Math.PI) / this.segments.length;

    // Draw segments
    for (let i = 0; i < this.segments.length; i++) {
      const startAngle = i * segmentAngle + this.currentRotation;
      const endAngle = startAngle + segmentAngle;
      const seg = this.segments[i];

      // Segment fill
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text - draw with shadow for better readability
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = "right";
      ctx.font = `bold ${fontSize}px Arial`;
      // Shadow for readability
      ctx.fillStyle = "#000000";
      ctx.fillText(seg.icon + " " + seg.label, radius - 8 * scale, 5);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(seg.icon + " " + seg.label, radius - 10 * scale, 4);
      ctx.restore();
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = "#333333";
    ctx.fill();
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Center text
    ctx.fillStyle = "#ffd700";
    ctx.font = `bold ${Math.floor(16 * scale)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🎰", centerX, centerY);
  },

  // Track coins dropped for free spins
  onCoinDropped: function () {
    this.coinsDropped++;
    if (this.coinsDropped >= this.coinsForSpin) {
      this.coinsDropped = 0;
      this.trigger("coinCount");
    }
  },

  // Trigger the bonus wheel
  trigger: function (reason) {
    if (this.isSpinning) return;

    // Guard against multiple triggers - if wheel is already visible, don't pause again
    if (!this.container.classList.contains("hidden")) {
      return;
    }

    this.container.classList.remove("hidden");
    document.getElementById("wheel-result").classList.add("hidden");
    document.getElementById("spin-wheel-btn").classList.remove("hidden");
    Game.pause();

    // Show reason
    let title = "🎡 BONUS WHEEL! 🎡";
    if (reason === "setComplete") {
      title = "🎉 SET COMPLETE BONUS! 🎉";
    } else if (reason === "coinCount") {
      title = "⭐ FREE SPIN EARNED! ⭐";
    } else if (reason === "jackpot") {
      title = "💰 JACKPOT SPIN! 💰";
    }
    document.querySelector(".wheel-title").textContent = title;
  },

  // Spin the wheel
  spin: function () {
    if (this.isSpinning) return;
    this.isSpinning = true;

    document.getElementById("spin-wheel-btn").classList.add("hidden");
    Sound.play("spin");

    // Calculate spin
    const spins = 5 + Math.random() * 3; // 5-8 full rotations
    const targetSegment = Math.floor(Math.random() * this.segments.length);
    const segmentAngle = (2 * Math.PI) / this.segments.length;
    const targetRotation = spins * Math.PI * 2 + (this.segments.length - targetSegment - 0.5) * segmentAngle;

    const startRotation = this.currentRotation;
    const duration = 4000;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      this.currentRotation = startRotation + targetRotation * eased;
      this.drawWheel();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.isSpinning = false;
        this.onSpinComplete(this.segments[targetSegment]);
      }
    };

    requestAnimationFrame(animate);
  },

  // Handle spin result
  onSpinComplete: function (segment) {
    const resultEl = document.getElementById("wheel-result");
    resultEl.innerHTML = `<div class="result-icon">${segment.icon}</div><div class="result-text">${segment.label}</div>`;
    resultEl.classList.remove("hidden");

    Sound.play("win");

    // Apply reward
    switch (segment.type) {
      case "coins":
        Coins.addToQueue(segment.value);
        break;
      case "multiplier":
        Coins.valueMultiplier *= segment.value;
        setTimeout(() => {
          Coins.valueMultiplier = Math.max(1, Coins.valueMultiplier / segment.value);
          UI.showMessage("Multiplier ended!");
        }, 30000);
        UI.showMessage(segment.value + "x Score for 30 seconds!");
        break;
      case "coinShower":
        this.triggerCoinShower(segment.value);
        break;
      case "frenzy":
        this.triggerFrenzyMode(segment.value);
        break;
      case "jackpot":
        Jackpot.burst();
        break;
    }

    // Close after delay
    setTimeout(() => {
      this.close();
    }, 2000);
  },

  // Trigger coin shower power-up
  triggerCoinShower: function (count) {
    UI.showMessage("🌧️ COIN SHOWER!");
    const dropZone = Board.getDropZone();

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const x = Utils.random(dropZone.minX, dropZone.maxX);
        Coins.spawnCoin(x, dropZone.y + Math.random() * 3, dropZone.z + Math.random() * 2, "gold");
      }, i * 50);
    }
  },

  // Trigger frenzy mode
  triggerFrenzyMode: function (duration) {
    UI.showMessage("🔥 FRENZY MODE!");

    // Speed up pushers
    const originalSpeeds = Board.pushers.map(p => p.speed);
    Board.pushers.forEach(p => p.speed *= 2);

    // Double coin value
    const originalMult = Coins.valueMultiplier;
    Coins.valueMultiplier *= 2;

    // End frenzy after duration
    setTimeout(() => {
      Board.pushers.forEach((p, i) => p.speed = originalSpeeds[i]);
      Coins.valueMultiplier = originalMult;
      UI.showMessage("Frenzy ended!");
    }, duration * 1000);
  },

  // Close the wheel
  close: function () {
    this.container.classList.add("hidden");
    Game.resume();
  },
};

window.BonusWheel = BonusWheel;
