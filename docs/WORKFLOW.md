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

**現在（イニシャル期）**: main 直コミットで進める。

- 理由: ソロ開発 + レビュー窓が「家族 = プロダクト評価観点」で **コード review は不要**。コードレビューに相当する品質担保は `docs/TASKS.md` の DoD チェックリストで代替
- Vercel は main push 即デプロイなので、動作確認のたびにブランチを切る手間もない

**移行タイミング（= feature branch + PR を導入する時）**

以下のどれかに該当したら main 直運用を終える:

- 2 人目以降の開発者（Claude 以外）が入る
- 「変更を本番に反映する前にステージングで家族に触ってもらって 1 日寝かせる」運用が必要になった
- 複数の機能を並行開発するため branch で分離する必要が出た
- Phase 2 以降、壊すと家族が困るリスクが上がった

移行時は本ファイルに「20YY-MM-DD 以降は feature branch + PR 運用」と追記する。

## 参照

- コミット粒度の背景: `memory/feedback_commit_cadence.md` に個別ケース判断の記録あり
- ドキュメント戦略: `memory/feedback_claudemd_delegation.md` に CLAUDE.md 肥大化回避ルールあり
