# Runbook 00: オンコール引き継ぎ手順

## 目的
週次でオンコール担当を交代するときの引き継ぎ手順を統一する。

## 引き継ぎチェックリスト

### 1. 直近 7 日間の状態確認
- [ ] `https://[base-url]/admin/dashboard` — KPI に異常が出ていないか (生存率急落 / 反応率急落)
- [ ] `https://[base-url]/admin/audit?action=` — 直近の監査ログで異常 action が無いか
- [ ] `https://[base-url]/admin/nurture` — ACTIVE シナリオの滞留 (stuck) が無いか
- [ ] `https://[base-url]/admin/dispatch-ledgers` — **抵触日まで 30 日以内**のレコードを確認、対応漏れが無いか

### 2. ヘルスチェック実行
```bash
curl -s https://[base-url]/api/health | jq .
curl -s -H "Cookie: <admin session cookie>" https://[base-url]/api/health/deep | jq .
```
すべて `ok` が出ること。

### 3. 環境変数 / プロバイダ状態
- [ ] `/admin/system-status` で MOCK 状態の機能が想定どおりか
- [ ] AI_PROVIDER / EMAIL_PROVIDER / BIAS_EVAL_PROVIDER がすべて意図通りか

### 4. PR / インシデント未対応
- [ ] GitHub Open PR がレビュー待ちで残っていないか
- [ ] Sentry (`SENTRY_DSN` 設定後): 未解決 issue 数

### 5. 連絡先 / オンコール担当
- 当週担当: \_\_\_\_\_\_\_\_ さん (Slack DM / 電話: \_\_\_\_)
- 次週担当: \_\_\_\_\_\_\_\_ さん
- 緊急: ADMIN 全員 (admin@growlink.local 含む) + 代表

## 引き継ぎ時の質問テンプレ
1. 今週進行中の重大インシデントはあるか?
2. 直近で本番接続 (Gemini / Resend など) が増えたか?
3. 来週中に抵触日や請求期日を迎える Placement / Invoice はあるか?
4. デプロイ予定はあるか? あれば何曜日?
