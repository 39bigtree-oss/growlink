# グロウリンク AI採用・営業自動化システム

求職者の Web 申込から AI 適職診断・AI 電話面接・営業用 FAX 送信票生成までを
一気通貫で行う社内システムです。

詳細は次のドキュメントを参照してください。

- 業務仕様: [`spec.md`](./spec.md)
- 開発設計: [`design.md`](./design.md)
- Claude Code 向けコンテキスト: [`CLAUDE.md`](./CLAUDE.md)

## 現在のフェーズ

**Phase 1-1**: Next.js + Prisma + Auth.js 雛形作成（完了条件: プロジェクト起動 + ログイン可能）。

## セットアップ

### 1. 依存関係インストール

```bash
pnpm install
```

### 2. ローカル DB / Redis 起動

```bash
docker compose up -d
```

PostgreSQL 16 と Redis 7 が `localhost:5432` / `localhost:6379` で起動します。

### 3. 環境変数

```bash
cp .env.example .env.local
```

最低限、`AUTH_SECRET` を生成して書き換えてください。

```bash
openssl rand -base64 32
```

### 4. Prisma マイグレーション + シード

```bash
pnpm prisma:migrate
pnpm prisma:seed
```

シードで作成される初期管理者:

- Email: `admin@growlink.local`（`SEED_ADMIN_EMAIL` で上書き可能）
- Password: `growlink-admin-pass`（`SEED_ADMIN_PASSWORD` で上書き可能）

### 5. 開発サーバ起動

```bash
pnpm dev
```

http://localhost:3000 を開き、`管理画面ログイン` から上記アカウントでログインできることを確認してください。

## ログイン方式

Phase 1-1 では 2 種類の認証を用意しています。

| 方式 | 用途 | 必要設定 |
|---|---|---|
| Credentials (Email + Password) | 社内スタッフ用 | DB のみ |
| Magic Link (Resend) | スタッフ・外部協力者の招待 | `RESEND_API_KEY`（未設定時はコンソール出力にフォールバック） |

## よく使うコマンド

```bash
pnpm dev              # 開発サーバ
pnpm build            # 本番ビルド
pnpm typecheck        # tsc --noEmit
pnpm lint             # next lint
pnpm test             # vitest
pnpm prisma:studio    # Prisma Studio
```
