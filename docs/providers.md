# プロバイダ本番切替手順

開発時はすべて mock。本番では以下の手順で実 API に切り替えます。

## 1. AI (LLM)

### Anthropic Claude

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
MODEL_SMART=claude-sonnet-4-6
MODEL_FAST=claude-haiku-4-5
```

- リトライ: 5xx / 429 を最大 4 回、指数バックオフ (0.5s → 1s → 2s → 4s)
- JSON 出力時は system prompt に JSON Schema を追記し、応答からコードフェンスを剥がす
- 失敗は throw せず `{ ok: false }` を返却。呼び出し側でフォールバック

### Google Gemini

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL_SMART=gemini-2.5-pro
GEMINI_MODEL_FAST=gemini-2.5-flash
```

- `@google/generative-ai` SDK を使用
- JSON 出力は `responseMimeType=application/json` + `responseSchema` で直接強制
- 同じくリトライ・フォールバックポリシーは Anthropic と同等

切替には `process.env.AI_PROVIDER` を変えるだけで他コードは変更不要です。

## 2. メール (Resend)

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
EMAIL_FROM=Growlink <no-reply@growlink.example>
EMAIL_REPLY_TO=support@growlink.example
```

- mock 時は `.storage/sent-emails/*.eml` に書き出し
- 失敗は `EmailLog` に `status=failed` で記録、呼び出し側でリトライ判断

## 3. STT (Whisper / Deepgram)

```env
STT_PROVIDER=whisper   # or deepgram
```

Phase 3 では未実装スタブ。`src/lib/stt/client.ts` に provider 分岐を追加してください。

## 4. TTS (ElevenLabs / VOICEVOX)

```env
TTS_PROVIDER=elevenlabs
```

同じく未実装スタブ。`src/lib/tts/client.ts` に追加。

## 5. Twilio Programmable Voice

```env
TWILIO_PROVIDER=twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_NUMBER=+8150...
APP_BASE_URL=https://your-host
```

- 発信先 webhook は `/api/twilio/voice`、ステータスは `/api/twilio/status`
- ngrok 経由でローカルテスト可能

## 6. OCR (Google Document AI)

```env
OCR_PROVIDER=docai
GCP_DOCAI_PROJECT=...
GCP_DOCAI_LOCATION=us
GCP_DOCAI_PROCESSOR_ID=...
```

Phase 2 では未実装スタブ (`createDocAiProvider`)。
誤って実 API を叩かないよう、`docai` 選択時に `Error` を投げます。

## 7. FAX (InterFAX)

```env
FAX_PROVIDER=interfax
INTERFAX_USER=...
INTERFAX_PASS=...
```

Phase 4 で実装予定。現状は mock で `console.log` のみ。

## 8. ジョブキュー

```env
QUEUE_PROVIDER=bullmq
REDIS_URL=redis://...
WORKER_INLINE=1            # 別プロセスを立てたくない場合
```

mock (`memory`) は単一プロセス内のみ。Vercel ではプロセスをまたがないので、複雑な処理は Phase 6 で `pnpm tsx src/lib/jobs/worker.ts` を別プロセスで起動する設計。

## 9. 監視 (Sentry)

```env
SENTRY_DSN=https://...@sentry.io/...
```

設定すると `captureException` が Sentry へ送る。未設定なら no-op。
`@sentry/nextjs` の install は本番時のみ必要 (現状は雛形)。
