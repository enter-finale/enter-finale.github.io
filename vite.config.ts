import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * 公開設定（シェルの環境変数 or .env / .env.production）
 * - BASE_PATH : GitHub Pages のサブパス公開時に "/enter-finale/" のように指定
 * - SITE_URL  : OGP の絶対 URL 用（例: https://example.com/enter-finale/）
 *               未指定なら og:image は相対パスになる（X のカードには絶対 URL が必要）
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = process.env.BASE_PATH ?? env.BASE_PATH ?? '/';
  const siteUrlRaw = process.env.SITE_URL ?? env.SITE_URL ?? '';
  const siteUrl = siteUrlRaw ? siteUrlRaw.replace(/\/?$/, '/') : '';

  /** index.html 内の __SITE_URL__ を置換する */
  const ogpPlugin = (): Plugin => ({
    name: 'enter-finale-ogp',
    transformIndexHtml(html) {
      return html.replace(/__SITE_URL__/g, siteUrl || base);
    },
  });

  return {
    base,
    plugins: [ogpPlugin()],
    build: {
      target: 'es2020',
      sourcemap: false,
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
    },
  };
});
