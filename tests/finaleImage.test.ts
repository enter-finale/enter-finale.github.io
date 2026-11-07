import { describe, expect, it } from 'vitest';
import { pickFinaleImage } from '../src/ui/finaleImage';

const sweep = (prev: number, count: number) => {
  const seen = new Set<number>();
  for (let r = 0; r < 1; r += 0.01) {
    const i = pickFinaleImage(prev, () => r, count);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(count);
    seen.add(i);
  }
  return [...seen].sort();
};

describe('pickFinaleImage', () => {
  it('直前と同じ写真は選ばず、それ以外は全て選ばれうる', () => {
    expect(sweep(0, 4)).toEqual([1, 2, 3]);
    expect(sweep(1, 4)).toEqual([0, 2, 3]);
    expect(sweep(2, 4)).toEqual([0, 1, 3]);
    expect(sweep(3, 4)).toEqual([0, 1, 2]);
  });

  it('初回（prev = -1）は全枚数から選ぶ', () => {
    expect(sweep(-1, 4)).toEqual([0, 1, 2, 3]);
  });

  it('1 枚しか無いときは同じ写真を返し、0 枚なら -1', () => {
    expect(pickFinaleImage(0, () => 0.5, 1)).toBe(0);
    expect(pickFinaleImage(0, () => 0.5, 0)).toBe(-1);
  });

  it('rand が 1 に近くても範囲外にならない', () => {
    expect(pickFinaleImage(3, () => 0.999999, 4)).toBe(2);
    expect(pickFinaleImage(-1, () => 0.999999, 4)).toBe(3);
  });
});
