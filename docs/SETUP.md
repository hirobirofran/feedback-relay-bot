# 環境構築手順書

> 本ファイルは骨組み。Phase 0 残作業（LINE 公式アカウント登録、Vercel プロジェクト作成、Upstash 設定）完了時に記入する。

## 前提

## 1. 開発環境の起動

## 2. LINE Messaging API の設定

家族とのフィードバック会話の入口となる LINE 公式アカウント (= Messaging API チャンネル)。家族 LINE から 1:1 チャットで送信 → Vercel の Webhook が受信 → Bot 返信という構成。

> **Claude Code への指示:** LINE Developers Console の UI は頻繁に変わる。手順書は**目的の値（Channel Secret、Channel Access Token、LINE 公式アカウントの友達追加 URL）が取れる**ことを優先し、UI のボタン位置等に固執しない。迷ったら画面開いた状態でブラウザ側 AI（Claude in Chrome 等）に現在 UI でのガイドを頼む。

### LINE 方針サマリ

- **チャンネル種別**: Messaging API
- **プラン**: フリープラン（月 200 通まで無料メッセージ送信。家族規模で十分）
- **応答設定**: 自動応答・あいさつ・グループチャットは **OFF**（Bot 側で全応答を制御するため）
- **Webhook URL**: Phase 0 時点は未設定 or ダミー。Phase 1 で Vercel 本番 URL に差し替え
- **認証設計**: `ALLOWED_LINE_USER_IDS` ホワイトリスト + 署名検証で不特定多数の起票を防ぐ（[DESIGN.md §7](./DESIGN.md) 参照）

### 2.1 LINE Business ID 登録（初回のみ）

LINE Developers Console は **LINE Business ID** という独立のアカウント体系。普段使いの LINE アカウント（スマホの LINE アプリ）とは別物だが、それと紐づける形で作る。

1. <https://developers.line.biz/console/> にアクセス
2. 「Log in with LINE」を選択し、個人の LINE アカウントでログイン
3. 初回はメールアドレス登録と認証メール確認を求められる → ひろゆきさんのメールアドレスで認証
4. 開発者名（Developer Name、公開されない管理用）を入力して登録完了

### 2.2 Provider 作成

Provider は複数のチャンネルをまとめる会社/組織単位のコンテナ。個人でも 1 個は必要。

1. Console のトップで **Create a new provider**
2. Provider name: `hirobirofran`（または任意。公開されないので後で変更可）
3. Create

> 将来、食材管理アプリや他の Bot も同じ Provider にぶら下げられる。この段階で分ける必要はない。

### 2.3 Messaging API チャンネル作成（LINE 公式アカウント経由）

> **UI 変更あり（2024-09 時点）**: LINE Developers Console から Messaging API チャンネルを直接作成する導線は**廃止**された。まず Official Account Manager で LINE 公式アカウントを作成 → Messaging API を有効化する順序になる。チャンネル自体は最後に Developers Console 側へ自動的に出現する。

1. Developers Console の Provider 画面で **Create a new channel** → Messaging API の枠にある **「LINE公式アカウントを作成する」** 緑ボタンを押す → `manager.line.biz` に遷移
2. LINE Official Account Manager で以下を入力:

    | 項目 | 値 |
    | --- | --- |
    | アカウント名 | `食材アプリ 意見箱`（**7 日間変更不可**。家族の LINE 連絡先に出る名前なので慎重に） |
    | メールアドレス | 受信用メール |
    | 会社・事業者の所在国・地域 | `日本` |
    | 業種（大業種／小業種） | `個人` → `個人（IT・コンピュータ）` |
    | 運用目的 | `お問い合わせに対応したい` ・ `お客さんとチャットしたい` 等 |
    | 主な使い方 | `チャット・LINEコール用` |
    | 接続先の組織 | ビジネスマネージャーの組織名を入力（例: `食材管理アプリ フィードバック窓口`）。これは OA 側の組織コンテナで Provider とは別概念 |

3. 規約同意 → **作成**
4. Official Account Manager の設定画面で **Messaging API** の利用を有効化
5. Provider 選択ダイアログで **既存の `hirobirofran` を選ぶ**（新規作成しない。管理がバラける）
6. 有効化完了 → Developers Console に戻るとチャンネルが自動で出現している

作成直後にここで一旦休憩可能。続きは 2.4 以降（チャンネル設定と Token 取得）。

### 2.4 Channel Secret と Channel Access Token の取得

この作業は **LINE Developers Console 側** で行う（Official Account Manager では Channel secret / Access token は表示されない）。Official Account Manager 画面の「その他の設定は LINE Developers コンソールから行えます」リンクから遷移するのが早い。

1. Developers Console の対象チャンネルを開く
2. **Basic settings** タブ → 下にスクロール → **Channel secret** をコピー
3. **Messaging API** タブに切り替え（最初に開いた時点では「Messaging API 未有効化」状態のことがある。その場合はタブ内の **Enable Messaging API** を押して有効化）
4. **Channel access token** セクションの **Issue** をクリックして長期トークンを発行 → コピー（再表示可能）
5. `.env.local` に追記:

    ```env
    LINE_CHANNEL_SECRET=（コピーした Channel secret）
    LINE_CHANNEL_ACCESS_TOKEN=（コピーした Channel access token）
    ```

6. `.env.local` が ignore されていることを確認:

    ```bash
    git check-ignore .env.local
    ```

### 2.5 応答設定を Bot 専用に切り替え

デフォルトだと LINE 側のあいさつ文・自動応答が ON になっていて Bot の返信と競合する。Phase 0 では 2 項目だけ OFF にして、Webhook は Phase 1 で Vercel URL 設定と同時に ON にする（URL 未設定では Webhook を ON にできない LINE 仕様のため）。

1. <https://manager.line.biz/> で対象アカウント（例: `食材アプリ 意見箱`）を開く
2. 左メニューの **設定** → **応答設定** (`.../setting/response`)
3. 以下を操作:

    | UI 項目（現行） | 設定 | 備考 |
    | --- | --- | --- |
    | チャット | **オフ**（= Bot モード） | 新 UI では旧「応答モード」を「チャット」トグル単独で表現。オフ = Bot 優先 |
    | あいさつメッセージ | **オフ** | Bot 側で決め打ち文を返すため |
    | 応答メッセージ | **オフ** | Bot が全応答を管理 |
    | Webhook | オフのまま（**Phase 1 で ON**） | Webhook URL が空だと ON にできない。Phase 1 で Vercel URL 設定と同時に切り替え |

4. グループ・複数人トーク参加は（UI にあれば）**オフ** に。UI から消えている場合は無視でよい

> **UI ラベル変更の履歴**: 旧手順書は「応答モード = Bot」「あいさつメッセージ 無効」「応答メッセージ 無効」「Webhook 有効」の 4 項目を想定。現行 UI は「チャット」「あいさつメッセージ」「応答メッセージ」「Webhook」の 4 トグル構成。目的は同じ（Bot がすべての応答を制御）。
>
> **既知のハマりどころ**: LINE の応答設定は Developers Console と Official Account Manager の 2 箇所で同期される。片方だけ変更しても反映されないことがあるので、疑問があれば両方を確認する。

### 2.6 友達追加の確認

1. LINE 公式アカウント作成時、本人の LINE アカウントは**自動で友達追加済み**の場合がある（LINE Business ID 経由のログインのため）
2. 念のため QR コード読み取りでも確認可能:
   - **Developers Console** の **Messaging API** タブ下部の **QR code**、または
   - **Official Account Manager** の **ホーム** → **友だちを増やす** 配下の QR コード
3. スマホの LINE トーク一覧で当該アカウントが表示されればメッセージ送信可能な状態

> **userId は Phase 1 で取得**: `ALLOWED_LINE_USER_IDS` に入れる値は、友達追加後に実際にメッセージを送って Webhook が受信したときのログから取れる。Phase 0 時点ではプレースホルダのまま（`.env.local.example` の値を参照）。Phase 1 で Webhook を実装したら、初回メッセージ受信のログから userId をコピーして `.env.local` と Vercel env に入れる運用にする。

### 2.7 更新手順（Token 再発行時）

Channel Secret は原則変更しない（漏洩時のみ）。Channel Access Token は Developers Console → **Messaging API** タブ → **Reissue** で再発行できる（旧トークン即無効）。

1. Developers Console の対象チャンネルを開く
2. **Messaging API** タブ → **Channel access token** → **Reissue**
3. `.env.local` の `LINE_CHANNEL_ACCESS_TOKEN` を書き換え
4. Vercel 環境変数 `LINE_CHANNEL_ACCESS_TOKEN` を書き換え（UI から直接入力）
5. Vercel で再デプロイ、LINE から test メッセージを送って疎通確認

期限の概念は無いので定期更新は不要。漏洩時のみ。

## 3. Upstash Redis の設定

LINE ユーザーごとの会話状態（`state`・`messages`・`draft`）を保持するストレージ。24 時間 TTL で自動消滅。Vercel のサーバーレス関数から HTTP REST で叩くので、通常の Redis SDK ではなく `@upstash/redis` を使う。

> **Claude Code への指示:** このセクションの手順をユーザーと進めるとき、Database 作成自体は Upstash Web UI 専用。`.env.local` / Vercel env の更新と、疎通確認までは伴走する。

### Upstash 方針サマリ

- **Type**: Regional（Global は家族規模では過剰。価格も上がる）
- **Region**: `ap-northeast-1` (Tokyo) — 日本在住家族利用、Vercel のエッジと低レイテンシ
- **Eviction**: `allkeys-lru`（デフォルト。24h TTL 使うので事実上効かないが保険として）
- **TLS**: 有効（デフォルト）
- **料金**: Free tier（月 10,000 コマンド、256MB）— 家族規模で余裕

### 3.1 Database 作成手順

1. <https://console.upstash.com/> にアクセス（GitHub login が最速）
2. **Redis** タブ → **Create Database**
3. 以下を設定:

    | 項目 | 値 |
    | --- | --- |
    | Name | `feedback-relay-bot` |
    | Type | **Regional** |
    | Primary Region | **AP-NORTHEAST-1 (Tokyo)** |
    | Eviction | ✅ Enabled (`allkeys-lru`) |
    | TLS | ✅ Enabled (デフォルト) |

4. **Create** をクリック
5. Database 詳細画面で **Details** タブを選び、下にスクロールして **Connect** セクションを開く
6. **Connect** 内の **REST** タブが選択されていることを確認（隣に TCP タブあり）
7. 👁 アイコンで Token を表示、📋 アイコンで 2 行まとめてコピー。コピーした内容をそのまま `.env.local` に貼り付ける（形式は下記、`"..."` のダブルクォート込みで OK）:

    ```env
    UPSTASH_REDIS_REST_URL="https://xxxxx.upstash.io"
    UPSTASH_REDIS_REST_TOKEN="..."
    ```

   > **UI 変更に注意**: 以前は独立した「REST API」タブがあったが現在は Details → Connect → REST に統合されている（2026-04-19 時点）。将来さらに UI が変わる可能性あり。その場合はブラウザで画面を開いた状態で AI（Claude in Chrome など）にガイドしてもらうのが早い。

8. `.env.local` が ignore されていることを確認:

    ```bash
    git check-ignore .env.local
    # → .env.local が返れば OK
    ```

### 3.2 疎通確認

SDK 未導入のうちは REST API を curl で直接叩いて確認する:

```bash
# トークンを一度シェルに読み込む (履歴に残さない)
export UPSTASH_URL_TMP=$(grep '^UPSTASH_REDIS_REST_URL=' .env.local | cut -d'=' -f2-)
export UPSTASH_TOKEN_TMP=$(grep '^UPSTASH_REDIS_REST_TOKEN=' .env.local | cut -d'=' -f2-)

# SET + GET の往復テスト (TTL 60 秒で即消える)
curl -s -H "Authorization: Bearer $UPSTASH_TOKEN_TMP" \
  "$UPSTASH_URL_TMP/set/conv:test/hello?EX=60"
curl -s -H "Authorization: Bearer $UPSTASH_TOKEN_TMP" \
  "$UPSTASH_URL_TMP/get/conv:test"

unset UPSTASH_URL_TMP UPSTASH_TOKEN_TMP
```

期待: 1 行目が `{"result":"OK"}`、2 行目が `{"result":"hello"}`。認証失敗は 401、URL 誤りは 404。

Phase 1 実装後は `@upstash/redis` SDK 経由で使う。`import { Redis } from '@upstash/redis'; const redis = Redis.fromEnv();` で env から自動読み込みされる。

### 3.3 更新手順（Token 再発行時）

Token は Upstash 側で **Roll Token** することで再発行できる（旧 Token は即無効）。漏れた時や定期ローテーション時に使う。

1. <https://console.upstash.com/> の `feedback-relay-bot` database → **REST API** タブ
2. **Roll Token** をクリック → 新 Token が発行される
3. `.env.local` の `UPSTASH_REDIS_REST_TOKEN` を新値で**書き換える**
4. Vercel ダッシュボード → プロジェクト → Settings → Environment Variables → `UPSTASH_REDIS_REST_TOKEN` を**書き換える**（UI から直接入力）
5. Vercel で再デプロイ、疎通確認

期限切れの概念は Upstash にはないので、定期更新は不要。漏洩時のみ実行。

## 4. Gemini API の設定

食材管理アプリと**別プロジェクト・別キー**にする。無料枠 (RPD/TPM) はプロジェクト単位で共有されるため、同プロジェクトだと両アプリで食い合う。

### 手順

1. [Google AI Studio](https://aistudio.google.com/) にログイン（Google アカウント）
2. 左メニューの **Get API key** を開く
3. **Create API key** をクリック
4. プロジェクト選択で **Create API key in new project** を選ぶ（食材管理アプリの `gen-lang-client-*` プロジェクトとは別の新しいプロジェクトが自動作成される）
5. 生成されたキー文字列をコピー
6. ルート直下に `.env.local` を作成（まだ無ければ）し、以下を追記:

    ```env
    GEMINI_API_KEY=（コピーしたキーをここに貼る）
    GEMINI_MODEL=gemini-2.5-flash
    ```

7. `.env.local` がコミット対象外であることを確認:

    ```bash
    git check-ignore .env.local
    # → .env.local が返ればOK（ignore されている）
    ```

### 確認ポイント

- キー文字列は AIza... で始まる形
- AI Studio の **Get API key** 画面で、作成されたプロジェクト名が `gen-lang-client-*` 形式の**新規プロジェクト**（食材管理アプリの既存プロジェクトと別）であること
- 「請求先アカウントなし」の無料枠プロジェクトであること（Google Cloud コンソールで請求情報が紐づいていると prepayment credits 扱いになり、無料枠と別管理になる）

### 既知のハマりどころ（食材管理アプリ KNOWLEDGE.md より）

- モデル名は世代交代が早い。DESIGN.md 時点では `gemini-2.5-flash` を採用
- レート制限は 10 req/min。家族規模なら問題ないが、連続リクエストの開発テストで 429 を出しやすい
- レスポンスの JSON が ` ```json ... ``` ` で囲まれることがあるので、Gemini Client 側で抽出正規表現が必要（Phase 1 実装時）

## 5. GitHub Fine-grained PAT の発行

feedback-relay-bot が食材管理アプリ [food-inventory-app](https://github.com/hirobirofran/food-inventory-app) に Issue を起票するための認証トークン。Fine-grained PAT を選ぶ理由は、対象リポジトリと権限を最小に絞れるため。

> **Claude Code への指示:** このセクションの手順をユーザーと進めるとき、PAT の発行自体は GitHub Web UI 専用で API 化できない。`.env.local` / Vercel env の更新と、完了後の疎通確認までは伴走する。

### PAT 方針サマリ

- **種類**: Fine-grained personal access token (classic PAT は使わない)
- **対象リポジトリ**: `hirobirofran/food-inventory-app` のみ
- **権限**: `Issues: Read and write`, `Metadata: Read-only` (必須)。他はすべて `No access`
- **期限**: **1 年**（GitHub の fine-grained 最大値。無期限は選ばない）
- **管理**: 発行日と期限日を [docs/TASKS.md](./TASKS.md) に明記、期限 1 週間前の Google カレンダー通知を別途仕込む

### 5.1 初回発行手順

1. <https://github.com/settings/personal-access-tokens/new> にアクセス
2. 以下を設定:

    | 項目 | 値 |
    | --- | --- |
    | Token name | `feedback-relay-bot (prod)` |
    | Expiration | Custom → **1 年後の日付** |
    | Description | `feedback-relay-bot が food-inventory-app に Issue 起票するためのトークン` |
    | Resource owner | `hirobirofran` |
    | Repository access | **Only select repositories** → `food-inventory-app` を選択 |

3. **Permissions** を開いて以下だけ設定（他は触らない = No access のまま）:

    | カテゴリ | 権限 | 値 |
    | --- | --- | --- |
    | Repository permissions | Issues | **Read and write** |
    | Repository permissions | Metadata | **Read-only** (Issues を選ぶと自動で付与される) |

4. **Generate token** → 生成された `github_pat_...` で始まる文字列をコピー（**この画面を閉じると二度と表示されない**）
5. `.env.local` に追記:

    ```env
    GITHUB_TOKEN=（コピーしたトークンをここに貼る）
    GITHUB_OWNER=hirobirofran
    GITHUB_REPO=food-inventory-app
    ```

6. `.env.local` が ignore されていることを確認:

    ```bash
    git check-ignore .env.local
    # → .env.local が返れば OK
    ```

7. 発行日・期限日を [docs/TASKS.md](./TASKS.md) の Phase 0 セクションに記録（例: `PAT 発行 2026-04-19 / 期限 2027-04-19`）

### 5.2 疎通確認

Phase 1 で Octokit クライアントを実装したら、以下で認証が通ることを確認する（Phase 0 時点では未実装なので後回し）:

```bash
# Phase 1 実装後に追加予定
npm run check:github
```

暫定的には、`.env.local` の値をシェル変数に読み込んで curl で確認もできる:

```bash
# トークンを一度シェルに読み込む (履歴に残さない)
export GH_TOKEN_TMP=$(grep '^GITHUB_TOKEN=' .env.local | cut -d'=' -f2-)
curl -s -H "Authorization: Bearer $GH_TOKEN_TMP" \
  https://api.github.com/repos/hirobirofran/food-inventory-app \
  | head -20
unset GH_TOKEN_TMP
```

期待: `"full_name": "hirobirofran/food-inventory-app"` 等のメタ情報が返る。401 なら認証失敗、404 なら権限スコープ誤り。

### 5.3 更新手順（期限切れが近づいたとき）

GitHub から期限 30 日前・7 日前にメールが来る。Google カレンダー通知でも 1 週間前にリマインド予定（§5.4 参照）。更新時の手順:

1. <https://github.com/settings/personal-access-tokens> にアクセス
2. 期限切れ間近のトークンを開いて **Regenerate token** を押す
3. Expiration を **1 年後** に再設定
4. 新しいトークン文字列をコピー（古い値は無効になる）
5. `.env.local` の `GITHUB_TOKEN` を**書き換える**
6. Vercel ダッシュボード → プロジェクト → Settings → Environment Variables → `GITHUB_TOKEN` を**書き換える**（CLI stdin 経由は履歴に残るので UI から直接入力）
7. Vercel で再デプロイ（自動 or 手動）、本番で LINE からテストメッセージを送って疎通確認
8. [docs/TASKS.md](./TASKS.md) の期限日を更新
9. Google カレンダーに**来年分の通知イベントを新規作成**（1 回限り運用、§5.4 の仕込み手順を参照）

> **Claude Code に頼むときの一言**: 「`docs/SETUP.md §5.3` の PAT 更新手順で進めて」と言えば、Claude がこの手順を読んで `.env.local` 更新と疎通確認までガイドする。PAT 発行そのもの（ステップ 2-4）だけは Web UI 手動。

### 5.4 期限リマインドの仕込み

PAT 発行（または更新）のたびに、期限日の **1 週間前** を Google カレンダーに 30 分の通知イベントとして登録する。毎回 1 回限りの単発イベント（年次繰り返しにしない）で、更新時に次回分を新しく作る運用。

**現在のイベント**: 2027-04-12 (月) 9:00 JST（2026-04-19 発行 PAT の期限 2027-04-19 に対するリマインド。Google カレンダーで登録済み。）

**イベント仕込み手順（Claude Code に頼む場合）**:

Claude Code に以下を依頼する:

> 「Google Calendar MCP で feedback-relay-bot PAT 更新イベントを作って。期限 YYYY-MM-DD の 1 週間前、9:00-9:30 JST、1 回限り。説明欄に SETUP.md §5.3 へのリンクと Claude Code への依頼例を入れて」

Claude は `mcp__claude_ai_Google_Calendar__create_event` を以下パラメータで呼ぶ:

| パラメータ | 値 |
| --- | --- |
| summary | `feedback-relay-bot PAT 更新（期限 YYYY-MM-DD）` |
| startTime | `YYYY-MM-DDT09:00:00` (期限の 1 週間前) |
| endTime | `YYYY-MM-DDT09:30:00` |
| timeZone | `Asia/Tokyo` |
| location | `https://github.com/hirobirofran/feedback-relay-bot` |
| description | 更新手順リンク + Claude Code への依頼例 |

## 6. Vercel デプロイ

Next.js アプリと API Route を Vercel の Hobby プラン（無料）で本番ホストする。食材管理アプリと同じアカウント・同じ方針（ダッシュボード UI から直接入力 / CLI は使わない）。

> **Claude Code への指示:** プロジェクト作成と env 投入は Vercel Web UI 専用。Claude Code からできるのは `.env.local` の値読み取り（チャットに出さずユーザーに見せる形）と、デプロイ後の URL 疎通確認。

### Vercel 方針サマリ

- **インポート方法**: **Dashboard → Import Git Repository**（CLI `vercel project add` は GitHub 連携が付かず不安定。食材管理アプリの KNOWLEDGE.md 参照）
- **Framework**: Next.js（自動検出）
- **環境変数投入**: Dashboard UI から**直接入力**（CLI stdin 経由はシェル履歴に残るため使わない）
- **Deployment Protection**: **Disabled**（LINE の Webhook が無認証で叩ける必要があるため。署名検証は Bot 側コードで行う）

### 6.1 プロジェクト作成

1. <https://vercel.com/> にログイン（既存アカウントで OK、food-inventory-app と同じもの）
2. **Add New...** → **Project**
3. **Import Git Repository** セクションで `hirobirofran/feedback-relay-bot` を選んで **Import**
4. 設定画面で以下を確認（ほぼ自動検出されている）:

    | 項目 | 値 |
    | --- | --- |
    | Project Name | `feedback-relay-bot`（自動） |
    | Framework Preset | Next.js |
    | Root Directory | `./`（デフォルト） |
    | Build Command | `next build`（自動） |

5. **Environment Variables** セクションを展開 → §6.2 の手順で全件入力
6. 全件入力後 **Deploy** をクリック → 初回ビルド開始（1〜2 分）

### 6.2 環境変数の投入

`.env.local` の値を Vercel Dashboard に写す。全 9 件（Phase 0 時点）。**Production / Preview / Development すべてにチェック**を入れて 1 回で済ませる（個別管理は後で必要になったら分ける）。

| Key | Value | 出どころ |
| --- | --- | --- |
| `LINE_CHANNEL_SECRET` | `.env.local` の値 | §2.4 で取得 |
| `LINE_CHANNEL_ACCESS_TOKEN` | `.env.local` の値 | §2.4 で取得 |
| `GEMINI_API_KEY` | `.env.local` の値 | §4 で取得 |
| `GEMINI_MODEL` | `gemini-2.5-flash` | 固定値 |
| `GITHUB_TOKEN` | `.env.local` の値 | §5.1 で取得 |
| `GITHUB_OWNER` | `hirobirofran` | 固定値 |
| `GITHUB_REPO` | `food-inventory-app` | 固定値 |
| `UPSTASH_REDIS_REST_URL` | `.env.local` の値 | §3.1 で取得 |
| `UPSTASH_REDIS_REST_TOKEN` | `.env.local` の値 | §3.1 で取得 |

> **秘密情報は貼らない**: Vercel UI には `.env.local` から 1 件ずつコピペで入れる。Claude Code のチャットに値を貼らないこと（メンテ支援を頼むときは「投入済み」「投入漏れ」だけ伝える）。
>
> **食材管理アプリ KNOWLEDGE.md の教訓**: PowerShell のパイプ経由で `vercel env` を叩くと値が空になったり末尾改行が付いたりする既知問題がある。UI から直接入力すれば起きない。

`ALLOWED_LINE_USER_IDS` / `USER_DISPLAY_NAME_MAP` は Phase 1 で Webhook が最初の userId を拾ったら入れる。Phase 0 では**未設定でよい**。

### 6.3 Deployment Protection を Disabled に

デフォルトだと Vercel Authentication が ON で、LINE からの Webhook リクエストが 401 で弾かれる。Phase 0 の hello-world 状態では外界からアクセスさせる必要はないが、Phase 1 で Webhook を繋ぐ前に必ず Disabled にする（今のうちにやっておくほうが忘れないので推奨）。

1. プロジェクトダッシュボード → **Settings** → **Deployment Protection**
2. **Vercel Authentication** セクションで **Standard Protection** → **Disabled** に変更
3. **Save** を必ず押す（食材管理アプリ KNOWLEDGE.md の実体験より、Save 忘れが頻発する）

### 6.4 疎通確認

初回デプロイが Ready になったら:

1. プロジェクトの **Domains** 欄から URL を確認（例: `https://feedback-relay-bot.vercel.app/` や `https://feedback-relay-bot-xxxxx.vercel.app/`）
2. ブラウザ or curl でアクセス:

    ```bash
    curl -sI https://feedback-relay-bot.vercel.app/ | head -5
    ```

    期待: `HTTP/2 200` が返る。401 なら Deployment Protection が残っている。404 なら Domains 欄の URL を再確認

3. [docs/TASKS.md](./TASKS.md) の Phase 0 完了リストに「Vercel プロジェクト作成 + 初回デプロイ成功」「本番 URL: （確定した URL）」を記録

### 6.5 Phase 1 Webhook 疎通手順（実測済み 2026-04-19）

Phase 1 の Webhook スケルトン（[src/app/api/line/webhook/route.ts](../src/app/api/line/webhook/route.ts)）が main に入って Vercel 自動デプロイが Ready になった後、以下の順で疎通を確認する。

#### 6.5.1 GET ヘルスチェック

```bash
curl -s https://feedback-relay-bot.vercel.app/api/line/webhook
# 期待: {"ok":true,"path":"/api/line/webhook"}
```

401 が返る場合は Deployment Protection が ON に戻っている（§6.3 参照）。404 の場合はまだデプロイ反映前。

#### 6.5.2 LINE Developers Console で Webhook URL 設定

1. [LINE Developers Console](https://developers.line.biz/console/) → Provider `hirobirofran` → 該当 Messaging API チャンネル
2. **Messaging API** タブ → **Webhook settings**
3. **Webhook URL** に `https://feedback-relay-bot.vercel.app/api/line/webhook` を入力 → **Update**
4. **Use webhook** トグルを **ON**
5. **Verify** ボタンを押下 → `Success.` 表示を確認
   - 仕組み: LINE は空 events の POST を送ってくる。`validateSignature` はこのリクエストにも正しい署名を付けてくるので通る
6. LINE Official Account Manager の **応答設定** → **Webhook** トグルも **ON**（Console 側だけでは足りないケースあり）

#### 6.5.3 初回 userId の回収と投入（ここが Phase 1 特有）

**理由**: `ALLOWED_LINE_USER_IDS` は Phase 0 時点ではまだ自分の userId を知らないので未設定。Webhook が初めてメッセージを受けたときの `unauthorized` ログから userId を拾う必要がある。これは Phase 1 の**正常フロー**であり、エラーではない。

1. LINE アプリから Bot にメッセージ送信（内容は何でも可、例: `テスト`）
2. Vercel Dashboard → feedback-relay-bot → **Logs** タブ（または最新デプロイの Inspector → **Runtime Logs**）
3. `[line-webhook] unauthorized userId=U<32 文字> type=message` の行を探す
4. `U` で始まる 33 文字をコピー（チャットや外部には貼らない。Vercel 画面内で完結させる）
5. Vercel Dashboard → **Settings** → **Environment Variables** → **Add New**
   - Key: `ALLOWED_LINE_USER_IDS`
   - Value: 上記の userId 1 件（複数の場合はカンマ区切り、例: `U111,U222`）
   - Environments: **Production / Preview / Development** 全てにチェック → **Save**
6. **再デプロイが必要**。最新デプロイの `⋯` → **Redeploy**（Use existing Build Cache のままで OK）
7. Ready になってから LINE に再度メッセージ送信
8. ログに `[line-webhook] received authorized event type=message userId=U...` が出れば疎通完了

#### 6.5.4 `.env.local` への反映

ローカル dev で同じ userId で試せるように、`.env.local` の `ALLOWED_LINE_USER_IDS=` にも同じ値を入れておく。`.env.local.example` には**値を貼らない**（プレースホルダのまま）。

## 7. （欠番・予約）

Phase 2（Redis 会話状態機械 / 会話設計の見直し）の手順枠として欠番扱い。実装着手時にここを埋める。

## 8. 家族公開前の Production 切替

Phase 1 A 案完了直後は Production / Preview / Development 全環境が **sandbox リポ (`feedback-relay-bot-sandbox`) + `[TEST]` タイトル付与** で動いている。家族に LINE 公式アカウントの友達追加 URL を渡す前に、Production スコープだけを本丸リポに切り替える。

> **Claude Code への指示:** このセクションは「家族公開」という判断が発生する瞬間にオーナー（ひろゆきさん）と一緒に実行する前提で書かれている。切替後は本丸リポ `hirobirofran/food-inventory-app` に実 Issue が立つので、誤実行のリスクが最も高い。必ず §8.5 の実機疎通まで終えてから家族に URL を渡す。

### 8.1 方針

- **Production のみ本丸切替**。Preview と Development は `feedback-relay-bot-sandbox` + `FEEDBACK_BOT_MODE=test` のまま**恒久維持**する
- **理由**: Preview 経路を常時 sandbox に向けておくと、main にマージ前の PR プレビュー or ブランチデプロイで動作確認したときに本丸リポを汚さない。これが**家族公開後の唯一のデグレ検知手段**（テストスイート未整備のため）
- sandbox 側は今後も残し、家族以外（本人の動作確認用途）でも活用する

### 8.2 Vercel env 切替（UI 手順）

1. [Vercel Dashboard](https://vercel.com/) → feedback-relay-bot プロジェクト → **Settings** → **Environment Variables**
2. `GITHUB_REPO` 行の `⋯` → **Edit**
    - Value: `food-inventory-app`
    - Environments: **Production のみにチェック**（Preview / Development のチェックは外す）
    - **Save**
3. Preview / Development 用の `GITHUB_REPO=feedback-relay-bot-sandbox` は**別エントリとして残す**（同じ Key を環境別に複数保持できる）。未登録なら **Add New** で追加:
    - Key: `GITHUB_REPO`
    - Value: `feedback-relay-bot-sandbox`
    - Environments: Preview / Development
4. `FEEDBACK_BOT_MODE` も同様に:
    - Production: `production`
    - Preview / Development: `test`
5. **`ALLOWED_LINE_USER_IDS` は全環境共通**（§6.5.3 で投入済み）のままで良い。家族分を追加する場合はここで**カンマ区切りで追記**（例: `U<本人>,U<家族1>,U<家族2>`）

**秘密値は触らない**: `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN` / `GITHUB_TOKEN` / `GEMINI_API_KEY` / Upstash 資格情報は本セクションで変更する必要がない。

### 8.3 Vercel MCP 補足（Claude 伴走時）

Claude Code が伴走している場合、以下の MCP ツールで確認・支援ができる:

- `mcp__vercel__vercel-get-environments` — 現在の env エントリを列挙。**値は暗号化されているため見えない**が、どの Key がどの Environment で設定されているかは確認できる
- `mcp__vercel__vercel-create-environment-variables` — 新規追加
- `mcp__vercel__vercel-remove-environment-variable` — 削除

**初回の Production 切替は UI 手順を推奨**。誤操作時に「いま何が Production に入っているか」を Dashboard の一覧で目視できる方が安全。以降のメンテ（家族追加など値の追記だけ）は MCP 経由でも差し支えない。

### 8.4 Redeploy（必須）

env を保存しただけでは動いているデプロイには反映されない（既知、[KNOWLEDGE.md 2026-04-19 Phase 1 着手セッション](./KNOWLEDGE.md) 記載）。

1. Vercel Dashboard → **Deployments** タブ → 最新の **Production** デプロイの `⋯` → **Redeploy**
2. **Use existing Build Cache** は ON のままで OK
3. Status が **Ready** になるまで待つ（通常 1-2 分）

### 8.5 実機疎通確認（家族に URL を渡す前に必ず実施）

1. LINE アプリから Bot に短いテキストを 1 通送信（例: `テスト送信です`）
2. [feedback-relay-bot-sandbox リポ](https://github.com/hirobirofran/feedback-relay-bot-sandbox) には **Issue が立たないこと** を確認（Production 切替後なので本丸に飛ぶはず）
3. [food-inventory-app リポ](https://github.com/hirobirofran/food-inventory-app) の Issues に **新規 Issue が立っていること** を確認
4. タイトル冒頭に **`[TEST]` が付いていないこと** を確認（`FEEDBACK_BOT_MODE=production` が効いている証拠）
5. LINE 側で受け取った返信文が `受け取りました、ありがとうございます。...` で始まることを確認
6. 動作確認で立った Issue は **即 close**（本丸リポを汚染しないため）。削除は慎重に（削除権限がある場合でも履歴が残らないので close 推奨）

### 8.6 ロールバック

家族公開後に不具合が見つかり sandbox に戻したい場合:

1. §8.2 の手順で Production スコープの `GITHUB_REPO` を `feedback-relay-bot-sandbox`、`FEEDBACK_BOT_MODE` を `test` に戻す
2. §8.4 の Redeploy を実施
3. 本丸リポに誤起票された Issue があれば close
4. LINE 公式アカウントを **一時停止** したい場合: LINE Developers Console → Messaging API → **Webhook** トグルを OFF（Webhook URL は残して OK）

元に戻すときは逆手順。Preview/Development を一切触っていないので、Production だけの往復で済む。
