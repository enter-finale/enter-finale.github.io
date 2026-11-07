/**
 * アプリの状態機械。
 *   ready → typing → finale → finished → (reset) → ready
 *
 * 音の発音は AudioEngine / DrumEngine に、映像は UI 側に委譲し、
 * ここでは「いつ何を起こすか」だけを決める。
 * 打鍵中はドラムのみ。Enter では「ジャーン」（キック・クラッシュ・ギターをまとめた 1 音）と歓声が鳴る。
 */
import type { AudioEngine } from '../audio/AudioEngine';
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
    this.drums.gains = { snare: g.snare, tomHigh: g.tomHigh, tomLow: g.tomLow };
    if (this.drums.patternId !== this.settings.patternId) this.drums.setPattern(this.settings.patternId);
    this.audio.volume = this.settings.volume;
    this.audio.muted = this.settings.muted;
  }

  private setState(next: AppState) {
    const prev = this._state;
    if (prev === next) return;
    this._state = next;
    this.cb.onStateChange(next, prev);
  }

  /** 1 打鍵 = ドラム 1 打 */
  hit(soft = false) {
    if (this._state === 'finale' || this._state === 'finished') return;
    const when = this.audio.currentTime + Math.max(0, this.settings.audioOffsetMs) / 1000;
    if (this._state === 'ready') this.setState('typing');
    const r = this.drums.hit(performance.now(), { soft, when });
    if (r) this.cb.onHit(r.voice, r.velocity);
  }

  /** Enter / 送信ボタン。finale 中は何もしない（多重発火防止） */
  finale(text: string) {
    if (this._state === 'finale' || this._state === 'finished') return;
    const offset = this.settings.audioOffsetMs / 1000;
    const now = this.audio.currentTime;
    const t0 = now + Math.max(0, offset);
    const g = this.settings.gains;

    // 1. 「ジャーン」（キック + クラッシュ + ギターを 1 本にまとめた音源）
    this.audio.play('finale', { when: t0, gain: g.finale, reverb: 0.2 });
    // 2. 歓声はジャーンの直後に立ち上がる
    this.audio.play('crowdCheer', { when: t0 + 0.25, gain: g.crowd, fadeIn: 0.3, reverb: 0.1 });
    this.drums.reset();

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
    this.audio.stopAll(0.25);
    this.drums.reset();
    this.setState('ready');
  }
}
