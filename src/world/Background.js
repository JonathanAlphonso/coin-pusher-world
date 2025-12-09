/**
 * Background System for Coin Pusher World
 * Manages the dynamic 3D background and themed decorations
 */

import * as THREE from 'three';
import { random } from '../core/Utils.js';

const Background = {
  scene: null,
  camera: null,
  
  // Background elements
  skybox: null,
  stars: null,
  nebula: null,
  grid: null,
  
  // Themed floating background decorations
  decorations: [],
  
  // State
  time: 0,
  
  init: function (scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.decorations = [];
    this.time = 0;
    
    this.createSkybox();
    this.createStars();
    this.createGrid();
    this.createAtmosphere(); // Floating particles/fog
    
    console.log("Background system initialized");
  },
  
  createSkybox: function () {
    // Gradient sky using a large sphere with custom shader material for performance and aesthetics
    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `;

    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize( vWorldPosition + offset ).y;
        gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h, 0.0 ), exponent ), 0.0 ) ), 1.0 );
      }
    `;

    const uniforms = {
      topColor: { value: new THREE.Color(0x001133) }, // Deep blue/purple top
      bottomColor: { value: new THREE.Color(0x1a0b2e) }, // Darker bottom
      offset: { value: 33 },
      exponent: { value: 0.6 }
    };

    const skyGeo = new THREE.SphereGeometry(150, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: THREE.BackSide
    });

    this.skybox = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skybox);
  },
  
  createStars: function () {
    const starCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    
    for (let i = 0; i < starCount; i++) {
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 80 + Math.random() * 40; // Distant but within skybox
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      positions.push(x, y, z);
      
      // Twinkling colors
      const color = new THREE.Color();
      color.setHSL(Math.random(), 0.5, 0.8);
      colors.push(color.r, color.g, color.b);
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });
    
    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  },
  
  createGrid: function () {
    // Retro-wave style moving grid at the bottom
    const gridHelper = new THREE.GridHelper(200, 100, 0x00ffff, 0x220044);
    gridHelper.position.y = -30;
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    this.grid = gridHelper;
    this.scene.add(this.grid);
  },

  createAtmosphere: function () {
    // Floating dust motes
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    
    for (let i = 0; i < particleCount; i++) {
      positions.push(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60
      );
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.2,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });
    
    this.atmosphere = new THREE.Points(geometry, material);
    this.scene.add(this.atmosphere);
  },
  
  // Add a huge themed decoration in the background
  addThemeDecoration: function (theme) {
    if (!theme) return;

    const group = new THREE.Group();
    
    // Position randomly in strictly negative Z space (behind the board)
    const x = random(-45, 45);
    // Board starts at z=0 and grows positive. Camera is at z=20+.
    // Decoration must be well behind the board (z < -10).
    const z = random(-60, -15);
    const y = random(-5, 25);
    
    group.position.set(x, y, z);
    
    // Material: Glowing wireframe or holographic look
    const material = new THREE.MeshPhongMaterial({
      color: theme.accent,
      emissive: theme.glow,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.6,
      wireframe: true,
    });
    
    const solidMat = new THREE.MeshPhongMaterial({
      color: theme.wall,
      emissive: theme.glow,
      emissiveIntensity: 0.2,
      flatShading: true,
    });

    let mesh;
    
    // Generate shape based on theme name
    switch (theme.name) {
      case "Neon Arcade":
        // Floating arcade stick or giant pixel
        const geo = new THREE.IcosahedronGeometry(4, 0);
        mesh = new THREE.Mesh(geo, material);
        // Add "pixels" orbiting
        for(let i=0; i<8; i++) {
           const pixel = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), solidMat);
           pixel.position.set(random(-5,5), random(-5,5), random(-5,5));
           group.add(pixel);
        }
        break;
        
      case "Dino Land":
        // Floating bone or egg
        const eggGeo = new THREE.SphereGeometry(3, 8, 8);
        eggGeo.scale(1, 1.4, 1);
        mesh = new THREE.Mesh(eggGeo, material);
        break;
        
      case "Alien Invasion":
        // Saucer shape
        const saucerGeo = new THREE.TorusGeometry(4, 1, 8, 16);
        mesh = new THREE.Mesh(saucerGeo, material);
        mesh.rotation.x = Math.PI/2;
        break;
        
      case "Pirate Cove":
        // Anchor or Wheel
        const wheelGeo = new THREE.TorusGeometry(3, 0.5, 8, 8);
        mesh = new THREE.Mesh(wheelGeo, solidMat);
        break;
        
      case "Candy Kingdom":
        // Giant Candy
        const candyGeo = new THREE.TorusKnotGeometry(2.5, 1, 60, 8);
        mesh = new THREE.Mesh(candyGeo, material);
        break;
        
      case "Space Station":
        // Satellite
        const satGeo = new THREE.OctahedronGeometry(4, 0);
        mesh = new THREE.Mesh(satGeo, material);
        break;
        
      default:
        // Generic crystal
        const crystalGeo = new THREE.ConeGeometry(3, 6, 4);
        mesh = new THREE.Mesh(crystalGeo, material);
    }
    
    group.add(mesh);
    this.scene.add(group);
    
    this.decorations.push({
      mesh: group,
      rotSpeed: random(0.1, 0.3) * (Math.random() < 0.5 ? 1 : -1),
      floatSpeed: random(0.2, 0.5),
      floatOffset: random(0, Math.PI * 2),
      baseY: y
    });
    
    console.log(`Added background decoration for ${theme.name}`);
  },
  
  update: function (deltaTime) {
    this.time += deltaTime;
    
    // Rotate stars slowly
    if (this.stars) {
      this.stars.rotation.y += deltaTime * 0.02;
    }
    
    // Float atmosphere
    if (this.atmosphere) {
      this.atmosphere.rotation.y -= deltaTime * 0.01;
      this.atmosphere.rotation.x += deltaTime * 0.005;
    }
    
    // Move grid
    if (this.grid) {
      this.grid.position.z = (this.time * 2) % 10 - 30;
    }
    
    // Animate decorations
    this.decorations.forEach(deco => {
      deco.mesh.rotation.y += deco.rotSpeed * deltaTime;
      deco.mesh.rotation.x += deco.rotSpeed * 0.5 * deltaTime;
      deco.mesh.position.y = deco.baseY + Math.sin(this.time * deco.floatSpeed + deco.floatOffset) * 2;
    });
  }
};

export default Background;
