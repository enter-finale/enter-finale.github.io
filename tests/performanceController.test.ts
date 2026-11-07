import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioEngine, PlayOptions, Voice } from '../src/audio/AudioEngine';
import { PerformanceController } from '../src/core/PerformanceController';
import { DEFAULT_SETTINGS, type Settings } from '../src/core/settings';

/** AudioEngine の代役。loaded=false の間は play が null を返す（ロード前の実機挙動） */
function fakeAudio() {
  const plays: { name: string; opts: PlayOptions }[] = [];
  const fake = {
    loaded: true,
    plays,
    currentTime: 0,
    volume: 0,
    muted: false,
    stopped: 0,
    play(name: string, opts: PlayOptions = {}): Voice | null {
      plays.push({ name, opts });
      if (!fake.loaded) return null;
      return { source: {} as AudioBufferSourceNode, gain: {} as GainNode, fadeOut() {}, stop() {} };
    },
    stopAll() {
      fake.stopped++;
    },
  };
  return fake;
}

function makeController(audio: ReturnType<typeof fakeAudio>) {
  const settings: Settings = structuredClone(DEFAULT_SETTINGS);
  const events: string[] = [];
  const c = new PerformanceController(audio as unknown as AudioEngine, settings, {
    onStateChange: (s) => events.push(s),
    onHit: () => {},
    onFinale: () => events.push('onFinale'),
  });
  return { c, events };
}

const names = (audio: ReturnType<typeof fakeAudio>) => audio.plays.map((p) => p.name);

describe('PerformanceController', () => {
  beforeEach(() => {
    // finale() は window.setTimeout を使う（node 環境なので差し替え）
    vi.stubGlobal('window', { setTimeout: globalThis.setTimeout });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('打鍵ではドラムだけが鳴り（スネアは A/B 交互）、フィナーレ音は鳴らない', () => {
    const audio = fakeAudio();
    const { c, events } = makeController(audio);
    c.hit();
    c.hit();
    c.hit(true);
    expect(c.state).toBe('typing');
    expect(events).toEqual(['typing']);
    expect(names(audio)).toEqual(['snareA', 'snareB', 'snareA']); // classic16 の先頭 3 打
    expect(names(audio)).not.toContain('finale');
    expect(names(audio)).not.toContain('crowdCheer');
  });

  it('Enter で「ジャーン」が 1 回鳴り、歓声がその直後に続く', () => {
    const audio = fakeAudio();
    const { c, events } = makeController(audio);
    c.hit();
    audio.plays.length = 0;
    c.finale('hello');
    expect(c.state).toBe('finale');
    expect(events).toEqual(['typing', 'finale', 'onFinale']);
    expect(names(audio)).toEqual(['finale', 'crowdCheer']);
    const t = audio.plays[0].opts.when!;
    expect(audio.plays[1].opts.when).toBeCloseTo(t + 0.25, 5);
    expect(audio.plays[1].opts.fadeIn).toBeGreaterThan(0);
  });

  it('フィナーレ中の Enter と打鍵は無視される', () => {
    const audio = fakeAudio();
    const { c } = makeController(audio);
    c.finale('a');
    const n = audio.plays.length;
    c.finale('b');
    c.hit();
    expect(audio.plays.length).toBe(n);
  });

  it('reset で全音を止めて ready に戻り、2 周目も同じように鳴る', () => {
    const audio = fakeAudio();
    const { c } = makeController(audio);
    c.hit();
    c.finale('x');
    c.reset();
    expect(c.state).toBe('ready');
    expect(audio.stopped).toBe(1);
    audio.plays.length = 0;
    c.hit();
    expect(names(audio)).toEqual(['snareA']); // スネアも A からやり直し
    c.finale('y');
    expect(names(audio).filter((n) => n === 'finale')).toHaveLength(1);
  });

  it('音源ロード前の打鍵でも落ちず、ロード後は普通に鳴る', () => {
    const audio = fakeAudio();
    audio.loaded = false;
    const { c } = makeController(audio);
    c.hit();
    expect(c.state).toBe('typing');
    audio.loaded = true;
    c.hit();
    expect(names(audio)).toEqual(['snareA', 'snareB']);
  });
});
