# タスク一覧

> 本ファイルは骨組み。内容は [DESIGN.md](./DESIGN.md) §6, §10 を起点に Phase 1 着手時に転記する。

## Phase 0: 外部サービス設定（進行中）

### ✅ 完了（Phase 0）

- [x] リポジトリ初期構成（Next.js 16 スキャフォールド + docs/ 骨組み）
- [x] GitHub リポジトリ登録（main ブランチ、public）
- [x] Gemini AI Studio API キー取得（食材管理アプリと別プロジェクト・別キー、2026-04-19）
- [x] GitHub Fine-grained PAT 発行（2026-04-19 / **期限 2027-04-19**、`food-inventory-app` の Issues Read/Write のみ）
- [x] Upstash Redis インスタンス作成（2026-04-19、Regional AP-NORTHEAST-1 Tokyo、無料枠、SET/GET 疎通確認済み）
- [x] LINE 公式アカウント登録・Channel Secret/Access Token 取得（2026-04-19、アカウント名「食材アプリ 意見箱」、Provider `hirobirofran`、応答設定はあいさつ/応答 OFF、Webhook は Phase 1 で URL 設定と同時に ON 予定）
- [x] Vercel プロジェクト作成・環境変数投入・初回デプロイ成功（2026-04-19、本番 URL: <https://feedback-relay-bot.vercel.app/>、Deployment Protection Disabled、env 9 件全環境投入済み）

### 🔲 次にやること（Phase 0）

Phase 0 完了。次は Phase 1 実装（[DESIGN.md §10](./DESIGN.md) の Phase 1 DoD 参照）。

### 🔔 期限管理・定期作業

- [ ] **PAT 更新（次回期限: 2027-04-19）** — 1 週間前に Google カレンダー通知予定。手順は [docs/SETUP.md §5.3](./SETUP.md#53-更新手順期限切れが近づいたとき)

## Phase 1: 最小往復（進行中）

詳細は [DESIGN.md §10](./DESIGN.md) の Phase 1 Definition of Done を参照。

### ✅ 完了（Phase 1）

- [x] 依存パッケージ投入（2026-04-19、`@line/bot-sdk` `@upstash/redis` `@google/generative-ai` `@octokit/rest`）
- [x] LINE Webhook スケルトン（2026-04-19、[src/app/api/line/webhook/route.ts](../src/app/api/line/webhook/route.ts) に署名検証 + ホワイトリスト認証 + 常に 200 応答、GET ヘルスチェック付き。ローカル `npm run build` / `curl` 疎通確認済み。Vercel 本番反映・LINE Webhook URL 設定は未実施）
- [x] env ヘルパー作成（2026-04-19、[src/lib/env.ts](../src/lib/env.ts)）
- [x] Vercel 本番デプロイ + LINE Webhook URL 設定 + Verify 成功（2026-04-19、本番 `https://feedback-relay-bot.vercel.app/api/line/webhook`）
- [x] 初回 userId 回収 + `ALLOWED_LINE_USER_IDS` 投入 + 再デプロイ（2026-04-19、実機メッセージで `received authorized event` ログ確認済み。手順は [SETUP.md §6.5.3](./SETUP.md#653-初回-userid-の回収と投入ここが-phase-1-特有)）
- [x] **A 案（単発版）実装 + sandbox リポへの E2E 疎通**（2026-04-19、`feedback-relay-bot-sandbox` private リポ作成、PAT access 追加、Vercel env に `GITHUB_REPO=feedback-relay-bot-sandbox` + `FEEDBACK_BOT_MODE=test` 投入、LINE 実機メッセージで sandbox #1 起票成功、タイトルに `[TEST]` プレフィックス付与確認、Gemini の `## 背景 / ## 期待する動作 / ## 補足 / ## 元メッセージ` セクション構造通り）

### 🔲 次にやること（Phase 2 着手前）

Phase 1 DoD 最短コース到達。以下は Phase 2 移行前の選択肢:

- **B: Redis 会話状態 + 状態機械**（`gathering`→`confirming`→`done`、起票前に「これで起票しますか？」の確認ステップ）
- **家族公開前チェックリスト運用**: Production env だけ `GITHUB_REPO=food-inventory-app` + `FEEDBACK_BOT_MODE=production` に切替、Preview は sandbox のまま残してデグレ検知用に維持（手順は [SETUP.md](./SETUP.md) §8 予定）
- **ラベル運用**: sandbox / 本丸どちらも `from-family` ラベル整備、Gemini 出力の labels を採用する経路追加

## Phase 2: 家族展開（未着手）

## Phase 3: 複数プロジェクト対応（未着手）
