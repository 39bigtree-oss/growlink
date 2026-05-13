# Security — Tsumugi

## 1. 脅威モデルの要旨

| 想定脅威 | 影響 | 対策 |
|---|---|---|
| 求職者情報 (PII) の流出 | 法的責任・信用毀損 | DB と LLM の境界で必ずマスク。`lib/mask.ts` を経由しないコードは PR レビューで弾く |
| トークン総当たり (skill-sheet / interview / feedback) | 第三者による編集・閲覧 | 24 文字 base64url 乱数 + 期限 (skill/interview) / HMAC SHA256 (feedback) |
| 大量申込スパム | DB 肥大化・運用負荷 | 同一 IP に対する `/api/applicants` のレート制限 (5 件 / 5 分) |
| Cross-Site Scripting | セッション奪取 | CSP, `X-Content-Type-Options=nosniff`, React の自動エスケープ |
| Clickjacking | 操作のなりすまし | `X-Frame-Options=DENY` |
| マイクロサービス間横移動 | 権限昇格 | RBAC × AuditLog で記録、最小権限ロール |
| 国家公的情報 (在留資格) の漏洩 | 法的責任 | `ResidenceStatus` を別テーブルに分離し、将来の権限分離を可能に |

## 2. 認証 / 認可

- **認証**: Auth.js v5 (NextAuth) — Credentials (bcrypt 12 round) + Magic Link (Resend)
- **認可**: `src/lib/auth/rbac.ts` の Capability。`hasCapability(role, "fax:send")` で全エンドポイント・全画面分岐
- **セッション**: Database Session、CSRF は Next.js Server Action / Route Handler 標準
- 本番ではメールは `EMAIL_PROVIDER=resend` + SPF/DKIM/DMARC 設定が必須 (`docs/providers.md`)

## 3. 入力検証

- 全ての API 入力に Zod スキーマ (`src/lib/schemas/*`)
- ファイルアップロードは MIME と拡張子のホワイトリスト (`storeResume` 内 MAX 10MB)
- CSV インポートは独自パーサで RFC 4180 風、PG injection は Prisma の prepared statement で完全防御

## 4. 監査ログ

- 全ての PATCH/POST/DELETE 操作で `recordAuditLog` を呼ぶ慣習
- 重要イベント:
  - `applicant.status_changed` / `diagnosis.run` / `fax_sheet.send` / `interview.completed` / `residence_status.updated`
- 保管期間: 当面無期限。Phase 6 で 1 年保持 + archive 設計

## 5. 暗号化

- パスワード: bcrypt 12 round
- DB 通信: TLS (本番は Railway / AWS RDS の TLS 標準)
- LLM API: 各社の HTTPS / SLA に依存
- 反応トークン: HMAC SHA256, `AUTH_SECRET` 由来。タイムセーフ比較 (`timingSafeEqual`)

## 6. ヘッダ (`next.config.mjs`)

- `Content-Security-Policy`: self + 必要な inline (`recharts`/`react-pdf` 都合)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## 7. シークレット管理

- `.env.local` は Git 管理外 (`.gitignore`)、`pnpm` インストール時の警告は無視しない
- 本番では Railway / Vercel / AWS Secret Manager に集約、コードに埋め込まない
- API キーをログに出さないこと (provider 内部で raw key を console.log しない設計)

## 8. データ削除請求

- 求職者から「削除して」と言われたら `Applicant.deletedAt` をセット (論理削除)
- 30 日後の cron で物理削除 (Phase 6 で実装予定)
- すべての関連テーブル (`SkillSheet` 等) は CASCADE で同時削除

## 9. 脆弱性報告

- 内部: GitHub Issue で `security` ラベル
- 外部: `security@growlink.example` へ非公開連絡 (Phase 6 で `SECURITY.md` の連絡先を整備)
- 90 日 disclosure ポリシー (報告 → 修正 → 公開)

## 10. レビューチェックリスト

PR レビュー時:
- [ ] PII を LLM に渡す前段で `lib/mask.ts` を通しているか
- [ ] AuditLog に記録しているか
- [ ] レート制限は必要か (公開エンドポイントの場合)
- [ ] エラーメッセージに内部情報を漏らしていないか
- [ ] テストで認証なしケース・期限切れトークンケースをカバーしているか
