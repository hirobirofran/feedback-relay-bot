# 家族向けフィードバック収集Bot 設計書

食材管理アプリ（food-inventory-app）への家族からのフィードバックを、LINE経由でカジュアルに受け取り、AI窓口が壁打ち・要件整形してGitHub Issueとして起票する小型エージェント。

**本書は食材管理アプリの docs/VISION.md, docs/ARCHITECTURE.md, CLAUDE.md, KNOWLEDGE.md の内容を前提にしています。**

---

## 1. 背景・目的

- 食材管理アプリ (Next.js 15/16 + Vercel + Google Sheets + Gemini) に対して家族からフィードバックが欲しい
- 家族にGitHub Issueを直接書かせるのは敷居が高すぎる
- 「冷蔵庫のボタン押しにくい」みたいな一言だけだと要件として不十分
- → AI窓口が壁打ち相手として情報を引き出し、整形してから起票する

将来的には：

- 健康管理・在庫管理など、今後追加するアプリにも同じ仕組みを転用
- Issue起票だけでなく、既存Issueへのコメント追加
- 起票後のIssue状態変化をLINEで通知

---

## 2. ユースケース

### Phase 1 想定シナリオ

食材管理アプリを使っている家族から、こんな会話が来ることを想定：

```
家族: 「今日買ってきた牛乳登録するの、ちょっとめんどかった」
Bot : 「食材の追加機能のことですね。どのあたりが手間でしたか?
       例: 入力項目が多い、キーボードが出るのが遅い、写真で登録したい、など」
家族: 「全部手入力なのがだるい。バーコードで読ませたい」
Bot : 「なるほどバーコード登録の要望ですね。以下で起票します:

       タイトル: 食材追加時にバーコードスキャンで登録できるようにしたい
       本文:
       # 背景
       家族から「手入力が手間」というフィードバック
       # 期待する動作
       バーコード読み取り → 商品名・カテゴリ自動入力
       # 報告者
       [家族名]
       ラベル: enhancement, from-family, mobile

       これで起票していい? (はい / 修正する)」
家族: 「はい」
Bot : 「起票しました → https://github.com/hirobirofran/food-inventory-app/issues/42
       追加情報があればいつでも送ってください」
```

整形時のAIは、食材管理アプリの **docs/VISION.md** と **docs/TASKS.md** を知っているので、「あ、バーコード登録は Phase 3 ロードマップに既にあるな」とか「オートクッカー絡みの要望かも」とか文脈を反映できる。

### 想定されるフィードバック領域（食材管理アプリ固有）

- UI/UX: 食材一覧、買い物リスト、モーダル、ボトムナビ
- AIレシピ提案: 提案内容、調理器具の使い方（オートクッカービストロ / ビストロレンジ / グルラボ）
- 食材登録: 手入力の手間、カテゴリ選択、期限入力
- データ: 賞味期限切れの見せ方、最低在庫数
- バグ報告

---

## 3. アーキテクチャ

### 全体構成

```mermaid
flowchart TB
  subgraph Input[入力]
    LINE[LINE Bot<br/>1対1チャット]
  end

  subgraph Vercel[Vercel / Next.js 16]
    WH[/api/webhook/line<br/>署名検証]
    CONV[Conversation Engine<br/>状態遷移・壁打ち]
    GH_CLIENT[GitHub Publisher<br/>Octokit]
  end

  subgraph External[外部サービス]
    GEMINI[Gemini API<br/>AI Studio<br/>2.5 Flash]
    REDIS[(Upstash Redis<br/>会話状態 TTL 24h)]
    GH[GitHub Issues API]
  end

  LINE --> WH
  WH --> CONV
  CONV <--> REDIS
  CONV <--> GEMINI
  CONV --> GH_CLIENT
  GH_CLIENT --> GH
  GH --> FOOD[food-inventory-app<br/>リポジトリ]
```

### 主要コンポーネント

| # | コンポーネント | 責務 | Phase1行数目安 |
|---|---------------|------|-------|
| 1 | LINE Adapter (`/api/webhook/line`) | Webhook受信、署名検証、テキスト抽出 | 80 |
| 2 | Auth Guard | LINE userIdをホワイトリスト照合 | 30 |
| 3 | Conversation Engine | マルチターン会話・状態遷移 (`gathering` → `confirming` → `done`) | 200 |
| 4 | Project Context Provider | プロジェクト情報（README、docs抜粋、既存Issueタイトル）を提供 | 60 |
| 5 | Gemini Client | Gemini API呼び出し、JSON抽出正規表現 | 60 |
| 6 | GitHub Publisher | Octokit経由で起票、URL返却 | 50 |
| 7 | LINE Reply Helper | LINE Messaging API 応答送信 | 50 |
| 8 | Config/Types | プロジェクト定義、ユーザー定義、型 | 80 |

**合計 600行程度**。テスト含めても1000行以内、週末2回で書ける規模。

### 抽象化方針（重要）

- Phase 1 は **LINE決め打ち・food-inventory-app決め打ちで具象1個ずつ** 書く
- ただし以下はインターフェースを切る:
  - `ChannelAdapter`: LINE/将来Slack等の抽象化点
  - `ProjectContextProvider`: プロジェクト情報取得の抽象化点（Phase 3複数プロジェクト対応に備える）
- それ以外は抽象化しない（Phase 3でリファクタが安い）

---

## 4. 技術スタック

| 層 | 採用 | 理由 |
|----|------|------|
| ホスティング | **Vercel** | 食材管理アプリと同じ、Next.js 16で一体化、デプロイ・環境変数管理の知見流用 |
| 言語/FW | **Next.js 16 (App Router) + TypeScript** | 食材管理アプリと同じ、API RoutesでWebhook受け |
| 会話状態 | **Upstash Redis** | Vercel親和性高い、TTL対応、無料枠で家族規模余裕 |
| プロジェクト設定 | **コード内定数 + 環境変数** | 複雑化するまでJSON/DBは不要 |
| AI | **Gemini 2.5 Flash (AI Studio無料枠)** | 食材管理アプリと同一、無料枠で家族規模余裕、モデル挙動の既知トラブル流用 |
| LINE | **Messaging API** | 1対1チャット、無料枠200通/月、家族規模で十分 |
| GitHub | **Octokit (REST)** | Fine-grained PAT、対象リポジトリ限定 |
| 認証 | **LINE userIdホワイトリスト + 署名検証** | 不特定多数からの起票防止 |
| CI/CD | **GitHub Actions + Vercel連携** | pushで自動デプロイ、食材管理アプリと同じ |

### Upstash Redis を選んだ理由（Firestoreでなく）
- Vercel のサーバーレス関数は「コールドスタート」特性があり、コネクション維持型DBと相性が悪い
- Upstash は HTTP APIでアクセス、サーバーレス最適
- `SET key value EX 86400` 一発で24h TTL
- 無料枠: 月10,000コマンド、256MB → 家族規模で余裕

### Next.js 16 移行の既知事項（KNOWLEDGE.md引用）
- `middleware` → `proxy` に改名。ファイル名 `src/proxy.ts`、関数名 `proxy`
- 書き方・matcher・NextResponse は従来通り
- 本Botでは proxy は使わない想定（API Route内で署名検証）が、同リポジトリに proxy.ts を置く場合の注意

---

## 5. データモデル

### Upstash Redis キー設計

```
conv:{lineUserId}
  # 会話状態、TTL 86400 (24h)
  {
    "state": "gathering" | "confirming" | "done",
    "projectId": "food-inventory-app",
    "messages": [
      {"role": "user", "content": "...", "ts": 1713500000},
      {"role": "assistant", "content": "...", "ts": 1713500010}
    ],
    "draft": { "title": "...", "body": "...", "labels": [...] },
    "createdAt": 1713500000
  }
```

会話終了時に `DEL conv:{lineUserId}` で明示削除。異常終了時もTTLで24h後に自動削除。

### プロジェクト定義（コード内定数）

```typescript
// src/config/projects.ts
export const PROJECTS = {
  "food-inventory-app": {
    name: "食材管理アプリ",
    githubOwner: "hirobirofran",
    githubRepo: "food-inventory-app",
    defaultLabels: ["from-family"],
    // 起票時のシステムプロンプトに埋め込むコンテキスト
    contextDocs: [
      "docs/VISION.md",
      "docs/ARCHITECTURE.md",
      "docs/TASKS.md",
    ],
    // 食材管理アプリの CLAUDE.md から抽出したドメイン情報
    domainNotes: "ユーザーはオートクッカービストロ、ビストロレンジ、グルラボを使っている",
  },
} as const;
```

### ユーザー定義（環境変数）

家族のLINE userId をカンマ区切り環境変数で管理（最初は本人1人からでも可）：

```env
ALLOWED_LINE_USER_IDS=U1234abcd...,U5678efgh...
USER_DISPLAY_NAME_MAP='{"U1234abcd...":"本人","U5678efgh...":"母"}'
```

Phase 3で複数プロジェクト・ユーザー管理が複雑化したら Google Sheets に切り出す（食材管理アプリと同じパターン）。

---

## 6. 開発フェーズと工数

| Phase | 内容 | 概算 |
|-------|------|------|
| 0 | LINE公式アカウント登録、Vercelプロジェクト作成、Upstash設定、環境変数設定 | 0.5週末 |
| 1 | Webhook受信 → 単純な往復 → Gemini整形 → GitHub起票（単一プロジェクト、本人1人、壁打ち1〜2ターン） | 1.5週末 |
| 2 | マルチターン壁打ちの深化、確認ステップ、エラーハンドリング、家族展開 | 1週末 |
| 3 | 複数プロジェクト対応（健康管理・在庫管理追加時） | 1週末 |

**Phase 1+2 = 2.5週末 で家族に使ってもらえる状態**

以降は「現実の使用感」を見てから判断：
- 既存Issue重複チェック
- 画像添付対応（LINE画像 → Gemini Vision）
- Issue状態変化のLINE通知
- 複数プロジェクト対応（実際に2個目のアプリができてから）

### 削除・格下げしたPhase

- ~~Phase 4 RAG~~ → 不要。Geminiの1Mコンテキストに食材管理アプリ全文が入る
- ~~Phase 5 Slack Bot~~ → 不要。Slack + Claudeアプリで「このスレッドをIssueに整形して」が既にできる
- Phase 6 Claude/Code起票 → プロンプトテンプレ整備のみ（後述の§11）

---

## 7. つまずきポイント・リスク

### 技術的リスク（低〜中）
- **LINE Webhook署名検証**: `x-line-signature` をHMAC-SHA256で検証、Channel Secret必要
- **Gemini レート制限**: 食材管理アプリ（KNOWLEDGE.md）で既知: 10 req/min、429エラー。家族規模なら問題なし
- **Gemini レスポンスのJSON抽出**: ` ```json ` 囲みがあり正規表現必要。食材管理アプリで実装済みのパターン流用
- **Vercel のサーバーレスタイムアウト**: 無料プランは10秒。Gemini呼び出しが長引くと切れる可能性 → LINEは `replyToken` 使って先に「考え中…」返信してからpush messageで本番応答、の2段階にするのが安全
- **Next.js 16 の proxy.ts 改名**: 本Botでは使わない想定だが、同リポジトリに置くなら注意

### 設計リスク（中）
- **会話の中断**: ユーザーが壁打ち途中で放置するケースが頻発する想定
  - 24h TTLで自動削除
  - 新しいメッセージが来たら「前の話の続き? 新しい話?」と確認
- **AIの整形品質**: 家族が満足するかは作ってみないと不明 → Phase 2で実家族に渡して様子見

### 頓挫リスク（中）⚠️
- 前回書いた「家族が使わない問題」は、ご本人がヘビーユーザーである想定なら大幅に低減
- ご本人自身の改善サイクル（使う → ペイン発見 → Bot経由で起票 → Claude Codeが修正）が回るなら、それだけでポートフォリオ価値十分
- 家族が使わなくても、自分の開発ループ加速ツールとして機能する

### セキュリティ・プライバシー
- **LINE userId ホワイトリスト必須**: 不特定多数の起票防止
- **GitHub PAT**: Fine-grained、対象リポジトリのみ、Issue権限のみ
- **Webhook署名検証**: 不正リクエストの弾き
- **秘密情報ルール**: 食材管理アプリのCLAUDE.mdルールを踏襲
  - シークレット・環境固有識別子はチャット／コミットに出さない
  - `.env.local.example` はプレースホルダのみ
  - Vercel環境変数はダッシュボードUIから直接入力

### コスト見積もり（月額・家族利用想定）
- Vercel Hobby: 無料
- Upstash Redis 無料枠: 無料
- Gemini AI Studio 無料枠: 無料（家族規模でRPD/TPM制限に当たらない）
- LINE Messaging API: 無料枠内（応答200通/月）
- **合計: $0/月**

---

## 8. 代案と選定理由

### 代案1: Cloud Run + Firestore (前版の採用案)
- ✅ GCPメイン方針
- ❌ 食材管理アプリと別インフラ、知見流用できない
- ❌ Vercel + Next.jsでほぼ同等のことができる
- 判定: **不採用**（食材管理アプリの存在を知った上で再評価）

### 代案2: ノーコード（Make/n8n）
- ✅ 即実装
- ❌ AI壁打ちのマルチターン状態管理が破綻
- ❌ ポートフォリオにならない
- 判定: **不採用**

### 代案3: Slack Bot版を先に作る
- ❌ Slack内のClaudeアプリで目的達成済み
- 判定: **不採用**

### 代案4: LIFF (LINE Front-end Framework)
- 画像アップロード機能で将来使う可能性
- 判定: **Phase 2以降で検討**（画像添付対応時）

### 採用: Vercel + Next.js 16 + Upstash Redis + Gemini + GitHub API
- 食材管理アプリと同一スタック
- 既存の秘密情報ルール・デプロイ知見・Gemini APIノウハウをそのまま流用
- リポジトリは独立（`feedback-relay-bot` 等の名前）

---

## 9. リポジトリ構成案

食材管理アプリとは **別リポジトリ** を推奨。責務分離、ポートフォリオ分離、将来の転用容易性。

```
feedback-relay-bot/
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── webhook/
│   │       │   └── line/
│   │       │       └── route.ts       # LINE Webhook受信
│   │       └── health/
│   │           └── route.ts
│   ├── lib/
│   │   ├── line.ts                    # LINE Adapter + Reply Helper
│   │   ├── gemini.ts                  # Gemini Client
│   │   ├── github.ts                  # GitHub Publisher (Octokit)
│   │   ├── redis.ts                   # Upstash Redis Client
│   │   ├── conversation.ts            # Conversation Engine
│   │   └── context.ts                 # Project Context Provider
│   ├── config/
│   │   ├── projects.ts                # プロジェクト定義
│   │   └── auth.ts                    # ホワイトリスト
│   └── types/
│       └── index.ts
├── docs/
│   ├── VISION.md
│   ├── ARCHITECTURE.md
│   ├── SETUP.md
│   ├── TASKS.md
│   └── KNOWLEDGE.md                   # 食材管理アプリと同じフォーマット
├── CLAUDE.md                          # 秘密情報ルール含む
├── AGENTS.md
├── .env.local.example
└── README.md
```

食材管理アプリのdocs/構成を踏襲。同じ慣習で回す方がClaude Codeも迷わない。

---

## 10. Claude Codeへの指示（Phase 0+1）

### やってもらうこと

1. **Next.js 16 プロジェクト新規作成**
   - `create-next-app@latest feedback-relay-bot --typescript --tailwind --app`
   - 食材管理アプリと同じ方針（ESLint設定等）
2. **ドキュメント骨組み作成**
   - 食材管理アプリのdocs/構成を踏襲
   - CLAUDE.md に秘密情報ルールを食材管理アプリからコピー
3. **LINE Webhook受信 (`/api/webhook/line/route.ts`)**
   - 署名検証（`x-line-signature` HMAC-SHA256）
   - テキストメッセージの抽出
   - 未対応イベント（スタンプ・画像等）は Phase 1 では「すみません、今はテキストのみ対応です」と返信
4. **Upstash Redis クライアント**
   - `@upstash/redis` SDK使用
   - 会話状態のCRUD関数（get/set/delete）、TTL 24h
5. **Gemini Client**
   - `@google/generative-ai` SDK、モデル `gemini-2.5-flash`
   - システムプロンプトに食材管理アプリのVISION/ARCHITECTURE要約を埋め込む
   - JSON抽出正規表現（食材管理アプリから移植）
6. **Conversation Engine**
   - 状態遷移: `gathering` → `confirming` → `done`
   - `gathering`: AIが情報引き出し、必要に応じて質問
   - `confirming`: AIがDraft提示、ユーザー「はい」で起票、「修正」で`gathering`に戻る
   - `done`: 起票URL返信、会話削除
7. **GitHub Publisher**
   - Octokit REST、Fine-grained PAT
   - Issueタイトル・本文・ラベル指定で起票
   - 戻り値としてIssue URLを返す
8. **LINE Reply**
   - `replyToken` で即応（「考え中...」）
   - Gemini応答が準備できたら push message で本番応答
   - または、Geminiを同期呼び出ししてreplyで一発応答（Vercel 10秒タイムアウト注意）
9. **環境変数の整備**
   - `.env.local.example` に以下のプレースホルダ:
     - `LINE_CHANNEL_SECRET`
     - `LINE_CHANNEL_ACCESS_TOKEN`
     - `GEMINI_API_KEY`
     - `GITHUB_TOKEN`
     - `GITHUB_OWNER` / `GITHUB_REPO`
     - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
     - `ALLOWED_LINE_USER_IDS`
10. **README** にセットアップ手順（LINE開発者登録、Webhook URL設定、Vercel環境変数、ngrok手順）

### 必要な情報（実装着手時にユーザーに確認してOK）
- 食材管理アプリのGitHubリポジトリ（owner/repo）: `hirobirofran/food-inventory-app` 前提でOKか
- プロジェクトで使うラベル（`from-family`, `bug`, `enhancement`, `ux` など先に作っておく）
- LINE公式アカウント名（これから作る）

### 既存プロジェクトから流用すべきノウハウ
食材管理アプリの KNOWLEDGE.md から以下を参照：
- Gemini API のJSON抽出正規表現
- Gemini モデル名の更新方法（`gemini-2.5-flash`系が現行）
- Vercel環境変数はダッシュボードUIから直接入力（CLI stdinは履歴に残る）
- `private_key` 系の環境変数の罠（改行・ダブルクォート）
- Next.js 16 の `proxy.ts` 改名

### Phase 1 の完成条件（Definition of Done）
- [ ] LINE友達追加 → メッセージ送信 → Issueが立つ、の一連が動く
- [ ] 本人のuserIdがホワイトリストで認証される
- [ ] 会話状態がRedisに保存され、24h TTLで消える
- [ ] エラー時に適切なメッセージが返る
- [ ] README にセットアップ手順が書かれている
- [ ] Vercel本番デプロイ成功、LINE Webhook URLを本番URLに向けて動作確認完了
- [ ] `.env.local.example` が整備されている
- [ ] CLAUDE.md に秘密情報ルールが転記されている

### Phase 2 で追加すること
- マルチターン壁打ち（情報が足りないとAIが判断したら追加質問）
- Draft確認ステップ（「この内容で起票していい?」）
- 家族メンバー追加（userIdホワイトリスト拡張）
- エラーケース網羅（Gemini 429, GitHub API 失敗, Redis 到達不能）

---

## 11. Claude/Claude Codeからの起票用プロンプトテンプレ（Phase 6相当）

Bot化せず、プロンプトとして整備して使う。Slack内のClaudeアプリ／claude.ai／Claude Codeで共通で使える。

### テンプレ（業務/個人共通）

```
以下の会話・コード・ペインの内容を、GitHub Issueとして整形してください。

# 対象リポジトリ
owner/repo

# プロジェクトコンテキスト
（必要なら貼る。短めで。例: 「React+TSの社内ダッシュボード、認証はAuth0」）

# 元情報
（Slackの会話ログ、Claudeとのやりとり、コード断片、ペインの説明など）

# 出力形式
以下のMarkdownで出してください：

## タイトル
（簡潔・動詞始まり・50字以内）

## 本文
### 背景
### 現状の問題
### 期待する動作
### 補足（任意：再現手順、関連ファイル等）

## ラベル
（カンマ区切り：bug, enhancement, ux, performance, docs, tech-debt から選ぶ）

## 優先度
high / medium / low の根拠付き
```

### 運用
- 業務Slackで会話 → スレッドまるごとコピー → Slack内Claudeアプリに投げる or claude.ai に貼る
- 出力をGitHub Issuesに手で貼る（1分）
- GitHub MCPが使える環境なら、Claudeに直接起票させる

これで業務用途は十分。家族用途だけ Bot化する（LINEだから）。

---

## 12. ポートフォリオとしての見せ方

GitHubリポジトリREADMEで以下を整えると映える：

- **冒頭の動機**: 「食材管理アプリを作ったが、家族からフィードバックが欲しいのにGitHub Issueの敷居が高すぎる。AI窓口で吸収するBotを作った」
- **アーキテクチャ図**: 本書の Mermaid を埋め込み
- **実使用例**: LINE会話のスクショ + 起票されたIssueのスクショ
- **技術選定理由**: Vercel/Upstash/Gemini/LINEの組み合わせ
- **拡張性**: 複数プロジェクト対応の設計意図

技術的な目玉：
- 小型エージェント実装例（状態管理・壁打ち・ツール使用）をフレームワーク無しで素朴に書いた
- 食材管理アプリエコシステムの一部として機能している（単独Botではなく）

---

## 付録A: 想定システムプロンプト（Phase 1）

```
あなたは食材管理アプリ「food-inventory-app」のフィードバック窓口です。
家族ユーザーからのカジュアルな意見・要望・不具合報告を聞き取り、
GitHub Issueとして起票できる形に整理することが役割です。

# 対話方針
- 親しみやすい口調で、技術用語は避ける
- 質問は一度に1つまで
- 3-4ターン以内に整理を完了させる
- 情報が足りない場合のみ追加質問（再現手順、いつ起きたか、期待動作）
- 整理できたらタイトル・本文・ラベル案を提示し、確認を取る

# 対象アプリの概要
{食材管理アプリの docs/VISION.md 要約をここに埋め込み}

# アーキテクチャ
{docs/ARCHITECTURE.md の要約}

# 現在のロードマップ（既存計画機能）
{docs/TASKS.md の要約。すでに予定されている機能を案内できるように}

# ユーザーの調理環境
ユーザーはオートクッカービストロ、ビストロレンジ、グルラボを使っています。
AI レシピ提案関連のフィードバックではこれを考慮してください。

# 既存Issue（重複防止参考）
{最新の Open Issue タイトル一覧を埋め込み}

# 出力フォーマット
最終確認時は以下のJSON形式で出力:
{
  "state": "confirming" | "gathering",
  "user_reply": "ユーザーに見せる自然文",
  "draft_issue": {  // state=confirming 時のみ
    "title": "...",
    "body": "...",
    "labels": ["from-family", "..."]
  }
}
```

---

## 付録B: 環境変数一覧

```env
# LINE
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=

# Gemini (AI Studio)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

# GitHub
GITHUB_TOKEN=
GITHUB_OWNER=
GITHUB_REPO=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Auth
ALLOWED_LINE_USER_IDS=U1,U2,U3
USER_DISPLAY_NAME_MAP={"U1":"本人"}

# App
NEXT_PUBLIC_APP_ENV=production
```

---

## 付録C: 削除・縮退したもの（前版からの変更履歴）

| 項目 | 前版 | 今版 | 理由 |
|------|------|------|------|
| ホスティング | Cloud Run | Vercel | 食材管理アプリと統一、知見流用 |
| DB | Firestore | Upstash Redis | Vercel親和性、TTL機能、サーバーレス最適 |
| AI | Claude API | Gemini 2.5 Flash | 食材管理アプリと統一、無料枠で十分 |
| Phase 4 RAG | あり | **削除** | Geminiの1Mコンテキストで代替 |
| Phase 5 Slack | あり | **削除** | Slack内Claudeアプリで代替 |
| Phase 6 スキル/MCP | あり | **プロンプトテンプレ化** | Bot化不要 |
| 工数合計 | 8-11週末 | 3-4週末 | 上記削減 + 既存スタック流用 |
| 月額コスト | ~$5 | $0 | 全部無料枠 |
