# Runbook 03: AI クォータ超過 / 課金上限到達

## 症状
- AI 診断ボタンを押すと「Quota exceeded」エラー
- ダッシュボードの AI 機能が一斉に失敗

## 対応

### 1. provider 別の確認

#### Gemini (Google AI Studio / Vertex AI)
- 個人プラン: 月 ¥3,000 で月 X 万トークン
- [Google AI Studio billing](https://aistudio.google.com/app/billing) で残量確認
- 即時の救済: **AI_PROVIDER=mock に切り替えて再起動** (`.env.local`)

#### Anthropic Claude
- [Anthropic Console](https://console.anthropic.com/) で残高確認
- pre-pay 残高 < $5 ならクレジット追加

### 2. ロールバック手順

```bash
# .env.local を編集 (mock に戻す)
AI_PROVIDER=mock
# Next.js を再起動 (pnpm dev or Vercel redeploy)
```

これで `/admin/system-status` の AI 機能が一斉に MOCK 表示に戻り、
スタッフの誤解を防げる。

### 3. クォータ拡張

- Gemini: クレジットカード追加 → 月額上限を引き上げ
- Anthropic: pre-pay 追加

### 4. レート制限の見直し

`src/lib/security/rate-limit.ts` で AI 系 endpoint のレート制限を
**1 リクエスト/秒 × 3 同時実行**程度に絞る (現状: 無制限)。

## 予防策

- 月利用量メーター (v1.8 で feature-status ダッシュに追加検討)
- Anthropic / Gemini の利用上限を **月予算の 80%** で alert
- Bias eval を Claude Haiku で実行する場合は **batch API** を使う (50% 割引)
