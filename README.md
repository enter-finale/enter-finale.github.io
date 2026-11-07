# ENTER FINALE — Enterでライブ終了

普通に文章を打っていたはずなのに、Enter を押すとロックバンドのライブがフィナーレを迎える Web アプリです。

- 文字を打つたびにスネア → タムのドラムフィルが鳴る（打鍵タイミングそのまま）。打鍵中はドラムのみ
- Enter（スマホは送信ボタン）でキック＋クラッシュ＋パワーコードが同時に鳴り、画面がライブステージに変わる
- 観客の歓声、ドラムセット・ギター・アンプの出現、照明
- 入力した文章はステージ上の電光掲示板に残る
- 「もう一度演奏する」で最初から

ログイン・インストール不要の完全静的サイト。入力した文章はどこにも送信・保存しません。

## 起動方法

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # 本番ビルド → dist/
npm run preview    # 本番ビルドのプレビュー
npm test           # 単体テスト (vitest)
npm run typecheck  # 型チェック
npm run og         # OGP 画像を再生成 (scripts/og-image.svg → public/og-image.png)
```

Node.js 20 以上を推奨。

## 操作

| 操作 | 動作 |
|---|---|
| 文字キー | ドラム 1 打（スネア → タムのフィルを循環） |
| Backspace / Delete | 控えめなドラム 1 打 |
| Enter | フィナーレ |
| Shift + Enter | 文中の改行 |
| IME 変換中の Enter | 変換確定のみ（フィナーレにならない） |
| 送信ボタン | フィナーレ（スマホの確実な操作手段） |
| もう一度演奏する | 初期状態に戻す |
| 🔊 / スライダー | ミュート / マスター音量 |
| ⚙（右下） | 開発者向け設定 |
| URL に `?clean=1` | 操作 UI を全て隠す（画面収録用） |

文字入力で使うキー（R, F, H など）はショートカットとして横取りしていません。

## 音声ファイルの差し替え

`public/audio/` に以下のファイル名で置くだけで、次回ロード時から自動的に使われます。
無い・読めないファイルは Web Audio API の合成音に自動でフォールバックします（アプリは止まりません）。

| ファイル名 | 用途 |
|---|---|
| `snare-1.wav` / `snare-2.wav` | スネア（1 打ごとに交互に鳴る） |
| `tom-high.wav` | ハイタム |
| `tom-low.wav` | ロータム |
| `enter.wav` | Enter の「ジャーン」（キック・クラッシュ・ギターをまとめた 1 音、余韻込み） |
| `crowd-cheer.wav` | 観客の歓声（アプリ側で 0.3 秒フェードイン） |

詳しい推奨尺などは [public/audio/README.md](public/audio/README.md) を参照。
ファイル名を変えたい場合は `src/config.ts` の `SAMPLE_FILES` を編集します。
WAV 以外（MP3 / OGG / M4A）も `decodeAudioData` が対応していれば使えます。

各楽器の音量バランスは右下 ⚙ の設定パネルで調整できます（localStorage に保存）。初期値は `src/core/settings.ts` の `DEFAULT_SETTINGS`。

## ドラムパターン・演出の変更

- ドラムフィル: `src/core/drumPatterns.ts` の `PATTERNS` に追加すると設定パネルから選べます
- 打鍵速度 → 音量の対応: `src/audio/DrumEngine.ts` の `velocityFromInterval`
- フィナーレのタイムライン: `src/ui/FinaleAnimation.ts`（クラス付け外しのタイミング）と `src/style.css`（`calc(〇〇ms * var(--fx))` の部分）
- ステージの写真: `public/images/finale-*.webp`。`src/config.ts` の `FINALE_IMAGES` に並べた中から Enter のたびにランダムで 1 枚（直前と同じ写真は避ける）
- サービス名・共有テキスト: `src/config.ts`

## 公開（デプロイ）

静的サイトなので `dist/` をそのまま置けばどこでも動きます。

### 共通: OGP の URL

X のカードには `og:image` の**絶対 URL** が必要です。公開 URL が決まったら、ビルド時に `SITE_URL` を渡してください。

```bash
SITE_URL=https://example.com/ npm run build
```

`.env.example` をコピーして `.env.production` に書いても同じです（Vite が読み込みます）。未指定の場合は `og:image` が相対パスになり、X でカードが出ません。

### GitHub Pages

1. リポジトリを作成して push
2. Settings > Pages > Source を **GitHub Actions** にする
3. 同梱の [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) が `main` への push で自動ビルド＆デプロイします（`BASE_PATH` と `SITE_URL` はリポジトリ名から自動で組み立て）

手動でビルドする場合:

```bash
BASE_PATH=/<リポジトリ名>/ SITE_URL=https://<ユーザー名>.github.io/<リポジトリ名>/ npm run build
```

### Cloudflare Pages

1. Cloudflare Pages で Git リポジトリを接続
2. Build command: `npm run build`、Build output directory: `dist`
3. 環境変数に `SITE_URL=https://<project>.pages.dev/`（独自ドメインならそちら）を設定
4. `BASE_PATH` は不要（ルート公開）

### 独自ドメイン

- GitHub Pages: リポジトリの Settings > Pages > Custom domain で設定し、`BASE_PATH` を外して（`/`）`SITE_URL` を独自ドメインにしてビルド。`public/CNAME` にドメイン名を書いたファイルを置くとビルドに含まれます
- Cloudflare Pages: Custom domains で追加し、`SITE_URL` を差し替えて再デプロイ

## 技術構成

Vite + TypeScript（Vanilla、フレームワークなし）+ Web Audio API + SVG/CSS アニメーション。実行時の外部ライブラリは 0 です。

```
enter-finale/
├── index.html                 # OGP メタ、画面の骨組み
├── public/
│   ├── audio/                 # 音声素材置き場（README あり）
│   ├── og-image.png           # OGP 画像（npm run og で再生成）
│   └── favicon.svg
├── scripts/
│   ├── og-image.svg           # OGP 画像の元
│   └── generate-og.mjs
├── src/
│   ├── main.ts                # 配線
│   ├── config.ts              # 名前・共有テキスト・音声ファイル名
│   ├── style.css              # 見た目と演出アニメーション
│   ├── audio/
│   │   ├── AudioEngine.ts     # AudioContext / ロード / フォールバック / 再生
│   │   ├── DrumEngine.ts      # 打鍵 → ドラム 1 打
│   │   └── FallbackSynth.ts   # 素材が無いときの合成音
│   ├── core/
│   │   ├── PerformanceController.ts  # 状態機械 ready/typing/finale/finished
│   │   ├── inputClassifier.ts        # キー/IME/入力イベントの判定（純粋関数）
│   │   ├── InputHandler.ts           # textarea へのイベント配線
│   │   ├── drumPatterns.ts
│   │   └── settings.ts
│   └── ui/
│       ├── finaleImage.ts     # ステージ写真のランダム選択・先読み
│       ├── FinaleAnimation.ts # 演出タイムライン
│       ├── SettingsPanel.ts
└── tests/                     # vitest
```

### 設計メモ

- **発音**: すべて `AudioBufferSourceNode` で、同じ `AudioContext.currentTime` を指定して開始。フィナーレのキック・クラッシュ・ギターは同一時刻、歓声だけ 0.3 秒遅れ
- **マスターチェーン**: 各音 → マスターゲイン → `DynamicsCompressor`（リミッター）→ 出力。リバーブは `Convolver`（生成したインパルス応答）へのセンド
- **代替音源**: `OfflineAudioContext` で起動時にレンダリング。フィナーレのギターは完全周期のパワーコード波形をディストーション → キャビネット風フィルタに通したもの
- **IME**: Chrome/Mac (`isComposing`)、Windows (`keyCode 229` / `key='Process'`)、Safari/Firefox（`compositionend` 後に Enter の keydown が来る）の 3 パターンを個別にガード
- **二重発音防止**: keydown で鳴らした 60ms 以内の `beforeinput` は無視。スマホは keydown が `Unidentified` なので `beforeinput` 側だけが鳴る。ペースト・予測変換は 1 イベント 1 打
- **自動再生規制**: 最初の pointerdown / touchend / keydown で `AudioContext` を生成・resume。それでも止まっていれば「音を有効にする」ボタンを表示
- **ロード前の打鍵**: PC は入力欄が自動フォーカスなので、1 文字目の keydown が `AudioContext` 生成と音源ロードの開始を兼ねる。ロード完了前の打鍵は無音（落ちない）で、完了後の打鍵から鳴る
- **prefers-reduced-motion**: シェイクと継続アニメーションを止め、フェードのみにする

## テスト結果

### 自動テスト（`npm test`、39 件すべて成功）

- キー判定: 通常 Enter / Shift+Enter / IME 変換中 Enter（Chrome・Windows・Safari 順序）/ 文字・空白・絵文字 / Backspace / 修飾キー単独 / auto-repeat / Ctrl・Cmd ショートカット / スマホの Unidentified
- 入力イベント判定: keydown 直後の二重発音防止 / ペースト 1 打 / スマホ改行キーのフィナーレ / 予測変換の連打防止 / 削除系
- ドラム: パターン循環 / 1 打鍵 1 打 / 速度 → 音量 / 揺らぎ / フィナーレ同時刻 / リセット
- 共有: URL 組み立て、入力文を含まない
- 状態機械: 打鍵はドラムのみ / Enter でギター・キック・クラッシュが同一時刻 / フィナーレ中の多重発火防止 / reset 後の 2 周目 / ロード前の打鍵

### ブラウザでの動作検証（Windows / Chromium 系の内蔵ブラウザ、代替音源）

確認済み:

- 初期画面がメール作成画面に見えること（ライト / ダーク両テーマ）
- 英字・日本語・記号・空白・Backspace で 1 打鍵 = 1 打（5 文字＋空白＋Backspace = 7 打、Shift 単独 = 0 打）
- ペースト（20 文字）= 1 打
- 打鍵中はドラムのみで、ギターは Enter のフィナーレでだけ鳴る（再演奏後の 2 周目も同じ）
- 合成イベントによる IME 3 パターンでフィナーレが発火しないこと、確定後の Enter で発火すること
- Shift+Enter で改行が入ること
- Enter / 送信ボタン / 空欄 Enter でフィナーレ
- フィナーレ中の追加 Enter は無視
- ステージ、楽器の出現、観客、照明、文章バナー（短文〜480 文字）、ボタン表示
- もう一度演奏する → 初期状態（テキスト空、音声ノード 0）。5 回連続でも正常
- 375×812（スマホ縦）、812×375（横）、デスクトップ幅のレイアウト
- `?clean=1` で UI 非表示
- 本番ビルド成功（JS 42KB / CSS 14KB）

### 未検証・未実装（実機が無いため）

- **macOS Chrome / Safari の実 IME 入力**（合成イベントでの検証のみ。実機で `compositionend` と Enter の順序を必ず確認してください）
- **iPhone Safari / Chrome、Android Chrome の実機**（ソフトウェアキーボードの keydown / beforeinput の挙動、Safari の音声再生制限、Safe Area、キーボード表示中のレイアウト）
- 実際の音の聞こえ方（内蔵ブラウザでは音声出力を聴けないため、ノードの生成とタイミングのみ確認。音量バランスは作者の環境で設定パネルから調整してください）
- 作者制作の WAV 素材での動作（フォールバックのみ確認）
- GitHub Pages / Cloudflare Pages への実デプロイ、X でのカード表示

## ライセンス

未設定（公開前に決めてください）。
