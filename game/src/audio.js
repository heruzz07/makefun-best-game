// Emberdrift — every sound is synthesized with WebAudio. No audio files, no
// network: a few oscillators and a noise buffer, tuned to feel like a game.

function makeNoiseBuffer(ctx) {
  const length = ctx.sampleRate * 0.35;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  return buffer;
}

export function createAudio() {
  const bus = {
    ctx: null,
    master: null,
    noise: null,
    muted: false,

    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
      this.noise = makeNoiseBuffer(this.ctx);
    },

    setMuted(muted) {
      this.muted = muted;
      if (this.master) this.master.gain.value = muted ? 0 : 0.22;
    },

    tone({ frequency, endFrequency, duration, type, volume, delay = 0 }) {
      if (!this.ctx || this.muted) return;
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, t0);
      if (endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), t0 + duration);
      gain.gain.setValueAtTime(volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    },

    burst({ duration, volume, frequency }) {
      if (!this.ctx || this.muted) return;
      const t0 = this.ctx.currentTime;
      const source = this.ctx.createBufferSource();
      source.buffer = this.noise;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = frequency;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      source.start(t0);
      source.stop(t0 + duration + 0.02);
    },

    // A collect blip that climbs with the combo, so a hot streak sounds hot.
    collect(combo) {
      const base = 520 + Math.min(combo, 8) * 55;
      this.tone({ frequency: base, endFrequency: base * 1.6, duration: 0.12, type: 'sine', volume: 0.5 });
      this.tone({ frequency: base * 2, duration: 0.07, type: 'triangle', volume: 0.16 });
    },

    hit() {
      this.burst({ duration: 0.3, volume: 0.7, frequency: 900 });
      this.tone({ frequency: 140, endFrequency: 45, duration: 0.3, type: 'sawtooth', volume: 0.4 });
    },

    nova() {
      this.tone({ frequency: 180, endFrequency: 1400, duration: 0.45, type: 'sawtooth', volume: 0.32 });
      this.burst({ duration: 0.4, volume: 0.35, frequency: 3200 });
    },

    forge() {
      [523, 659, 784, 1047].forEach((frequency, i) => {
        this.tone({ frequency, duration: 0.22, type: 'triangle', volume: 0.4, delay: i * 0.09 });
      });
    },

    gameOver() {
      [392, 311, 233, 175].forEach((frequency, i) => {
        this.tone({ frequency, duration: 0.3, type: 'triangle', volume: 0.35, delay: i * 0.14 });
      });
    },

    click() {
      this.tone({ frequency: 880, duration: 0.06, type: 'square', volume: 0.18 });
    },
  };
  return bus;
}
