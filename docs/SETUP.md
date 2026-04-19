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

## 6. Vercel デプロイ
