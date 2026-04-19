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
- [x] **Bot 返信 3 文言の家族目線リライト**（2026-04-19、[src/app/api/line/webhook/route.ts](../src/app/api/line/webhook/route.ts) の成功/失敗/非テキスト 3 リプライを「受領感謝 → 何が起きたか → 次の期待行動」の 3 要素で揃え直し。`npm run build` 通過、実機疎通確認は別途）
- [x] **家族公開前切替手順の書き下し**（2026-04-19、[docs/SETUP.md §8](./SETUP.md) に Production 切替・Redeploy・実機疎通・ロールバックを書き下し。Preview/Development は sandbox 恒久維持してデグレ検知に使う方針を明記。実切替は家族公開タイミングで別途実施）
- [x] **LINE チャンネル二重化（家族公開前ブロッカー解消）**（2026-04-19、DEV チャンネル「食材アプリ 意見箱 DEV」を同 Provider に新設、Vercel env で `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN` を Production = 本番チャンネル / Preview+Development = DEV チャンネルに環境別分割、`develop` ブランチ運用に移行して Preview 固定 URL `feedback-relay-bot-git-develop-hirobirofran-7375s-projects.vercel.app` に DEV チャンネル Webhook を紐付け。DEV/本番 両経路で実機疎通成功。手順は [docs/SETUP.md §7](./SETUP.md)、運用変更は [docs/WORKFLOW.md](./WORKFLOW.md) 参照）
- [x] **Gemini CLI プレイグラウンド整備**（2026-04-19、[scripts/try-gemini.ts](../scripts/try-gemini.ts) + `npm run try:gemini -- "..."`。tsx + `--env-file=.env.local` で dotenv 追加なし。Step 3 以降のプロンプト調整をローカル秒サイクルで回すための下準備。初回実行で「12 文字の曖昧入力から Gemini が推測膨らませ Issue を生成する地雷」を目視確認）
- [x] **テストケース MD 叩き**（2026-04-19、[docs/TEST_CASES.md](./TEST_CASES.md) にケース 8 件 + 観点 5 つ + Step 1 文言案を同梱。ひろゆきさんレビューでケース #1 を「対象外 (scope_reject)」に修正、他は OK）
- [x] **PII 警告の返信文差し込み + follow event 初回あいさつ**（2026-04-19、[src/app/api/line/webhook/route.ts](../src/app/api/line/webhook/route.ts) に `PII_NOTICE` / `FOLLOW_GREETING` 定数追加、成功返信末尾に PII 警告、follow event ハンドラで初回あいさつ。`npm run build` 通過。CLAUDE.md §会話設計の初手ルール 1「初回メッセージは決め打ち」も同時回収。実機疎通は Preview 反映後）

### 🔲 次にやること（Phase 1 MVP 残タスク: 壁打ち価値の実装）

**MVP 再定義の経緯**: 「最小機能」と「最小価値」を混同していた分類を見直し、[DESIGN.md §1-2](./DESIGN.md) の核心価値「AI 窓口が壁打ちで情報を引き出す」を提供できるまでを Phase 1 MVP とする（[docs/KNOWLEDGE.md 2026-04-19 価値駆動 MVP 再定義セッション](./KNOWLEDGE.md) 参照）。以下は現状の単発フォーマッタ版では提供できていない価値を埋めるための必須タスク:

- [ ] **Step 2: Redis 会話状態 CRUD ラッパ** (`src/lib/conversation.ts` 新規、`gathering`/`confirming`/`done` の 3 状態、TTL 24h、Upstash HTTP で単体確認可)
- [ ] **Step 3: Gemini プロンプトを分岐出力 + PII/scope ゲートに改修**（`gathering`: 質問返す / `confirming`: Draft 提示 / `pii_reject`: 言い換え依頼 / `scope_reject`: 窓口守備範囲を説明してアプリの話を促す。`scripts/try-gemini.ts` を拡張して [docs/TEST_CASES.md](./TEST_CASES.md) 全 8 ケース走らせ → `docs/tmp/gemini-runs-YYYYMMDD.md` 吐出し → ひろゆきさんまとめ読み）
- [ ] **Step 4: webhook で状態分岐実装**（「はい」応答検出 → `createIssue`、修正/薄入力 → `gathering` 戻し、`pii_reject`/`scope_reject` → 起票せず返信のみ）
- [ ] **Step 5: DEV チャンネル + sandbox リポで LINE 実機疎通**（テストケース 8 件を LINE から流し、Preview の Vercel ログと Issue 内容を確認）
- [ ] **Step 6: §8 Production 切替（家族公開）**（[docs/SETUP.md §8](./SETUP.md) に従い env 差替え + Redeploy + 実機疎通）

### 🔲 Phase 2 以降へ繰り越し（MVP 公開後の課題）

- **PII 対策の強化**: 正規表現プレフィルタ・マスキング・監査ログ（MVP は Bot 警告 + Gemini 目視ゲートの簡易 2 段のみ）
- **二段返信（即時 ACK → Issue 完了通知）**: 家族レビュー（本人セルフ）から「Bot 応答までの無音が不安」の指摘あり（[KNOWLEDGE.md 2026-04-19 LINE チャンネル二重化セッション](./KNOWLEDGE.md) 参照）。B 案の `gathering` 状態 = 即時 ACK の自然な拡張なので、Step 2〜4 完了後に合流設計する
- **ラベル運用**: sandbox / 本丸どちらも `from-family` ラベル整備、Gemini 出力の labels を採用する経路追加

## 📌 後日着手（GitHub Issue 追跡）

Phase 1 MVP 公開後、以下 2 件を順に着手する。**優先度は両方とも高い**が、#3 は #2 の上に段階的に重ねる Epic なので #2 から片付ける。

- [ ] **[#2 イシュー起票フローの再検討](https://github.com/hirobirofran/feedback-relay-bot/issues/2)** — **優先度: 高**
  - BOT が Public リポに直接起票する現状は PII リスクが拭えず、かつ要件整形されていないドラフトが開発側に流れ込む課題。
  - 方針（2026-04-20 決定）: Private リポにドラフト起票 → Claude Code セッションで整形・仕分け → Public リポに正式起票 + ドラフト Close + リンク紐付け。
  - Phase 1 サブタスク: Private ドラフトリポ作成 / BOT 起票先切替 / ドラフトラベル体系 / 承認フロー明文化 / 正式起票フォーマット定義。
- [ ] **[#3 Epic: 要望対応フローの自動化（Human-in-Loop）](https://github.com/hirobirofran/feedback-relay-bot/issues/3)** — **優先度: 高だが #2 の後（後回し）**
  - #2 で増える手動承認・手動起票の負担を、Human-in-Loop を保ったまま段階的自動化で減らす Epic。
  - 次の一歩: 認証方式の裏取り（Max OAuth の課金挙動検証 / spend limit 設定）。Anthropic API 課金経路か Max 内で済むかで後続設計が変わる。
  - **#2 と関連はするが依存はしない**（INVEST 原則）。#2 完了を待たず #3 の「認証裏取り」単体着手も可。

## Phase 2: 家族展開（未着手）

## Phase 3: 複数プロジェクト対応（未着手）
