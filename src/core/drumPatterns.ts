/**
 * ドラムフィルのパターン定義。
 * 打鍵のたびに次のステップへ進み、末尾まで来たら先頭へ戻る。
 * 新しいパターンを足すときは PATTERNS に追加するだけでよい。
 *
 * ここでの 'snare' は「スネア」という役割で、実際に鳴るサンプル（snareA / snareB）は
 * DrumEngine が 1 打ごとに交互に選ぶ。
 */
export type DrumVoice = 'snare' | 'tomHigh' | 'tomLow';

export interface DrumPattern {
  id: string;
  label: string;
  steps: DrumVoice[];
}

export const PATTERNS: DrumPattern[] = [
  {
    id: 'classic16',
    label: 'クラシック 16打 (スネア → タム)',
    steps: [
      'snare', 'snare', 'snare', 'snare',
      'snare', 'snare', 'tomHigh', 'tomHigh',
      'tomLow', 'tomLow', 'snare', 'snare',
      'tomHigh', 'tomHigh', 'tomLow', 'tomLow',
    ],
  },
  {
    id: 'rolling8',
    label: 'ローリング 8打',
    steps: ['snare', 'snare', 'tomHigh', 'tomHigh', 'tomLow', 'tomLow', 'tomHigh', 'tomLow'],
  },
  {
    id: 'snareOnly',
    label: 'スネアのみ',
    steps: ['snare'],
  },
  {
    id: 'triplets',
    label: '3連 (スネア → ハイ → ロー)',
    steps: ['snare', 'tomHigh', 'tomLow', 'snare', 'tomHigh', 'tomLow', 'snare', 'snare', 'tomHigh', 'tomHigh', 'tomLow', 'tomLow'],
  },
];

export const DEFAULT_PATTERN_ID = 'classic16';

export function getPattern(id: string): DrumPattern {
  return PATTERNS.find((p) => p.id === id) ?? PATTERNS[0];
}

/** index 番目の打鍵で鳴らす音（循環） */
export function voiceAt(pattern: DrumPattern, index: number): DrumVoice {
  const n = pattern.steps.length;
  if (n === 0) return 'snare';
  return pattern.steps[((index % n) + n) % n];
}
