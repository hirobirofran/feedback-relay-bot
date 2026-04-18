# feedback-relay-bot

家族向け LINE Bot で、食材管理アプリ [food-inventory-app](https://github.com/hirobirofran/food-inventory-app) への要望や不具合報告をカジュアルに受け取り、AI が壁打ち・整形して GitHub Issue として起票する小型エージェント。

## 動機

食材管理アプリを家族に使ってもらうにあたり、「冷蔵庫のボタン押しにくい」みたいな一言フィードバックをもらいたい。でも GitHub Issue を直接書いてもらうのは敷居が高すぎる。AI 窓口が壁打ち相手として情報を引き出し、整形してから起票する仕組みで橋渡しする。

## アーキテクチャ

LINE Messaging API → Vercel (Next.js 16 API Route) → Upstash Redis (会話状態) ↔ Gemini 2.5 Flash (整形) → GitHub Issues API (起票)

設計の詳細は [docs/DESIGN.md](./docs/DESIGN.md) を参照。

## 現在の状態

- **Phase 0**: スキャフォールド完了（本コミット）。外部サービス設定は未着手
- **Phase 1**: 未着手（Webhook 受信 → Gemini 整形 → GitHub 起票の一往復）
- **Phase 2 以降**: [docs/TASKS.md](./docs/TASKS.md) 参照

## 開発

```bash
npm install
npm run dev
```

`.env.local` に必要な環境変数を設定する。雛形は [.env.local.example](./.env.local.example) を参照。

## ライセンス

個人プロジェクト。外部公開・再利用は想定していない。
