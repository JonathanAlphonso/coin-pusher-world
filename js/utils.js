/**
 * Utility functions for Coin Pusher World
 * Optimized for performance on old Android devices
 */

const Utils = {
  // Random number between min and max
  random: function (min, max) {
    return Math.random() * (max - min) + min;
  },

  // Random integer between min and max (inclusive)
  randomInt: function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Clamp value between min and max
  clamp: function (value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  // Linear interpolation
  lerp: function (a, b, t) {
    return a + (b - a) * t;
  },

  // Distance between two 3D points
  distance3D: function (x1, y1, z1, x2, y2, z2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  },

  // Distance between two 2D points
  distance2D: function (x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  // Convert degrees to radians
  degToRad: function (degrees) {
    return degrees * (Math.PI / 180);
  },

  // Convert radians to degrees
  radToDeg: function (radians) {
    return radians * (180 / Math.PI);
  },

  // Object pool for reusing objects (performance optimization)
  createPool: function (factory, initialSize) {
    const pool = [];
    const available = [];

    // Pre-create objects
    for (let i = 0; i < initialSize; i++) {
      const obj = factory();
      obj._poolIndex = i;
      pool.push(obj);
      available.push(i);
    }

    return {
      get: function () {
        if (available.length > 0) {
          const index = available.pop();
          return pool[index];
        }
        // Expand pool if needed
        const obj = factory();
        obj._poolIndex = pool.length;
        pool.push(obj);
        return obj;
      },

      release: function (obj) {
        if (
          obj._poolIndex !== undefined &&
          !available.includes(obj._poolIndex)
        ) {
          available.push(obj._poolIndex);
        }
      },

      getActiveCount: function () {
        return pool.length - available.length;
      },
    };
  },

  // Throttle function calls (for performance)
  throttle: function (func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Debounce function calls
  debounce: function (func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },

  // Format large numbers
  formatNumber: function (num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return Math.floor(num).toString();
  },

  // Check if device is mobile
  isMobile: function () {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  },

  // Check WebGL support level
  getWebGLVersion: function () {
    const canvas = document.createElement("canvas");
    const gl2 = canvas.getContext("webgl2");
    if (gl2) return 2;
    const gl1 =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl1) return 1;
    return 0;
  },

  // Simple easing functions
  easing: {
    linear: function (t) {
      return t;
    },
    easeInQuad: function (t) {
      return t * t;
    },
    easeOutQuad: function (t) {
      return t * (2 - t);
    },
    easeInOutQuad: function (t) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    },
    easeOutBounce: function (t) {
      if (t < 1 / 2.75) {
        return 7.5625 * t * t;
      } else if (t < 2 / 2.75) {
        return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
      } else if (t < 2.5 / 2.75) {
        return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
      } else {
        return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
      }
    },
  },
};

// Make available globally
window.Utils = Utils;
