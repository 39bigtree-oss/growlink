# API リファレンス

すべてのレスポンスは `{ "ok": boolean, ... }` 形式の JSON。
認証が必要なエンドポイントは Auth.js のセッション Cookie で判定。

## 公開エンドポイント (認証不要)

### `POST /api/applicants`

求職者の申込登録。

- レート制限: 同一 IP で 5 件 / 5 分
- リクエスト:
  ```json
  { "lastName": "山田", "firstName": "花子", "lastNameKana": "ヤマダ", ... }
  ```
- レスポンス:
  - `201 { ok: true, applicantId: "..." }`
  - `409 { ok: false, error: "ALREADY_REGISTERED" }`
  - `400 { ok: false, error: "VALIDATION_ERROR", issues: [...] }`
  - `429 { ok: false, error: "RATE_LIMITED", resetAt: 1700000000000 }`

### `POST /api/skill-sheet/[token]/save`

スキルシート途中保存。

### `POST /api/skill-sheet/[token]/submit`

スキルシート提出 → `SKILL_SHEET_DONE` に進める。

### `POST /api/skill-sheet/[token]/resume` (multipart)

履歴書 PDF / 画像をアップ → OCR → Claude 構造化 → SkillSheet マージ。
`?async=1` でジョブ経由 (202)。

### `POST /api/interview/[token]/turn`

AI 面接の `start` / `ask` / `answer` アクション。

### `POST /api/interview/[token]/end`

面接終了 → finalize ジョブ enqueue。

### `POST /api/feedback/[token]`

FAX 反応の受け付け (署名付きトークン、HMAC SHA256)。

### `POST /api/twilio/voice` (TwiML)

Twilio からの音声 webhook。`<Say>` + `<Gather>` で 5 ターン進行。

### `POST /api/twilio/status`

Twilio の通話ステータスコールバック。`completed` で finalize ジョブを起動。

### `GET /api/health`

サーバと DB 疎通の確認。`200 { ok, checks, ts }` or `503`。

---

## 管理エンドポイント (認証 + RBAC)

### `POST /api/diagnosis`

| Cap | `applicants:write` (実行する staff の Session が必要) |
|---|---|

AI 適職診断を実行。`?async=1` でジョブ経由 (202)。`regenerate: true` で再生成。

### `GET /api/diagnosis/[id]/pdf`

診断結果 PDF をストリーム返却。

### `POST /api/fax-sheets`

| Cap | `fax:create` |

`{applicantId, facilityId}` または `{applicantId, facilityIds[]}` で 1〜100 件まで生成。
`?async=1` でジョブ経由 (202)。

### `GET /api/fax-sheets/[id]/pdf`

| Cap | `fax:read` | PDF ストリーム。

### `POST /api/fax-sheets/[id]/send`

| Cap | `fax:send` | mock の場合は console.log のみ。`?async=1` でジョブ。

### `POST /api/fax-sheets/[id]/reaction`

内部用反応記録 (公開ルートは `/api/feedback/[token]`)。

### `POST /api/admin/applicants` (v1.2)

| Cap | `applicants:write` | スタッフが求職者を **代理登録**。
リクエスト: `applicantFormSchema` (`agreedToTerms` 除外)。
動作: 申込登録 → AI 適職診断 → 診断 PDF を **招待メールに添付** して送信。
レスポンス: `{ ok, applicantId, diagnosisProvider, inviteSent, pdfAttached }`。

### `POST /api/admin/facilities/import` (multipart)

| Cap | `facilities:write` | CSV 一括インポート。`{created, updated, failed, results[]}` を返す。

### `POST /api/admin/applicants/[id]/skill-sheet/invite`

| Cap | `applicants:write` | スキルシート入力リンクを再送 (mock メール送信)。

### `POST /api/admin/interviews`

| Cap | `interviews:write` | Interview + Token 発行 + 招待メール。

### `POST /api/admin/interviews/[id]/turn`

| Cap | `interviews:write` | シミュレータ用 `start` / `ask` / `answer`。

### `POST /api/admin/interviews/[id]/end`

| Cap | `interviews:write` | endedAt 設定 + finalize ジョブ enqueue。

### `PUT /api/admin/applicants/[id]/residence-status`

| Cap | `applicants:write` | 在留資格 upsert。

### `DELETE /api/admin/applicants/[id]/residence-status`

同上、削除。

---

## 共通

- 401 `UNAUTHORIZED` / 403 `FORBIDDEN` / 404 `NOT_FOUND` / 410 `expired|revoked` / 429 `RATE_LIMITED`
- すべての成功時に `AuditLog` 記録 (`recordAuditLog`)
- バリデーションは Zod で実装。失敗は `400 { ok:false, error:"VALIDATION_ERROR", issues:[...] }`
