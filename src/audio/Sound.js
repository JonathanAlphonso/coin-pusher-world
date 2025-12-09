/**
 * Epic Sound & Music System for Coin Pusher World
 * Procedural synthesizer music with dynamic layers that respond to gameplay
 */

const Sound = {
  // Audio context
  ctx: null,

  // Master volume
  masterVolume: 0.6,
  musicVolume: 0.4,
  sfxVolume: 0.7,

  // Sound enabled
  enabled: true,
  musicEnabled: true,

  // Music state
  musicPlaying: false,
  musicTempo: 125,
  currentBeat: 0,
  currentBar: 0,
  currentSection: 0,
  currentTier: 0,

  // Music layers
  layers: {
    kick: null,
    hihat: null,
    snare: null,
    bass: null,
    pad: null,
    arp: null,
    lead: null,
  },

  // Gain nodes for each layer
  layerGains: {},

  // Master nodes
  masterGain: null,
  masterFilter: null,
  masterCompressor: null,
  reverbGain: null,
  reverbDelay: null,

  // Dynamic intensity (0-1)
  intensity: 0.3,
  targetIntensity: 0.3,

  // Current musical key and chord progression
  currentKey: 0,
  chordIndex: 0,

  // Musical scales (semitones from root)
  scales: {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    pentatonic: [0, 2, 4, 7, 9],
  },

  // Chord progressions
  progressions: {
    // I - V - vi - IV (Classic Epic)
    epic: [[0, 4, 7, 11], [7, 11, 14, 18], [9, 12, 16, 19], [5, 9, 12, 16]], 
    // I - vi - IV - V (Dreamy 50s/Pop)
    dreamy: [[0, 4, 7, 14], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]],
    // i - VI - III - VII (Classic Intense/Action)
    intense: [[0, 3, 7, 10], [8, 12, 15, 19], [3, 7, 10, 14], [10, 14, 17, 21]], 
    // I - IV - I - V (Uplifting)
    uplifting: [[0, 4, 7, 12], [5, 9, 12, 17], [0, 4, 7, 16], [7, 11, 14, 19]],
    // i - VII - VI - V (Andalusian/Mystical)
    mystical: [[0, 3, 7, 12], [10, 14, 17, 22], [8, 12, 15, 20], [7, 11, 14, 19]],
  },

  // Tier-based music themes
  tierThemes: [
    { key: 0, scale: 'major', progression: 'uplifting', tempo: 125, name: 'Neon Dreams' },
    { key: 5, scale: 'mixolydian', progression: 'epic', tempo: 128, name: 'Golden Palace' },
    { key: 2, scale: 'minor', progression: 'intense', tempo: 132, name: 'Cyber Punk' },
    { key: 7, scale: 'dorian', progression: 'dreamy', tempo: 120, name: 'Ocean Depths' },
    { key: 9, scale: 'minor', progression: 'intense', tempo: 138, name: 'Lava Kingdom' },
    { key: 4, scale: 'major', progression: 'uplifting', tempo: 126, name: 'Enchanted Forest' },
    { key: 11, scale: 'dorian', progression: 'mystical', tempo: 118, name: 'Crystal Cave' },
    { key: 0, scale: 'pentatonic', progression: 'epic', tempo: 140, name: 'Starlight Galaxy' },
  ],

  // Arpeggio patterns
  arpPatterns: [
    [0, 1, 2, 1],
    [0, 1, 2, 3, 2, 1],
    [0, 2, 1, 3],
    [3, 2, 1, 0],
    [0, 0, 1, 2, 2, 3],
  ],

  // Rhythm patterns
  rhythmPatterns: {
    kick: [
      [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    ],
    hihat: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    ],
    snare: [
      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0],
    ],
  },

  // Initialize sound system
  init: function () {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.setupMasterChain();

      const resumeAudio = () => {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      };
      document.addEventListener('click', resumeAudio);
      document.addEventListener('touchstart', resumeAudio);

      console.log('Epic Sound System initialized!');
    } catch (e) {
      console.warn('Web Audio not supported:', e);
      this.enabled = false;
    }
  },

  // Setup master audio chain
  setupMasterChain: function () {
    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.value = -18; // Less aggressive
    this.masterCompressor.knee.value = 30;
    this.masterCompressor.ratio.value = 3;
    this.masterCompressor.attack.value = 0.01;
    this.masterCompressor.release.value = 0.2;

    this.masterFilter = this.ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 22000; // Open up
    this.masterFilter.Q.value = 1;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.musicVolume * this.masterVolume;

    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.35; // More space

    // Stereo-ish delay (ping pong simulation manually)
    const delay1 = this.ctx.createDelay();
    delay1.delayTime.value = 0.15; // 1/8 note approx at 120bpm
    const delay2 = this.ctx.createDelay();
    delay2.delayTime.value = 0.25; 
    
    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.25;

    this.masterFilter.connect(this.reverbGain);
    this.reverbGain.connect(delay1);
    delay1.connect(delay2);
    delay2.connect(feedback);
    feedback.connect(delay1);
    
    // Connect wet signal to compressor
    delay1.connect(this.masterCompressor);
    delay2.connect(this.masterCompressor);

    this.masterFilter.connect(this.masterCompressor);
    this.masterCompressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    const layers = ['kick', 'hihat', 'snare', 'bass', 'pad', 'arp', 'lead'];
    layers.forEach(layer => {
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      gain.connect(this.masterFilter);
      this.layerGains[layer] = gain;
    });
  },

  // ... (keep midiToFreq and getScaleNote same) ...

  updateLayerVolumes: function () {
    const i = this.intensity;
    const vol = this.musicVolume * this.masterVolume;

    this.layerGains.kick.gain.value = vol * (0.6 + i * 0.2);
    this.layerGains.hihat.gain.value = vol * Math.max(0, (i - 0.1) * 0.4);
    this.layerGains.snare.gain.value = vol * Math.max(0, (i - 0.3) * 0.5);
    this.layerGains.bass.gain.value = vol * (0.4 + i * 0.25);
    // Reduced pad volume due to multi-oscillator thickness
    this.layerGains.pad.gain.value = vol * (0.15 + i * 0.1); 
    this.layerGains.arp.gain.value = vol * Math.max(0, (i - 0.2) * 0.3);
    this.layerGains.lead.gain.value = vol * Math.max(0, (i - 0.4) * 0.25);
  },

  midiToFreq: function (note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  },

  getScaleNote: function (degree, octave = 4) {
    const theme = this.tierThemes[this.currentTier || 0];
    const scale = this.scales[theme.scale];
    const root = theme.key;

    const octaveOffset = Math.floor(degree / scale.length);
    const scaleDegree = ((degree % scale.length) + scale.length) % scale.length;
    const semitone = scale[scaleDegree];

    return 36 + root + semitone + (octave + octaveOffset) * 12;
  },

  getCurrentChord: function (octave = 3) {
    const theme = this.tierThemes[this.currentTier || 0];
    const progression = this.progressions[theme.progression];
    const chord = progression[this.chordIndex % progression.length];
    const root = theme.key;

    return chord.map(interval => 36 + root + interval + octave * 12);
  },

  playMusic: function () {
    if (!this.enabled || !this.ctx || !this.musicEnabled || this.musicPlaying) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.musicPlaying = true;
    this.currentTier = 0;
    this.currentBeat = 0;
    this.currentBar = 0;
    this.chordIndex = 0;
    this.intensity = 0.3;
    this.targetIntensity = 0.3;

    this.startMusicLoop();
    console.log('Epic music started!');
  },

  startMusicLoop: function () {
    const beatDuration = 60 / this.musicTempo / 4;

    const tick = () => {
      if (!this.musicPlaying || !this.musicEnabled) return;

      const now = this.ctx.currentTime;

      this.intensity += (this.targetIntensity - this.intensity) * 0.02;
      this.updateLayerVolumes();
      this.playDrumBeat(now);

      if (this.currentBeat % 4 === 0) {
        this.playBass(now);
      }

      this.playArp(now, beatDuration);

      if (this.currentBeat === 0) {
        this.playPad(now);
      }

      if (this.intensity > 0.6 && this.currentBeat % 2 === 0 && Math.random() < 0.3) {
        this.playLead(now);
      }

      this.currentBeat = (this.currentBeat + 1) % 16;
      if (this.currentBeat === 0) {
        this.currentBar++;
        this.chordIndex = (this.chordIndex + 1) % 4;

        if (this.currentBar % 4 === 0) {
          this.currentSection++;
        }
      }

      this.musicTimeout = setTimeout(tick, beatDuration * 1000);
    };

    tick();
  },

  updateLayerVolumes: function () {
    const i = this.intensity;
    const vol = this.musicVolume * this.masterVolume;

    this.layerGains.kick.gain.value = vol * (0.4 + i * 0.3);
    this.layerGains.hihat.gain.value = vol * Math.max(0, (i - 0.2) * 0.5);
    this.layerGains.snare.gain.value = vol * Math.max(0, (i - 0.4) * 0.6);
    this.layerGains.bass.gain.value = vol * (0.5 + i * 0.3);
    this.layerGains.pad.gain.value = vol * (0.25 + i * 0.15);
    this.layerGains.arp.gain.value = vol * Math.max(0, (i - 0.3) * 0.4);
    this.layerGains.lead.gain.value = vol * Math.max(0, (i - 0.5) * 0.35);
  },

  playDrumBeat: function (time) {
    const patternIndex = Math.min(2, Math.floor(this.intensity * 3));

    if (this.rhythmPatterns.kick[patternIndex][this.currentBeat]) {
      this.playKick(time);
    }

    if (this.rhythmPatterns.hihat[patternIndex][this.currentBeat]) {
      this.playHiHat(time, this.currentBeat % 2 === 0);
    }

    if (this.rhythmPatterns.snare[patternIndex][this.currentBeat]) {
      this.playSnare(time);
    }
  },

  playKick: function (time) {
    // Punchy electronic kick
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.1);
    
    gain.gain.setValueAtTime(1.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    // Add a click for attack
    const click = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(1500, time);
    click.frequency.exponentialRampToValueAtTime(100, time + 0.02);
    clickGain.gain.setValueAtTime(0.5, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

    osc.connect(gain);
    click.connect(clickGain);
    
    // Connect to master
    gain.connect(this.layerGains.kick);
    clickGain.connect(this.layerGains.kick);

    osc.start(time);
    osc.stop(time + 0.35);
    click.start(time);
    click.stop(time + 0.02);
  },

  playHiHat: function (time, accent) {
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;
    
    const gain = this.ctx.createGain();
    const vol = accent ? 0.2 : 0.08;
    const decay = accent ? 0.08 : 0.04;
    
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.layerGains.hihat);
    
    noise.start(time);
  },

  playSnare: function (time) {
    // Body (tone)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, time);
    osc.frequency.exponentialRampToValueAtTime(140, time + 0.1);
    oscGain.gain.setValueAtTime(0.4, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    
    // Snare (noise)
    const noiseBufferSize = this.ctx.sampleRate * 0.2;
    const noiseBuffer = this.ctx.createBuffer(1, noiseBufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1500;
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    
    osc.connect(oscGain);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    
    oscGain.connect(this.layerGains.snare);
    noiseGain.connect(this.layerGains.snare);
    
    osc.start(time);
    osc.stop(time + 0.2);
    noise.start(time);
  },

  playBass: function (time) {
    const chord = this.getCurrentChord(2); // Octave 2 for deep bass
    const note = chord[0];
    const freq = this.midiToFreq(note);
    
    // Oscillator 1: Sawtooth for grit
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = freq;
    
    // Oscillator 2: Square for body, slightly detuned
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = freq * 0.5; // Sub-octave
    
    // Filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, time);
    filter.frequency.exponentialRampToValueAtTime(800 + this.intensity * 1000, time + 0.05); // Attack 'wow'
    filter.frequency.exponentialRampToValueAtTime(200, time + 0.4);
    filter.Q.value = 3;

    // Amp Envelope
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.4, time + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.layerGains.bass);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.5);
    osc2.stop(time + 0.5);
  },

  playArp: function (time, beatDuration) {
    const chord = this.getCurrentChord(4);
    const pattern = this.arpPatterns[this.currentSection % this.arpPatterns.length];
    const patternIndex = this.currentBeat % pattern.length;
    const noteIndex = pattern[patternIndex] % chord.length;
    const note = chord[noteIndex];
    if (this.currentBeat % 2 !== 0 && Math.random() < 0.4) return;

    // Plucky synth
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = this.midiToFreq(note);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, time);
    filter.frequency.exponentialRampToValueAtTime(3000 + this.intensity * 2000, time + 0.02);
    filter.frequency.exponentialRampToValueAtTime(200, time + 0.2);
    filter.Q.value = 2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.15, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.layerGains.arp);

    osc.start(time);
    osc.stop(time + 0.2);
  },

  playPad: function (time) {
    const chord = this.getCurrentChord(3);
    const beatDuration = 60 / this.musicTempo;

    chord.forEach((note) => {
      // Super-saw pad effect: Multiple detuned oscillators
      const freqs = [
          this.midiToFreq(note),
          this.midiToFreq(note) * 1.002,
          this.midiToFreq(note) * 0.998
      ];

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.06, time + 0.5); // Slow attack
      gain.gain.setValueAtTime(0.06, time + beatDuration * 3.5);
      gain.gain.linearRampToValueAtTime(0, time + beatDuration * 4);
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800 + Math.sin(time) * 200; // Moving filter LFO

      freqs.forEach(f => {
          const osc = this.ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = f;
          osc.connect(filter);
          osc.start(time);
          osc.stop(time + beatDuration * 4.5);
      });

      filter.connect(gain);
      gain.connect(this.layerGains.pad);
    });
  },

  playLead: function (time) {
    const chord = this.getCurrentChord(5);
    // Pick a pentatonic scale note for better melody
    const theme = this.tierThemes[this.currentTier || 0];
    const scale = this.scales.pentatonic; // Use pentatonic for solos usually sounds better
    const root = theme.key;
    const noteIndex = Math.floor(Math.random() * scale.length);
    const note = 60 + root + scale[noteIndex]; // Higher octave

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle'; // Smoother lead
    osc.frequency.setValueAtTime(this.midiToFreq(note), time);
    
    // Vibrato LFO
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 5;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 2;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.linearRampToValueAtTime(0.12, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.layerGains.lead);

    osc.start(time);
    osc.stop(time + 0.4);
    lfo.stop(time + 0.4);
  },

  stopMusic: function () {
    this.musicPlaying = false;
    if (this.musicTimeout) {
      clearTimeout(this.musicTimeout);
      this.musicTimeout = null;
    }
  },

  setIntensity: function (value) {
    this.targetIntensity = Math.max(0.1, Math.min(1, value));
  },

  setTier: function (tier) {
    this.currentTier = tier % this.tierThemes.length;
    const theme = this.tierThemes[this.currentTier];
    this.musicTempo = theme.tempo;
    console.log('Music theme:', theme.name);
  },

  filterSweep: function (up = true) {
    if (!this.masterFilter) return;
    const now = this.ctx.currentTime;
    if (up) {
      this.masterFilter.frequency.setValueAtTime(500, now);
      this.masterFilter.frequency.exponentialRampToValueAtTime(20000, now + 0.5);
    } else {
      this.masterFilter.frequency.setValueAtTime(20000, now);
      this.masterFilter.frequency.exponentialRampToValueAtTime(500, now + 0.3);
      this.masterFilter.frequency.exponentialRampToValueAtTime(20000, now + 0.8);
    }
  },

  // Sound effects
  play: function (type) {
    if (!this.enabled || !this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    switch (type) {
      case 'drop': this.playDrop(); break;
      case 'coin': this.playCoin(); break;
      case 'score': this.playScore(); break;
      case 'bonus': this.playBonus(); break;
      case 'powerup': this.playPowerup(); break;
      case 'levelup': this.playLevelup(); break;
      case 'hit': this.playHit(); break;
      case 'ability': this.playAbility(); break;
      case 'jackpot': this.playJackpot(); break;
      case 'combo': this.playCombo(); break;
      case 'spin': this.playSpin(); break;
      case 'win': this.playWin(); break;
    }
  },

  playDrop: function () {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  },

  playCoin: function () {
    const chord = this.musicPlaying ? this.getCurrentChord(5) : [72, 76, 79];
    const notes = [chord[0], chord[1], chord[2]];

    notes.forEach((note, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = this.midiToFreq(note);

      const startTime = this.ctx.currentTime + i * 0.04;
      gain.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });

    this.targetIntensity = Math.min(1, this.targetIntensity + 0.01);
  },

  playScore: function () {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1800, this.ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  },

  playBonus: function () {
    const notes = this.musicPlaying
      ? [...this.getCurrentChord(4), this.getCurrentChord(5)[0]]
      : [60, 64, 67, 72];

    notes.forEach((note, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = this.midiToFreq(note);

      const startTime = this.ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(this.sfxVolume * this.masterVolume * 0.35, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });

    this.filterSweep(true);
    this.targetIntensity = Math.min(1, this.targetIntensity + 0.05);
  },

  playPowerup: function () {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'square';

    osc1.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.3);
    osc1.frequency.exponentialRampToValueAtTime(1600, this.ctx.currentTime + 0.5);

    osc2.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.3);
    osc2.frequency.exponentialRampToValueAtTime(2000, this.ctx.currentTime + 0.5);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(8000, this.ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.6);
    osc2.stop(this.ctx.currentTime + 0.6);

    this.targetIntensity = Math.min(1, this.targetIntensity + 0.1);
  },

  playLevelup: function () {
    const baseNotes = this.musicPlaying ? this.getCurrentChord(4) : [60, 64, 67];

    const melody = [
      baseNotes[0], baseNotes[1], baseNotes[2],
      baseNotes[2] + 12, baseNotes[1] + 12, baseNotes[2] + 12, baseNotes[0] + 17
    ];

    melody.forEach((note, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = i < 3 ? 'square' : 'sawtooth';
      osc.frequency.value = this.midiToFreq(note);

      const startTime = this.ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(this.sfxVolume * this.masterVolume * 0.2, startTime + 0.02);
      gain.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.18, startTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });

    this.filterSweep(true);
  },

  playHit: function () {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const pitch = 300 + Math.random() * 600;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  },

  playAbility: function () {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 5;

    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = noiseBuffer;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.3, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

    filter.frequency.setValueAtTime(200, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(4000, this.ctx.currentTime + 0.2);
    filter.frequency.exponentialRampToValueAtTime(500, this.ctx.currentTime + 0.4);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start();

    const chord = [36, 43, 48, 55];
    chord.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = this.midiToFreq(note);
      gain.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.15, this.ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + 0.1);
      osc.stop(this.ctx.currentTime + 0.5);
    });

    this.targetIntensity = Math.min(1, this.targetIntensity + 0.15);
  },

  playJackpot: function () {
    const chords = [
      [48, 52, 55, 60],
      [50, 53, 57, 62],
      [52, 55, 59, 64],
      [53, 57, 60, 65],
    ];

    chords.forEach((chord, chordIndex) => {
      chord.forEach((note) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = chordIndex < 2 ? 'sawtooth' : 'square';
        osc.frequency.value = this.midiToFreq(note);

        const startTime = this.ctx.currentTime + chordIndex * 0.15;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(this.sfxVolume * this.masterVolume * 0.2, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    });

    this.filterSweep(true);
    this.targetIntensity = 1;
  },

  playCombo: function () {
    const pitch = 400 + this.intensity * 600;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);

    this.targetIntensity = Math.min(1, this.targetIntensity + 0.02);
  },

  playSpin: function () {
    this.playPowerup();
  },

  playWin: function () {
    this.playBonus();
  },

  toggle: function () {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopMusic();
    }
    return this.enabled;
  },

  toggleMusic: function () {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicEnabled) {
      this.playMusic();
    } else {
      this.stopMusic();
    }
    return this.musicEnabled;
  },

  setVolume: function (vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain) {
      this.masterGain.gain.value = this.musicVolume * this.masterVolume;
    }
  },

  // Mute all sounds - useful for tests
  mute: function () {
    this.enabled = false;
    this.musicEnabled = false;
    this.stopMusic();
    if (this.masterGain) {
      this.masterGain.gain.value = 0;
    }
  },

  // Unmute all sounds
  unmute: function () {
    this.enabled = true;
    this.musicEnabled = true;
    if (this.masterGain) {
      this.masterGain.gain.value = this.musicVolume * this.masterVolume;
    }
  },
};

export default Sound;
