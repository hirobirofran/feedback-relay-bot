# 環境構築手順書

> 本ファイルは骨組み。Phase 0 残作業（LINE 公式アカウント登録、Vercel プロジェクト作成、Upstash 設定）完了時に記入する。

## 前提

## 1. 開発環境の起動

## 2. LINE Messaging API の設定

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
