/**
 * フィナーレの映像演出。
 * 実際のアニメーションは CSS（[data-state] と .fx-* クラス）で行い、
 * ここではタイミングに合わせてクラスを付け外しし、文章バナーを更新する。
 */
import { messageSizeClass } from '../core/inputClassifier';
import type { AppState } from '../core/PerformanceController';

export interface FinaleAnimationOptions {
  app: HTMLElement;
  flash: HTMLElement;
  banner: HTMLElement;
  bannerText: HTMLElement;
  getSpeed: () => number;
  getVisualsEnabled: () => boolean;
}

export class FinaleAnimation {
  private timers: number[] = [];
  private hitTimer: number | null = null;

  constructor(private o: FinaleAnimationOptions) {}

  private later(fn: () => void, ms: number) {
    const speed = Math.max(0.25, this.o.getSpeed());
    this.timers.push(window.setTimeout(fn, ms / speed));
  }

  setState(state: AppState) {
    this.o.app.dataset.state = state;
  }

  /** 打鍵ごとの小さな反応（テキストエリアがわずかに揺れる） */
  pulse(velocity: number) {
    if (!this.o.getVisualsEnabled()) return;
    const app = this.o.app;
    app.style.setProperty('--hit-strength', velocity.toFixed(2));
    app.classList.remove('fx-hit');
    // 再トリガーのため reflow
    void app.offsetWidth;
    app.classList.add('fx-hit');
    if (this.hitTimer) clearTimeout(this.hitTimer);
    this.hitTimer = window.setTimeout(() => app.classList.remove('fx-hit'), 160);
  }

  /** Enter 直後 */
  start(text: string, delayMs: number) {
    this.clear();
    const app = this.o.app;
    const speed = Math.max(0.25, this.o.getSpeed());
    app.style.setProperty('--fx', (1 / speed).toFixed(3));

    this.o.bannerText.textContent = text.trim().length > 0 ? text : '（無言）';
    this.o.banner.dataset.size = messageSizeClass(text);

    const run = () => {
      if (!this.o.getVisualsEnabled()) {
        app.classList.add('fx-novisual');
        app.classList.add('fx-stage');
        app.classList.add('fx-settled');
        return;
      }
      app.classList.remove('fx-novisual');
      // 0ms: フラッシュとシェイク
      app.classList.add('fx-flash', 'fx-shake');
      // 100ms: ステージに切り替え（CSS 側でパーツごとの遅延を持つ）
      this.later(() => app.classList.add('fx-stage'), 100);
      this.later(() => app.classList.remove('fx-flash'), 260);
      this.later(() => app.classList.remove('fx-shake'), 420);
      // 2.4s: ボタン類を出す
      this.later(() => app.classList.add('fx-controls'), 2400);
      // 4.2s: 落ち着いた状態
      this.later(() => app.classList.add('fx-settled'), 4200);
    };
    if (delayMs > 0) this.timers.push(window.setTimeout(run, delayMs));
    else run();
  }

  /** 初期状態へ */
  reset() {
    this.clear();
    const app = this.o.app;
    app.classList.remove('fx-flash', 'fx-shake', 'fx-stage', 'fx-controls', 'fx-settled', 'fx-hit', 'fx-novisual');
    this.o.bannerText.textContent = '';
  }

  private clear() {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }
}
