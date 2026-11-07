/**
 * アプリの状態機械。
 *   ready → typing → finale → finished → (reset) → ready
 *
 * 音の発音は AudioEngine / DrumEngine に、映像は UI 側に委譲し、
 * ここでは「いつ何を起こすか」だけを決める。
 */
import type { AudioEngine, Voice } from '../audio/AudioEngine';
import { DrumEngine } from '../audio/DrumEngine';
import type { Settings } from './settings';

export type AppState = 'ready' | 'typing' | 'finale' | 'finished';

export interface FinaleEvent {
  /** フィナーレの音が鳴る AudioContext 時刻 */
  audioTime: number;
  /** 映像を開始すべきまでの遅延 ms（0 以上） */
  visualDelayMs: number;
  text: string;
}

export interface ControllerCallbacks {
  onStateChange: (state: AppState, prev: AppState) => void;
  onHit: (voice: string, velocity: number) => void;
  onFinale: (ev: FinaleEvent) => void;
}

/** 演出が落ち着いて finished になるまでの基準時間 ms（fxSpeed で割る） */
export const FINALE_SETTLE_MS = 4200;

export class PerformanceController {
  private _state: AppState = 'ready';
  private guitar: Voice | null = null;
  private timers: number[] = [];
  readonly drums: DrumEngine;

  constructor(
    private audio: AudioEngine,
    private settings: Settings,
    private cb: ControllerCallbacks,
  ) {
    this.drums = new DrumEngine(audio);
    this.applySettings();
  }

  get state(): AppState {
    return this._state;
  }

  /** 設定変更をエンジンに反映する */
  applySettings() {
    const g = this.settings.gains;
    this.drums.gains = { snare: g.snare, tomHigh: g.tomHigh, tomMid: g.tomMid, tomLow: g.tomLow, kick: g.kick, crash: g.crash };
    if (this.drums.patternId !== this.settings.patternId) this.drums.setPattern(this.settings.patternId);
    this.audio.volume = this.settings.volume;
    this.audio.muted = this.settings.muted;
    if (this.guitar) {
      const t = this.audio.currentTime;
      this.guitar.gain.gain.setTargetAtTime(g.guitarSustain, t, 0.05);
    }
  }

  private setState(next: AppState) {
    const prev = this._state;
    if (prev === next) return;
    this._state = next;
    this.cb.onStateChange(next, prev);
  }

  /** 1 打鍵 */
  hit(soft = false) {
    if (this._state === 'finale' || this._state === 'finished') return;
    const when = this.audio.currentTime + Math.max(0, this.settings.audioOffsetMs) / 1000;
    if (this._state === 'ready') {
      this.setState('typing');
      this.startGuitar(when);
    }
    const r = this.drums.hit(performance.now(), { soft, when });
    if (r) this.cb.onHit(r.voice, r.velocity);
  }

  private startGuitar(when: number) {
    if (this.guitar) return; // 再トリガーしない
    this.guitar = this.audio.play('guitarSustain', {
      when,
      loop: true,
      gain: this.settings.gains.guitarSustain,
      fadeIn: 0.12,
      reverb: 0.12,
    });
  }

  /** Enter / 送信ボタン。finale 中は何もしない（多重発火防止） */
  finale(text: string) {
    if (this._state === 'finale' || this._state === 'finished') return;
    const offset = this.settings.audioOffsetMs / 1000;
    const now = this.audio.currentTime;
    const t0 = now + Math.max(0, offset);
    const g = this.settings.gains;

    // 1. 伸ばしていたギターを素早く切る（フィナーレのギターに引き継ぐ）
    if (this.guitar) {
      this.guitar.fadeOut(0.06, t0);
      this.guitar = null;
    }
    // 2. キック + クラッシュ + ギター を同一時刻で
    this.drums.finaleHit(t0);
    this.audio.play('guitarFinale', { when: t0, gain: g.guitarFinale, reverb: 0.3 });
    // 3. 歓声は少し遅れて立ち上がる
    this.audio.play('crowdCheer', { when: t0 + 0.3, gain: g.crowd, fadeIn: 0.45, reverb: 0.1 });

    this.setState('finale');
    // 映像側の遅延：audioOffset が負なら映像を遅らせる、正なら音が遅れるので映像も合わせる
    const visualDelayMs = Math.max(0, -this.settings.audioOffsetMs) + Math.max(0, this.settings.audioOffsetMs);
    this.cb.onFinale({ audioTime: t0, visualDelayMs, text });

    const settle = FINALE_SETTLE_MS / Math.max(0.25, this.settings.fxSpeed);
    this.timers.push(
      window.setTimeout(() => {
        if (this._state === 'finale') this.setState('finished');
      }, settle + visualDelayMs),
    );
  }

  /** もう一度演奏する */
  reset() {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    if (this.guitar) {
      this.guitar.fadeOut(0.1);
      this.guitar = null;
    }
    this.audio.stopAll(0.25);
    this.drums.reset();
    this.setState('ready');
  }
}
