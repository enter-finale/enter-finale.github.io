/**
 * 打鍵をドラムの 1 打に変換する。
 * - パターンに従ってスネア → タムと進む
 * - スネアは 2 つのサンプル（A / B）を 1 打ごとに交互に鳴らす（マシンガン感を避ける）
 * - 打鍵間隔が短いほど少し強く（速いフィルほど迫力が出る）
 * - 同じ音でも毎回わずかにピッチと音量を変えて機械的にならないようにする
 *
 * 実際の発音は AudioEngine に委譲する。
 */
import type { AudioEngine } from './AudioEngine';
import type { SampleName } from '../config';
import { DEFAULT_PATTERN_ID, getPattern, voiceAt, type DrumPattern, type DrumVoice } from '../core/drumPatterns';

export interface DrumGains {
  snare: number;
  tomHigh: number;
  tomLow: number;
}

export const DEFAULT_DRUM_GAINS: DrumGains = {
  snare: 0.9,
  tomHigh: 0.9,
  tomLow: 1.0,
};

export interface HitResult {
  /** パターン上の役割（snare / tomHigh / tomLow） */
  voice: DrumVoice;
  /** 実際に鳴らしたサンプル（snare は snareA / snareB のどちらか） */
  sample: SampleName;
  velocity: number;
  index: number;
}

/** 打鍵間隔(ms)から 0.55〜1.0 の強さを決める（純粋関数・テスト対象） */
export function velocityFromInterval(intervalMs: number | null): number {
  if (intervalMs === null) return 0.8;
  // 60ms 以下 = 最速 → 1.0、600ms 以上 = ゆっくり → 0.65
  const t = Math.min(1, Math.max(0, (600 - intervalMs) / 540));
  return 0.65 + 0.35 * t;
}

export class DrumEngine {
  private pattern: DrumPattern = getPattern(DEFAULT_PATTERN_ID);
  private index = 0;
  private lastHitAt: number | null = null;
  private snareTurn = 0;
  private rngState = 12345;
  gains: DrumGains = { ...DEFAULT_DRUM_GAINS };
  /** ピッチの揺らぎ幅（±セント相当の比率） */
  humanizePitch = 0.03;
  humanizeGain = 0.1;
  reverbSend = 0.18;

  constructor(private audio: AudioEngine) {}

  setPattern(id: string) {
    this.pattern = getPattern(id);
    this.index = 0;
  }

  get patternId(): string {
    return this.pattern.id;
  }

  private rand(): number {
    this.rngState = (this.rngState * 1664525 + 1013904223) >>> 0;
    return this.rngState / 0x100000000;
  }

  /** フィルを最初から（スネアの A/B も A から） */
  reset() {
    this.index = 0;
    this.lastHitAt = null;
    this.snareTurn = 0;
  }

  /** パターン上の役割 → 実際に鳴らすサンプル。snare だけ A/B を交互に返す */
  private sampleFor(voice: DrumVoice): SampleName {
    if (voice !== 'snare') return voice;
    const s: SampleName = this.snareTurn % 2 === 0 ? 'snareA' : 'snareB';
    this.snareTurn++;
    return s;
  }

  /**
   * 1 打鍵 = 1 打。now は performance.now() 相当の ms。
   * soft=true は Backspace など控えめに鳴らしたい打鍵。
   */
  hit(nowMs: number, opts: { soft?: boolean; when?: number } = {}): HitResult | null {
    const interval = this.lastHitAt === null ? null : nowMs - this.lastHitAt;
    this.lastHitAt = nowMs;
    const voice = voiceAt(this.pattern, this.index);
    const sample = this.sampleFor(voice);
    const idx = this.index;
    this.index++;

    let velocity = velocityFromInterval(interval);
    if (opts.soft) velocity *= 0.5;
    const humanG = 1 + (this.rand() * 2 - 1) * this.humanizeGain;
    const humanP = 1 + (this.rand() * 2 - 1) * this.humanizePitch;
    const gain = this.gains[voice] * velocity * humanG;

    this.audio.play(sample, {
      when: opts.when,
      gain,
      rate: humanP,
      reverb: this.reverbSend,
    });
    return { voice, sample, velocity, index: idx };
  }
}
