# 🚶‍♂️ お散歩アシスタント

目標歩数や時間に合わせて、現在地から**最適な散歩ルート**を自動生成するWebアプリケーションです。

![ライトモード](https://img.shields.io/badge/theme-Light-f8fafc?style=flat-square)
![ダークモード](https://img.shields.io/badge/theme-Dark-0f172a?style=flat-square)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript)

## ✨ 特徴

- **ルート自動生成** — 歩数 or 時間を指定するだけで円状のお散歩ルートを作成
- **主要道路を優先** — 国道・県道などの大きい道を優先ルーティング（山道回避）
- **リアルタイム追従** — GPSで現在地をトラッキングし、通過済み/未到達のルートを色分け表示
- **ダークモード対応** — システム設定連動 + 手動切替。地図タイルも暗色に変更
- **ガラスモーフィズムUI** — マップ上に透過パネルをオーバーレイ表示

## 🔧 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フロントエンド | React 19 + Vite 8 + TypeScript |
| スタイリング | Tailwind CSS v4 |
| マップ | Leaflet + React-Leaflet（OpenStreetMap） |
| ルーティング | OSRM (Open Source Routing Machine) 公開API |
| 位置情報 | Geolocation API |

## 🚀 ローカル開発

```bash
# リポジトリのクローン
git clone https://github.com/<your-username>/OSANPOAssistant.git
cd OSANPOAssistant

# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで http://localhost:5173/ を開いてください。

## 📦 デプロイ（GitHub Pages）

このアプリは**GitHub Pages**で静的サイトとして公開できます。

### 手順

#### 1. `vite.config.ts` の `base` を設定

リポジトリ名に合わせて `base` を設定します（例：リポジトリ名が `OSANPOAssistant` の場合）：

```ts
// vite.config.ts
export default defineConfig({
  base: '/OSANPOAssistant/',
  // ...
})
```

#### 2. GitHub Actions でデプロイ

`.github/workflows/deploy.yml` を作成して以下を記述：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ['main']

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

#### 3. GitHub の設定

1. リポジトリの **Settings** → **Pages** を開く
2. **Source** を `GitHub Actions` に設定
3. `main` ブランチに push すると自動デプロイされる

公開URL: `https://<your-username>.github.io/OSANPOAssistant/`

### 代替：Vercel でデプロイ

1. [Vercel](https://vercel.com) に GitHub アカウントでログイン
2. 「New Project」からリポジトリをインポート
3. 設定はデフォルトのままで「Deploy」をクリック

> Vercel の場合は `base` の設定変更は不要です。

## 📝 注意事項

- **位置情報の許可**が必要です（ブラウザが許可を求めます）
- OSRM 公開デモAPIは帯域制限があるため、大量リクエスト時にエラーが出る場合があります
- HTTPS環境でないとGeolocation APIが動作しないため、**GitHub Pages や Vercel 等のHTTPS環境**での利用を推奨します

## 📄 ライセンス

MIT
