# 思考のデッサン会｜個人用自己紹介カード生成エージェント

ワークショップ参加者と5〜7分の短時間インタビューを行い、自己紹介カードとファシリテーター集約用メモを生成するWebアプリです。

## 機能

- 全6問のインタビュー進行（クイックリプライ付き）
- 各問の深掘り判断（ルールベース、最大1回）
- お試しモード
- 自己紹介カード + ファシリテーター集約用メモのAI生成
- Canvas風の右パネル表示・Markdownダウンロード

## 必要な環境

- Node.js 20+
- Anthropic APIキー（カード生成用）

## セットアップ

```bash
cd 思考のデッサン
npm install
cp .env.example .env
# .env に ANTHROPIC_API_KEY を設定
```

## 開発

APIサーバーとフロントを別々に起動します。

```bash
# ターミナル1: API（ポート 8787）
npm run dev:api

# ターミナル2: フロント（Vite が /api をプロキシ）
npm run dev
```

ブラウザで http://localhost:5173 を開きます。

## 本番ビルド・起動

```bash
npm run build
npm start
```

http://localhost:8787 でフロント＋APIが同一ポートで動作します。

## Docker

```bash
docker build -t shikou-no-dessan .
docker run -p 8080:8080 -e ANTHROPIC_API_KEY=sk-ant-... shikou-no-dessan
```

## GitHub への公開

### 1. リポジトリ作成

```bash
cd 思考のデッサン
git init
git add .
git commit -m "Initial commit: 思考のデッサン会 自己紹介カード生成アプリ"
```

GitHubで新規リポジトリを作成し、pushします。

```bash
git remote add origin https://github.com/YOUR_USER/shikou-no-dessan.git
git branch -M main
git push -u origin main
```

### 2. デプロイ（Railway / Render / Fly.io など）

**共通手順**

1. GitHubリポジトリを接続
2. 環境変数 `ANTHROPIC_API_KEY` を設定
3. ビルドコマンド: `npm install && npm run build`
4. 起動コマンド: `npm start`
5. ポート: `8787` またはプラットフォームの `PORT` 変数

**Render の例**

- Service Type: Web Service
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment: `ANTHROPIC_API_KEY`

**Railway の例**

- Dockerfile または Nixpacks で自動検出
- Variables に `ANTHROPIC_API_KEY` を追加

### 3. Vercel（フロントのみの場合）

APIサーバーが必要なため、Vercel Serverless への移植が別途必要です。フルスタックデプロイは Railway / Render / Docker ホスティングを推奨します。

## プロジェクト構成

```
思考のデッサン/
├── agent/
│   └── generation-system.txt   # カード生成用システムプロンプト
├── server/
│   └── index.mjs               # Express API
├── src/
│   ├── components/
│   │   ├── InterviewChat.tsx   # インタビューUI
│   │   └── CanvasPanel.tsx     # カード表示パネル
│   ├── lib/
│   │   ├── interviewConfig.ts  # 質問・選択肢定義
│   │   ├── interviewEngine.ts  # 状態機械
│   │   └── api.ts
│   └── App.tsx
├── Dockerfile
└── package.json
```

## セキュリティ

- APIキーはサーバー側の環境変数のみ。参加者には配布しない
- 参加者データの永続保存は行わない（1セッション完結型）

## ライセンス

ワークショップ用途。利用条件は主催者に準じます。
