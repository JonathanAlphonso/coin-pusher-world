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
  musicTempo: 125, // BPM
  currentBeat: 0,
  currentBar: 0,
  currentSection: 0,

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
  currentKey: 0, // 0 = C
  chordIndex: 0,

  // Musical scales (semitones from root)
  scales: {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    pentatonic: [0, 2, 4, 7, 9],
  },

  // Chord progressions for different vibes
  progressions: {
    epic: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [5, 9, 12]], // I - IV - V - IV
    dreamy: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], // I - vi - IV - V
    intense: [[0, 3, 7], [5, 8, 12], [7, 10, 14], [0, 3, 7]], // i - iv - v - i (minor)
    uplifting: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], // I - V - vi - IV
    mystical: [[0, 4, 7, 11], [5, 9, 12, 16], [2, 5, 9, 12], [7, 11, 14, 17]], // Imaj7 - IVmaj7 - ii7 - V7
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
    [0, 1, 2, 1], // Up-down
    [0, 1, 2, 3, 2, 1], // Up-down extended
    [0, 2, 1, 3], // Interleaved
    [3, 2, 1, 0], // Down
    [0, 0, 1, 2, 2, 3], // Stuttered
  ],

  // Rhythm patterns (1 = hit, 0 = rest)
  rhythmPatterns: {
    kick: [
      [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], // Four on floor
      [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0], // Syncopated
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], // Double time
    ],
    hihat: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 16ths
      [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], // Off-beat
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], // 8ths
    ],
    snare: [
      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], // 2 and 4
      [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0], // Syncopated
      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0], // Fills
    ],
  },

  // Initialize sound system
  init: function () {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();

      // Create master chain
      this.setupMasterChain();

      // Resume on user interaction
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
    // Compressor for punch
    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.value = -24;
    this.masterCompressor.knee.value = 30;
    this.masterCompressor.ratio.value = 4;
    this.masterCompressor.attack.value = 0.003;
    this.masterCompressor.release.value = 0.25;

    // Master filter for sweeps
    this.masterFilter = this.ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 20000;
    this.masterFilter.Q.value = 1;

    // Master gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.musicVolume * this.masterVolume;

    // Simple reverb using delays
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.2;

    const delay1 = this.ctx.createDelay();
    delay1.delayTime.value = 0.1;
    const delay2 = this.ctx.createDelay();
    delay2.delayTime.value = 0.2;
    const delay3 = this.ctx.createDelay();
    delay3.delayTime.value = 0.35;

    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.3;

    // Connect reverb chain
    this.masterFilter.connect(this.reverbGain);
    this.reverbGain.connect(delay1);
    delay1.connect(delay2);
    delay2.connect(delay3);
    delay3.connect(feedback);
    feedback.connect(delay1);
    delay3.connect(this.masterCompressor);

    // Connect main chain
    this.masterFilter.connect(this.masterCompressor);
    this.masterCompressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Create layer gains
    const layers = ['kick', 'hihat', 'snare', 'bass', 'pad', 'arp', 'lead'];
    layers.forEach(layer => {
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      gain.connect(this.masterFilter);
      this.layerGains[layer] = gain;
    });
  },

  // Convert MIDI note to frequency
  midiToFreq: function (note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  },

  // Get note from scale
  getScaleNote: function (degree, octave = 4) {
    const theme = this.tierThemes[this.currentTier || 0];
    const scale = this.scales[theme.scale];
    const root = theme.key;

    const octaveOffset = Math.floor(degree / scale.length);
    const scaleDegree = ((degree % scale.length) + scale.length) % scale.length;
    const semitone = scale[scaleDegree];

    return 36 + root + semitone + (octave + octaveOffset) * 12;
  },

  // Get current chord notes
  getCurrentChord: function (octave = 3) {
    const theme = this.tierThemes[this.currentTier || 0];
    const progression = this.progressions[theme.progression];
    const chord = progression[this.chordIndex % progression.length];
    const root = theme.key;

    return chord.map(interval => 36 + root + interval + octave * 12);
  },

  // Start the music
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

    // Start all layers
    this.startMusicLoop();

    console.log('Epic music started!');
  },

  // Main music loop
  startMusicLoop: function () {
    const beatDuration = 60 / this.musicTempo / 4; // 16th note duration

    const tick = () => {
      if (!this.musicPlaying || !this.musicEnabled) return;

      const now = this.ctx.currentTime;

      // Smooth intensity changes
      this.intensity += (this.targetIntensity - this.intensity) * 0.02;

      // Update layer volumes based on intensity
      this.updateLayerVolumes();

      // Play drum hits
      this.playDrumBeat(now);

      // Play bass on beats 0, 4, 8, 12 (quarter notes)
      if (this.currentBeat % 4 === 0) {
        this.playBass(now);
      }

      // Play arp notes
      this.playArp(now, beatDuration);

      // Play pad chord changes (every bar)
      if (this.currentBeat === 0) {
        this.playPad(now);
      }

      // Play lead melody occasionally
      if (this.intensity > 0.6 && this.currentBeat % 2 === 0 && Math.random() < 0.3) {
        this.playLead(now);
      }

      // Advance beat
      this.currentBeat = (this.currentBeat + 1) % 16;
      if (this.currentBeat === 0) {
        this.currentBar++;
        this.chordIndex = (this.chordIndex + 1) % 4;

        // Every 4 bars, maybe change something
        if (this.currentBar % 4 === 0) {
          this.currentSection++;
        }
      }

      // Schedule next tick
      this.musicTimeout = setTimeout(tick, beatDuration * 1000);
    };

    tick();
  },

  // Update layer volumes based on intensity
  updateLayerVolumes: function () {
    const i = this.intensity;
    const vol = this.musicVolume * this.masterVolume;

    // Kick: always present, louder at high intensity
    this.layerGains.kick.gain.value = vol * (0.4 + i * 0.3);

    // Hi-hat: fades in at medium intensity
    this.layerGains.hihat.gain.value = vol * Math.max(0, (i - 0.2) * 0.5);

    // Snare: fades in at higher intensity
    this.layerGains.snare.gain.value = vol * Math.max(0, (i - 0.4) * 0.6);

    // Bass: always present
    this.layerGains.bass.gain.value = vol * (0.5 + i * 0.3);

    // Pad: always present, warm background
    this.layerGains.pad.gain.value = vol * (0.25 + i * 0.15);

    // Arp: fades in at medium intensity
    this.layerGains.arp.gain.value = vol * Math.max(0, (i - 0.3) * 0.4);

    // Lead: only at high intensity
    this.layerGains.lead.gain.value = vol * Math.max(0, (i - 0.5) * 0.35);
  },

  // Play drum beat
  playDrumBeat: function (time) {
    const patternIndex = Math.min(2, Math.floor(this.intensity * 3));

    // Kick
    if (this.rhythmPatterns.kick[patternIndex][this.currentBeat]) {
      this.playKick(time);
    }

    // Hi-hat
    if (this.rhythmPatterns.hihat[patternIndex][this.currentBeat]) {
      this.playHiHat(time, this.currentBeat % 2 === 0);
    }

    // Snare
    if (this.rhythmPatterns.snare[patternIndex][this.currentBeat]) {
      this.playSnare(time);
    }
  },

  // Kick drum synthesizer
  playKick: function (time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);

    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc.connect(gain);
    gain.connect(this.layerGains.kick);

    osc.start(time);
    osc.stop(time + 0.3);

    // Add click transient
    const click = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    click.type = 'square';
    click.frequency.value = 1000;
    clickGain.gain.setValueAtTime(0.3, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
    click.connect(clickGain);
    clickGain.connect(this.layerGains.kick);
    click.start(time);
    click.stop(time + 0.02);
  },

  // Hi-hat synthesizer
  playHiHat: function (time, accent) {
    // Use noise-like sound with high frequency oscillators
    const oscs = [];
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'highpass';
    filter.frequency.value = 7000;

    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 3000 + i * 2000 + Math.random() * 1000;
      osc.connect(filter);
      oscs.push(osc);
    }

    const vol = accent ? 0.25 : 0.12;
    const decay = accent ? 0.08 : 0.04;

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

    filter.connect(gain);
    gain.connect(this.layerGains.hihat);

    oscs.forEach(osc => {
      osc.start(time);
      osc.stop(time + decay);
    });
  },

  // Snare synthesizer
  playSnare: function (time) {
    // Tone component
    const tone = this.ctx.createOscillator();
    const toneGain = this.ctx.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(200, time);
    tone.frequency.exponentialRampToValueAtTime(100, time + 0.1);
    toneGain.gain.setValueAtTime(0.5, time);
    toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    tone.connect(toneGain);
    toneGain.connect(this.layerGains.snare);
    tone.start(time);
    tone.stop(time + 0.15);

    // Noise component
    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.layerGains.snare);
    noise.start(time);
  },

  // Bass synthesizer
  playBass: function (time) {
    const chord = this.getCurrentChord(2);
    const note = chord[0]; // Root note

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'square';

    const freq = this.midiToFreq(note);
    osc1.frequency.value = freq;
    osc2.frequency.value = freq * 0.5; // Sub octave

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300 + this.intensity * 500, time);
    filter.Q.value = 2;

    gain.gain.setValueAtTime(0.6, time);
    gain.gain.setValueAtTime(0.5, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.layerGains.bass);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.4);
    osc2.stop(time + 0.4);
  },

  // Arpeggiator
  playArp: function (time, beatDuration) {
    const chord = this.getCurrentChord(4);
    const pattern = this.arpPatterns[this.currentSection % this.arpPatterns.length];
    const patternIndex = this.currentBeat % pattern.length;
    const noteIndex = pattern[patternIndex] % chord.length;
    const note = chord[noteIndex];

    // Only play on certain beats for rhythm
    if (this.currentBeat % 2 !== 0 && Math.random() < 0.5) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.value = this.midiToFreq(note);

    filter.type = 'lowpass';
    filter.frequency.value = 2000 + this.intensity * 3000;
    filter.Q.value = 3;

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + beatDuration * 3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.layerGains.arp);

    osc.start(time);
    osc.stop(time + beatDuration * 3);
  },

  // Pad synthesizer
  playPad: function (time) {
    const chord = this.getCurrentChord(3);
    const beatDuration = 60 / this.musicTempo;

    chord.forEach((note, i) => {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      const freq = this.midiToFreq(note);
      osc1.frequency.value = freq;
      osc2.frequency.value = freq * 1.002; // Slight detune for width

      filter.type = 'lowpass';
      filter.frequency.value = 800 + this.intensity * 400;

      // Slow attack and release
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.15, time + 0.2);
      gain.gain.setValueAtTime(0.15, time + beatDuration * 3.5);
      gain.gain.linearRampToValueAtTime(0, time + beatDuration * 4);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.layerGains.pad);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + beatDuration * 4 + 0.1);
      osc2.stop(time + beatDuration * 4 + 0.1);
    });
  },

  // Lead melody synthesizer
  playLead: function (time) {
    const chord = this.getCurrentChord(5);
    const note = chord[Math.floor(Math.random() * chord.length)];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.value = this.midiToFreq(note);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4000, time);
    filter.frequency.exponentialRampToValueAtTime(1000, time + 0.3);
    filter.Q.value = 5;

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.layerGains.lead);

    osc.start(time);
    osc.stop(time + 0.25);
  },

  // Stop music
  stopMusic: function () {
    this.musicPlaying = false;
    if (this.musicTimeout) {
      clearTimeout(this.musicTimeout);
      this.musicTimeout = null;
    }
  },

  // Set intensity (called from game based on score/combo)
  setIntensity: function (value) {
    this.targetIntensity = Math.max(0.1, Math.min(1, value));
  },

  // Change tier (updates music theme)
  setTier: function (tier) {
    this.currentTier = tier % this.tierThemes.length;
    const theme = this.tierThemes[this.currentTier];
    this.musicTempo = theme.tempo;
    console.log('Music theme:', theme.name);
  },

  // Trigger a filter sweep effect
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

  // ==================== SOUND EFFECTS ====================

  // Play a sound effect
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
    }
  },

  // Coin drop sound
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

  // Coin collect - musical arpeggio
  playCoin: function () {
    const chord = this.musicPlaying ? this.getCurrentChord(5) : [72, 76, 79]; // C E G
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

    // Increase intensity slightly
    this.targetIntensity = Math.min(1, this.targetIntensity + 0.01);
  },

  // Score sound
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

  // Bonus sound - triumphant arpeggio
  playBonus: function () {
    const notes = this.musicPlaying
      ? [...this.getCurrentChord(4), this.getCurrentChord(5)[0]]
      : [60, 64, 67, 72]; // C major arpeggio

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

  // Powerup sound - rising synth
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

  // Level up fanfare
  playLevelup: function () {
    const baseNotes = this.musicPlaying
      ? this.getCurrentChord(4)
      : [60, 64, 67];

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

  // Peg hit sound
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

  // Ability activation
  playAbility: function () {
    // Whoosh + power chord
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

    // Power chord
    const chord = [36, 43, 48, 55]; // Power chord
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

  // Jackpot sound
  playJackpot: function () {
    // Epic rising chord progression
    const chords = [
      [48, 52, 55, 60],
      [50, 53, 57, 62],
      [52, 55, 59, 64],
      [53, 57, 60, 65],
    ];

    chords.forEach((chord, chordIndex) => {
      chord.forEach((note, noteIndex) => {
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

  // Combo sound
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

  // Toggle sound
  toggle: function () {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopMusic();
    }
    return this.enabled;
  },

  // Toggle music
  toggleMusic: function () {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicEnabled) {
      this.playMusic();
    } else {
      this.stopMusic();
    }
    return this.musicEnabled;
  },

  // Set volume
  setVolume: function (vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain) {
      this.masterGain.gain.value = this.musicVolume * this.masterVolume;
    }
  },
};

// Make available globally
window.Sound = Sound;
