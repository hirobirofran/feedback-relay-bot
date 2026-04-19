# 気づき・ナレッジ・申し送り

このファイルには、開発中に気づいたこと、ハマったこと、決めたこと、**家族レビュアーからの会話設計フィードバック**、次回への申し送りを記録する。

---

## 2026-04-19（Phase 1 仕上げセッション: 返信文リライト + SETUP §8）

### UX・会話設計の気づき

- Bot 返信文の見直しで**「受領感謝 → 何が起きたか → 次の期待行動」**の 3 要素を常に満たすルールを採用した。旧文言は開発者語「起票しました」単独で、家族から見ると「(a) 届いたのか？ (b) これで何が起こるのか？ (c) 自分は何を待てば良いのか？」が全部曖昧だった。失敗時の「調子が悪いみたい」も同様で、「届かなかった」事実と「再送して」という期待行動を明示する文面に直した。成功・失敗・非テキストの 3 分岐ともこの 3 要素で揃えると、返信ログだけ見ても家族側の体験が再現できる
- 「開発メモに追加しました。順に対応していきます」の一行は**期待値調整**として効く。家族から見て「フィードバック = 即対応」を期待させないための予防線で、CS プロの観点で未着手/滞留時の不満を減らす役割を持つ

### 運用・設計の気づき（Production 切替設計）

- **Preview/Development は恒久的に sandbox に向けておく**という判断を [docs/SETUP.md §8.1](./SETUP.md) で明文化した。理由は「テストスイート未整備の現状、Preview デプロイで sandbox リポに起票できるかを目視すること自体が唯一のデグレ検知手段になる」から。Production だけを本丸に向けると、main にマージ前の PR Preview が自動で sandbox 経路を通って事前に動作確認できるようになる
- 同じ env Key を環境別に違う値で複数エントリ持てるという Vercel の挙動を前提にしている（§8.2）。ひとつのエントリで scope を Production だけに絞り、別エントリで Preview/Development に別の値を入れる二重化が正攻法

### 次回セッションへの申し送り（Phase 1 仕上げ）

- 実際の Production 切替（§8 の §8.2〜§8.4 実行）は家族公開を判断したタイミングで。切替直後に §8.5 の実機疎通を必ず通す
- LINE follow event の初回あいさつ（CLAUDE.md §会話設計の初手ルール 1）は Phase 2 B 案（会話状態機械）と一緒に再検討。単発で実装するより会話状態の一部として設計した方が整合が取れる
- **🔴 LINE チャンネル二重化は家族公開前に必須**（[docs/TASKS.md](./TASKS.md) Phase 2 候補に追記済み）。現状 LINE チャンネル 1 本体制は「家族が見ている Bot を壊せる状態で main に push できる」という危険な構図。sandbox リポ分離（`docs/SETUP.md §8`）は GitHub Issue 側の誤爆を防ぐが、LINE 返信側は保護できていない。家族公開前の最後のブロッカーとして意識しておく

## 2026-04-19（Phase 1 A 案 E2E 到達セッション）

### 技術的な気づき（Phase 1 A）

- `@google/generative-ai` v0.24 では `generationConfig.responseMimeType: "application/json"` + `responseSchema` を指定すると、Gemini が ` ```json ``` ` 囲みなしの純 JSON 文字列を返す。Phase 0 で想定していた「正規表現で ` ```json ``` ` を剥がす」前処理は不要になった。`SchemaType.OBJECT` の `required` フィールドは `string[]`（mutable）なので `as const` で固めると型エラー。`ResponseSchema` 型注釈だけ付けて通常の配列リテラルで書くのが TypeScript strict と相性が良い
- Octokit `@octokit/rest` の `issues.create` は `{ owner, repo, title, body }` の最小引数で動く。`labels` を省略すれば本当にラベルなしで立つ。ラベル未整備の sandbox リポでも失敗しない
- `@line/bot-sdk` v11 では `messagingApi.MessagingApiClient` のコンストラクタ引数が `{ channelAccessToken: string }` 形式。古いドキュメントの `new Client({ channelAccessToken })` ではなく `new messagingApi.MessagingApiClient({ channelAccessToken })`。LINE Reply は `replyMessage({ replyToken, messages: [{ type: "text", text }] })` で送れる
- Webhook ハンドラ内で Gemini + GitHub を同期的に直列実行しても Vercel Hobby の 10 秒タイムアウト内に収まった（Gemini 2.5 Flash で 2-3 秒、GitHub 起票 1 秒未満）。replyToken 2 段階化（考え中 → push）は現時点では不要。将来 Gemini が重くなったら再考

### 運用・設計の気づき（Phase 1 A）

- **テスト環境の二重化**: 本丸リポ（food-inventory-app）を汚さないために (a) sandbox リポを用意して env で切替 (b) `FEEDBACK_BOT_MODE=test` でタイトル冒頭に `[TEST]` 付与、の 2 段構えを採用。どちらか片方だけだと「env の書き換えを忘れて本番リポに飛ぶ」or「sandbox のつもりが本物リポに行ったことを title からは判別できない」というリスクが残る。**Phase 1 AND イニシャルリリース後も** sandbox は残して Preview 環境（or 本人テスト用途）のままにする
- Fine-grained PAT の Repository access は後から追加できる（トークン再発行不要）。`hirobirofran/food-inventory-app` + `hirobirofran/feedback-relay-bot-sandbox` の 2 個 Selected repositories に列挙する形で、PAT 1 本で両方に起票できる
- Issue に **draft 状態は存在しない**（draft は PR だけの概念）。テストと本番の区別は title prefix or label or 別リポで行うしかない。本プロジェクトでは「別リポ + title prefix」の二重化で決着

### 次回セッションへの申し送り（Phase 1 A）

- Phase 2 / B 案（Redis 会話状態機械）に着手する場合は、A 案の単発版を**残したまま** state=none のフォールバックとして呼べるように設計すると実装が楽。既存の `buildIssueFromFeedback(text)` は単一ターン用途そのまま流用可能
- 家族公開直前の切替手順は [docs/SETUP.md](./SETUP.md) §8 として近いうちに書き下す（Production env の `GITHUB_REPO` と `FEEDBACK_BOT_MODE` を差し替える 2 ステップ + 動作確認 1 ステップ）
- 家族レビューに出す前に Bot の返信文「起票しました。\n（タイトル）\n（URL）」を家族（CS プロ）目線で再チェックしたい。Phase 2 の会話設計見直しと一緒に

## 2026-04-19（Phase 1 着手セッション）

### 技術的な気づき

- `@line/bot-sdk` v10 系では `validateSignature` が named export に変わっている。`import { validateSignature, webhook } from "@line/bot-sdk"` の形で使い、webhook のリクエストボディ型は `webhook.CallbackRequest`（`events` は `webhook.Event[]`）。古いドキュメントにある default import はもう動かない
- Next.js 16 App Router の route handler で raw body を取るには `await request.text()` を JSON パースより**先**に呼ぶ。LINE 署名検証は raw body 前提なので、ここで `request.json()` を先に呼ぶと復元した JSON の key 順で署名が狂い検証落ちる地雷になる
- LINE Webhook は **署名検証失敗時も 200 を返す** のが安全。4xx/5xx を返すと LINE 側がリトライを走らせ、攻撃者のノイズでリトライ嵐を招く。検証失敗・認可外 userId・JSON 破損はすべて `console.warn` でログに残して 200 返却が定石
- `export const runtime = "nodejs"` を明示しないと Vercel が Edge ランタイムを選ぶ可能性がある。`@line/bot-sdk` の署名検証は Node `crypto` 依存なので明示必須
- Markdownlint の MD024 は見出しレベル跨ぎでも重複警告を出す。Phase 0 / Phase 1 で同じ絵文字見出しを使うとぶつかるので `### ✅ 完了（Phase 1）` のように段階名を付けて区別する
- **初回 userId 回収フロー**（Phase 1 で実測）: `ALLOWED_LINE_USER_IDS` は Phase 0 では未設定のまま置き、Phase 1 で Webhook 実装後の初回メッセージ送信で `[line-webhook] unauthorized userId=U...` ログから拾う手順が正解。このログが出るのは**エラーではなく設計上の受け入れ挙動**。`ALLOWED_LINE_USER_IDS` 事前入手は不可能（LINE Console から自分の userId を直接見ることもできない）なので、この「初回 unauthorized → 拾う → 投入 → 再デプロイ」の 4 ステップを正式フローとしてドキュメント化済み（[SETUP.md §6.5.3](./SETUP.md#653-初回-userid-の回収と投入ここが-phase-1-特有)）
- Vercel の環境変数追加は**再デプロイ必須**。env を UI で保存しただけでは動いているデプロイには反映されない。最新デプロイの Redeploy（Build Cache 利用 OK）で即反映される
- 当初 [docs/SETUP.md §6.5](./SETUP.md) に書いていた Webhook パスは `/api/webhook/line` だったが、実装時に App Router のディレクトリ構造上 `/api/line/webhook` の方が素直だったので変更。**事前に書いた手順書のパスは実装時に乖離しやすい**ので、疎通確認時に必ず手順書側を書き戻す

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
