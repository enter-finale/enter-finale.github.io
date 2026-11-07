/**
 * textarea に貼り付いて、キー/入力イベントを「打撃」「フィナーレ」に変換して通知する。
 * 判定ロジック自体は inputClassifier.ts（純粋関数）に置いている。
 */
import { classifyBeforeInput, classifyKeydown } from './inputClassifier';

export interface InputHandlerCallbacks {
  onHit: (soft: boolean) => void;
  onFinale: () => void;
  /** 音声の有効化などに使う。すべてのユーザー操作で呼ばれる */
  onGesture: () => void;
}

const KEYDOWN_DEDUPE_MS = 60;
const COMPOSITION_END_GUARD_MS = 150;

export class InputHandler {
  private composing = false;
  private compositionEndAt = -Infinity;
  private lastKeydownHitAt = -Infinity;
  private allowLineBreakUntil = -Infinity;
  private prevCompositionLength = 0;
  private enabled = true;
  private disposers: Array<() => void> = [];

  constructor(
    private textarea: HTMLTextAreaElement,
    private cb: InputHandlerCallbacks,
  ) {
    this.bind();
  }

  /** フィナーレ中は打鍵しても鳴らさない */
  setEnabled(v: boolean) {
    this.enabled = v;
  }

  private now() {
    return performance.now();
  }

  private get recentCompositionEnd(): boolean {
    return this.now() - this.compositionEndAt < COMPOSITION_END_GUARD_MS;
  }

  private bind() {
    const ta = this.textarea;
    const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
      ta.addEventListener(type, fn);
      this.disposers.push(() => ta.removeEventListener(type, fn));
    };

    on('compositionstart', () => {
      this.composing = true;
      this.prevCompositionLength = 0;
    });
    on('compositionend', () => {
      this.composing = false;
      this.compositionEndAt = this.now();
      this.prevCompositionLength = 0;
    });

    on('keydown', (e) => {
      this.cb.onGesture();
      const action = classifyKeydown(e, {
        composing: this.composing,
        recentCompositionEnd: this.recentCompositionEnd,
      });
      switch (action) {
        case 'finale':
          e.preventDefault();
          if (this.enabled) this.cb.onFinale();
          break;
        case 'newline':
          this.allowLineBreakUntil = this.now() + KEYDOWN_DEDUPE_MS;
          break;
        case 'hit':
        case 'softHit':
          this.lastKeydownHitAt = this.now();
          if (this.enabled) this.cb.onHit(action === 'softHit');
          break;
        case 'ignore':
          break;
      }
    });

    on('keyup', () => {
      // 確定 Enter の keyup が来たら compositionend ガードを解除してよい
      if (this.recentCompositionEnd) this.compositionEndAt = -Infinity;
    });

    on('beforeinput', (e) => {
      const ev = e as InputEvent;
      const t = this.now();
      const action = classifyBeforeInput(ev.inputType, ev.data, {
        keydownHitRecently: t - this.lastKeydownHitAt < KEYDOWN_DEDUPE_MS,
        composing: this.composing || ev.isComposing,
        recentCompositionEnd: this.recentCompositionEnd,
        allowLineBreak: t < this.allowLineBreakUntil,
        prevCompositionLength: this.prevCompositionLength,
      });
      if (ev.inputType === 'insertCompositionText') {
        this.prevCompositionLength = ev.data ? [...ev.data].length : 0;
      }
      switch (action) {
        case 'finale':
          e.preventDefault();
          this.cb.onGesture();
          if (this.enabled) this.cb.onFinale();
          break;
        case 'hit':
        case 'softHit':
          this.cb.onGesture();
          if (this.enabled) this.cb.onHit(action === 'softHit');
          break;
        case 'allow':
        case 'ignore':
          break;
      }
    });

    // beforeinput 非対応の古い環境向け保険: input イベントで最低限鳴らす
    if (!('InputEvent' in window) || !('inputType' in InputEvent.prototype)) {
      on('input', () => {
        if (this.now() - this.lastKeydownHitAt < KEYDOWN_DEDUPE_MS) return;
        this.cb.onGesture();
        if (this.enabled) this.cb.onHit(false);
      });
    }

    on('pointerdown', () => this.cb.onGesture());
  }

  dispose() {
    for (const d of this.disposers) d();
    this.disposers = [];
  }
}
