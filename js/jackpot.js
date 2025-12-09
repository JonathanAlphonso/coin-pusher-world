/**
 * Jackpot System for Coin Pusher World
 * Build up the jackpot meter and win big!
 */

const Jackpot = {
  // Current jackpot value
  value: 0,
  maxValue: 10000,
  minBurst: 500,

  // Contribution per coin
  contributionRate: 0.05, // 5% of coin value goes to jackpot

  // Burst chance when jackpot item collected
  burstChancePerItem: 0.15,

  // Visual elements
  meterElement: null,
  valueElement: null,

  // 3D representation
  mesh: null,
  particles: [],

  // State
  isBursting: false,

  // Initialize
  init: function (scene) {
    this.scene = scene;
    this.value = 100; // Start with some value
    this.createUI();
    this.create3DMeter();
  },

  // Create UI elements
  createUI: function () {
    // Create jackpot meter in UI
    const container = document.createElement("div");
    container.id = "jackpot-container";
    container.innerHTML = `
      <div class="jackpot-header">
        <span class="jackpot-icon">🎰</span>
        <span class="jackpot-label">JACKPOT</span>
      </div>
      <div class="jackpot-meter">
        <div class="jackpot-fill" id="jackpot-fill"></div>
      </div>
      <div class="jackpot-value" id="jackpot-value">0</div>
    `;
    document.getElementById("game-container").appendChild(container);

    this.meterElement = document.getElementById("jackpot-fill");
    this.valueElement = document.getElementById("jackpot-value");
    this.updateUI();
  },

  // Create 3D jackpot display in the scene
  create3DMeter: function () {
    // Create a glowing jackpot orb above the board
    const geometry = new THREE.SphereGeometry(0.8, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: 0xffd700,
      emissive: 0xffaa00,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(0, 14, -2);
    this.scene.add(this.mesh);

    // Add ring around it
    const ringGeometry = new THREE.TorusGeometry(1, 0.1, 8, 32);
    const ringMaterial = new THREE.MeshPhongMaterial({
      color: 0xff00ff,
      emissive: 0xff00ff,
      emissiveIntensity: 0.4,
    });
    this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
    this.ring.position.copy(this.mesh.position);
    this.ring.rotation.x = Math.PI / 2;
    this.scene.add(this.ring);
  },

  // Add to jackpot when coin scores
  contribute: function (coinValue) {
    const contribution = Math.floor(coinValue * this.contributionRate);
    this.value = Math.min(this.value + contribution, this.maxValue);
    this.updateUI();
  },

  // Update UI display
  updateUI: function () {
    if (this.meterElement) {
      const percent = (this.value / this.maxValue) * 100;
      this.meterElement.style.width = percent + "%";

      // Color based on fill level
      if (percent > 80) {
        this.meterElement.style.background = "linear-gradient(90deg, #ff0000, #ffff00)";
      } else if (percent > 50) {
        this.meterElement.style.background = "linear-gradient(90deg, #ffaa00, #ffff00)";
      } else {
        this.meterElement.style.background = "linear-gradient(90deg, #ffd700, #ffaa00)";
      }
    }

    if (this.valueElement) {
      this.valueElement.textContent = Utils.formatNumber(this.value);
    }
  },

  // Try to burst the jackpot (called when jackpot item is collected)
  tryBurst: function () {
    if (this.value < this.minBurst || this.isBursting) return false;

    // Higher chance if jackpot is fuller
    const fillPercent = this.value / this.maxValue;
    const chance = this.burstChancePerItem + fillPercent * 0.2;

    if (Math.random() < chance) {
      this.burst();
      return true;
    }
    return false;
  },

  // Burst the jackpot!
  burst: function () {
    if (this.isBursting) return;
    this.isBursting = true;

    const wonAmount = this.value;
    UI.showMessage("🎰 JACKPOT! +" + Utils.formatNumber(wonAmount) + "! 🎰");
    Sound.play("jackpot");

    // Award the jackpot
    Game.addScore(wonAmount, 0, 10, 0, 1);

    // Spawn celebration coins
    this.spawnCelebration();

    // Reset jackpot
    this.value = 100;
    this.updateUI();

    setTimeout(() => {
      this.isBursting = false;
    }, 3000);
  },

  // Spawn celebration effects
  spawnCelebration: function () {
    const dropZone = Board.getDropZone();

    // Rain golden coins
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        const x = Utils.random(-8, 8);
        const y = 16 + Math.random() * 5;
        const z = Utils.random(-2, 4);
        Coins.spawnCoin(x, y, z, Math.random() < 0.3 ? "special" : "gold");
      }, i * 40);
    }

    // Spawn particles from jackpot orb
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const speed = 5 + Math.random() * 3;

      const geometry = new THREE.SphereGeometry(0.15, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(Math.random(), 1, 0.5),
        transparent: true,
        opacity: 1,
      });

      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(this.mesh.position);
      this.scene.add(particle);

      this.particles.push({
        mesh: particle,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 3,
        vz: (Math.random() - 0.5) * speed,
        life: 2,
        maxLife: 2,
      });
    }
  },

  // Update
  update: function (deltaTime) {
    const time = performance.now() * 0.001;

    // Animate jackpot orb
    if (this.mesh) {
      this.mesh.position.y = 14 + Math.sin(time * 2) * 0.3;
      const scale = 0.8 + (this.value / this.maxValue) * 0.4;
      this.mesh.scale.setScalar(scale);

      // Pulse glow based on fill
      const intensity = 0.3 + (this.value / this.maxValue) * 0.5 + Math.sin(time * 4) * 0.1;
      this.mesh.material.emissiveIntensity = intensity;
    }

    // Rotate ring
    if (this.ring) {
      this.ring.rotation.z += deltaTime * 2;
      this.ring.position.y = this.mesh.position.y;
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.x += p.vx * deltaTime;
      p.mesh.position.y += p.vy * deltaTime;
      p.mesh.position.z += p.vz * deltaTime;
      p.vy -= 8 * deltaTime;

      p.mesh.material.opacity = p.life / p.maxLife;
      p.mesh.scale.setScalar(p.life / p.maxLife);
    }
  },

  // Cleanup
  cleanup: function () {
    if (this.mesh) this.scene.remove(this.mesh);
    if (this.ring) this.scene.remove(this.ring);
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
    }
    this.particles = [];
  },
};

window.Jackpot = Jackpot;
