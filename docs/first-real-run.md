# First Real Run Guide — 実運用 0 → 1 のチェックリスト

> v1.8 時点。「全部 mock のまま」を脱出して、**生身の運用を 1 回回す** ための手順書。

## 前提
- v1.0〜v1.8 のコードが local に pull されている
- `pnpm dev` が起動できる状態
- 個人 Gemini プラン (月 ¥3,000) または Anthropic Console アカウントがある

---

## Phase A: AI を実プロバイダに切り替える

### A-1. API キーの取得

| プロバイダ | URL | 推奨用途 |
|---|---|---|
| **Gemini** (個人 ¥3,000/月) | https://aistudio.google.com/app/apikey | 全 AI 機能 (低コスト) |
| Anthropic Claude | https://console.anthropic.com/ | 高品質が必要な診断のみ |

### A-2. `.env.local` を更新

```bash
# 既存の AI_PROVIDER=mock を以下に置換
AI_PROVIDER=gemini
GEMINI_API_KEY=AIzaSy...

# 任意: モデル指定
MODEL_SMART=gemini-2.0-flash
MODEL_FAST=gemini-2.0-flash
```

### A-3. 再起動 + 状態確認

```bash
# pnpm dev を再起動
# ブラウザで /admin/system-status を開く
# → ai.diagnosis / ai.interview / ai.skill_sheet_parsing / ai.fax_cover が
#    "Mock" → "利用可" (緑) に切り替わっていること
```

### A-4. 1 件で品質チェック

1. `/admin/applicants` → 適当な求職者 1 名を選択
2. AI 診断タブ → 「AI 診断を実行」ボタン
3. **出力された日本語コメントを目視で確認**:
   - 不自然な日本語、医療福祉ドメインでおかしい単語、差別的な表現が無いか
   - 11 業態のスコアに極端な偏りが無いか
4. **問題があれば**: `src/prompts/diagnosis.md` を編集 → 再実行 → 期待値を `tests/ai/decisions/golden/` に保存
5. **問題なければ**: スクショを取り、Slack / 社内ドキュメントに共有

### A-5. AI 品質チェック完了の判定基準

- [ ] 出力の日本語が自然 (機械翻訳臭が薄い)
- [ ] 11 業態すべてに「pro / con コメント」が一貫している
- [ ] 不適切な属性 (年齢 / 性別 / 国籍) を含む推論をしていない
- [ ] PII (氏名 / 電話) が出力に漏れていない
- [ ] 同じ求職者で 3 回再生成 → スコアの揺らぎが ±5 以内

---

## Phase B: メール送信を実プロバイダに

### B-1. Resend アカウント

1. https://resend.com/ で無料登録
2. Domain を verify (DNS TXT レコード追加)
3. API キー発行

### B-2. `.env.local` を更新

```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxx
EMAIL_FROM=Tsumugi <no-reply@your-domain.com>
EMAIL_REPLY_TO=staff@your-domain.com
```

### B-3. 1 件で動作確認

1. `/admin/applicants/new` で自分自身の Gmail で代理登録
2. 招待メールが Gmail に届くか
3. 添付の診断 PDF が開けるか
4. 5 言語切替が正しく反映されているか

---

## Phase C: 施設ポータルを 1 施設に開く

### C-1. テスト施設に発行

1. `/admin/facilities` → 1 件選択
2. 詳細ページ下部 「ポータル URL を発行」をクリック
3. クリップボードに URL がコピーされる
4. メール / LINE で施設に送付

### C-2. 施設目線で動作確認

1. シークレットウィンドウで URL を開く (ログイン不要であることの確認)
2. 自分宛 FAX 一覧が出るか
3. 「興味あり」反応を送信できるか
4. 反応が `/admin/fax-sheets/[id]` に反映されるか

---

## Phase D: ナーチャシナリオ起動

### D-1. シナリオ手動起動 (UI 自動起動は v1.9)

```bash
# Prisma Studio で直接 NurtureSequence レコードを作成
# OR psql で:
INSERT INTO "NurtureSequence" (
  id, "applicantId", trigger, status, steps, "currentStep",
  "startedAt", "nextRunAt", "createdAt", "updatedAt"
)
VALUES (
  'test-seq-1', '<applicantId>', 'FAX_SENT_NO_REPLY', 'ACTIVE',
  '[{"kind":"WAIT","waitDays":0,"label":"即時実行 test"},{"kind":"STAFF_TODO","label":"TODO","todoMessage":"テスト TODO"}]',
  0, NOW(), NOW(), NOW(), NOW()
);
```

### D-2. scan を実行

`/admin/nurture` → 「scan を今すぐ実行」ボタン

ステップが進み、`NurtureStepExecution` レコードが作られることを確認。

---

## Phase E: 監査チェーンの整合性確認

### E-1. 整合性検証

`/admin/audit` → 「全件チェーン整合性を再計算」→ "整合性 OK" メッセージ

### E-2. チェックポイント保存

`/admin/audit` → 「チェックポイントを保存」→ 件数表示

### E-3. 改ざんを検知できるかテスト

```sql
-- 任意の 1 レコードの after を改ざん
UPDATE "AuditEvent" SET after = '{"hacked": true}' WHERE id = '<id>';
```

→ `/admin/audit` で「全件チェーン整合性を再計算」→ **改ざん検知メッセージ**が出ることを確認。

---

## Phase F: 初運用チェックリスト (最終)

実運用 1 週間の前に以下が全部 ✅ であること:

- [ ] AI が実プロバイダで動く (Phase A)
- [ ] メールが Gmail に届く (Phase B)
- [ ] 施設ポータルが施設目線で使える (Phase C)
- [ ] ナーチャシナリオが scan で進む (Phase D)
- [ ] 監査チェーンの改ざん検知が動く (Phase E)
- [ ] `/api/health/deep` が全項目 ok
- [ ] バックアップ取得 `pnpm tsx scripts/backup-db.sh` を実行済
- [ ] リストア試験を 1 度実施済 (`docs/runbook/01-db-down.md`)
- [ ] On-call ローテーション表が決まっている (`docs/runbook/00-on-call-handover.md`)
- [ ] Sentry DSN を設定 (個人 Free プラン可)

---

## Phase G: 初運用 1 ヶ月後の振り返り

- 出力の AI 品質: golden tests に追加 / 修正
- 退職実績: Placement の attritionAt を埋めて生存率を回す
- 監査チェックポイント: 毎月 1 日に手動保存 → v1.9 で自動化
- ナーチャシナリオ: 「実は不要だった」シナリオを整理

実運用で出てきた問題を集約 → v1.9 のバックログにする。
