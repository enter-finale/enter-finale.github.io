import { describe, expect, it } from 'vitest';
import { classifyBeforeInput, classifyKeydown, messageSizeClass, type InputContext, type KeyContext } from '../src/core/inputClassifier';

const idle: KeyContext = { composing: false, recentCompositionEnd: false };
const composing: KeyContext = { composing: true, recentCompositionEnd: false };

describe('classifyKeydown', () => {
  it('通常の Enter はフィナーレ', () => {
    expect(classifyKeydown({ key: 'Enter', code: 'Enter', keyCode: 13 }, idle)).toBe('finale');
    expect(classifyKeydown({ key: 'Enter', code: 'NumpadEnter', keyCode: 13 }, idle)).toBe('finale');
  });

  it('Shift+Enter は改行', () => {
    expect(classifyKeydown({ key: 'Enter', code: 'Enter', shiftKey: true }, idle)).toBe('newline');
  });

  it('IME 変換中の Enter (Chrome/Mac: isComposing) は無視', () => {
    expect(classifyKeydown({ key: 'Enter', code: 'Enter', isComposing: true }, idle)).toBe('ignore');
  });

  it('IME 変換中の Enter (Windows: keyCode 229 / Process) は無視', () => {
    expect(classifyKeydown({ key: 'Process', code: 'Enter', keyCode: 229 }, idle)).toBe('ignore');
  });

  it('compositionstart〜end の間の Enter は無視', () => {
    expect(classifyKeydown({ key: 'Enter', code: 'Enter' }, composing)).toBe('ignore');
  });

  it('compositionend 直後の Enter (Safari/Firefox) は無視', () => {
    expect(classifyKeydown({ key: 'Enter', code: 'Enter' }, { composing: false, recentCompositionEnd: true })).toBe('ignore');
  });

  it('確定後に改めて押した Enter はフィナーレ', () => {
    expect(classifyKeydown({ key: 'Enter', code: 'Enter', isComposing: false }, idle)).toBe('finale');
  });

  it('文字キーは打撃（英字・日本語・記号・空白・絵文字）', () => {
    expect(classifyKeydown({ key: 'a', code: 'KeyA' }, idle)).toBe('hit');
    expect(classifyKeydown({ key: 'あ', code: 'KeyA' }, idle)).toBe('hit');
    expect(classifyKeydown({ key: '!', code: 'Digit1', shiftKey: true }, idle)).toBe('hit');
    expect(classifyKeydown({ key: ' ', code: 'Space' }, idle)).toBe('hit');
    expect(classifyKeydown({ key: '😀' }, idle)).toBe('hit');
  });

  it('IME 変換中の文字キーも打撃', () => {
    expect(classifyKeydown({ key: 'k', code: 'KeyK', isComposing: true }, idle)).toBe('hit');
    expect(classifyKeydown({ key: 'Process', code: 'KeyK', keyCode: 229 }, idle)).toBe('hit');
    expect(classifyKeydown({ key: ' ', code: 'Space', isComposing: true }, idle)).toBe('hit');
  });

  it('Backspace / Delete は控えめな打撃', () => {
    expect(classifyKeydown({ key: 'Backspace', code: 'Backspace' }, idle)).toBe('softHit');
    expect(classifyKeydown({ key: 'Delete', code: 'Delete' }, idle)).toBe('softHit');
  });

  it('修飾キー単独・矢印・Tab・Esc・ファンクションキーは鳴らさない', () => {
    for (const key of ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape', 'ArrowLeft', 'ArrowDown', 'Home', 'F5']) {
      expect(classifyKeydown({ key }, idle), key).toBe('ignore');
    }
    expect(classifyKeydown({ key: 'Process', code: 'ShiftLeft', keyCode: 229 }, idle)).toBe('ignore');
    expect(classifyKeydown({ key: 'Process', code: 'ArrowDown', keyCode: 229 }, idle)).toBe('ignore');
  });

  it('キー長押しの auto-repeat は鳴らさない', () => {
    expect(classifyKeydown({ key: 'a', code: 'KeyA', repeat: true }, idle)).toBe('ignore');
    expect(classifyKeydown({ key: 'Enter', code: 'Enter', repeat: true }, idle)).toBe('ignore');
  });

  it('Ctrl/Cmd 付きショートカットは鳴らさない（ペーストは beforeinput 側で 1 打）', () => {
    expect(classifyKeydown({ key: 'v', code: 'KeyV', ctrlKey: true }, idle)).toBe('ignore');
    expect(classifyKeydown({ key: 'a', code: 'KeyA', metaKey: true }, idle)).toBe('ignore');
  });

  it('スマホの Unidentified キーは keydown では鳴らさない', () => {
    expect(classifyKeydown({ key: 'Unidentified', keyCode: 229 }, idle)).toBe('ignore');
  });
});

const base: InputContext = {
  keydownHitRecently: false,
  composing: false,
  recentCompositionEnd: false,
  allowLineBreak: false,
  prevCompositionLength: 0,
};

describe('classifyBeforeInput', () => {
  it('keydown で鳴らした直後の insertText は二重発音しない', () => {
    expect(classifyBeforeInput('insertText', 'a', { ...base, keydownHitRecently: true })).toBe('ignore');
    expect(classifyBeforeInput('insertText', 'a', base)).toBe('hit');
  });

  it('ペーストは文字数に関係なく 1 打', () => {
    expect(classifyBeforeInput('insertFromPaste', 'とても長い文章をたくさん貼り付けました', base)).toBe('hit');
  });

  it('スマホの改行キー（keydown 無し）はフィナーレ', () => {
    expect(classifyBeforeInput('insertLineBreak', null, base)).toBe('finale');
    expect(classifyBeforeInput('insertParagraph', null, base)).toBe('finale');
  });

  it('Shift+Enter の改行は既定動作を通す', () => {
    expect(classifyBeforeInput('insertLineBreak', null, { ...base, allowLineBreak: true })).toBe('allow');
  });

  it('IME 変換中 / 確定直後の改行はフィナーレにしない', () => {
    expect(classifyBeforeInput('insertLineBreak', null, { ...base, composing: true })).toBe('allow');
    expect(classifyBeforeInput('insertLineBreak', null, { ...base, recentCompositionEnd: true })).toBe('allow');
  });

  it('予測変換で複数文字が一度に入っても 1 打、減ったら控えめ、同じなら無音', () => {
    expect(classifyBeforeInput('insertCompositionText', 'おつかれさま', { ...base, prevCompositionLength: 2 })).toBe('hit');
    expect(classifyBeforeInput('insertCompositionText', 'お', { ...base, prevCompositionLength: 2 })).toBe('softHit');
    expect(classifyBeforeInput('insertCompositionText', 'おつ', { ...base, prevCompositionLength: 2 })).toBe('ignore');
  });

  it('削除系は控えめな打撃', () => {
    expect(classifyBeforeInput('deleteContentBackward', null, base)).toBe('softHit');
    expect(classifyBeforeInput('deleteByCut', null, base)).toBe('softHit');
    expect(classifyBeforeInput('deleteContentBackward', null, { ...base, keydownHitRecently: true })).toBe('ignore');
  });

  it('未知の inputType は無視', () => {
    expect(classifyBeforeInput('formatBold', null, base)).toBe('ignore');
  });
});

describe('messageSizeClass', () => {
  it('文章の長さで段階的に小さくなる', () => {
    expect(messageSizeClass('')).toBe('xl');
    expect(messageSizeClass('誠に申し訳ございません。')).toBe('xl');
    expect(messageSizeClass('あ'.repeat(20))).toBe('lg');
    expect(messageSizeClass('あ'.repeat(60))).toBe('md');
    expect(messageSizeClass('あ'.repeat(150))).toBe('sm');
    expect(messageSizeClass('あ'.repeat(500))).toBe('xs');
  });
});
