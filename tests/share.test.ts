import { describe, expect, it } from 'vitest';
import { buildTweetIntentUrl, getShareUrl } from '../src/ui/share';

describe('share', () => {
  it('共有 URL は現在のページから組み立て、index.html とクエリを含めない', () => {
    expect(getShareUrl({ origin: 'https://example.com', pathname: '/' })).toBe('https://example.com/');
    expect(getShareUrl({ origin: 'https://user.github.io', pathname: '/enter-finale/' })).toBe('https://user.github.io/enter-finale/');
    expect(getShareUrl({ origin: 'https://user.github.io', pathname: '/enter-finale/index.html' })).toBe('https://user.github.io/enter-finale/');
  });

  it('intent URL に文章・URL・ハッシュタグが入り、入力文は含まれない', () => {
    const url = buildTweetIntentUrl('https://example.com/', '文章を打ってEnter押したらライブ終わったwww 🥁🎸', ['ENTERFINALE']);
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe('https://twitter.com/intent/tweet');
    expect(u.searchParams.get('text')).toContain('ライブ終わった');
    expect(u.searchParams.get('url')).toBe('https://example.com/');
    expect(u.searchParams.get('hashtags')).toBe('ENTERFINALE');
    expect(url).not.toContain('誠に申し訳');
  });
});
