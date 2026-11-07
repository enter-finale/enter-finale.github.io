import './style.css';
import { AudioEngine } from './audio/AudioEngine';
import { InputHandler } from './core/InputHandler';
import { PerformanceController } from './core/PerformanceController';
import { loadSettings, saveSettings } from './core/settings';
import { FinaleAnimation } from './ui/FinaleAnimation';
import { mountSettingsPanel } from './ui/SettingsPanel';
import { finaleImageUrl, pickFinaleImage, preloadFinaleImages } from './ui/finaleImage';

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el as T;
}

const app = $<HTMLDivElement>('app');
const textarea = $<HTMLTextAreaElement>('message');
const sendBtn = $<HTMLButtonElement>('send');
const replayBtn = $<HTMLButtonElement>('replay');
const muteBtn = $<HTMLButtonElement>('mute');
const volumeInput = $<HTMLInputElement>('volume');
const status = $<HTMLSpanElement>('status');
const unlockBox = $<HTMLDivElement>('audio-unlock');
const unlockBtn = $<HTMLButtonElement>('audio-unlock-btn');
const stagePhoto = $<HTMLImageElement>('stage-photo');

const query = new URLSearchParams(location.search);
// 画面収録用: ?clean=1 で操作 UI を隠す
if (query.get('clean') === '1') {
  document.body.classList.add('clean');
}
// 開発者向け設定（右下の ⚙）は ?dev=1 のときだけ出す
const devMode = query.get('dev') === '1';

// ステージ写真は Enter の瞬間に待たされないよう、起動後に裏で読み込んでおく
let lastPhoto = -1;
preloadFinaleImages();

const settings = loadSettings();
const audio = new AudioEngine();

/** 開発時のみ window.__enterFinale で状態を覗ける（ブラウザ検証用） */
const debug = { hits: 0, lastVoice: '' as string, audio, get voices() { return audio.activeVoiceCount; } };
if (import.meta.env.DEV) (window as unknown as { __enterFinale: typeof debug }).__enterFinale = debug;

const anim = new FinaleAnimation({
  app,
  flash: $('flash'),
  banner: $('banner'),
  bannerText: $('banner-text'),
  getSpeed: () => settings.fxSpeed,
  getVisualsEnabled: () => settings.visualsEnabled,
});

const controller = new PerformanceController(audio, settings, {
  onStateChange: (state) => {
    anim.setState(state);
    const playing = state === 'finale' || state === 'finished';
    input.setEnabled(!playing);
    textarea.readOnly = playing;
    sendBtn.disabled = playing;
    if (state === 'ready') {
      textarea.value = '';
      anim.reset();
      // スマホでキーボードが閉じた後でも入力しやすいようフォーカスを戻す
      if (window.matchMedia('(pointer: fine)').matches) textarea.focus();
    }
  },
  onHit: (voice, velocity) => {
    debug.hits++;
    debug.lastVoice = voice;
    anim.pulse(velocity);
  },
  onFinale: (ev) => {
    textarea.blur();
    lastPhoto = pickFinaleImage(lastPhoto);
    stagePhoto.src = finaleImageUrl(lastPhoto);
    anim.start(ev.text, ev.visualDelayMs);
  },
});

// ---------------------------------------------------------------- 音声の有効化

let unlockRequested = false;
async function ensureAudio() {
  if (unlockRequested && audio.state === 'running') return;
  unlockRequested = true;
  const ok = await audio.unlock();
  unlockBox.hidden = ok || !audio.supported;
  if (!audio.supported) {
    showStatus('このブラウザは Web Audio に対応していません', 4000);
  }
}

audio.onStateChange = (state) => {
  if (state === 'running') unlockBox.hidden = true;
  else if (state === 'suspended' && unlockRequested) unlockBox.hidden = false;
};

let statusTimer: number | null = null;
function showStatus(text: string, hideAfterMs?: number) {
  status.textContent = text;
  status.hidden = false;
  if (statusTimer) clearTimeout(statusTimer);
  if (hideAfterMs) statusTimer = window.setTimeout(() => (status.hidden = true), hideAfterMs);
}

audio.onProgress = (p) => {
  if (p.loaded < p.total) {
    showStatus(`音を準備中… ${p.loaded}/${p.total}`);
  } else {
    const fb = p.fallbacks.length;
    showStatus(fb === 0 ? '♪ 準備OK' : fb === p.total ? '♪ 準備OK（代替音源）' : `♪ 準備OK（代替音源 ${fb}）`, 2500);
  }
};

unlockBtn.addEventListener('click', () => void ensureAudio());
// 最初のタップ/クリック/キー操作で音声を有効化（iOS Safari 対策で pointerdown と touchend の両方）
for (const type of ['pointerdown', 'touchend', 'keydown'] as const) {
  document.addEventListener(type, () => void ensureAudio(), { passive: true });
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void audio.resume();
});
window.addEventListener('pageshow', () => void audio.resume());

// ---------------------------------------------------------------- 入力

const input = new InputHandler(textarea, {
  onGesture: () => void ensureAudio(),
  onHit: (soft) => controller.hit(soft),
  onFinale: () => controller.finale(textarea.value),
});

sendBtn.addEventListener('click', () => {
  void ensureAudio();
  controller.finale(textarea.value);
});

replayBtn.addEventListener('click', () => {
  controller.reset();
});

// ---------------------------------------------------------------- 音量・ミュート

function syncVolumeUI() {
  volumeInput.value = String(settings.volume);
  muteBtn.textContent = settings.muted ? '🔇' : settings.volume === 0 ? '🔈' : '🔊';
  muteBtn.setAttribute('aria-pressed', String(settings.muted));
}
volumeInput.addEventListener('input', () => {
  settings.volume = Number(volumeInput.value);
  if (settings.volume > 0 && settings.muted) settings.muted = false;
  controller.applySettings();
  saveSettings(settings);
  syncVolumeUI();
});
muteBtn.addEventListener('click', () => {
  settings.muted = !settings.muted;
  controller.applySettings();
  saveSettings(settings);
  syncVolumeUI();
});
syncVolumeUI();

// ---------------------------------------------------------------- 開発者向け設定（?dev=1 のときだけ）

if (devMode) {
  mountSettingsPanel({
    root: $('settings'),
    settings,
    onChange: () => {
      controller.applySettings();
      saveSettings(settings);
    },
    onTestFinale: () => {
      void ensureAudio();
      if (controller.state === 'finale' || controller.state === 'finished') controller.reset();
      controller.finale(textarea.value || 'テスト');
    },
  });
} else {
  $('settings').remove();
}

// ---------------------------------------------------------------- モバイルのキーボード対応

// ソフトウェアキーボードが出たときに入力欄が隠れないよう、表示領域の高さを CSS 変数に流す
const vv = window.visualViewport;
if (vv) {
  const update = () => {
    document.documentElement.style.setProperty('--vvh', `${Math.round(vv.height)}px`);
  };
  vv.addEventListener('resize', update);
  update();
}

// PC では最初からすぐ打てるようにフォーカス
if (window.matchMedia('(pointer: fine)').matches) textarea.focus();
