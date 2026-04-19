# 作業ワークフロー・コミット方針

このファイルは、本リポジトリで **いつコミットを刻むか・いつブランチを切るか・PR を出すか** を定義する。Claude Code / ひろゆきさん双方が迷わず進めるための実運用ルール。

## コミット粒度

自然な区切りで自発的に `git commit` する。境界判断に迷う時だけ着手前に確認を取る。

**区切りの例**

| 区切り | 典型サイズ |
| --- | --- |
| 依存パッケージ追加 / 更新 | `package.json` + `package-lock.json` のみ |
| 機能単体の実装 | 新規 module + 関連ヘルパー + その import 箇所 |
| ドキュメント更新（単一テーマ） | `docs/XXX.md` 1〜2 ファイル |
| バグ修正 | 該当 fix + 再発防止テスト |
| 設定変更 | `next.config.ts` / `tsconfig.json` / `.env.local.example` など |

**分けない組み合わせ**

- 実装とそれに付随する `docs/TASKS.md` 更新は 1 コミットで OK（理由: 進捗の記録は実装と一体）
- 実装とそれに付随する `docs/KNOWLEDGE.md` 学び追記も 1 コミットで OK
- ただし **依存追加** と **それを使う実装** は分ける（依存追加を独立 revert できるように）

## コミットメッセージ

Conventional Commits + scope を採用。既存 commit log にならう:

```
<type>(<scope>): <短い動詞主語の説明>
```

- **type**: `feat` / `fix` / `docs` / `build` / `refactor` / `chore` / `test`
- **scope**: `line` / `gemini` / `github` / `redis` / `setup` / `claude` / `workflow` / `deps` 等
- 例:
  - `feat(line): add webhook skeleton with signature verification`
  - `docs(setup): update LINE section for 2024-09+ flow`
  - `build(deps): add @line/bot-sdk and Phase 1 helper packages`

末尾に `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` を付ける（Claude がコミットした場合）。

## コミット前に確認を取るケース

以下は自発コミットせず、**ひろゆきさんに先に聞く**:

- 複数の区切りが混ざったコミットを作ろうとしている（分割した方がよい？を確認）
- 破壊的操作を伴う（`git reset --hard` / `git push --force` / 大きなリファクタ / ファイル削除）
- コミット対象に秘密情報（`.env.local` / トークン・ID）が紛れ込んでいないか確信が持てない
- Phase 1 DoD のような **節目** に到達したとき（節目の区切り方自体を相談したい）

## ブランチ・PR 運用

**現在（develop ブランチ運用期、2026-04-19〜）**: `develop → main` の PR 運用。

- **環境マッピング**:
  - `main` → Vercel Production → **本番 LINE チャンネル「食材アプリ 意見箱」**（家族が見ている）
  - `develop` → Vercel Preview（固定 URL `feedback-relay-bot-git-develop-<team>.vercel.app`）→ **DEV LINE チャンネル「食材アプリ 意見箱 DEV」**（本人のみ）
- **基本フロー**: `develop` で実装・コミット → 本人が DEV チャンネルで触って確認 → 必要なら寝かせる → `develop → main` の PR を作成 → ひろゆきさんが GitHub UI でマージ → main 反映で家族の Bot が更新される
- **Claude Code がコミットする先**: 原則 `develop`。main 直コミット禁止（緊急 hotfix で main から短命 fix branch を切るパターンは可、その場合は事前確認）
- **PR 作成方針**: コミット粒度（前章）に従って自然な単位で develop に積み、ある程度まとまったら PR を切る。1 PR = 複数 commit で OK（むしろ過剰に PR を分けない）。PR title は最大の commit message を流用、body には変更点と動作確認結果を箇条書き
- **マージ方針**: `Squash and merge` ではなく **通常の Merge commit**（commit 履歴を残して develop と main の対応を追えるようにする）

**移行の経緯（2026-04-19）**: 「移行タイミング」リストの 2 つめ「変更を本番に反映する前にステージングで家族に触ってもらって寝かせる運用が必要」が家族公開準備のタイミングで現実化。Vercel Preview + DEV LINE チャンネルの二重化（[docs/SETUP.md §7](./SETUP.md)）と同時に develop 運用へ移行した。

**過去の運用（イニシャル期、〜2026-04-19）**: main 直コミット運用。理由はソロ開発 + 家族レビュアーで code review 不要、Vercel が main push 即デプロイなので branch を切る手間が無かったため。Phase 1 完了までこのモードで進めた。

## 参照

- コミット粒度の背景: `memory/feedback_commit_cadence.md` に個別ケース判断の記録あり
- ドキュメント戦略: `memory/feedback_claudemd_delegation.md` に CLAUDE.md 肥大化回避ルールあり
