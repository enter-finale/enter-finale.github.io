/**
 * X への共有。入力した文章は含めない。
 * URL は固定のダミーではなく、実際に開いているページから組み立てる。
 */
import { SHARE_HASHTAGS, SHARE_TEXT } from '../config';

/** 共有用のページ URL（クエリやハッシュ、index.html を除いたもの） */
export function getShareUrl(loc: { origin: string; pathname: string } = window.location): string {
  let path = loc.pathname.replace(/index\.html$/, '');
  if (!path.endsWith('/')) path += '/';
  return loc.origin + path;
}

export function buildTweetIntentUrl(pageUrl: string, text = SHARE_TEXT, hashtags = SHARE_HASHTAGS): string {
  const params = new URLSearchParams();
  params.set('text', text);
  params.set('url', pageUrl);
  if (hashtags.length > 0) params.set('hashtags', hashtags.join(','));
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function openShare() {
  const url = buildTweetIntentUrl(getShareUrl());
  window.open(url, '_blank', 'noopener,noreferrer');
}
