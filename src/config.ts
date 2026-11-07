/**
 * アプリ全体の名前・文言・共有設定。
 * サービス名を変えたいときはここだけ書き換えれば OK。
 */
export const APP_NAME = 'ENTER FINALE';
export const APP_TAGLINE = 'Enterでライブ終了';
export const APP_DESCRIPTION =
  '普通に文章を打っていたはずなのに、Enterを押すとロックバンドのライブがフィナーレを迎える。';

/** X 共有の初期テキスト。入力した文章は含めない。 */
export const SHARE_TEXT = '文章を打ってEnter押したらライブ終わったwww 🥁🎸';

/** X のハッシュタグ（任意。空配列なら付けない） */
export const SHARE_HASHTAGS: string[] = ['ENTERFINALE'];

/** 音声ファイル名。public/audio/ 以下に置く。差し替えはファイルを置き換えるだけ。 */
export const SAMPLE_FILES = {
  snare: 'snare.wav',
  tomHigh: 'tom-high.wav',
  tomMid: 'tom-mid.wav',
  tomLow: 'tom-low.wav',
  kick: 'kick.wav',
  crash: 'crash.wav',
  guitarSustain: 'guitar-sustain.wav',
  guitarFinale: 'guitar-finale.wav',
  crowdCheer: 'crowd-cheer.wav',
} as const;

export type SampleName = keyof typeof SAMPLE_FILES;
