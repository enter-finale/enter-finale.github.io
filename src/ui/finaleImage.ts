/**
 * フィナーレで表示するステージ写真の選択と先読み。
 * 写真そのものは public/images/ にあり、一覧は config.ts の FINALE_IMAGES。
 */
import { FINALE_IMAGES } from '../config';

/**
 * 次に表示する写真の番号を返す（純粋関数・テスト対象）。
 * prev（直前の番号。初回は -1）と同じ番号は避ける。写真が 1 枚しか無いときだけ同じ番号を返す。
 */
export function pickFinaleImage(prev: number, rand: () => number = Math.random, count: number = FINALE_IMAGES.length): number {
  if (count <= 0) return -1;
  if (count === 1) return 0;
  const hasPrev = prev >= 0 && prev < count;
  if (!hasPrev) return Math.min(count - 1, Math.floor(rand() * count));
  // prev を除いた count-1 枚から選び、prev 以上なら 1 つずらして prev を飛ばす
  let i = Math.min(count - 2, Math.floor(rand() * (count - 1)));
  if (i >= prev) i++;
  return i;
}

export function finaleImageUrl(index: number, baseUrl = import.meta.env.BASE_URL): string {
  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  return `${base}images/${FINALE_IMAGES[index]}`;
}

/** 起動後に全写真を裏で読み込んでおく（Enter の瞬間に真っ暗にならないように） */
export function preloadFinaleImages() {
  const run = () => {
    for (let i = 0; i < FINALE_IMAGES.length; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = finaleImageUrl(i);
    }
  };
  const w = window as unknown as { requestIdleCallback?: (cb: () => void) => void };
  if (w.requestIdleCallback) w.requestIdleCallback(run);
  else window.setTimeout(run, 300);
}
