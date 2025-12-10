/**
 * Enhanced Physics Engine for Coin Pusher World
 * Features: Rotation physics, realistic coin settling, optimized collisions
 */

import { clamp } from './Utils.js';

const Physics = {
  // Physics constants
  gravity: -10, // Reduced for more natural falling behavior
  friction: 0.4, // Increased for better surface grip
  restitution: 0.2, // Reduced for less bouncy coins
  angularDamping: 0.88, // Increased damping to stop spinning faster
  linearDamping: 0.96, // Increased damping to slow coins faster

  // All physics bodies
  bodies: [],

  // Static bodies (walls, floors, pegs)
  staticBodies: [],

  // Pusher velocities for momentum transfer
  pusherVelocities: {},

  // Board reference (set during init)
  board: null,

  // Initialize physics
  init: function (board = null) {
    this.bodies = [];
    this.staticBodies = [];
    this.pusherVelocities = {};
    this.board = board;
  },

  // Create a dynamic body (coins)
  createBody: function (options) {
    const body = {
      id: options.id || Math.random().toString(36).substr(2, 9),
      type: options.type || "dynamic",
      shape: options.shape || "cylinder",

      // Position
      x: options.x || 0,
      y: options.y || 0,
      z: options.z || 0,

      // Velocity
      vx: options.vx || 0,
      vy: options.vy || 0,
      vz: options.vz || 0,

      // Angular velocity (rotation)
      ax: options.ax || 0,
      ay: options.ay || 0,
      az: options.az || 0,

      // Rotation (euler angles)
      rx: options.rx || 0,
      ry: options.ry || 0,
      rz: options.rz || 0,

      // Dimensions
      radius: options.radius || 0.5,
      height: options.height || 0.1,
      width: options.width || 1,
      depth: options.depth || 1,

      // Properties
      mass: options.mass || 1,
      friction:
        options.friction !== undefined ? options.friction : this.friction,
      restitution:
        options.restitution !== undefined
          ? options.restitution
          : this.restitution,

      // State
      isStatic: options.isStatic || false,
      isSleeping: false,
      sleepThreshold: 0.01,
      sleepCounter: 0,

      // Reference to Three.js mesh
      mesh: options.mesh || null,

      // Callback when coin falls off
      onFallOff: options.onFallOff || null,

      // Custom data
      data: options.data || {},
    };

    if (body.isStatic) {
      this.staticBodies.push(body);
    } else {
      this.bodies.push(body);
    }

    return body;
  },

  // Add a body (alias for backwards compatibility)
  addBody: function (body) {
    if (body.isStatic) {
      if (!this.staticBodies.includes(body)) {
        this.staticBodies.push(body);
      }
    } else {
      if (!this.bodies.includes(body)) {
        this.bodies.push(body);
      }
    }
  },

  // Remove a body
  removeBody: function (body) {
    const index = this.bodies.indexOf(body);
    if (index > -1) {
      this.bodies.splice(index, 1);
    }
    const staticIndex = this.staticBodies.indexOf(body);
    if (staticIndex > -1) {
      this.staticBodies.splice(staticIndex, 1);
    }
  },

  // Update physics simulation
  update: function (deltaTime) {
    const dt = Math.min(deltaTime, 0.033);

    // Get scoring threshold for nudge calculation
    const scoringY = this.board?.scoringY ?? -15;

    // Apply gravity and update velocities
    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];

      if (body.isSleeping) continue;

      // Apply gravity
      body.vy += this.gravity * dt;

      // Apply friction to horizontal movement
      body.vx *= 1 - body.friction * dt;
      body.vz *= 1 - body.friction * dt;

      // Only apply a very gentle forward nudge when coins are on the edge and need to fall
      // Don't push coins that are resting on flat surfaces
      const horizontalSpeed = Math.sqrt(body.vx * body.vx + body.vz * body.vz);
      const isNearlyStationary = horizontalSpeed < 0.1 && Math.abs(body.vy) < 0.1;

      // Skip nudging stationary coins - they should stay still on flat surfaces
      if (isNearlyStationary) {
        // Do nothing - let coins rest naturally
      }

      // Apply linear damping - more aggressive for slow-moving coins to help them settle
      const speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy + body.vz * body.vz);
      if (speed < 2.0) {
        // Apply stronger damping for very slow coins to help them stop
        const dampFactor = speed < 0.2 ? 0.90 : (speed < 0.5 ? 0.95 : this.linearDamping);
        body.vx *= dampFactor;
        body.vz *= dampFactor;

        // Clamp very small velocities to zero to prevent endless micro-movement
        if (Math.abs(body.vx) < 0.02) body.vx = 0;
        if (Math.abs(body.vz) < 0.02) body.vz = 0;
      }

      // Apply angular damping - more aggressive for slow-spinning coins
      const angularSpeed = Math.sqrt(body.ax * body.ax + body.ay * body.ay + body.az * body.az);
      const angularDamp = angularSpeed < 0.3 ? 0.85 : this.angularDamping;
      body.ax *= angularDamp;
      body.ay *= angularDamp;
      body.az *= angularDamp;

      // Clamp very small angular velocities to zero
      if (Math.abs(body.ax) < 0.01) body.ax = 0;
      if (Math.abs(body.ay) < 0.01) body.ay = 0;
      if (Math.abs(body.az) < 0.01) body.az = 0;

      // Update position
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.z += body.vz * dt;

      // Update rotation
      body.rx += body.ax * dt;
      body.ry += body.ay * dt;
      body.rz += body.az * dt;

      // Normalize rotation to help coins settle flat
      if (Math.abs(body.vx) < 0.5 && Math.abs(body.vz) < 0.5 && Math.abs(body.vy) < 1) {
        body.rx *= 0.92;
        body.rz *= 0.92;
      }
    }

    // Check collisions
    this.resolveCollisions();

    // Update mesh positions
    this.syncMeshes();

    // Check for fallen coins
    this.checkFallenBodies();

    // Sleep check
    this.updateSleep();
  },

  // Resolve collisions between bodies
  resolveCollisions: function () {
    // Body vs static bodies (walls, floor, pusher, pegs)
    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];

      for (let j = 0; j < this.staticBodies.length; j++) {
        const staticBody = this.staticBodies[j];
        this.resolveCollision(body, staticBody);
      }
    }

    // Body vs body collisions
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        this.resolveBodyCollision(this.bodies[i], this.bodies[j]);
      }
    }
  },

  // Resolve collision between dynamic and static body
  resolveCollision: function (body, staticBody) {
    if (staticBody.shape === "box") {
      this.resolveBoxCollision(body, staticBody);
    } else if (staticBody.shape === "sphere" || staticBody.shape === "peg") {
      this.resolvePegCollision(body, staticBody);
    } else if (staticBody.shape === "plane") {
      this.resolvePlaneCollision(body, staticBody);
    }
  },

  // Box collision (walls, pushers, floors)
  resolveBoxCollision: function (body, staticBody) {
    const halfWidth = staticBody.width / 2;
    const halfHeight = staticBody.height / 2;
    const halfDepth = staticBody.depth / 2;

    const closestX = clamp(
      body.x,
      staticBody.x - halfWidth,
      staticBody.x + halfWidth
    );
    const closestY = clamp(
      body.y,
      staticBody.y - halfHeight,
      staticBody.y + halfHeight
    );
    const closestZ = clamp(
      body.z,
      staticBody.z - halfDepth,
      staticBody.z + halfDepth
    );

    const dx = body.x - closestX;
    const dy = body.y - closestY;
    const dz = body.z - closestZ;
    const distSq = dx * dx + dy * dy + dz * dz;
    const radius = body.radius;

    if (distSq < radius * radius && distSq > 0) {
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;

      const overlap = radius - dist;
      body.x += nx * overlap * 1.1;
      body.y += ny * overlap * 1.1;
      body.z += nz * overlap * 1.1;

      const pusherId = staticBody.id;
      const pusherVel = this.pusherVelocities[pusherId];

      const velDotN = body.vx * nx + body.vy * ny + body.vz * nz;
      if (velDotN < 0) {
        // Use realistic restitution - coins should lose energy on bounce
        // bounce = 1 means no bounce, bounce = 2 means perfect elastic
        const bounce = 1 + body.restitution * 0.5; // Reduced bounce for realistic behavior
        body.vx -= bounce * velDotN * nx;
        body.vy -= bounce * velDotN * ny;
        body.vz -= bounce * velDotN * nz;

        // Only add angular velocity for significant impacts, and much less of it
        const impactSpeed = Math.abs(velDotN);
        if (impactSpeed > 1.0) {
          body.ax += (Math.random() - 0.5) * impactSpeed * 0.3;
          body.az += (Math.random() - 0.5) * impactSpeed * 0.3;
        }

        body.isSleeping = false;
        body.sleepCounter = 0;
      }

      // If pusher is moving FORWARD, transfer momentum to the coin
      // Only push coins forward (positive Z), never backward when pusher retracts
      if (pusherVel && pusherVel > 0.1) {
        // Reduced force multiplier for more realistic pusher momentum
        const pushForce = pusherVel * 1.8;
        body.vz += pushForce;
        body.vy += pusherVel * 0.15; // Less upward bounce
        body.vx += (Math.random() - 0.5) * pusherVel * 0.2; // Less random side scatter

        body.isSleeping = false;
        body.sleepCounter = 0;
      }
    }
  },

  // Peg collision (pachinko pegs)
  resolvePegCollision: function (body, peg) {
    const dx = body.x - peg.x;
    const dy = body.y - peg.y;
    const dz = body.z - peg.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const minDist = body.radius + peg.radius;

    if (distSq < minDist * minDist && distSq > 0) {
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;

      const overlap = minDist - dist;
      body.x += nx * overlap;
      body.y += ny * overlap;
      body.z += nz * overlap;

      const velDotN = body.vx * nx + body.vy * ny + body.vz * nz;
      if (velDotN < 0) {
        // Pegs are slightly bouncier but still realistic
        const bounce = 1 + body.restitution * 0.8;
        body.vx -= bounce * velDotN * nx;
        body.vy -= bounce * velDotN * ny;
        body.vz -= bounce * velDotN * nz;

        // Reduced angular impulse for more predictable behavior
        const impactSpeed = Math.abs(velDotN);
        if (impactSpeed > 0.5) {
          body.ax += nx * impactSpeed * 0.5;
          body.ay += (Math.random() - 0.5) * impactSpeed * 0.8;
          body.az += nz * impactSpeed * 0.5;
        }

        body.isSleeping = false;
        body.sleepCounter = 0;
      }
    }
  },

  // Plane collision
  resolvePlaneCollision: function (body, staticBody) {
    if (staticBody.data && staticBody.data.normal) {
      const normal = staticBody.data.normal;
      const d = staticBody.data.d || 0;

      const dist =
        body.x * normal.x + body.y * normal.y + body.z * normal.z - d;

      if (dist < body.radius) {
        const overlap = body.radius - dist;
        body.x += normal.x * overlap;
        body.y += normal.y * overlap;
        body.z += normal.z * overlap;

        const velDotN =
          body.vx * normal.x + body.vy * normal.y + body.vz * normal.z;
        if (velDotN < 0) {
          const bounce = 1 + body.restitution;
          body.vx -= bounce * velDotN * normal.x;
          body.vy -= bounce * velDotN * normal.y;
          body.vz -= bounce * velDotN * normal.z;

          body.ax += body.vz * 0.5;
          body.az -= body.vx * 0.5;
        }
      }
    }
  },

  // Resolve collision between two dynamic bodies
  resolveBodyCollision: function (bodyA, bodyB) {
    const dx = bodyB.x - bodyA.x;
    const dy = bodyB.y - bodyA.y;
    const dz = bodyB.z - bodyA.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const minDist = bodyA.radius + bodyB.radius;

    if (distSq < minDist * minDist && distSq > 0) {
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;

      const overlap = (minDist - dist) / 2;
      bodyA.x -= nx * overlap;
      bodyA.y -= ny * overlap;
      bodyA.z -= nz * overlap;
      bodyB.x += nx * overlap;
      bodyB.y += ny * overlap;
      bodyB.z += nz * overlap;

      const dvx = bodyA.vx - bodyB.vx;
      const dvy = bodyA.vy - bodyB.vy;
      const dvz = bodyA.vz - bodyB.vz;
      const dvDotN = dvx * nx + dvy * ny + dvz * nz;

      if (dvDotN > 0) {
        const restitution = Math.min(bodyA.restitution, bodyB.restitution);
        const j =
          (-(1 + restitution) * dvDotN) / (1 / bodyA.mass + 1 / bodyB.mass);

        bodyA.vx += (j / bodyA.mass) * nx;
        bodyA.vy += (j / bodyA.mass) * ny;
        bodyA.vz += (j / bodyA.mass) * nz;
        bodyB.vx -= (j / bodyB.mass) * nx;
        bodyB.vy -= (j / bodyB.mass) * ny;
        bodyB.vz -= (j / bodyB.mass) * nz;

        // Only add angular velocity for significant coin-to-coin impacts
        const impactSpeed = Math.abs(dvDotN);
        if (impactSpeed > 1.0) {
          const angularFactor = 0.2; // Much reduced angular impulse
          bodyA.ax += (Math.random() - 0.5) * impactSpeed * angularFactor;
          bodyA.az += (Math.random() - 0.5) * impactSpeed * angularFactor;
          bodyB.ax += (Math.random() - 0.5) * impactSpeed * angularFactor;
          bodyB.az += (Math.random() - 0.5) * impactSpeed * angularFactor;
        }

        bodyA.isSleeping = false;
        bodyB.isSleeping = false;
        bodyA.sleepCounter = 0;
        bodyB.sleepCounter = 0;
      }
    }
  },

  // Sync physics bodies with Three.js meshes
  syncMeshes: function () {
    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];
      if (body.mesh) {
        body.mesh.position.set(body.x, body.y, body.z);
        body.mesh.rotation.set(body.rx, body.ry, body.rz);
      }
    }

    for (let i = 0; i < this.staticBodies.length; i++) {
      const body = this.staticBodies[i];
      if (body.mesh && !body.data.noSync) {
        body.mesh.position.set(body.x, body.y, body.z);
      }
    }
  },

  // Check for bodies that have fallen off or reached scoring area
  checkFallenBodies: function () {
    const scoringY = this.board?.scoringY ?? -15;
    const fallThreshold = scoringY - 3;

    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const body = this.bodies[i];

      if (body.y < fallThreshold) {
        if (body.onFallOff) {
          body.onFallOff(body);
        }
      }

      const maxDistance = 30;
      if (Math.abs(body.x) > maxDistance || Math.abs(body.z) > maxDistance) {
        if (body.onFallOff) {
          body.onFallOff(body);
        }
      }
    }
  },

  // Update sleep state for bodies
  updateSleep: function () {
    const sleepVelocity = 0.05; // Lower threshold for faster settling
    const sleepAngular = 0.05;
    const sleepFrames = 30; // Faster sleep for quicker settling

    // Get scoring threshold - coins above this should not sleep easily
    const scoringY = this.board?.scoringY ?? -15;

    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];
      const speed = Math.sqrt(
        body.vx * body.vx + body.vy * body.vy + body.vz * body.vz
      );
      const angularSpeed = Math.sqrt(
        body.ax * body.ax + body.ay * body.ay + body.az * body.az
      );

      // Coins above scoring area should not sleep - they need to fall
      const aboveScoringArea = body.y > scoringY + 1;

      if (speed < sleepVelocity && angularSpeed < sleepAngular && !aboveScoringArea) {
        body.sleepCounter++;

        // Start zeroing out tiny velocities earlier
        if (body.sleepCounter > sleepFrames / 3) {
          if (Math.abs(body.vx) < 0.02) body.vx = 0;
          if (Math.abs(body.vz) < 0.02) body.vz = 0;
          if (Math.abs(body.ax) < 0.02) body.ax = 0;
          if (Math.abs(body.ay) < 0.02) body.ay = 0;
          if (Math.abs(body.az) < 0.02) body.az = 0;
        }

        if (body.sleepCounter > sleepFrames) {
          body.isSleeping = true;
          body.vx = 0;
          body.vy = 0;
          body.vz = 0;
          body.ax = 0;
          body.ay = 0;
          body.az = 0;
          // Gradually flatten coins but don't snap aggressively
          body.rx *= 0.9;
          body.rz *= 0.9;
        }
      } else {
        body.sleepCounter = 0;
        body.isSleeping = false;
      }
    }
  },

  // Set pusher velocity for momentum transfer
  setPusherVelocity: function (pusherId, velocity) {
    this.pusherVelocities[pusherId] = velocity;
  },

  // Wake up all bodies in a region
  wakeRegion: function (x, y, z, radius) {
    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];
      const dx = body.x - x;
      const dy = body.y - y;
      const dz = body.z - z;
      if (dx * dx + dy * dy + dz * dz < radius * radius) {
        body.isSleeping = false;
        body.sleepCounter = 0;
      }
    }
  },

  // Apply impulse to a body
  applyImpulse: function (body, ix, iy, iz) {
    body.vx += ix / body.mass;
    body.vy += iy / body.mass;
    body.vz += iz / body.mass;
    body.isSleeping = false;
    body.sleepCounter = 0;
  },

  // Get active body count
  getActiveCount: function () {
    let count = 0;
    for (let i = 0; i < this.bodies.length; i++) {
      if (!this.bodies[i].isSleeping) count++;
    }
    return count;
  },

  // Alias for update (for test compatibility)
  step: function (deltaTime) {
    return this.update(deltaTime);
  },
};

export default Physics;
