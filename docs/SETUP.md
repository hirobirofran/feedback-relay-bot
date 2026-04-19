# 環境構築手順書

> 本ファイルは骨組み。Phase 0 残作業（LINE 公式アカウント登録、Vercel プロジェクト作成、Upstash 設定）完了時に記入する。

## 前提

## 1. 開発環境の起動

## 2. LINE Messaging API の設定

## 3. Upstash Redis の設定

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

### 方針サマリ

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
