/**
 * キーボード / 入力イベントを「何をすべきか」に分類する純粋関数群。
 * DOM に依存しないので単体テストできる。
 *
 * 判定の方針:
 * - PC は keydown を打撃トリガーにする
 * - IME 変換中の Enter は確定なので絶対にフィナーレにしない
 * - keydown で鳴らした直後の beforeinput は二重発音させない
 * - keydown が取れない環境（スマホ）では beforeinput で鳴らす
 */

export type KeyAction = 'finale' | 'newline' | 'hit' | 'softHit' | 'ignore';

export interface KeyLike {
  key: string;
  code?: string;
  keyCode?: number;
  isComposing?: boolean;
  repeat?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

export interface KeyContext {
  /** compositionstart〜compositionend の間 */
  composing: boolean;
  /** compositionend の直後（Safari / Firefox で確定 Enter の keydown が後から来るケースの保護） */
  recentCompositionEnd: boolean;
}

const NON_SOUNDING_KEYS = new Set([
  'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Home', 'End', 'PageUp', 'PageDown', 'Insert',
  'NumLock', 'ScrollLock', 'ContextMenu', 'Fn', 'FnLock',
  'Unidentified', 'Hyper', 'Super', 'OS', 'AltGraph', 'Eisu',
  'KanaMode', 'Hiragana', 'Katakana', 'Romaji', 'Convert', 'NonConvert', 'HiraganaKatakana', 'Zenkaku', 'Hankaku', 'ZenkakuHankaku', 'Alphanumeric', 'Lang1', 'Lang2',
]);

const NON_SOUNDING_CODES = new Set([
  'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight',
  'CapsLock', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Home', 'End', 'PageUp', 'PageDown', 'Insert', 'NumLock', 'ScrollLock', 'ContextMenu',
  'Lang1', 'Lang2', 'KanaMode', 'Convert', 'NonConvert',
]);

export function isEnterKey(e: KeyLike): boolean {
  return e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13;
}

export function isComposingKey(e: KeyLike, ctx: KeyContext): boolean {
  return Boolean(e.isComposing) || e.keyCode === 229 || ctx.composing;
}

/** keydown をどう扱うか */
export function classifyKeydown(e: KeyLike, ctx: KeyContext): KeyAction {
  if (e.repeat) return 'ignore';
  const composing = isComposingKey(e, ctx);

  if (isEnterKey(e)) {
    // IME の確定 Enter。Chrome/Mac は isComposing=true、Windows は keyCode 229 で来る
    if (composing) return 'ignore';
    // Safari / Firefox: compositionend の後に isComposing=false の Enter が来ることがある
    if (ctx.recentCompositionEnd) return 'ignore';
    if (e.shiftKey) return 'newline';
    if (e.ctrlKey || e.metaKey || e.altKey) return 'finale';
    return 'finale';
  }

  // ショートカット（Cmd+A, Ctrl+V など）は鳴らさない。ペーストは beforeinput 側で 1 打鳴る
  if (e.ctrlKey || e.metaKey) return 'ignore';

  if (e.key === 'Backspace' || e.key === 'Delete') return 'softHit';
  if (e.code === 'Backspace' || e.code === 'Delete') return 'softHit';

  if (e.code && NON_SOUNDING_CODES.has(e.code)) return 'ignore';
  if (e.key && NON_SOUNDING_KEYS.has(e.key) && e.key !== 'Unidentified') return 'ignore';
  if (e.key && e.key.startsWith('F') && /^F\d{1,2}$/.test(e.key)) return 'ignore';

  // 'Unidentified' はスマホの仮想キーボード。input イベント側で鳴らす
  if (e.key === 'Unidentified' || e.key === '') return 'ignore';

  // 'Process' は Windows IME 変換中のキー、'Dead' はアクセント合成キー。どちらも打鍵
  if (e.key === 'Process' || e.key === 'Dead') return 'hit';

  // 1 文字（空白・記号・絵文字も含む）
  if ([...e.key].length === 1) return 'hit';

  // IME 変換中の未知キー
  if (composing) return 'hit';

  return 'ignore';
}

export type InputAction = 'finale' | 'allow' | 'hit' | 'softHit' | 'ignore';

export interface InputContext {
  /** 直前の keydown ですでに鳴らした（二重発音防止） */
  keydownHitRecently: boolean;
  composing: boolean;
  recentCompositionEnd: boolean;
  /** Shift+Enter の keydown 直後で、改行を許可すべき */
  allowLineBreak: boolean;
  /** 直前の insertCompositionText の文字数（予測変換の連打防止） */
  prevCompositionLength: number;
}

/**
 * beforeinput をどう扱うか。
 * 'finale' のときだけ preventDefault する。'allow' は既定動作を通して鳴らさない。
 */
export function classifyBeforeInput(inputType: string, data: string | null, ctx: InputContext): InputAction {
  switch (inputType) {
    case 'insertLineBreak':
    case 'insertParagraph':
      if (ctx.allowLineBreak) return 'allow';
      if (ctx.composing || ctx.recentCompositionEnd) return 'allow';
      return 'finale';

    case 'insertFromPaste':
    case 'insertFromDrop':
    case 'insertFromYank':
      // 大量の文字が入っても 1 打だけ
      return ctx.keydownHitRecently ? 'ignore' : 'hit';

    case 'insertCompositionText': {
      if (ctx.keydownHitRecently) return 'ignore';
      const len = data ? [...data].length : 0;
      if (len > ctx.prevCompositionLength) return 'hit';
      if (len < ctx.prevCompositionLength) return 'softHit';
      return 'ignore';
    }

    case 'insertText':
    case 'insertReplacementText':
    case 'insertTranspose':
      return ctx.keydownHitRecently ? 'ignore' : 'hit';

    case 'deleteContentBackward':
    case 'deleteContentForward':
    case 'deleteWordBackward':
    case 'deleteWordForward':
    case 'deleteSoftLineBackward':
    case 'deleteSoftLineForward':
    case 'deleteHardLineBackward':
    case 'deleteHardLineForward':
    case 'deleteByCut':
    case 'deleteByDrag':
      return ctx.keydownHitRecently ? 'ignore' : 'softHit';

    default:
      return 'ignore';
  }
}

/** 表示用：文章の長さからバナーの文字サイズ区分を決める */
export function messageSizeClass(text: string): 'xl' | 'lg' | 'md' | 'sm' | 'xs' {
  const n = [...text.trim()].length;
  if (n === 0) return 'xl';
  if (n <= 14) return 'xl';
  if (n <= 32) return 'lg';
  if (n <= 80) return 'md';
  if (n <= 200) return 'sm';
  return 'xs';
}
