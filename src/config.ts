/**
 * アプリ全体の名前・文言・共有設定。
 * サービス名を変えたいときはここだけ書き換えれば OK。
 */
export const APP_NAME = 'ENTER FINALE';
export const APP_TAGLINE = 'Enterでライブ終了';
export const APP_DESCRIPTION =
  '普通に文章を打っていたはずなのに、Enterを押すとロックバンドのライブがフィナーレを迎える。';

/**
 * フィナーレで表示するステージ写真。public/images/ 以下に置く。
 * Enter のたびにこの中からランダムで 1 枚選ぶ（直前と同じ写真は避ける）。
 * 枚数を増減したいときはこの配列を編集するだけでよい。
 */
export const FINALE_IMAGES = ['finale-1.webp', 'finale-2.webp', 'finale-3.webp', 'finale-4.webp'] as const;

/**
 * 音声ファイル名。public/audio/ 以下に置く。差し替えはファイルを置き換えるだけ。
 * - snareA / snareB : 打鍵のスネア。1 打ごとに交互に鳴らす（同じ音の連打感を避ける）
 * - tomHigh / tomLow: フィルで使う 2 つのタム
 * - finale          : Enter で鳴る「ジャーン」。キック・クラッシュ・ギターを 1 本にまとめた音
 * - crowdCheer      : フィナーレ後の観客の歓声
 */
export const SAMPLE_FILES = {
  snareA: 'snare-1.wav',
  snareB: 'snare-2.wav',
  tomHigh: 'tom-high.wav',
  tomLow: 'tom-low.wav',
  finale: 'enter.wav',
  crowdCheer: 'crowd-cheer.wav',
} as const;

export type SampleName = keyof typeof SAMPLE_FILES;
