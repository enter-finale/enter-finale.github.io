/**
 * WAV 素材が無いときに使う代替音源。
 * OfflineAudioContext で一度だけレンダリングし、通常のサンプルと同じ AudioBuffer として扱う。
 * リアルさは求めず、「動作検証ができる」「それなりにロックっぽい」ことを目標にしている。
 */
import type { SampleName } from '../config';

type OfflineCtor = typeof OfflineAudioContext;

function getOfflineCtor(): OfflineCtor {
  const w = window as unknown as { OfflineAudioContext?: OfflineCtor; webkitOfflineAudioContext?: OfflineCtor };
  const ctor = w.OfflineAudioContext ?? w.webkitOfflineAudioContext;
  if (!ctor) throw new Error('OfflineAudioContext is not supported');
  return ctor;
}

/** 擬似乱数（再現性のため seed 固定） */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function noiseBuffer(ctx: BaseAudioContext, seconds: number, seed = 1): AudioBuffer {
  const len = Math.ceil(seconds * ctx.sampleRate);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  const rng = makeRng(seed);
  for (let i = 0; i < len; i++) data[i] = rng() * 2 - 1;
  return buf;
}

function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 2048;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return curve;
}

function gainEnv(ctx: BaseAudioContext, t0: number, peak: number, decay: number, attack = 0.001): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  return g;
}

/** 共通：長さ seconds のオフラインコンテキストを作る */
function offline(seconds: number, sampleRate: number, channels = 1): OfflineAudioContext {
  const Ctor = getOfflineCtor();
  return new Ctor(channels, Math.ceil(seconds * sampleRate), sampleRate);
}

// ---------------------------------------------------------------- drums

async function renderKick(sr: number): Promise<AudioBuffer> {
  const ctx = offline(0.7, sr);
  const t = 0;
  // 本体：ピッチが急降下するサイン波
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(48, t + 0.09);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.5);
  const env = gainEnv(ctx, t, 1.0, 0.55, 0.002);
  osc.connect(env).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.7);
  // アタックのクリック
  const click = ctx.createBufferSource();
  click.buffer = noiseBuffer(ctx, 0.02, 7);
  const cEnv = gainEnv(ctx, t, 0.5, 0.012, 0.0005);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1500;
  click.connect(hp).connect(cEnv).connect(ctx.destination);
  click.start(t);
  return ctx.startRendering();
}

async function renderSnare(sr: number): Promise<AudioBuffer> {
  const ctx = offline(0.45, sr);
  const t = 0;
  // 胴鳴り
  for (const [f, g, d] of [
    [185, 0.55, 0.12],
    [330, 0.3, 0.08],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f * 1.3, t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.02);
    const env = gainEnv(ctx, t, g, d);
    osc.connect(env).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }
  // スナッピー（ノイズ）
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(ctx, 0.45, 11);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 900;
  const bp = ctx.createBiquadFilter();
  bp.type = 'peaking';
  bp.frequency.value = 3200;
  bp.gain.value = 6;
  const env = gainEnv(ctx, t, 0.9, 0.28, 0.001);
  noise.connect(hp).connect(bp).connect(env).connect(ctx.destination);
  noise.start(t);
  return ctx.startRendering();
}

async function renderTom(sr: number, fStart: number, fEnd: number, decay: number): Promise<AudioBuffer> {
  const ctx = offline(decay + 0.2, sr);
  const t = 0;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(fStart, t);
  osc.frequency.exponentialRampToValueAtTime(fEnd, t + 0.12);
  osc.frequency.exponentialRampToValueAtTime(fEnd * 0.9, t + decay);
  const env = gainEnv(ctx, t, 1.0, decay, 0.002);
  osc.connect(env).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + decay + 0.2);
  // 倍音を少し
  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(fStart * 1.6, t);
  osc2.frequency.exponentialRampToValueAtTime(fEnd * 1.5, t + 0.1);
  const env2 = gainEnv(ctx, t, 0.25, decay * 0.5, 0.002);
  osc2.connect(env2).connect(ctx.destination);
  osc2.start(t);
  osc2.stop(t + decay);
  // スティックのアタック
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(ctx, 0.05, 13);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2500;
  const nEnv = gainEnv(ctx, t, 0.35, 0.03, 0.0005);
  noise.connect(bp).connect(nEnv).connect(ctx.destination);
  noise.start(t);
  return ctx.startRendering();
}

async function renderCrash(sr: number): Promise<AudioBuffer> {
  const dur = 3.0;
  const ctx = offline(dur, sr);
  const t = 0;
  // ノイズ成分（高域）
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(ctx, dur, 17);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 4500;
  const peak = ctx.createBiquadFilter();
  peak.type = 'peaking';
  peak.frequency.value = 8000;
  peak.gain.value = 4;
  const env = gainEnv(ctx, t, 0.9, 2.6, 0.002);
  noise.connect(hp).connect(peak).connect(env).connect(ctx.destination);
  noise.start(t);
  // 金属的な非整数倍音
  const partials = [1.0, 1.483, 1.932, 2.546, 2.63, 3.897, 4.21];
  for (let i = 0; i < partials.length; i++) {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 520 * partials[i];
    const g = gainEnv(ctx, t, 0.08 / (i + 1), 1.4 + i * 0.1, 0.002);
    const bp = ctx.createBiquadFilter();
    bp.type = 'highpass';
    bp.frequency.value = 3000;
    osc.connect(bp).connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }
  return ctx.startRendering();
}

// ---------------------------------------------------------------- guitar

/**
 * 完全に周期的なパワーコード波形を JS で生成する。
 * ループ長を周期の整数倍にすることで、ループ境界のクリックを防ぐ。
 */
function buildPeriodicChordBuffer(ctx: BaseAudioContext, seconds: number): { buffer: AudioBuffer; loopLen: number } {
  const sr = ctx.sampleRate;
  // E2 ≈ 82.4Hz。周期サンプル数を 6 の倍数にして 5度(2/3) と オクターブ(1/2) も整数周期にする
  const rootPeriod = Math.round(sr / 82.4 / 6) * 6;
  const fifthPeriod = (rootPeriod * 2) / 3;
  const octavePeriod = rootPeriod / 2;
  const cycle = rootPeriod; // 全音の最小公倍周期
  const cycles = Math.max(1, Math.floor((seconds * sr) / cycle));
  const loopLen = cycles * cycle;
  const buf = ctx.createBuffer(1, loopLen, sr);
  const data = buf.getChannelData(0);
  const saw = (i: number, period: number, phase: number) => {
    const p = ((i + phase) % period) / period;
    return 2 * p - 1;
  };
  for (let i = 0; i < loopLen; i++) {
    // 2本のギターが少しズレた位相で弾いているイメージ
    const v =
      saw(i, rootPeriod, 0) * 0.5 +
      saw(i, rootPeriod, rootPeriod * 0.37) * 0.3 +
      saw(i, fifthPeriod, 0) * 0.35 +
      saw(i, fifthPeriod, fifthPeriod * 0.61) * 0.2 +
      saw(i, octavePeriod, 0) * 0.18;
    data[i] = v;
  }
  return { buffer: buf, loopLen };
}

async function renderGuitarSustain(sr: number): Promise<{ buffer: AudioBuffer; loopStart: number; loopEnd: number }> {
  const preRoll = 0.8; // フィルタの過渡応答を捨てるための助走
  const loopSeconds = 2.0;
  const tmpCtx = offline(0.01, sr);
  const { buffer: raw, loopLen } = buildPeriodicChordBuffer(tmpCtx, loopSeconds);
  const loopDur = loopLen / sr;
  const total = preRoll + loopDur + 0.05;
  const ctx = offline(total, sr);
  const src = ctx.createBufferSource();
  src.buffer = raw;
  src.loop = true;
  src.loopStart = 0;
  src.loopEnd = loopDur;
  const pre = ctx.createBiquadFilter();
  pre.type = 'highpass';
  pre.frequency.value = 120;
  const drive = ctx.createGain();
  drive.gain.value = 4;
  const shaper = ctx.createWaveShaper();
  shaper.curve = makeDistortionCurve(6);
  shaper.oversample = '2x';
  const cab = ctx.createBiquadFilter();
  cab.type = 'lowpass';
  cab.frequency.value = 3800;
  cab.Q.value = 0.8;
  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 1800;
  presence.gain.value = 3;
  const out = ctx.createGain();
  out.gain.value = 0.55;
  src.connect(pre).connect(drive).connect(shaper).connect(cab).connect(presence).connect(out).connect(ctx.destination);
  src.start(0);
  const rendered = await ctx.startRendering();
  return { buffer: rendered, loopStart: preRoll, loopEnd: preRoll + loopDur };
}

async function renderGuitarFinale(sr: number): Promise<AudioBuffer> {
  const dur = 7.0;
  const ctx = offline(dur, sr);
  const tmp = buildPeriodicChordBuffer(ctx, 2.0);
  const src = ctx.createBufferSource();
  src.buffer = tmp.buffer;
  src.loop = true;
  src.loopEnd = tmp.loopLen / sr;
  // 最初だけ少しピッチが揺れる（ジャーン！の「ン」）
  src.playbackRate.setValueAtTime(1.03, 0);
  src.playbackRate.exponentialRampToValueAtTime(1.0, 0.15);
  src.playbackRate.setValueAtTime(1.0, 4.0);
  src.playbackRate.linearRampToValueAtTime(0.985, dur);
  const drive = ctx.createGain();
  drive.gain.setValueAtTime(7, 0);
  drive.gain.exponentialRampToValueAtTime(3, dur);
  const shaper = ctx.createWaveShaper();
  shaper.curve = makeDistortionCurve(8);
  shaper.oversample = '2x';
  const cab = ctx.createBiquadFilter();
  cab.type = 'lowpass';
  cab.frequency.setValueAtTime(5200, 0);
  cab.frequency.exponentialRampToValueAtTime(2200, dur);
  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 2000;
  presence.gain.value = 4;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, 0);
  env.gain.exponentialRampToValueAtTime(0.9, 0.006);
  env.gain.setValueAtTime(0.9, 0.3);
  env.gain.exponentialRampToValueAtTime(0.0008, dur);
  src.connect(drive).connect(shaper).connect(cab).connect(presence).connect(env).connect(ctx.destination);
  src.start(0);
  // ピックのアタック
  const pick = ctx.createBufferSource();
  pick.buffer = noiseBuffer(ctx, 0.03, 23);
  const pEnv = gainEnv(ctx, 0, 0.5, 0.02, 0.0005);
  const pHp = ctx.createBiquadFilter();
  pHp.type = 'highpass';
  pHp.frequency.value = 2000;
  pick.connect(pHp).connect(pEnv).connect(ctx.destination);
  pick.start(0);
  return ctx.startRendering();
}

// ---------------------------------------------------------------- crowd

async function renderCrowd(sr: number): Promise<AudioBuffer> {
  const dur = 9.0;
  const ctx = offline(dur, sr, 2);
  const rng = makeRng(99);
  const merger = ctx.createChannelMerger(2);
  merger.connect(ctx.destination);
  // 大勢の「ワー」：帯域の違うノイズを複数重ねる
  const voices = 10;
  for (let v = 0; v < voices; v++) {
    const n = ctx.createBufferSource();
    n.buffer = noiseBuffer(ctx, dur, 100 + v);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 350 + rng() * 1400;
    bp.Q.value = 1.2 + rng() * 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, 0);
    const rise = 0.25 + rng() * 0.5;
    g.gain.exponentialRampToValueAtTime(0.09, rise);
    // ゆらぎ
    let t = rise;
    while (t < dur - 1.5) {
      const step = 0.15 + rng() * 0.4;
      t += step;
      g.gain.linearRampToValueAtTime(0.04 + rng() * 0.08, t);
    }
    g.gain.linearRampToValueAtTime(0.0001, dur);
    const pan = ctx.createStereoPanner();
    pan.pan.value = rng() * 1.6 - 0.8;
    n.connect(bp).connect(g).connect(pan).connect(ctx.destination);
    n.start(0);
  }
  // 歓声の「ヒュー」「ウォー」：短いサイン波のスイープを散らす
  for (let i = 0; i < 28; i++) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const start = 0.3 + rng() * 5.5;
    const f0 = 600 + rng() * 900;
    osc.frequency.setValueAtTime(f0, start);
    osc.frequency.exponentialRampToValueAtTime(f0 * (1.3 + rng() * 0.6), start + 0.25 + rng() * 0.3);
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.9, start + 0.8);
    const g = gainEnv(ctx, start, 0.025 + rng() * 0.02, 0.7, 0.05);
    const pan = ctx.createStereoPanner();
    pan.pan.value = rng() * 2 - 1;
    osc.connect(g).connect(pan).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 1.0);
  }
  // 拍手：細かいクリック列
  const clapNoise = ctx.createBufferSource();
  clapNoise.buffer = noiseBuffer(ctx, dur, 555);
  const clapHp = ctx.createBiquadFilter();
  clapHp.type = 'bandpass';
  clapHp.frequency.value = 2200;
  clapHp.Q.value = 0.7;
  const clapGain = ctx.createGain();
  clapGain.gain.setValueAtTime(0, 0);
  let ct = 0.4;
  while (ct < dur - 0.5) {
    clapGain.gain.setValueAtTime(0.0001, ct);
    clapGain.gain.linearRampToValueAtTime(0.05 + rng() * 0.05, ct + 0.003);
    clapGain.gain.exponentialRampToValueAtTime(0.0001, ct + 0.02);
    ct += 0.02 + rng() * 0.05;
  }
  clapNoise.connect(clapHp).connect(clapGain).connect(ctx.destination);
  clapNoise.start(0);
  return ctx.startRendering();
}

// ---------------------------------------------------------------- public API

export interface FallbackSample {
  buffer: AudioBuffer;
  /** ループ再生用の範囲（秒）。未指定なら buffer 全体 */
  loopStart?: number;
  loopEnd?: number;
}

/** 指定サンプルの代替音源をレンダリングして返す */
export async function renderFallback(name: SampleName, sampleRate: number): Promise<FallbackSample> {
  switch (name) {
    case 'kick':
      return { buffer: await renderKick(sampleRate) };
    case 'snare':
      return { buffer: await renderSnare(sampleRate) };
    case 'tomHigh':
      return { buffer: await renderTom(sampleRate, 420, 240, 0.35) };
    case 'tomMid':
      return { buffer: await renderTom(sampleRate, 300, 165, 0.45) };
    case 'tomLow':
      return { buffer: await renderTom(sampleRate, 200, 100, 0.6) };
    case 'crash':
      return { buffer: await renderCrash(sampleRate) };
    case 'guitarSustain':
      return await renderGuitarSustain(sampleRate);
    case 'guitarFinale':
      return { buffer: await renderGuitarFinale(sampleRate) };
    case 'crowdCheer':
      return { buffer: await renderCrowd(sampleRate) };
  }
}

/** リバーブ用インパルス応答（減衰ノイズ） */
export function renderImpulseResponse(ctx: BaseAudioContext, seconds = 1.8, decay = 3.0): AudioBuffer {
  const len = Math.ceil(seconds * ctx.sampleRate);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    const rng = makeRng(31 + ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      data[i] = (rng() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  return buf;
}
