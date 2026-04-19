# 気づき・ナレッジ・申し送り

このファイルには、開発中に気づいたこと、ハマったこと、決めたこと、**家族レビュアーからの会話設計フィードバック**、次回への申し送りを記録する。

---

## 2026-04-19（LINE チャンネル二重化セッション: 家族公開前ブロッカー解消）

### 技術的な気づき（LINE チャンネル二重化）

- **Vercel SHA dedup の罠**: 新規ブランチを push しても、HEAD が既存ブランチと**同じ commit SHA を指している**と Vercel は Preview デプロイを作らない。`develop` を `main` から切って即 push しただけだと `DEPLOYMENT_NOT_FOUND` のまま固まる。空 commit (`git commit --allow-empty`) で分岐させると即ビルド開始する。Vercel Dashboard の Deployments タブで該当ブランチの deployment が 1 件も無い場合、まず SHA 重複を疑う
- **同名 env × 環境別エントリは LINE 系にも有効**: [docs/SETUP.md §8.2](./SETUP.md) の `GITHUB_REPO` で実証済みの「同じキー名で Production と Preview/Development に別値を持つ」パターンを `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN` にもそのまま適用できた。**コード変更ゼロ**（[src/lib/env.ts](../src/lib/env.ts) の getter は `process.env[X]` を引くだけで Vercel 側が環境別に注入してくれる）。env getter に環境分岐ロジックを書く案も検討したが、Vercel ネイティブで解ける場面で getter を複雑化するメリットなし
- **`@line/bot-sdk` v11 の Webhook 署名検証は LINE Verify ボタンの「空 events POST」も同じ署名計算で通る**: 新チャンネルの Webhook URL Verify が即 Success になる前提条件。`validateSignature(rawBody, secret, signature)` の `rawBody` が空文字列 `""` でも署名計算は成立する設計

### UX・会話設計の気づき（LINE チャンネル二重化）

- **手順書の「正」原則**: Claude Code が古い記憶で外部 UI 手順を体当たり推測するのは禁じ手。SETUP.md §2.3 で「Messaging API の利用を有効化」が 1 行で済まされていて、実際は「設定（歯車）→ Messaging API → 「Messaging APIを利用する」→ 既存 Provider 選択」の 4 ステップが必要だったが、ひろゆきさんが Claude in Chrome に逃げて解決する事態になった。今回 SETUP.md §2.3 を加筆 + memory に「外部 UI で確信が持てない手順は Claude in Chrome に質問文を渡す」ルールを保存（`feedback_external_ui_escalation.md`）

### 家族レビューからのフィードバック

- **Bot 応答までの無音が不安**: ひろゆきさん本人の自己レビュー（家族役）から「Bot が反応するまで黙っているのは（LINE では普通だけど）不安になる」の指摘。現状 Gemini 整形 + GitHub 起票で 2-3 秒の沈黙が発生。CS プロ視点では「届いた / 届かない」の区別が無い時間は体験として劣る。Phase 2 で **2 段返信**（受信即「受け取りました、考えてます…」を `replyMessage` で返し、Issue 起票完了後に URL を `pushMessage` で通知）を検討する。B 案（Redis 会話状態機械）と合流させると `gathering` 状態 = 即時 ACK の自然な拡張になるので、合流案が有力（[TASKS.md Phase 2 候補](./TASKS.md) 参照）

### 運用・設計の気づき

- **branch 戦略移行の判定**: [WORKFLOW.md](./WORKFLOW.md) で挙げていた「main 直 → feature branch + PR 移行」のトリガー 4 つのうち、**「変更を本番に反映する前にステージングで家族に触ってもらって寝かせる運用が必要」**が家族公開準備のタイミングで現実化した。LINE チャンネル二重化と branch 運用変更は同時に着手するのが正解（片方だけだと中途半端に「DEV チャンネル無しで develop 運用」or「main 直で DEV チャンネル」になり意味が薄い）
- **Vercel Preview の固定 URL 命名規則**: `feedback-relay-bot-git-<branch>-<team-slug>.vercel.app` の `<team-slug>` 部分はチーム単位で一意（本プロジェクトでは `hirobirofran-7375s-projects`）。main の既存 alias を見れば develop 用の URL が事前に確定できるので、LINE Webhook URL 設定を develop push 前に下準備しておくことも可能（実際は push → ビルド完了を待ってから Verify する方が安全）

### 次回セッションへの申し送り（LINE チャンネル二重化）

- 家族公開前のブロッカーは全部潰れた。残るは (a) Phase 2 着手（B 案 = Redis 会話状態 or 二段返信、合流案推奨） / (b) [docs/SETUP.md §8](./SETUP.md) の Production 切替（家族公開タイミングで実施） / (c) ラベル運用 / (d) follow event 初回あいさつ、の 4 つの中から優先度判断
- **本セッションで develop 運用に移行**。今後 Claude Code は原則 develop にコミット → develop → main の PR を切る運用。詳細は [WORKFLOW.md](./WORKFLOW.md) 参照
- DEV チャンネル運用の継続的な意義は「main 反映前の本人ドッグフード」。Preview デプロイで sandbox リポに起票テストを通せるので、テストスイート未整備の現状でもデグレ検知の手段になる
- ローカル `.env.local` は TEST モード（sandbox 向き）なので LINE 系に DEV/本番どちらの値を入れても実害なし。通常は DEV チャンネル値を入れて Vercel Preview と環境を揃えるのが推奨（[.env.local.example](../.env.local.example) コメント追記済み）

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
