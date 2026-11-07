/**
 * Web Audio API のラッパー。
 * - AudioContext の生成・resume（自動再生規制対応）
 * - サンプルのロード（失敗したら FallbackSynth へ自動フォールバック）
 * - マスターゲイン → リミッター → 出力 のチェーン
 * - 低遅延の単発再生、ループ再生、リバーブセンド
 *
 * 状態管理（typing / finale など）はここには持たせない。
 */
import { SAMPLE_FILES, type SampleName } from '../config';
import { renderFallback, renderImpulseResponse, type FallbackSample } from './FallbackSynth';

export interface LoadedSample {
  name: SampleName;
  buffer: AudioBuffer;
  /** true なら WAV ではなく代替音源 */
  isFallback: boolean;
}

export interface PlayOptions {
  /** AudioContext 時刻。省略時は即時 */
  when?: number;
  gain?: number;
  /** 再生速度 (ピッチ)。1 = そのまま */
  rate?: number;
  /** リバーブセンド量 0〜1 */
  reverb?: number;
  loop?: boolean;
  /** フェードイン秒 */
  fadeIn?: number;
}

export interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  /** 指定秒でフェードアウトして停止 */
  fadeOut(seconds: number, at?: number): void;
  stop(): void;
}

export type LoadProgress = { loaded: number; total: number; fallbacks: SampleName[] };

type AudioCtxCtor = typeof AudioContext;

function getAudioCtxCtor(): AudioCtxCtor | null {
  const w = window as unknown as { AudioContext?: AudioCtxCtor; webkitAudioContext?: AudioCtxCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private reverb: ConvolverNode | null = null;
  private reverbReturn: GainNode | null = null;
  private samples = new Map<SampleName, LoadedSample>();
  private loadPromise: Promise<LoadProgress> | null = null;
  private activeVoices = new Set<Voice>();
  private _volume = 0.8;
  private _muted = false;
  private baseUrl: string;

  /** ロード進捗の通知先 */
  onProgress: ((p: LoadProgress) => void) | null = null;
  /** context の状態が変わったとき */
  onStateChange: ((state: AudioContextState | 'unsupported') => void) | null = null;

  constructor(baseUrl = import.meta.env.BASE_URL) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  }

  get supported(): boolean {
    return getAudioCtxCtor() !== null;
  }

  get state(): AudioContextState | 'unsupported' | 'uninitialized' {
    if (!this.supported) return 'unsupported';
    return this.ctx ? this.ctx.state : 'uninitialized';
  }

  get currentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  /** 出力遅延の目安（秒）。発音スケジュールの補正に使う */
  get outputLatency(): number {
    const c = this.ctx as (AudioContext & { outputLatency?: number }) | null;
    return c?.outputLatency ?? c?.baseLatency ?? 0;
  }

  get volume(): number {
    return this._volume;
  }

  set volume(v: number) {
    this._volume = Math.min(1, Math.max(0, v));
    this.applyMaster();
  }

  get muted(): boolean {
    return this._muted;
  }

  set muted(m: boolean) {
    this._muted = m;
    this.applyMaster();
  }

  private applyMaster() {
    if (!this.master || !this.ctx) return;
    const target = this._muted ? 0 : this._volume;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(target, t, 0.015);
  }

  /**
   * AudioContext を生成する。ユーザー操作のハンドラ内から呼ぶこと。
   * すでに生成済みなら resume のみ行う。
   */
  async unlock(): Promise<boolean> {
    const Ctor = getAudioCtxCtor();
    if (!Ctor) {
      this.onStateChange?.('unsupported');
      return false;
    }
    if (!this.ctx) {
      this.ctx = new Ctor({ latencyHint: 'interactive' });
      this.buildGraph(this.ctx);
      this.ctx.addEventListener('statechange', () => {
        this.onStateChange?.(this.ctx!.state);
      });
      // 読み込み開始（WAV があれば WAV、無ければ合成）
      void this.load();
    }
    if (this.ctx.state !== 'running') {
      try {
        await this.ctx.resume();
      } catch {
        /* resume が拒否されたら呼び出し側がボタンを出す */
      }
    }
    // iOS Safari は無音バッファを一度 start すると確実に解放される
    if (this.ctx.state === 'running') {
      const buf = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      src.start();
    }
    this.onStateChange?.(this.ctx.state);
    return this.ctx.state === 'running';
  }

  /** ページ復帰時などに呼ぶ */
  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state !== 'running') {
      try {
        await this.ctx.resume();
      } catch {
        /* ignore */
      }
      this.onStateChange?.(this.ctx.state);
    }
  }

  private buildGraph(ctx: AudioContext) {
    this.master = ctx.createGain();
    this.master.gain.value = this._muted ? 0 : this._volume;
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -8;
    this.limiter.knee.value = 6;
    this.limiter.ratio.value = 14;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.2;
    this.master.connect(this.limiter).connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = renderImpulseResponse(ctx, 1.8, 3.2);
    this.reverbReturn = ctx.createGain();
    this.reverbReturn.gain.value = 0.35;
    this.reverb.connect(this.reverbReturn).connect(this.master);
  }

  /** 全サンプルをロードする。何度呼んでも 1 回しか走らない */
  load(): Promise<LoadProgress> {
    if (this.loadPromise) return this.loadPromise;
    const ctx = this.ctx;
    if (!ctx) return Promise.reject(new Error('AudioContext not initialized'));
    const names = Object.keys(SAMPLE_FILES) as SampleName[];
    const progress: LoadProgress = { loaded: 0, total: names.length, fallbacks: [] };
    this.loadPromise = (async () => {
      await Promise.all(
        names.map(async (name) => {
          const sample = await this.loadOne(ctx, name);
          this.samples.set(name, sample);
          progress.loaded++;
          if (sample.isFallback) progress.fallbacks.push(name);
          this.onProgress?.({ ...progress, fallbacks: [...progress.fallbacks] });
        }),
      );
      return progress;
    })();
    return this.loadPromise;
  }

  get isLoaded(): boolean {
    return this.samples.size === Object.keys(SAMPLE_FILES).length;
  }

  isFallback(name: SampleName): boolean {
    return this.samples.get(name)?.isFallback ?? true;
  }

  private async loadOne(ctx: AudioContext, name: SampleName): Promise<LoadedSample> {
    const url = `${this.baseUrl}audio/${SAMPLE_FILES[name]}`;
    try {
      // 通常の HTTP キャッシュに任せる。force-cache だと「以前そのファイル名が無かった頃の HTML 応答」まで
      // 再利用してしまい、後から音源を置いても読み込めないことがある
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get('content-type') ?? '';
      // Vite dev / SPA fallback で index.html が返るケースを弾く
      if (type.includes('text/html')) throw new Error('not an audio file');
      const data = await res.arrayBuffer();
      const buffer = await decode(ctx, data);
      return { name, buffer, isFallback: false };
    } catch (err) {
      if (import.meta.env.DEV) {
        console.info(`[audio] ${SAMPLE_FILES[name]} が無いので代替音源を使います (${(err as Error).message})`);
      }
      const fb: FallbackSample = await renderFallback(name, ctx.sampleRate);
      return { name, buffer: fb.buffer, isFallback: true };
    }
  }

  /**
   * サンプルを再生する。ロード前なら何もしない（null を返す）。
   * when は AudioContext の時刻。複数音を同じ when で呼べば完全に同時に鳴る。
   */
  play(name: SampleName, opts: PlayOptions = {}): Voice | null {
    const ctx = this.ctx;
    const master = this.master;
    const sample = this.samples.get(name);
    if (!ctx || !master || !sample) return null;
    const when = Math.max(opts.when ?? ctx.currentTime, ctx.currentTime);
    const source = ctx.createBufferSource();
    source.buffer = sample.buffer;
    source.playbackRate.value = opts.rate ?? 1;
    if (opts.loop) source.loop = true;
    const gain = ctx.createGain();
    const g = opts.gain ?? 1;
    if (opts.fadeIn && opts.fadeIn > 0) {
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(Math.max(g, 0.0001), when + opts.fadeIn);
    } else {
      gain.gain.setValueAtTime(g, when);
    }
    source.connect(gain).connect(master);
    if (opts.reverb && this.reverb) {
      const send = ctx.createGain();
      send.gain.value = opts.reverb;
      gain.connect(send).connect(this.reverb);
    }
    source.start(when);

    const voice: Voice = {
      source,
      gain,
      fadeOut: (seconds: number, at?: number) => {
        const t = Math.max(at ?? ctx.currentTime, ctx.currentTime);
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(seconds, 0.005));
        try {
          source.stop(t + seconds + 0.05);
        } catch {
          /* already stopped */
        }
      },
      stop: () => {
        try {
          source.stop();
        } catch {
          /* already stopped */
        }
      },
    };
    this.activeVoices.add(voice);
    source.onended = () => {
      this.activeVoices.delete(voice);
      source.disconnect();
      gain.disconnect();
    };
    return voice;
  }

  /** 鳴っている音をすべて止める（再演奏時のクリーンアップ） */
  stopAll(fade = 0.05) {
    for (const v of this.activeVoices) v.fadeOut(fade);
    this.activeVoices.clear();
  }

  get activeVoiceCount(): number {
    return this.activeVoices.size;
  }
}

/** Safari の古い decodeAudioData（コールバック形式）にも対応 */
function decode(ctx: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const maybe = ctx.decodeAudioData(data, resolve, reject);
    if (maybe && typeof (maybe as Promise<AudioBuffer>).then === 'function') {
      (maybe as Promise<AudioBuffer>).then(resolve, reject);
    }
  });
}
