
import * as THREE from 'three';

const TextureGenerator = {
  // Cache textures to avoid regenerating them
  cache: {},

  createTexture: function(type, options) {
    const cacheKey = JSON.stringify({ type, ...options });
    // if (this.cache[cacheKey]) return this.cache[cacheKey];

    const width = 512;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Helper to extract hex color
    const getHexColor = (color) => {
        if (typeof color === 'number') return '#' + color.toString(16).padStart(6, '0');
        return color;
    }

    const color1 = getHexColor(options.color1 || 0xffffff);
    const color2 = getHexColor(options.color2 || 0xcccccc);
    const color3 = getHexColor(options.color3 || 0x888888);

    // Fill background
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, width, height);

    switch (type) {
      case 'grid':
        this.drawGrid(ctx, width, height, color2, options);
        break;
      case 'stripes':
        this.drawStripes(ctx, width, height, color2, options);
        break;
      case 'dots':
        this.drawDots(ctx, width, height, color2, options);
        break;
      case 'wood':
        this.drawWood(ctx, width, height, color2, color3, options);
        break;
      case 'metal':
        this.drawMetal(ctx, width, height, color2, color3, options);
        break;
      case 'circuit':
        this.drawCircuit(ctx, width, height, color2, options);
        break;
      case 'scales':
        this.drawScales(ctx, width, height, color2, options);
        break;
      case 'leaves':
        this.drawLeaves(ctx, width, height, color2, options);
        break;
      case 'panels':
        this.drawPanels(ctx, width, height, color2, color3, options);
        break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    // Store in cache
    // this.cache[cacheKey] = texture;
    
    return texture;
  },

  drawGrid: function(ctx, w, h, color, options) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    const spacing = 64;

    ctx.beginPath();
    for (let x = 0; x <= w; x += spacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += spacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    
    // Add some glow intersections
    ctx.fillStyle = color;
    for (let x = 0; x <= w; x += spacing) {
        for (let y = 0; y <= h; y += spacing) {
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
  },

  drawStripes: function(ctx, w, h, color, options) {
    ctx.fillStyle = color;
    const spacing = 64;
    const angle = Math.PI / 4;

    ctx.save();
    ctx.rotate(angle);
    // Draw oversized rects to cover rotation
    for (let i = -w; i < w * 2; i += spacing * 2) {
      ctx.fillRect(i, -h * 2, spacing, h * 4);
    }
    ctx.restore();
  },

  drawDots: function(ctx, w, h, color, options) {
    ctx.fillStyle = color;
    const spacing = 40;
    const radius = 8;

    for (let x = 0; x < w; x += spacing) {
      for (let y = 0; y < h; y += spacing) {
        ctx.beginPath();
        // Offset every other row
        const offsetX = (y / spacing) % 2 === 0 ? 0 : spacing / 2;
        ctx.arc(x + offsetX, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  drawWood: function(ctx, w, h, color1, color2, options) {
    // Grain
    ctx.fillStyle = color1;
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const len = 50 + Math.random() * 100;
        const thick = 1 + Math.random() * 3;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x, y, thick, len);
    }
    
    // Planks
    ctx.strokeStyle = color2;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 1.0;
    const plankWidth = 85;
    
    ctx.beginPath();
    for (let x = 0; x < w; x += plankWidth) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
    }
    ctx.stroke();
  },

  drawMetal: function(ctx, w, h, color1, color2, options) {
    // Noise/scratch
    for (let i = 0; i < 5000; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.fillStyle = Math.random() > 0.5 ? color1 : color2;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(x, y, 2, 2);
    }
    
    // Tread plate pattern
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = color1;
    const spacing = 64;
    
    for (let y = 0; y < h; y += spacing) {
        for (let x = 0; x < w; x += spacing) {
            const odd = (y / spacing) % 2 === 0;
            const px = x + (odd ? spacing/2 : 0);
            
            ctx.save();
            ctx.translate(px, y);
            ctx.rotate(odd ? Math.PI/4 : -Math.PI/4);
            ctx.beginPath();
            ctx.ellipse(0, 0, 15, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
  },

  drawCircuit: function(ctx, w, h, color, options) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Random paths
    for (let i = 0; i < 20; i++) {
        let x = Math.floor(Math.random() * (w/20)) * 20;
        let y = Math.floor(Math.random() * (h/20)) * 20;
        ctx.beginPath();
        ctx.moveTo(x, y);
        
        for (let j = 0; j < 5; j++) {
            const dir = Math.floor(Math.random() * 4);
            const move = 20 + Math.floor(Math.random() * 3) * 20;
            if (dir === 0) x += move;
            else if (dir === 1) x -= move;
            else if (dir === 2) y += move;
            else if (dir === 3) y -= move;
            
            ctx.lineTo(x, y);
            // Add node
            ctx.fillStyle = color;
            ctx.fillRect(x-4, y-4, 8, 8);
        }
        ctx.stroke();
    }
  },

  drawScales: function(ctx, w, h, color, options) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    
    const scaleW = 40;
    const scaleH = 30;
    
    for (let y = 0; y < h; y += scaleH) {
        for (let x = 0; x < w; x += scaleW) {
            const offsetX = (y/scaleH % 2) * (scaleW/2);
            ctx.beginPath();
            ctx.arc(x + offsetX, y, scaleW/2, 0, Math.PI, false);
            ctx.globalAlpha = 0.3;
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.stroke();
        }
    }
  },

  drawLeaves: function(ctx, w, h, color, options) {
    ctx.fillStyle = color;
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const size = 20 + Math.random() * 30;
        const rotation = Math.random() * Math.PI * 2;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.beginPath();
        ctx.ellipse(0, 0, size, size/2, 0, 0, Math.PI * 2);
        ctx.globalAlpha = 0.4;
        ctx.fill();
        // Vein
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.lineTo(size, 0);
        ctx.stroke();
        ctx.restore();
    }
  },

  drawPanels: function(ctx, w, h, color1, color2, options) {
      ctx.fillStyle = color1;
      ctx.strokeStyle = color2;
      ctx.lineWidth = 2;
      
      const panelSize = 128;
      
      for(let y=0; y<h; y+=panelSize) {
          for(let x=0; x<w; x+=panelSize) {
              const inset = 5;
              ctx.globalAlpha = 0.3;
              ctx.fillRect(x + inset, y + inset, panelSize - inset*2, panelSize - inset*2);
              ctx.globalAlpha = 1.0;
              ctx.strokeRect(x, y, panelSize, panelSize);
              
              // Detail
              if (Math.random() > 0.5) {
                  ctx.beginPath();
                  ctx.moveTo(x + panelSize*0.2, y + panelSize*0.2);
                  ctx.lineTo(x + panelSize*0.8, y + panelSize*0.8);
                  ctx.stroke();
              }
          }
      }
  }
};

export default TextureGenerator;
