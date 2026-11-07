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
    tomMid: number;
    tomLow: number;
    kick: number;
    crash: number;
    guitarSustain: number;
    guitarFinale: number;
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
    tomHigh: 0.85,
    tomMid: 0.9,
    tomLow: 1.0,
    kick: 1.0,
    crash: 0.8,
    guitarSustain: 0.45,
    guitarFinale: 0.95,
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
      gains: { ...DEFAULT_SETTINGS.gains, ...(parsed.gains ?? {}) },
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
