import { defineConfig, loadEnv } from 'vite';

/**
 * 公開設定（シェルの環境変数 or .env / .env.production）
 * - BASE_PATH : GitHub Pages のサブパス公開時に "/enter-finale/" のように指定。ルート公開なら不要
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = process.env.BASE_PATH ?? env.BASE_PATH ?? '/';

  return {
    base,
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
