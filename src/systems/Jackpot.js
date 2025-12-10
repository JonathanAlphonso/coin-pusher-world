/**
 * Jackpot System for Coin Pusher World
 * Build up the jackpot meter and win big!
 */

import * as THREE from 'three';
import { formatNumber, random } from '../core/Utils.js';

const Jackpot = {
  // Current jackpot value
  value: 0,
  maxValue: 10000,
  minBurst: 500,

  // Contribution per coin
  contributionRate: 0.05,

  // Burst chance when jackpot item collected
  burstChancePerItem: 0.15,

  // Visual elements
  meterElement: null,
  valueElement: null,

  // 3D representation
  mesh: null,
  ring: null,
  particles: [],

  // State
  isBursting: false,

  // References
  scene: null,
  game: null,
  ui: null,
  sound: null,
  coins: null,
  board: null,
  themeEffects: null,

  // Initialize
  init: function (scene, refs = {}) {
    this.scene = scene;
    this.game = refs.game;
    this.ui = refs.ui;
    this.sound = refs.sound;
    this.coins = refs.coins;
    this.board = refs.board;
    this.themeEffects = refs.themeEffects;
    this.value = 100;
    this.createUI();
    this.create3DMeter();
  },

  // Create UI elements
  createUI: function () {
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
    const gameContainer = document.getElementById("game-container");
    if (gameContainer) {
      gameContainer.appendChild(container);
    }

    this.meterElement = document.getElementById("jackpot-fill");
    this.valueElement = document.getElementById("jackpot-value");
    this.updateUI();
  },

  // Create 3D jackpot display in the scene
  create3DMeter: function () {
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

      if (percent > 80) {
        this.meterElement.style.background = "linear-gradient(90deg, #ff0000, #ffff00)";
      } else if (percent > 50) {
        this.meterElement.style.background = "linear-gradient(90deg, #ffaa00, #ffff00)";
      } else {
        this.meterElement.style.background = "linear-gradient(90deg, #ffd700, #ffaa00)";
      }
    }

    if (this.valueElement) {
      this.valueElement.textContent = formatNumber(this.value);
    }
  },

  // Try to burst the jackpot
  tryBurst: function () {
    if (this.value < this.minBurst || this.isBursting) return false;

    // Apply jackpot chance bonus from ThemeEffects (design spec section 5.8)
    const fillPercent = this.value / this.maxValue;
    const baseChance = this.burstChancePerItem + fillPercent * 0.2;
    const chance = this.themeEffects
      ? this.themeEffects.getJackpotChance(baseChance)
      : baseChance;

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
    if (this.ui) this.ui.showMessage("🎰 JACKPOT! +" + formatNumber(wonAmount) + "! 🎰");
    if (this.sound) this.sound.play("jackpot");

    if (this.game) {
      this.game.addScore(wonAmount, 0, 10, 0, 1);
      // Big screen shake for jackpot!
      this.game.shake(1.5, 0.6);
      // Track jackpot bursts
      this.game.sessionStats.jackpotBursts++;
    }

    this.spawnCelebration();

    this.value = 100;
    this.updateUI();

    setTimeout(() => {
      this.isBursting = false;
    }, 3000);
  },

  // Spawn celebration effects
  spawnCelebration: function () {
    // Rain golden coins
    if (this.coins) {
      for (let i = 0; i < 50; i++) {
        setTimeout(() => {
          const x = random(-8, 8);
          const y = 16 + Math.random() * 5;
          const z = random(-2, 4);
          this.coins.spawnCoin(x, y, z, Math.random() < 0.3 ? "special" : "gold");
        }, i * 40);
      }
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

    if (this.mesh) {
      this.mesh.position.y = 14 + Math.sin(time * 2) * 0.3;
      const scale = 0.8 + (this.value / this.maxValue) * 0.4;
      this.mesh.scale.setScalar(scale);

      const intensity = 0.3 + (this.value / this.maxValue) * 0.5 + Math.sin(time * 4) * 0.1;
      this.mesh.material.emissiveIntensity = intensity;
    }

    if (this.ring && this.mesh) {
      this.ring.rotation.z += deltaTime * 2;
      this.ring.position.y = this.mesh.position.y;
    }

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

  // Phase 9 - Save/Load support for run state persistence
  getSaveData: function () {
    return {
      value: this.value,
      isBursting: this.isBursting,
    };
  },

  loadSaveData: function (data) {
    if (!data) return;

    this.value = data.value || 0;
    this.isBursting = data.isBursting || false;

    // Update UI to reflect loaded state
    this.updateUI();
  },
};

export default Jackpot;
