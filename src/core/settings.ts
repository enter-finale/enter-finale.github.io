/**
 * 開発者向け設定と、ユーザー向けの音量/ミュート。
 * localStorage に保存するのは音量・ミュートと開発設定のみ。入力した文章は保存しない。
 */
import { DEFAULT_PATTERN_ID } from './drumPatterns';

export interface Settings {
  volume: number;
  muted: boolean;
  gains: {
    snare: number;
    tomHigh: number;
    tomLow: number;
    /** Enter の「ジャーン」（キック・クラッシュ・ギターをまとめた 1 音） */
    finale: number;
    crowd: number;
  };
  patternId: string;
  /** 発音を遅らせる ms（映像との同期調整。負の値は映像を遅らせる） */
  audioOffsetMs: number;
  visualsEnabled: boolean;
  /** 演出の速さ。1 = 標準、2 = 2倍速 */
  fxSpeed: number;
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.8,
  muted: false,
  gains: {
    snare: 0.9,
    tomHigh: 0.9,
    tomLow: 1.0,
    finale: 1.0,
    crowd: 0.7,
  },
  patternId: DEFAULT_PATTERN_ID,
  audioOffsetMs: 0,
  visualsEnabled: true,
  fxSpeed: 1,
};

const STORAGE_KEY = 'enter-finale:settings:v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...structuredClone(DEFAULT_SETTINGS),
      ...parsed,
      // 既知のキーだけ取り込む（過去バージョンで保存された不要なキーは捨てる）
      gains: Object.fromEntries(
        (Object.keys(DEFAULT_SETTINGS.gains) as (keyof Settings['gains'])[]).map((k) => [
          k,
          typeof parsed.gains?.[k] === 'number' ? parsed.gains[k] : DEFAULT_SETTINGS.gains[k],
        ]),
      ) as Settings['gains'],
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* プライベートモードなどで保存できなくても動作は続ける */
  }
}
