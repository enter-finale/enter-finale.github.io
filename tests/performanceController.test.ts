import { describe, expect, it } from 'vitest';
import type { AudioEngine, PlayOptions, Voice } from '../src/audio/AudioEngine';
import { PerformanceController } from '../src/core/PerformanceController';
import { DEFAULT_SETTINGS, type Settings } from '../src/core/settings';

/** AudioEngine の代役。loaded=false の間は play が null を返す（ロード前の実機挙動） */
function fakeAudio() {
  const plays: { name: string; opts: PlayOptions }[] = [];
  const fake = {
    loaded: false,
    plays,
    currentTime: 0,
    volume: 0,
    muted: false,
    play(name: string, opts: PlayOptions = {}): Voice | null {
      plays.push({ name, opts });
      if (!fake.loaded) return null;
      return {
        source: {} as AudioBufferSourceNode,
        gain: { gain: { setTargetAtTime() {} } } as unknown as GainNode,
        fadeOut() {},
        stop() {},
      };
    },
    stopAll() {},
  };
  return fake;
}

function makeController(audio: ReturnType<typeof fakeAudio>) {
  const settings: Settings = structuredClone(DEFAULT_SETTINGS);
  return new PerformanceController(audio as unknown as AudioEngine, settings, {
    onStateChange: () => {},
    onHit: () => {},
    onFinale: () => {},
  });
}

const sustains = (audio: ReturnType<typeof fakeAudio>) => audio.plays.filter((p) => p.name === 'guitarSustain');

describe('PerformanceController のギターサステイン', () => {
  it('音源ロード前に打ち始めても、ロード後の打鍵でサステインが始まる', () => {
    const audio = fakeAudio();
    const c = makeController(audio);
    c.hit();
    c.hit();
    expect(c.state).toBe('typing');
    expect(sustains(audio).length).toBeGreaterThanOrEqual(1); // 試行はしている
    const attemptsBeforeLoad = sustains(audio).length;
    audio.loaded = true;
    c.hit();
    // ロード後の打鍵で改めて開始が試みられる（成功する）
    expect(sustains(audio).length).toBe(attemptsBeforeLoad + 1);
    expect(sustains(audio).at(-1)?.opts.loop).toBe(true);
    // 始まった後は再トリガーしない
    const before = sustains(audio).length;
    c.hit();
    c.hit();
    expect(sustains(audio).length).toBe(before);
  });

  it('ロード済みなら最初の打鍵で 1 回だけ始まり、以降は再トリガーしない', () => {
    const audio = fakeAudio();
    audio.loaded = true;
    const c = makeController(audio);
    c.hit();
    c.hit();
    c.hit();
    expect(sustains(audio)).toHaveLength(1);
    expect(sustains(audio)[0].opts.loop).toBe(true);
  });

  it('reset 後の 2 周目でもサステインは 1 回だけ始まる', () => {
    const audio = fakeAudio();
    audio.loaded = true;
    const c = makeController(audio);
    c.hit();
    c.reset();
    expect(c.state).toBe('ready');
    c.hit();
    c.hit();
    expect(sustains(audio)).toHaveLength(2);
  });
});
