/**
 * Enhanced Physics Engine for Coin Pusher World
 * Features: Rotation physics, realistic coin settling, optimized collisions
 */

const Physics = {
  // Physics constants
  gravity: -15,
  friction: 0.3,
  restitution: 0.3,
  angularDamping: 0.92,  // Increased damping to reduce jiggling
  linearDamping: 0.98,   // New: helps coins settle faster

  // All physics bodies
  bodies: [],

  // Static bodies (walls, floors, pegs)
  staticBodies: [],

  // Pusher velocities for momentum transfer
  pusherVelocities: {},

  // Initialize physics
  init: function () {
    this.bodies = [];
    this.staticBodies = [];
    this.pusherVelocities = {};
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

    // Apply gravity and update velocities
    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];

      if (body.isSleeping) continue;

      // Apply gravity
      body.vy += this.gravity * dt;

      // Apply friction to horizontal movement
      body.vx *= 1 - body.friction * dt;
      body.vz *= 1 - body.friction * dt;

      // Apply linear damping (helps coins settle without jiggling)
      const speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy + body.vz * body.vz);
      if (speed < 2.0) {
        // Apply stronger damping when moving slowly
        const dampFactor = speed < 0.5 ? 0.90 : this.linearDamping;
        body.vx *= dampFactor;
        body.vz *= dampFactor;
        // Don't damp vertical too much or coins won't fall
        if (body.vy > -1) {
          body.vy *= dampFactor;
        }
      }

      // Apply angular damping
      body.ax *= this.angularDamping;
      body.ay *= this.angularDamping;
      body.az *= this.angularDamping;

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
        // Gently correct rotation towards flat
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

    // Find closest point on box to coin center
    const closestX = Utils.clamp(
      body.x,
      staticBody.x - halfWidth,
      staticBody.x + halfWidth
    );
    const closestY = Utils.clamp(
      body.y,
      staticBody.y - halfHeight,
      staticBody.y + halfHeight
    );
    const closestZ = Utils.clamp(
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

      // Push body out of collision
      const overlap = radius - dist;
      body.x += nx * overlap * 1.1; // Slightly more push to prevent sticking
      body.y += ny * overlap * 1.1;
      body.z += nz * overlap * 1.1;

      // Check if this is a pusher (has velocity tracking)
      const pusherId = staticBody.id;
      const pusherVel = this.pusherVelocities[pusherId];

      // Reflect velocity
      const velDotN = body.vx * nx + body.vy * ny + body.vz * nz;
      if (velDotN < 0) {
        const bounce = 1 + body.restitution;
        body.vx -= bounce * velDotN * nx;
        body.vy -= bounce * velDotN * ny;
        body.vz -= bounce * velDotN * nz;

        // Add rotation from collision
        const impactSpeed = Math.abs(velDotN);
        body.ax += (Math.random() - 0.5) * impactSpeed * 2;
        body.az += (Math.random() - 0.5) * impactSpeed * 2;

        // Wake up body
        body.isSleeping = false;
        body.sleepCounter = 0;
      }

      // If pusher is moving FORWARD, transfer momentum to the coin
      // Only push coins forward (positive Z), never backward when pusher retracts
      if (pusherVel && pusherVel > 0.1) {
        // Pusher is pushing forward (positive Z direction only)
        const pushForce = pusherVel * 3.5; // Amplify pusher effect
        body.vz += pushForce;
        // Also add slight upward and sideways motion for more natural pushing
        body.vy += pusherVel * 0.3;
        body.vx += (Math.random() - 0.5) * pusherVel * 0.5;

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

      // Push body out
      const overlap = minDist - dist;
      body.x += nx * overlap;
      body.y += ny * overlap;
      body.z += nz * overlap;

      // Reflect velocity with extra bounce for pegs
      const velDotN = body.vx * nx + body.vy * ny + body.vz * nz;
      if (velDotN < 0) {
        const bounce = 1 + body.restitution * 1.5; // Extra bouncy pegs
        body.vx -= bounce * velDotN * nx;
        body.vy -= bounce * velDotN * ny;
        body.vz -= bounce * velDotN * nz;

        // Add spin from peg hit
        const impactSpeed = Math.abs(velDotN);
        body.ax += nx * impactSpeed * 2;
        body.ay += (Math.random() - 0.5) * impactSpeed * 4;
        body.az += nz * impactSpeed * 2;

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

          // Add rotation from floor impact
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

      // Separate bodies
      const overlap = (minDist - dist) / 2;
      bodyA.x -= nx * overlap;
      bodyA.y -= ny * overlap;
      bodyA.z -= nz * overlap;
      bodyB.x += nx * overlap;
      bodyB.y += ny * overlap;
      bodyB.z += nz * overlap;

      // Calculate relative velocity
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

        // Transfer some rotation
        const impactSpeed = Math.abs(dvDotN);
        bodyA.ax += (Math.random() - 0.5) * impactSpeed;
        bodyA.az += (Math.random() - 0.5) * impactSpeed;
        bodyB.ax += (Math.random() - 0.5) * impactSpeed;
        bodyB.az += (Math.random() - 0.5) * impactSpeed;

        // Wake up bodies
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
    // Dynamic threshold based on board scoring area
    // Coins should be caught at the scoring slots, not fall into abyss
    const scoringY = (typeof Board !== 'undefined' && Board.scoringY) ? Board.scoringY : -15;
    const fallThreshold = scoringY - 3; // Just below scoring slots floor

    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const body = this.bodies[i];

      // Check if coin has fallen below the scoring area
      if (body.y < fallThreshold) {
        if (body.onFallOff) {
          body.onFallOff(body);
        }
      }

      // Safety check: also despawn coins that somehow escaped far from play area
      // (too far left/right or too far forward/back)
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
    const sleepVelocity = 0.12;  // Slightly higher threshold for earlier sleep
    const sleepAngular = 0.15;
    const sleepFrames = 30;      // Faster to sleep

    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];
      const speed = Math.sqrt(
        body.vx * body.vx + body.vy * body.vy + body.vz * body.vz
      );
      const angularSpeed = Math.sqrt(
        body.ax * body.ax + body.ay * body.ay + body.az * body.az
      );

      if (speed < sleepVelocity && angularSpeed < sleepAngular) {
        body.sleepCounter++;

        // Before fully sleeping, zero out tiny velocities to prevent jitter
        if (body.sleepCounter > sleepFrames / 2) {
          if (Math.abs(body.vx) < 0.05) body.vx = 0;
          if (Math.abs(body.vz) < 0.05) body.vz = 0;
          if (Math.abs(body.ax) < 0.05) body.ax = 0;
          if (Math.abs(body.ay) < 0.05) body.ay = 0;
          if (Math.abs(body.az) < 0.05) body.az = 0;
        }

        if (body.sleepCounter > sleepFrames) {
          body.isSleeping = true;
          body.vx = 0;
          body.vy = 0;
          body.vz = 0;
          body.ax = 0;
          body.ay = 0;
          body.az = 0;
          // Snap rotation to flat when sleeping
          body.rx = Math.round(body.rx / (Math.PI / 2)) * (Math.PI / 2);
          body.rz = Math.round(body.rz / (Math.PI / 2)) * (Math.PI / 2);
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
};

// Make available globally
window.Physics = Physics;
