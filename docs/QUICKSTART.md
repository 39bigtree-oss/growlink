# Quickstart (ローカルで 5 分起動)

## 前提

- Node 22.x / pnpm 9.x
- Docker + Docker Compose

## 手順 (コピペで動く)

```bash
# 1. 依存関係
pnpm install

# 2. DB + Redis を Docker で起動
docker compose up -d

# 3. 環境変数 (デモ用、全 provider mock)
cp .env.example .env.local
echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env.local

# 4. DB マイグレーション + デモシード
pnpm prisma:migrate
pnpm prisma:seed

# 5. 開発サーバ起動
pnpm dev
```

http://localhost:3000 を開きます。

## デモシナリオ

### 1. 求職者として申込

1. http://localhost:3000/apply を開く
2. 4 ステップで入力 → 送信
3. コンソールに以下が出ます:
   ```
   [email:mock] 送信 { template: 'applicant.skill_sheet_invite', to: '...', subject: '...', storedKey: 'sent-emails/...' }
   ```
4. `.storage/sent-emails/*.eml` を開くと招待リンク (`/skill-sheet/<token>`) があります

### 2. スキルシート入力

1. 招待リンクを開く
2. 6 タブを順に埋める (途中保存可)
3. 「履歴書アップロード」タブで適当な PDF / 画像をアップ → OCR mock が学歴・職歴を埋める
4. 「提出」で完了

### 3. スタッフとして承認

1. http://localhost:3000/login で `admin@growlink.local` / `growlink-admin-pass`
2. `/admin/applicants` → 申込詳細
3. 「AI 診断を実行」→ 結果 PDF 確認
4. 「面接タブ」→「面接を予約」→ シミュレータで AI ↔ 求職者を進行
5. 「FAX タブ」→「新規 FAX 送信票」→ 施設複数選択で一括生成
6. 一覧から PDF プレビュー + 「送信」

### 4. 反応を入れる

1. FAX 送信票一覧から PDF を開き、reaction URL を取得 (`/feedback/<token>`)
2. `/feedback/<token>` を開いて「興味あり」で送信
3. `/admin/sales` で「最近の興味あり反応」に表示される

### 5. KPI 確認

`/admin/dashboard` で:
- 8 KPI カード
- 30 日トレンド (申込 / FAX 送信 / 返信)
- 施設別 反応率 Top 20

## トラブルシュート

| 症状 | 対処 |
|---|---|
| `pnpm prisma:migrate` で接続エラー | `docker compose ps` で db が healthy か確認 |
| `next dev` で `Module not found` | `pnpm install` をやり直す |
| `pnpm test` で fax PDF が timeout | 初回フォント読み込みで 80 秒程度かかる (180s 余裕あり) |
| ログインできない | seed を流し直す (`pnpm prisma:seed`) |

## 主要 URL

| URL | 用途 |
|---|---|
| `/apply` | 求職者の申込フォーム |
| `/skill-sheet/<token>` | スキルシート入力 (求職者) |
| `/interview/<token>` | AI 面接 (求職者) |
| `/feedback/<token>` | FAX 返信フォーム (施設) |
| `/admin/dashboard` | KPI ダッシュボード |
| `/admin/applicants` | 申込一覧 |
| `/admin/sales` | 営業フローハブ |
| `/admin/fax-sheets` | FAX 送信票管理 |
| `/admin/facilities` | 施設マスタ |
| `/api/health` | ヘルスチェック |
