import { CONFIG } from '../config';
import { SynthwaveMusic } from './SynthwaveMusic';

/**
 * Procedural Web Audio (Step 32): engine + wind loops, draft tone, one-shot slingshot / milestones / crash.
 * Step 33: music bus + chain-reactive synth bed (`SynthwaveMusic`).
 * Unlocks after first pointer (browser autoplay policy). No external files — skin `manifest.audio` can be wired later.
 */
export type GameAudioUpdate = {
  playing: boolean;
  scrollPerFrame: number;
  inDraft: boolean;
  draftMeter: number;
  burstActive: boolean;
  chain: number;
};

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private music: SynthwaveMusic | null = null;
  private loopsBuilt = false;

  private engineOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  private windSrc: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;

  private draftOsc: OscillatorNode | null = null;
  private draftGain: GainNode | null = null;

  /** Call once from a user gesture so AudioContext can start (autoplay unlock). */
  unlock(): void {
    if (!CONFIG.AUDIO_ENABLED) return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;

    if (!this.ctx) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = CONFIG.AUDIO_MASTER;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 1;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = CONFIG.AUDIO_MUSIC_ENABLED
        ? CONFIG.AUDIO_MUSIC_MASTER
        : 0;
      this.musicBus.connect(this.master);
      this.buildLoops();
    }

    void this.ctx.resume();
  }

  private buildLoops(): void {
    if (!this.ctx || !this.sfxBus || !this.musicBus || this.loopsBuilt) return;
    this.loopsBuilt = true;
    const ctx = this.ctx;
    const out = this.sfxBus;

    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = CONFIG.AUDIO_ENGINE_HZ_MIN;
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = CONFIG.AUDIO_ENGINE_FILTER_HZ;
    this.engineFilter.Q.value = 0.7;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(out);

    const noiseBuf = this.makeNoiseBuffer(CONFIG.AUDIO_WIND_NOISE_SEC);
    this.windSrc = ctx.createBufferSource();
    this.windSrc.buffer = noiseBuf;
    this.windSrc.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.value = CONFIG.AUDIO_WIND_FILTER_HZ;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    this.windSrc.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(out);

    this.draftOsc = ctx.createOscillator();
    this.draftOsc.type = 'sine';
    this.draftOsc.frequency.value = CONFIG.AUDIO_DRAFT_HZ;
    this.draftGain = ctx.createGain();
    this.draftGain.gain.value = 0;
    this.draftOsc.connect(this.draftGain);
    this.draftGain.connect(out);

    this.engineOsc.start(0);
    this.draftOsc.start(0);
    this.windSrc.start(0);

    this.music = new SynthwaveMusic(ctx, this.musicBus);
    this.music.build();
  }

  private makeNoiseBuffer(durationSec: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  update(delta: number, u: GameAudioUpdate): void {
    if (!CONFIG.AUDIO_ENABLED) return;
    this.music?.update(delta, u.playing, u.chain);
    if (this.musicBus) {
      this.musicBus.gain.value = CONFIG.AUDIO_MUSIC_ENABLED
        ? CONFIG.AUDIO_MUSIC_MASTER
        : 0;
    }

    if (
      !this.ctx ||
      !this.engineGain ||
      !this.windGain ||
      !this.draftGain ||
      !this.engineOsc
    ) {
      return;
    }

    const base = CONFIG.BASE_SCROLL_SPEED;
    const max = CONFIG.MAX_SCROLL_SPEED;
    const span = Math.max(1e-6, max - base);
    const t = Math.max(
      0,
      Math.min(1, (u.scrollPerFrame - base) / span)
    );

    const now = this.ctx.currentTime;
    if (CONFIG.AUDIO_ENGINE_ENABLED) {
      let hz =
        CONFIG.AUDIO_ENGINE_HZ_MIN +
        t * (CONFIG.AUDIO_ENGINE_HZ_MAX - CONFIG.AUDIO_ENGINE_HZ_MIN);
      if (u.burstActive) hz += CONFIG.AUDIO_ENGINE_BURST_HZ_ADD;
      this.engineOsc.frequency.setTargetAtTime(hz, now, 0.07);
    }

    const targetEngine =
      u.playing && CONFIG.AUDIO_ENGINE_ENABLED
        ? CONFIG.AUDIO_ENGINE_GAIN *
          (CONFIG.AUDIO_ENGINE_GAIN_MIN_MIX +
            (1 - CONFIG.AUDIO_ENGINE_GAIN_MIN_MIX) * t) *
          (u.burstActive ? CONFIG.AUDIO_ENGINE_BURST_GAIN_MUL : 1)
        : 0;
    const targetWind =
      u.playing
        ? CONFIG.AUDIO_WIND_GAIN *
          (CONFIG.AUDIO_WIND_MIN_MIX +
            (1 - CONFIG.AUDIO_WIND_MIN_MIX) * t)
        : 0;
    const targetDraft =
      u.playing && u.inDraft
        ? CONFIG.AUDIO_DRAFT_GAIN *
          (CONFIG.AUDIO_DRAFT_MIN_MIX +
            (1 - CONFIG.AUDIO_DRAFT_MIN_MIX) * u.draftMeter)
        : 0;

    const k = Math.min(1, CONFIG.AUDIO_LOOP_SMOOTH * delta);
    this.engineGain.gain.value += (targetEngine - this.engineGain.gain.value) * k;
    this.windGain.gain.value += (targetWind - this.windGain.gain.value) * k;
    this.draftGain.gain.value += (targetDraft - this.draftGain.gain.value) * k;
  }

  playSlingshot(): void {
    if (!CONFIG.AUDIO_ENABLED) return;
    if (!this.ctx || !this.sfxBus) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const dur = CONFIG.AUDIO_SLINGSHOT_DURATION;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const fade = 1 - i / n;
      data[i] = (Math.random() * 2 - 1) * fade;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(CONFIG.AUDIO_SLINGSHOT_BP_HZ_START, t0);
    bp.frequency.exponentialRampToValueAtTime(
      CONFIG.AUDIO_SLINGSHOT_BP_HZ_END,
      t0 + dur
    );
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(CONFIG.AUDIO_SLINGSHOT_GAIN, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfxBus);
    src.start(t0);
    src.stop(t0 + dur + 0.04);
  }

  playMilestone(chain: number): void {
    if (!CONFIG.AUDIO_ENABLED) return;
    if (!this.ctx || !this.sfxBus) return;
    const ctx = this.ctx;
    const peak = CONFIG.AUDIO_MILESTONE_GAIN;

    const blip = (freq: number, start: number, len: number): void => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      const og = ctx.createGain();
      const t = ctx.currentTime + start;
      og.gain.setValueAtTime(0, t);
      og.gain.linearRampToValueAtTime(peak, t + 0.012);
      og.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(og);
      og.connect(this.sfxBus!);
      o.start(t);
      o.stop(t + len + 0.06);
    };

    if (chain === 5) {
      blip(523.25, 0, 0.2);
    } else if (chain === 10) {
      blip(659.25, 0, 0.22);
      blip(987.77, 0, 0.22);
    } else if (chain === 15) {
      blip(523.25, 0, 0.09);
      blip(659.25, 0.08, 0.09);
      blip(783.99, 0.16, 0.09);
      blip(1046.5, 0.24, 0.14);
    } else if (chain >= 20) {
      blip(587.33, 0, 0.28);
      blip(739.99, 0, 0.28);
      blip(880, 0, 0.28);
      blip(1174.66, 0, 0.3);
    }
  }

  playCrash(): void {
    if (!CONFIG.AUDIO_ENABLED) return;
    if (!this.ctx || !this.sfxBus) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const dur = CONFIG.AUDIO_CRASH_DURATION;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const fade = (1 - i / n) ** 0.45;
      data[i] = (Math.random() * 2 - 1) * fade;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = CONFIG.AUDIO_CRASH_LP_HZ;
    const g = ctx.createGain();
    g.gain.setValueAtTime(CONFIG.AUDIO_CRASH_GAIN, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(lp);
    lp.connect(g);
    g.connect(this.sfxBus);
    src.start(t0);
    src.stop(t0 + dur + 0.03);
  }
}
