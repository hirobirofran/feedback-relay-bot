@AGENTS.md

# feedback-relay-bot — Claude への申し送り

## このプロジェクトは何か

食材管理アプリ（[food-inventory-app](https://github.com/hirobirofran/food-inventory-app)）への家族からのフィードバックを、LINE 経由でカジュアルに受け取り、AI 窓口が壁打ち・要件整形して GitHub Issue として起票する小型エージェント。

詳細は [docs/DESIGN.md](./docs/DESIGN.md) を参照。

オーナー: ひろゆきさん（個人開発。家族がフィードバック送信者、本人が開発者・レビュアー）。

## 技術スタック

- **ホスティング**: Vercel
- **フロントエンド / API**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **会話状態**: Upstash Redis (TTL 24h)
- **AI**: Gemini 2.5 Flash (AI Studio 無料枠)
- **LINE**: Messaging API（1 対 1 チャット）
- **GitHub**: Octokit (REST) + Fine-grained PAT

食材管理アプリと同じスタックを採用している。Gemini API や Vercel のハマりどころは食材管理アプリの `docs/KNOWLEDGE.md` を参照する価値がある。

## 現在の状態

- **Phase 0 完了**（2026-04-19）: Next.js 16 スキャフォールド、docs 骨組み、外部サービス全設定済み、Vercel 初回デプロイ成功
  - 本番 URL: <https://feedback-relay-bot.vercel.app/>
  - LINE / Upstash / Gemini / GitHub PAT / Vercel env いずれも投入済み
- Phase 1 未着手。Webhook 実装 → Gemini 整形 → GitHub 起票 の最小往復が次のゴール（[docs/DESIGN.md §10](./docs/DESIGN.md) の Phase 1 DoD 参照）
- 次にやること → `docs/TASKS.md` を参照

## 重要ルール

- `.env.local` と秘密情報（LINE Channel Secret / Access Token、GitHub PAT、Gemini API キー、Upstash トークン）は**絶対にコミットしない**
- `docs/` フォルダに詳細ドキュメントがある。`docs/DESIGN.md` が設計ソース・オブ・トゥルース
- 各セッション終了時に `docs/TASKS.md` と `docs/KNOWLEDGE.md` を更新する
- 家族レビュアー（カスタマー対応プロ）からのフィードバックは `docs/KNOWLEDGE.md` の「家族レビューからのフィードバック」欄に蓄積する

## 秘密情報・識別子の扱い（重要）

- **秘密情報**（パスワード・トークン・API キー・LINE Channel Secret）は Claude のチャットに絶対に貼らない／出力させない。ソースコードにハードコードもしない
- **環境固有の識別子**（LINE userId、GitHub PAT のサフィックス、Upstash URL など）も、秘密情報でなくても**リポジトリに含めない**。`.env.local` 等に置き、`.env.local.example` ではプレースホルダで示す
- 実行に必要な識別子はすべて環境変数で渡す
- Vercel の環境変数はダッシュボード UI から直接入力する（CLI stdin 経由はシェル履歴に残る）
- ホワイトリスト (`ALLOWED_LINE_USER_IDS`) と表示名マップ (`USER_DISPLAY_NAME_MAP`) は環境変数管理。リポジトリに実値を置かない

## ドキュメント構成

| ファイル | 内容 |
| --- | --- |
| `docs/DESIGN.md` | 設計ソース・オブ・トゥルース（§1〜§12 + 付録 A〜C） |
| `docs/VISION.md` | やりたいこと・ゴール・利用シーン |
| `docs/ARCHITECTURE.md` | 技術選定の理由・データ設計・コンポーネント責務 |
| `docs/TASKS.md` | タスク一覧・進捗・次にやること |
| `docs/KNOWLEDGE.md` | 気づき・ハマりポイント・家族レビューフィードバック・申し送り |
| `docs/SETUP.md` | 環境構築手順（LINE・Upstash・Gemini・GitHub PAT・Vercel） |
| `docs/WORKFLOW.md` | コミット粒度・メッセージ規約・ブランチ/PR 運用ルール（いつ commit・いつ branch を切るか） |

## 会話設計の初手ルール（Phase 1 着手時に守る）

家族（カスタマー対応プロ）レビューを想定。付録 A のシステムプロンプトに加え、Phase 1 実装時に以下を必ず入れる:

1. **初回メッセージは決め打ち**: 「こんにちは、食材管理アプリのフィードバック窓口です」と名乗る
2. **限界の自覚**: 3 ターン経っても整理できない場合は「このまま届けます」と引き取る
3. **エスカレーション導線**: ユーザーが苛立ちを示したら整形を諦めて会話ログそのまま起票する
