# タスク一覧

> 本ファイルは骨組み。内容は [DESIGN.md](./DESIGN.md) §6, §10 を起点に Phase 1 着手時に転記する。

## Phase 0: 外部サービス設定（進行中）

### ✅ 完了

- [x] リポジトリ初期構成（Next.js 16 スキャフォールド + docs/ 骨組み）
- [x] GitHub リポジトリ登録（main ブランチ、public）
- [x] Gemini AI Studio API キー取得（食材管理アプリと別プロジェクト・別キー、2026-04-19）
- [x] GitHub Fine-grained PAT 発行（2026-04-19 / **期限 2027-04-19**、`food-inventory-app` の Issues Read/Write のみ）
- [x] Upstash Redis インスタンス作成（2026-04-19、Regional AP-NORTHEAST-1 Tokyo、無料枠、SET/GET 疎通確認済み）
- [x] LINE 公式アカウント登録・Channel Secret/Access Token 取得（2026-04-19、アカウント名「食材アプリ 意見箱」、Provider `hirobirofran`、応答設定はあいさつ/応答 OFF、Webhook は Phase 1 で URL 設定と同時に ON 予定）

### 🔲 次にやること

- [ ] Vercel プロジェクト作成・環境変数設定

### 🔔 期限管理・定期作業

- [ ] **PAT 更新（次回期限: 2027-04-19）** — 1 週間前に Google カレンダー通知予定。手順は [docs/SETUP.md §5.3](./SETUP.md#53-更新手順期限切れが近づいたとき)

## Phase 1: 最小往復（未着手）

詳細は [DESIGN.md §10](./DESIGN.md) の Phase 1 Definition of Done を参照。

## Phase 2: 家族展開（未着手）

## Phase 3: 複数プロジェクト対応（未着手）
