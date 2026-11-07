import { describe, expect, it } from 'vitest';
import { PATTERNS, getPattern, voiceAt } from '../src/core/drumPatterns';
import { DrumEngine, velocityFromInterval } from '../src/audio/DrumEngine';
import type { AudioEngine } from '../src/audio/AudioEngine';

describe('drumPatterns', () => {
  it('クラシック 16 打はスネアで始まりフロアタムで終わる', () => {
    const p = getPattern('classic16');
    expect(p.steps).toHaveLength(16);
    expect(p.steps[0]).toBe('snare');
    expect(p.steps[15]).toBe('tomLow');
  });

  it('打数がパターン長を超えたら循環する', () => {
    const p = getPattern('classic16');
    expect(voiceAt(p, 16)).toBe(p.steps[0]);
    expect(voiceAt(p, 17)).toBe(p.steps[1]);
    expect(voiceAt(p, 1000)).toBe(p.steps[1000 % 16]);
  });

  it('存在しない id は既定パターンにフォールバック', () => {
    expect(getPattern('nope').id).toBe(PATTERNS[0].id);
  });
});

describe('velocityFromInterval', () => {
  it('速い打鍵ほど強く、遅いほど弱い。範囲は 0.65〜1.0', () => {
    expect(velocityFromInterval(30)).toBeCloseTo(1.0, 2);
    expect(velocityFromInterval(2000)).toBeCloseTo(0.65, 2);
    expect(velocityFromInterval(300)).toBeGreaterThan(velocityFromInterval(500));
    expect(velocityFromInterval(null)).toBe(0.8);
  });
});

function fakeAudio() {
  const calls: Array<{ name: string; opts: Record<string, unknown> }> = [];
  const audio = {
    play: (name: string, opts: Record<string, unknown>) => {
      calls.push({ name, opts });
      return null;
    },
  } as unknown as AudioEngine;
  return { audio, calls };
}

describe('DrumEngine', () => {
  it('1 打鍵 = 1 打で、パターン通りに進む', () => {
    const { audio, calls } = fakeAudio();
    const d = new DrumEngine(audio);
    const p = getPattern('classic16');
    for (let i = 0; i < 20; i++) d.hit(i * 100);
    expect(calls).toHaveLength(20);
    calls.forEach((c, i) => expect(c.name).toBe(voiceAt(p, i)));
  });

  it('Backspace などの soft 打は音量が半分', () => {
    const { audio, calls } = fakeAudio();
    const d = new DrumEngine(audio);
    d.humanizeGain = 0;
    d.humanizePitch = 0;
    d.hit(0);
    d.setPattern('snareOnly');
    d.hit(100);
    d.hit(200, { soft: true });
    const loud = calls[1].opts.gain as number;
    const soft = calls[2].opts.gain as number;
    expect(soft).toBeCloseTo(loud * 0.5, 5);
  });

  it('ピッチと音量にわずかな揺らぎが入る（機械的にならない）', () => {
    const { audio, calls } = fakeAudio();
    const d = new DrumEngine(audio);
    d.setPattern('snareOnly');
    for (let i = 0; i < 10; i++) d.hit(i * 100);
    const rates = new Set(calls.map((c) => c.opts.rate));
    expect(rates.size).toBeGreaterThan(1);
    for (const c of calls) {
      expect(c.opts.rate as number).toBeGreaterThan(0.96);
      expect(c.opts.rate as number).toBeLessThan(1.04);
    }
  });

  it('フィナーレはキックとクラッシュを同一時刻で鳴らす', () => {
    const { audio, calls } = fakeAudio();
    const d = new DrumEngine(audio);
    d.finaleHit(12.5);
    const kick = calls.find((c) => c.name === 'kick')!;
    const crash = calls.find((c) => c.name === 'crash')!;
    expect(kick.opts.when).toBe(12.5);
    expect(crash.opts.when).toBe(12.5);
  });

  it('reset で先頭に戻る', () => {
    const { audio, calls } = fakeAudio();
    const d = new DrumEngine(audio);
    for (let i = 0; i < 7; i++) d.hit(i * 100);
    d.reset();
    d.hit(1000);
    expect(calls[7].name).toBe('snare');
  });
});
