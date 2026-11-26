import { GamePhase, SoundEffectId } from './types';

const BASS_NOTES = [130.81, 0, 130.81, 0, 164.81, 0, 196.0, 0, 146.83, 0, 174.61, 0, 196.0, 0, 164.81, 0];
const MARIMBA_NOTES = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.0, 783.99, 523.25, 659.25, 783.99, 1046.5, 880.0, 783.99, 659.25, 587.33];
const LEAD_NOTES = [0, 783.99, 880.0, 0, 1046.5, 0, 880.0, 783.99, 698.46, 0, 783.99, 880.0, 659.25, 0, 587.33, 523.25];

export class DynamicAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private trackGains: {
    bass: GainNode | null;
    marimba: GainNode | null;
    drums: GainNode | null;
    lead: GainNode | null;
  } = { bass: null, marimba: null, drums: null, lead: null };

  private phase: GamePhase = 'LOBBY';
  private stepIndex = 0;
  private timerId: number | null = null;
  private muted = false;
  private bgmVol = 0.45;
  private sfxVol = 0.65;

  public unlock(): void {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 1;
        this.masterGain.connect(this.ctx.destination);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = this.bgmVol;
        this.bgmGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.sfxVol;
        this.sfxGain.connect(this.masterGain);

        this.trackGains.bass = this.ctx.createGain();
        this.trackGains.marimba = this.ctx.createGain();
        this.trackGains.drums = this.ctx.createGain();
        this.trackGains.lead = this.ctx.createGain();

        this.trackGains.bass.connect(this.bgmGain);
        this.trackGains.marimba.connect(this.bgmGain);
        this.trackGains.drums.connect(this.bgmGain);
        this.trackGains.lead.connect(this.bgmGain);

        this.applyPhaseMix();
        this.startSequencer();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
    } catch {
      // Ignore audio errors on restricted environments
    }
  }

  public setPhase(phase: GamePhase): void {
    if (this.phase === phase) return;
    this.phase = phase;
    this.applyPhaseMix();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.04);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setBgmVolume(v: number): void {
    this.bgmVol = Math.max(0, Math.min(1, v));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(this.bgmVol, this.ctx.currentTime, 0.05);
    }
  }

  public setSfxVolume(v: number): void {
    this.sfxVol = Math.max(0, Math.min(1, v));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVol, this.ctx.currentTime, 0.05);
    }
  }

  private applyPhaseMix(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const mix = {
      LOBBY: { bass: 0.35, marimba: 0.35, drums: 0.12, lead: 0.0 },
      BOX_PICK: { bass: 0.45, marimba: 0.45, drums: 0.25, lead: 0.1 },
      PLACE: { bass: 0.4, marimba: 0.5, drums: 0.22, lead: 0.0 },
      COUNTDOWN: { bass: 0.5, marimba: 0.2, drums: 0.45, lead: 0.1 },
      ACTION: { bass: 0.55, marimba: 0.3, drums: 0.55, lead: 0.4 },
      SCORE: { bass: 0.3, marimba: 0.4, drums: 0.1, lead: 0.0 },
      PODIUM: { bass: 0.4, marimba: 0.5, drums: 0.3, lead: 0.35 },
    }[this.phase];

    this.trackGains.bass?.gain.setTargetAtTime(mix.bass, t, 0.25);
    this.trackGains.marimba?.gain.setTargetAtTime(mix.marimba, t, 0.25);
    this.trackGains.drums?.gain.setTargetAtTime(mix.drums, t, 0.25);
    this.trackGains.lead?.gain.setTargetAtTime(mix.lead, t, 0.25);
  }

  private startSequencer(): void {
    if (this.timerId !== null) return;
    const stepMs = (60 / 128 / 2) * 1000; // 8th notes at 128 BPM
    this.timerId = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const i = this.stepIndex % 16;
      this.stepIndex += 1;

      const bassFreq = BASS_NOTES[i];
      if (bassFreq > 0 && this.trackGains.bass) {
        this.playTone(bassFreq, 'triangle', 0.16, 0.35, this.trackGains.bass, now);
      }

      const marFreq = MARIMBA_NOTES[i];
      if (marFreq > 0 && this.trackGains.marimba && (i % 2 === 0 || this.phase === 'PLACE' || this.phase === 'ACTION')) {
        this.playTone(marFreq, 'sine', 0.11, 0.18, this.trackGains.marimba, now);
      }

      const leadFreq = LEAD_NOTES[i];
      if (leadFreq > 0 && this.trackGains.lead) {
        this.playTone(leadFreq, 'square', 0.12, 0.08, this.trackGains.lead, now);
      }

      if (this.trackGains.drums) {
        if (i % 4 === 0) {
          this.playKick(this.trackGains.drums, now);
        } else if (i % 4 === 2) {
          this.playHat(this.trackGains.drums, now);
        }
      }
    }, stepMs);
  }

  private playTone(
    freq: number,
    type: OscillatorType,
    dur: number,
    vol: number,
    dest: AudioNode,
    startTime: number
  ): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    g.gain.setValueAtTime(0.0001, startTime);
    g.gain.linearRampToValueAtTime(vol, startTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.02);
  }

  private playKick(dest: AudioNode, startTime: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, startTime);
    osc.frequency.exponentialRampToValueAtTime(42, startTime + 0.12);
    g.gain.setValueAtTime(0.45, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.14);
    osc.connect(g);
    g.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + 0.15);
  }

  private playHat(dest: AudioNode, startTime: number): void {
    if (!this.ctx) return;
    const bufSize = Math.floor(this.ctx.sampleRate * 0.04);
    const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.16, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.04);

    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(startTime);
  }

  public playSfx(id: SoundEffectId): void {
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const dest = this.sfxGain;

    switch (id) {
      case 'jump':
        this.playSweep(280, 580, 'sine', 0.13, 0.28, dest, now);
        break;
      case 'wall_jump':
        this.playSweep(360, 740, 'triangle', 0.13, 0.28, dest, now);
        break;
      case 'land':
        this.playSweep(150, 70, 'triangle', 0.07, 0.16, dest, now);
        break;
      case 'pick':
        this.playTone(523.25, 'triangle', 0.09, 0.25, dest, now);
        this.playTone(783.99, 'triangle', 0.12, 0.25, dest, now + 0.06);
        break;
      case 'place':
        this.playSweep(240, 320, 'square', 0.07, 0.15, dest, now);
        break;
      case 'invalid':
        this.playTone(170, 'sawtooth', 0.12, 0.18, dest, now);
        this.playTone(130, 'sawtooth', 0.14, 0.18, dest, now + 0.08);
        break;
      case 'bomb':
        this.playNoise(0.32, 0.45, dest, now);
        this.playSweep(140, 32, 'sawtooth', 0.3, 0.35, dest, now);
        break;
      case 'honey':
        this.playSweep(420, 260, 'sine', 0.18, 0.22, dest, now);
        break;
      case 'spring':
        this.playSweep(240, 920, 'sine', 0.22, 0.28, dest, now);
        break;
      case 'shoot':
        this.playSweep(680, 240, 'triangle', 0.08, 0.18, dest, now);
        break;
      case 'punch':
        this.playNoise(0.11, 0.28, dest, now);
        this.playSweep(220, 80, 'square', 0.12, 0.25, dest, now);
        break;
      case 'portal':
        this.playSweep(320, 1040, 'sine', 0.18, 0.22, dest, now);
        this.playSweep(640, 1400, 'triangle', 0.18, 0.16, dest, now + 0.04);
        break;
      case 'coin':
        this.playTone(987.77, 'sine', 0.08, 0.25, dest, now);
        this.playTone(1318.51, 'sine', 0.2, 0.25, dest, now + 0.07);
        break;
      case 'death':
        this.playSweep(520, 120, 'sawtooth', 0.24, 0.24, dest, now);
        this.playNoise(0.14, 0.2, dest, now);
        break;
      case 'goal':
        this.playTone(523.25, 'triangle', 0.1, 0.28, dest, now);
        this.playTone(659.25, 'triangle', 0.1, 0.28, dest, now + 0.08);
        this.playTone(783.99, 'triangle', 0.1, 0.28, dest, now + 0.16);
        this.playTone(1046.5, 'triangle', 0.26, 0.3, dest, now + 0.24);
        break;
      case 'too_easy':
        this.playTone(392, 'sawtooth', 0.15, 0.16, dest, now);
        this.playTone(349.23, 'sawtooth', 0.15, 0.16, dest, now + 0.15);
        this.playTone(311.13, 'sawtooth', 0.28, 0.18, dest, now + 0.3);
        break;
      case 'countdown':
        this.playTone(660, 'sine', 0.12, 0.25, dest, now);
        break;
      case 'win':
        [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, idx) => {
          this.playTone(f, 'triangle', 0.22, 0.28, dest, now + idx * 0.09);
        });
        break;
    }
  }

  private playSweep(
    f0: number,
    f1: number,
    type: OscillatorType,
    dur: number,
    vol: number,
    dest: AudioNode,
    startTime: number
  ): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), startTime + dur);
    g.gain.setValueAtTime(vol, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.02);
  }

  private playNoise(dur: number, vol: number, dest: AudioNode, startTime: number): void {
    if (!this.ctx) return;
    const bufSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, startTime);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(startTime);
  }

  public destroy(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
