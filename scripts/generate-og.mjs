/**
 * scripts/og-image.svg を public/og-image.png (1200x630) にレンダリングする。
 * 実行: npm run og
 * 文字のフォントはシステムフォントを使うため、環境によって見た目が少し変わります。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const here = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(here, 'og-image.svg');
const outPath = resolve(here, '..', 'public', 'og-image.png');

const svg = readFileSync(svgPath, 'utf8');
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  font: {
    loadSystemFonts: true,
    defaultFontFamily: 'Arial',
  },
});
const png = resvg.render().asPng();
writeFileSync(outPath, png);
console.log(`wrote ${outPath} (${png.length} bytes)`);
