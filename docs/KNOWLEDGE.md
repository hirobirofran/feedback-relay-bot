# 気づき・ナレッジ・申し送り

このファイルには、開発中に気づいたこと、ハマったこと、決めたこと、**家族レビュアーからの会話設計フィードバック**、次回への申し送りを記録する。

---

## 2026-04-19（Phase 1 着手セッション）

### 技術的な気づき

- `@line/bot-sdk` v10 系では `validateSignature` が named export に変わっている。`import { validateSignature, webhook } from "@line/bot-sdk"` の形で使い、webhook のリクエストボディ型は `webhook.CallbackRequest`（`events` は `webhook.Event[]`）。古いドキュメントにある default import はもう動かない
- Next.js 16 App Router の route handler で raw body を取るには `await request.text()` を JSON パースより**先**に呼ぶ。LINE 署名検証は raw body 前提なので、ここで `request.json()` を先に呼ぶと復元した JSON の key 順で署名が狂い検証落ちる地雷になる
- LINE Webhook は **署名検証失敗時も 200 を返す** のが安全。4xx/5xx を返すと LINE 側がリトライを走らせ、攻撃者のノイズでリトライ嵐を招く。検証失敗・認可外 userId・JSON 破損はすべて `console.warn` でログに残して 200 返却が定石
- `export const runtime = "nodejs"` を明示しないと Vercel が Edge ランタイムを選ぶ可能性がある。`@line/bot-sdk` の署名検証は Node `crypto` 依存なので明示必須
- Markdownlint の MD024 は見出しレベル跨ぎでも重複警告を出す。Phase 0 / Phase 1 で同じ絵文字見出しを使うとぶつかるので `### ✅ 完了（Phase 1）` のように段階名を付けて区別する

## 2026-04-19（Phase 0 完了セッション）

### 技術的な気づき（Phase 0）

- 外部サービスの Web UI は手順書を書いた時点から容易に陳腐化する（今回 Upstash の「REST API」タブは Details → Connect → REST に統合済みだった）。手順書は**目的の値が取れればよい**くらいの粒度にとどめ、最新 UI の細部はブラウザ + AI（Claude in Chrome 等）に実時間でガイドさせるのが速い。変更を見つけたら手順書に「UI 変更あり（いつ時点）」の注記を残して次回に引き継ぐ
- Upstash Redis の接続文字列は `"https://..."` と `"..."` のダブルクォート込みで出力される。`.env.local` にそのまま貼って `@upstash/redis` SDK・dotenv いずれもクォートは解釈してくれるので剥がさなくて良い。curl で検証するときだけ `tr -d '"'` で剥がす必要あり（[SETUP.md §3.2](./SETUP.md#32-疎通確認) の疎通スニペット参照）
- GitHub Fine-grained PAT の期限は最大 1 年。期限切れで Bot が無言死するのを避けるため、発行と同時に Google カレンダー 1 週間前通知を仕込む運用に決定（[SETUP.md §5.4](./SETUP.md#54-期限リマインドの仕込み)）。Claude の Google Calendar MCP 経由で仕込めるので、更新手順にカレンダー再仕込みのステップまで含める
- Gemini API の無料枠 (RPD/TPM) はプロジェクト単位で共有されるため、食材管理アプリと別プロジェクトで発行する必要がある。`Create API key in new project` を選ぶだけで新 `gen-lang-client-*` が自動作成される

### 次回セッションへの申し送り

- Phase 0 残: LINE 公式アカウント登録（重い）、Vercel プロジェクト作成（env が揃ってから）
- Phase 1 着手時に `@upstash/redis`, `@google/generative-ai`, `@octokit/rest`, `@line/bot-sdk` の 4 パッケージを `npm install` する
- 家族レビュー前の自己チェックは 3 往復の壁打ちで違和感を洗う（[CLAUDE.md の会話設計初手ルール](../CLAUDE.md#会話設計の初手ルールphase-1-着手時に守る)）

---

<!-- 新しいセッションの記録はこのテンプレートをコピーして追記してください
## YYYY-MM-DD

**技術的な気づき**
-

**UX・会話設計の気づき**
-

**家族レビューからのフィードバック**
-

**次回セッションへの申し送り**
-
-->
