/**
 * 開発者向け設定パネル。折りたたみ式で、閉じていれば画面収録の邪魔にならない。
 * URL に ?clean=1 を付けると歯車やステータス表示も含めて完全に隠す。
 */
import { PATTERNS } from '../core/drumPatterns';
import { DEFAULT_SETTINGS, type Settings } from '../core/settings';

export interface SettingsPanelOptions {
  root: HTMLElement;
  settings: Settings;
  onChange: () => void;
  onTestFinale: () => void;
}

interface SliderSpec {
  label: string;
  get: () => number;
  set: (v: number) => void;
  min: number;
  max: number;
  step: number;
}

export function mountSettingsPanel(o: SettingsPanelOptions) {
  const { root, settings } = o;
  const g = settings.gains;
  const sliders: SliderSpec[] = [
    { label: 'スネア', get: () => g.snare, set: (v) => (g.snare = v), min: 0, max: 1.5, step: 0.05 },
    { label: 'ハイタム', get: () => g.tomHigh, set: (v) => (g.tomHigh = v), min: 0, max: 1.5, step: 0.05 },
    { label: 'ロータム', get: () => g.tomLow, set: (v) => (g.tomLow = v), min: 0, max: 1.5, step: 0.05 },
    { label: 'フィナーレ（ジャーン）', get: () => g.finale, set: (v) => (g.finale = v), min: 0, max: 1.5, step: 0.05 },
    { label: '観客の歓声', get: () => g.crowd, set: (v) => (g.crowd = v), min: 0, max: 1.5, step: 0.05 },
    { label: '発音タイミング (ms)', get: () => settings.audioOffsetMs, set: (v) => (settings.audioOffsetMs = v), min: -200, max: 200, step: 5 },
    { label: '演出の速さ', get: () => settings.fxSpeed, set: (v) => (settings.fxSpeed = v), min: 0.5, max: 2, step: 0.1 },
  ];

  root.innerHTML = `
    <summary aria-label="開発者向け設定">⚙</summary>
    <div class="settings-body">
      <h2>開発者向け設定</h2>
      <label class="settings-row">
        <span>ドラムパターン</span>
        <select data-k="pattern">${PATTERNS.map((p) => `<option value="${p.id}">${p.label}</option>`).join('')}</select>
      </label>
      <div class="settings-sliders"></div>
      <label class="settings-row settings-check">
        <input type="checkbox" data-k="visuals"> <span>映像演出</span>
      </label>
      <div class="settings-actions">
        <button type="button" data-k="test">フィナーレを試す</button>
        <button type="button" data-k="reset">初期値に戻す</button>
      </div>
      <p class="settings-note">URL に <code>?clean=1</code> を付けると操作 UI を全て隠せます（画面収録用）。</p>
    </div>`;

  const sliderBox = root.querySelector<HTMLElement>('.settings-sliders')!;
  const patternSel = root.querySelector<HTMLSelectElement>('[data-k="pattern"]')!;
  const visualsChk = root.querySelector<HTMLInputElement>('[data-k="visuals"]')!;

  const render = () => {
    sliderBox.innerHTML = '';
    for (const s of sliders) {
      const row = document.createElement('label');
      row.className = 'settings-row';
      const val = document.createElement('output');
      val.textContent = String(s.get());
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(s.min);
      input.max = String(s.max);
      input.step = String(s.step);
      input.value = String(s.get());
      input.addEventListener('input', () => {
        const v = Number(input.value);
        s.set(v);
        val.textContent = String(v);
        o.onChange();
      });
      const span = document.createElement('span');
      span.textContent = s.label;
      row.append(span, input, val);
      sliderBox.append(row);
    }
    patternSel.value = settings.patternId;
    visualsChk.checked = settings.visualsEnabled;
  };
  render();

  patternSel.addEventListener('change', () => {
    settings.patternId = patternSel.value;
    o.onChange();
  });
  visualsChk.addEventListener('change', () => {
    settings.visualsEnabled = visualsChk.checked;
    o.onChange();
  });
  root.querySelector('[data-k="test"]')!.addEventListener('click', () => o.onTestFinale());
  root.querySelector('[data-k="reset"]')!.addEventListener('click', () => {
    Object.assign(settings.gains, DEFAULT_SETTINGS.gains);
    settings.patternId = DEFAULT_SETTINGS.patternId;
    settings.audioOffsetMs = DEFAULT_SETTINGS.audioOffsetMs;
    settings.visualsEnabled = DEFAULT_SETTINGS.visualsEnabled;
    settings.fxSpeed = DEFAULT_SETTINGS.fxSpeed;
    render();
    o.onChange();
  });
}
