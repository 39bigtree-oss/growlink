/**
 * フィーチャ状態レジストリ — Tsumugi の全機能の "今どこまで使えるか" を一元管理。
 *
 * 目的: スタッフが画面を触る前に「これは本物? mock? 制限あり?」が一目で分かる。
 * UI の `<FeatureStatusBanner>` / `<FeatureStatusBadge>` から参照される他、
 * /admin/system-status ページが一覧表示する。
 *
 * 環境変数で実プロバイダ接続が切り替わる項目は `runtimeState()` で動的判定。
 * それ以外はハードコード (機能の実装フェーズに依存)。
 */

export type FeatureCategory =
  | "core"
  | "ai"
  | "email"
  | "telephony"
  | "fax"
  | "ocr"
  | "compliance"
  | "billing"
  | "integration"
  | "security"
  | "ux";

/**
 * 状態定義:
 *   READY      — 本番運用可。実プロバイダ接続済 or 内部実装で完結。
 *   MOCK       — UI / DB は動くが、外部呼び出しは mock。本番接続待ち。
 *   LIMITED    — 動くが、月件数 / 機能の一部に制限あり (無料枠など)。
 *   PLANNED    — まだ実装されていない (将来予定)。
 *   ROADMAP    — 設計のみ。実装はずっと先。
 */
export type FeatureState = "READY" | "MOCK" | "LIMITED" | "PLANNED" | "ROADMAP";

export type FeatureKey =
  // core
  | "auth.login"
  | "auth.rbac"
  | "auth.mfa"
  | "auth.sso"
  // ai
  | "ai.diagnosis"
  | "ai.interview"
  | "ai.skill_sheet_parsing"
  | "ai.bias_eval"
  | "ai.fax_cover"
  // email
  | "email.send"
  // telephony
  | "telephony.voice_interview"
  | "telephony.sms"
  // fax
  | "fax.send"
  // ocr
  | "ocr.resume"
  | "ocr.my_number_card"
  // compliance
  | "compliance.dispatch_ledger"
  | "compliance.anti_teishoku"
  | "compliance.my_number_storage"
  | "compliance.residence_expiry_alert"
  | "compliance.audit_chain"
  // billing
  | "billing.invoice"
  | "billing.refund_policy"
  | "billing.attrition_risk"
  | "billing.csv_export"
  // integration
  | "integration.e_sign"
  | "integration.accounting"
  | "integration.line"
  | "integration.google_calendar"
  | "integration.job_board"
  // security
  | "security.csp_headers"
  | "security.rate_limit"
  | "security.waf"
  | "security.rls_multitenant"
  // ux
  | "ux.mobile_drawer"
  | "ux.i18n_5lang_jobseeker"
  | "ux.i18n_admin"
  // v1.8: 内部システムの "正面突破" 機能群
  | "portal.facility_view"
  | "nurture.engine"
  | "analytics.attrition_record"
  | "analytics.survival_rate"
  | "matching.haversine"
  | "matching.skill_hierarchy"
  | "compliance.audit_checkpoint"
  | "observability.health_deep";

export type FeatureMeta = {
  key: FeatureKey;
  /** 画面表示名 */
  name: string;
  category: FeatureCategory;
  /** ハードコード状態。runtimeState() がある場合はそちらが優先される。 */
  state: FeatureState;
  /** 1 行で「今何が起きるか」を説明 */
  summary: string;
  /** 制限内容 (LIMITED 時に表示) */
  limits?: string[];
  /** 接続先プロバイダ (READY/MOCK 時の表示) */
  provider?: string;
  /** 本番接続にいくらかかるか (月額目安) */
  productionCost?: string;
  /** どのバージョンで本番接続予定か */
  plannedVersion?: string;
  /** 関連ドキュメント */
  docs?: string[];
  /** 環境変数を見て状態を動的判定 (READY / MOCK / LIMITED を返す) */
  runtimeState?: () => Extract<FeatureState, "READY" | "MOCK" | "LIMITED">;
};

function aiProviderEnv(): "mock" | "anthropic" | "gemini" {
  const v = process.env.AI_PROVIDER ?? "mock";
  if (v === "anthropic" || v === "gemini") return v;
  return "mock";
}

function envFlag(name: string): boolean {
  return !!process.env[name] && process.env[name] !== "";
}

/**
 * フィーチャ一覧。新機能を追加するときはここに 1 行足す。
 * UI とドキュメントの both single source of truth。
 */
export const FEATURES: FeatureMeta[] = [
  // ----- core (本番運用可) -----
  {
    key: "auth.login",
    name: "ログイン (Email + Password / Magic Link)",
    category: "core",
    state: "READY",
    summary: "Auth.js v5 で Credentials + Magic Link。bcrypt パスワード保存。",
    provider: "internal",
  },
  {
    key: "auth.rbac",
    name: "ロール別権限 (RBAC)",
    category: "core",
    state: "READY",
    summary: "ADMIN / CONSULTANT / SALES / VIEWER の 4 ロール × 24 capability。",
    provider: "internal",
  },
  {
    key: "auth.mfa",
    name: "多要素認証 (MFA)",
    category: "security",
    state: "PLANNED",
    summary: "TOTP + WebAuthn を予定。現状はパスワード単独。",
    plannedVersion: "v1.8",
  },
  {
    key: "auth.sso",
    name: "SSO (SAML / OIDC)",
    category: "security",
    state: "PLANNED",
    summary: "法人グループ運用向け。導入企業が複数になったら本実装。",
    plannedVersion: "v1.8+",
  },

  // ----- ai -----
  {
    key: "ai.diagnosis",
    name: "AI 適職診断 (11 業態)",
    category: "ai",
    state: "MOCK",
    summary: "求職者の経歴 + 資格から 11 業態に対するスコアと所見を生成。",
    provider: "mock (anthropic / gemini に切替可能)",
    productionCost: "Gemini Flash で 1 件 ¥3〜¥10",
    plannedVersion: "v1.7 で Gemini 接続予定",
    runtimeState: () => (aiProviderEnv() === "mock" ? "MOCK" : "READY"),
  },
  {
    key: "ai.interview",
    name: "AI 電話面接",
    category: "ai",
    state: "MOCK",
    summary: "5 ターン × 母語切替の電話面接 + サマリ生成。テキストシミュレータ併用。",
    provider: "mock (claude / gemini + twilio + whisper + tts)",
    productionCost: "1 件 ¥80〜¥150 (8 分想定 / Twilio + STT/TTS + LLM)",
    plannedVersion: "v1.8 で Twilio + Whisper 接続",
    runtimeState: () => (aiProviderEnv() === "mock" ? "MOCK" : "READY"),
  },
  {
    key: "ai.skill_sheet_parsing",
    name: "履歴書 → スキルシート AI 構造化",
    category: "ai",
    state: "MOCK",
    summary: "OCR 後の生テキストを Claude/Gemini で正規化して SkillSheet にマージ。",
    provider: "mock (claude haiku で構造化予定)",
    productionCost: "1 件 ¥1〜¥3",
    plannedVersion: "v1.7",
    runtimeState: () => (aiProviderEnv() === "mock" ? "MOCK" : "READY"),
  },
  {
    key: "ai.bias_eval",
    name: "AI 出力バイアス検査",
    category: "ai",
    state: "MOCK",
    summary: "AI 出力に年齢/性別/国籍などの差別表現が含まれないか検査。",
    limits: [
      "ルールベース (正規表現) のみ",
      "Claude Haiku ジャッジは未接続",
    ],
    provider: "mock (Claude Haiku 予定)",
    plannedVersion: "v1.7",
    runtimeState: () =>
      process.env.BIAS_EVAL_PROVIDER === "claude_haiku" ? "READY" : "MOCK",
  },
  {
    key: "ai.fax_cover",
    name: "FAX 送信票の AI 文面生成",
    category: "ai",
    state: "MOCK",
    summary: "FAX 送信票の宛名・推薦コメントを AI で生成。",
    provider: "mock",
    plannedVersion: "v1.7",
    runtimeState: () => (aiProviderEnv() === "mock" ? "MOCK" : "READY"),
  },

  // ----- email -----
  {
    key: "email.send",
    name: "メール送信",
    category: "email",
    state: "MOCK",
    summary: "求職者向け案内、スタッフ通知、診断 PDF 添付など。",
    limits: ["mock 時: .storage/sent-emails/ に .eml を書き出すのみ (実配信なし)"],
    provider: "mock (Resend に切替可能)",
    productionCost: "Resend Free 3,000 通/月 まで無料、それ以上は ¥3,100/月",
    plannedVersion: "v1.7 で Resend 接続",
    runtimeState: () => {
      const p = process.env.EMAIL_PROVIDER ?? "mock";
      if (p === "resend" && envFlag("RESEND_API_KEY")) return "READY";
      return "MOCK";
    },
  },

  // ----- telephony -----
  {
    key: "telephony.voice_interview",
    name: "音声電話面接 (Twilio)",
    category: "telephony",
    state: "MOCK",
    summary: "Twilio Programmable Voice で求職者に電話 → AI が音声で面接。",
    limits: ["mock 時: TwiML / STT / TTS は in-process でテキスト処理"],
    provider: "mock (Twilio 予定)",
    productionCost: "Twilio Voice 1 分 ¥3〜¥5, STT/TTS 別途",
    plannedVersion: "v1.8",
  },
  {
    key: "telephony.sms",
    name: "SMS 通知",
    category: "telephony",
    state: "PLANNED",
    summary: "面接前リマインド / 提案案件通知などを SMS で送信。",
    plannedVersion: "v1.9",
  },

  // ----- fax -----
  {
    key: "fax.send",
    name: "FAX 一括送信",
    category: "fax",
    state: "MOCK",
    summary: "求職者プロフィールを A4 2 枚で施設へ FAX。送信履歴と反応トラッキング付き。",
    limits: ["mock 時: PDF を .storage/fax-sheets/ に保存するのみ (実送信なし)"],
    provider: "mock (InterFAX 予定)",
    productionCost: "InterFAX 1 通 ¥30〜¥50",
    plannedVersion: "v1.7-1.8",
  },

  // ----- ocr -----
  {
    key: "ocr.resume",
    name: "履歴書 OCR",
    category: "ocr",
    state: "MOCK",
    summary: "アップロードされた履歴書 PDF/画像を OCR → AI で構造化。",
    provider: "mock (Google Document AI 予定)",
    productionCost: "1 件 ¥3〜¥10",
    plannedVersion: "v1.8",
  },
  {
    key: "ocr.my_number_card",
    name: "マイナンバーカード OCR",
    category: "ocr",
    state: "MOCK",
    summary: "マイナンバーカード画像から 12 桁を自動抽出。",
    limits: [
      "mock: ファイル名に test-card を含めると固定値 (123456789012) を返す",
      "それ以外の画像は信頼度 0.42 の代替値",
    ],
    provider: "mock (Google Document AI 予定)",
    plannedVersion: "v1.8",
  },

  // ----- compliance (本番運用可、内部実装で完結) -----
  {
    key: "compliance.dispatch_ledger",
    name: "派遣台帳 (PDF 出力)",
    category: "compliance",
    state: "READY",
    summary: "派遣業法 第 31 条準拠の派遣元管理台帳を A4 PDF で出力。",
    provider: "internal (react-pdf)",
  },
  {
    key: "compliance.anti_teishoku",
    name: "抵触日アラート (3 年ルール)",
    category: "compliance",
    state: "READY",
    summary: "派遣台帳一覧で抵触日 90 日以内のレコードを赤色強調。",
    provider: "internal",
  },
  {
    key: "compliance.my_number_storage",
    name: "マイナンバー暗号化保管",
    category: "compliance",
    state: "READY",
    summary: "AES-256-GCM で暗号化、別テーブルで管理、閲覧時は理由必須 + アクセスログ。",
    limits: [
      "ADMIN のみ平文閲覧可、CONSULTANT 以下はマスク表示",
      "暗号化鍵 (MYNUMBER_ENCRYPTION_KEY) は .env 経由。本番は KMS 推奨。",
    ],
    provider: "internal (node:crypto)",
  },
  {
    key: "compliance.residence_expiry_alert",
    name: "在留期限アラート (日次ジョブ)",
    category: "compliance",
    state: "LIMITED",
    summary: "在留資格の有効期限 90/30/7 日前に担当営業へメール通知。",
    limits: [
      "メール送信が mock の場合は .eml に書き出すのみ (実送信なし)",
      "BullMQ + cron での自動実行はまだ未配線。`pnpm tsx scripts/run-residence-expiry-job.ts` で手動実行",
    ],
    plannedVersion: "v1.8 でスケジューラ自動化",
  },
  {
    key: "compliance.audit_chain",
    name: "監査ログ (ハッシュチェーン)",
    category: "compliance",
    state: "READY",
    summary: "全 mutation を append-only で記録、sha256 チェーンで改ざん検知。",
    provider: "internal",
  },

  // ----- billing -----
  {
    key: "billing.invoice",
    name: "請求書管理 (発行 / 入金管理)",
    category: "billing",
    state: "READY",
    summary: "Placement 作成時に紹介手数料を自動算出 + 請求書発行。入金済化アクション付き。",
    provider: "internal",
  },
  {
    key: "billing.refund_policy",
    name: "返金規定 (段階返金) + シミュレーション",
    category: "billing",
    state: "READY",
    summary: "30/60/90 日段階返金などを契約に紐付け、退職日で適用 tier を自動判定。",
    provider: "internal",
  },
  {
    key: "billing.attrition_risk",
    name: "退職予兆スコア",
    category: "billing",
    state: "LIMITED",
    summary: "在籍月数 + 雇用形態 + 給与差 + 経験などからリスクスコア (0-100) を算出。",
    limits: [
      "ルールベース (固定ロジック)",
      "ML モデル (LightGBM 等) は退職実績データが溜まってから v2.0 で",
    ],
    provider: "internal (rule-based)",
    plannedVersion: "v2.0",
  },
  {
    key: "billing.csv_export",
    name: "請求書 CSV エクスポート",
    category: "billing",
    state: "READY",
    summary: "freee / Money Forward 互換の最小フォーマットで CSV ダウンロード。",
    provider: "internal",
  },

  // ----- integration -----
  {
    key: "integration.e_sign",
    name: "電子契約 (CloudSign / GMO サイン)",
    category: "integration",
    state: "MOCK",
    summary: "Contract.eSignProvider で provider 切替。送付・署名待ちの状態管理を備える。",
    limits: ["mock: docId 払い出し + 30 秒後に signed 扱いに自動遷移"],
    provider: "mock (CloudSign / GMO サイン 予定)",
    productionCost: "CloudSign Standard ¥10,000/月 (Free は 5 件/月)",
    plannedVersion: "v1.7-1.8",
  },
  {
    key: "integration.accounting",
    name: "会計連携 (freee / Money Forward)",
    category: "integration",
    state: "MOCK",
    summary: "請求書発行 / 入金マーキング / 月次 CSV エクスポートの 3 操作。",
    limits: ["mock: in-memory 保持のみ。再起動で消える"],
    provider: "mock (freee / Money Forward 予定)",
    productionCost: "freee 法人ベーシック ¥4,000/月、MF クラウドプロ ¥4,000/月",
    plannedVersion: "v1.7-1.8",
  },
  {
    key: "integration.line",
    name: "LINE 公式アカウント連携",
    category: "integration",
    state: "PLANNED",
    summary: "求職者連絡を LINE で行う。スキルシート招待、面接前リマインドなど。",
    plannedVersion: "v1.9",
  },
  {
    key: "integration.google_calendar",
    name: "Google Calendar / Outlook 連携",
    category: "integration",
    state: "PLANNED",
    summary: "面接日程の自動調整・カレンダー登録。",
    plannedVersion: "v1.9",
  },
  {
    key: "integration.job_board",
    name: "求人ボード連携 (Indeed / 看護のお仕事 / マイナビ看護師)",
    category: "integration",
    state: "ROADMAP",
    summary: "外部求人ボードから求人案件を自動取り込み。",
    plannedVersion: "v2.x",
  },

  // ----- security -----
  {
    key: "security.csp_headers",
    name: "セキュリティヘッダ (CSP / X-Frame / Referrer)",
    category: "security",
    state: "READY",
    summary: "CSP / X-Content-Type / Referrer-Policy / Permissions-Policy / SAMEORIGIN。",
    provider: "internal (next.config.mjs)",
  },
  {
    key: "security.rate_limit",
    name: "API レート制限",
    category: "security",
    state: "LIMITED",
    summary: "申込 API / 反応 API に固定窓カウンタのレート制限。",
    limits: ["in-memory のみ。複数インスタンス本番では Redis ベースに切替必要"],
    plannedVersion: "v1.8",
  },
  {
    key: "security.waf",
    name: "WAF / DDoS 防御",
    category: "security",
    state: "PLANNED",
    summary: "Cloudflare WAF / IP 許可リスト / Bot 防御。",
    plannedVersion: "v1.8 (Vercel / Cloudflare 検討)",
  },
  {
    key: "security.rls_multitenant",
    name: "Row Level Security (マルチテナント)",
    category: "security",
    state: "ROADMAP",
    summary: "Postgres RLS で物理データ分離。",
    limits: ["内部システム = 単一テナント前提のため発動条件待ち"],
    docs: ["docs/multi-tenant-rls-plan.md"],
    plannedVersion: "発動条件次第",
  },

  // ----- ux -----
  {
    key: "ux.mobile_drawer",
    name: "モバイル UI (ドロワーメニュー)",
    category: "ux",
    state: "READY",
    summary: "サイドバーを下隅 FAB → ドロワー展開で操作可能。営業外回り対応。",
    provider: "internal",
  },
  {
    key: "ux.i18n_5lang_jobseeker",
    name: "求職者向け i18n (5 言語)",
    category: "ux",
    state: "READY",
    summary: "ja / en / vi / id / zh の 5 言語でメール本文・案内画面を切替。",
    provider: "internal",
  },
  {
    key: "ux.i18n_admin",
    name: "管理画面の i18n",
    category: "ux",
    state: "PLANNED",
    summary: "管理画面側の多言語化。外国人スタッフ運用向け。",
    plannedVersion: "v1.9+",
  },

  // ===== v1.8 「正面突破」 =====
  {
    key: "portal.facility_view",
    name: "施設ポータル (ログイン不要)",
    category: "integration",
    state: "READY",
    summary:
      "HMAC 署名 URL で施設が自分宛 FAX/案件/請求書を閲覧、反応を直接送信できる片側 SaaS の解消策。",
    provider: "internal",
  },
  {
    key: "nurture.engine",
    name: "ナーチャ自動化エンジン",
    category: "core",
    state: "LIMITED",
    summary:
      "FAX 未反応 / スキルシート未提出 / 入社 1/3 ヶ月 などのシーケンスを自動進行。BullMQ + 手動 scan で運用。",
    limits: [
      "v1.8 では EMAIL ステップは記録のみ (実送信は v1.9 で sendEmail に接続)",
      "FAX/反応/入社などのトリガー自動起動はまだ手動。順次接続中",
    ],
    provider: "internal",
    plannedVersion: "v1.9 でトリガー自動接続 + 実メール送信",
  },
  {
    key: "analytics.attrition_record",
    name: "退職実績の入力 (ML 教師データ収集)",
    category: "billing",
    state: "READY",
    summary:
      "Placement 詳細から退職日を入力 → 退職予兆スコアの確定値 + 6/12ヶ月生存率の元データになる。",
    provider: "internal",
  },
  {
    key: "analytics.survival_rate",
    name: "入社後 6 / 12 ヶ月生存率",
    category: "billing",
    state: "READY",
    summary:
      "ダッシュボードに表示。退職実績データが少ないうちは小サンプルなので注意。",
    provider: "internal",
  },
  {
    key: "matching.haversine",
    name: "Haversine 距離マッチング",
    category: "core",
    state: "LIMITED",
    summary:
      "Facility.lat/lng が設定済なら直線距離 km でスコアリング、無ければ都道府県/市区町村一致にフォールバック。",
    limits: ["lat/lng は手動入力 (geocoding API は v1.9)"],
    plannedVersion: "v1.9 で Geocoding API 連携",
  },
  {
    key: "matching.skill_hierarchy",
    name: "資格の階層的マッチ",
    category: "core",
    state: "READY",
    summary:
      "「看護師」要件に対し「認定看護師」も上位資格としてマッチ。SKILL_SUBSUMPTION テーブルで管理。",
    provider: "internal",
  },
  {
    key: "compliance.audit_checkpoint",
    name: "監査ログのチェックポイント (差分検証)",
    category: "compliance",
    state: "READY",
    summary:
      "月末スナップショット保存 → 次回は差分のみ検証することでスケールさせる。手動保存ボタンあり。",
    plannedVersion: "v1.9 で BullMQ スケジュール化",
  },
  {
    key: "observability.health_deep",
    name: "深いヘルスチェック (/api/health/deep)",
    category: "security",
    state: "READY",
    summary: "DB / Storage / Email / Queue / AI / Sentry の状態を 1 つのエンドポイントで確認。",
    provider: "internal",
  },
];

/** key で 1 件取得 */
export function getFeature(key: FeatureKey): FeatureMeta | undefined {
  return FEATURES.find((f) => f.key === key);
}

/**
 * runtime 状態を解決する。
 * `runtimeState()` が定義されていればそちらを使い、無ければ `state` をそのまま返す。
 */
export function resolveFeatureState(meta: FeatureMeta): FeatureState {
  if (meta.runtimeState) return meta.runtimeState();
  return meta.state;
}

export const STATE_LABEL: Record<FeatureState, string> = {
  READY: "利用可",
  MOCK: "Mock (動作確認用)",
  LIMITED: "制限あり",
  PLANNED: "未実装 (予定)",
  ROADMAP: "ロードマップ",
};

export const STATE_BADGE_VARIANT: Record<
  FeatureState,
  "default" | "outline" | "secondary" | "success" | "warning" | "danger" | "muted"
> = {
  READY: "success",
  MOCK: "warning",
  LIMITED: "warning",
  PLANNED: "muted",
  ROADMAP: "muted",
};

export const CATEGORY_LABEL: Record<FeatureCategory, string> = {
  core: "認証 / 基盤",
  ai: "AI 機能",
  email: "メール",
  telephony: "電話 / SMS",
  fax: "FAX",
  ocr: "OCR",
  compliance: "法令対応",
  billing: "請求 / 手数料",
  integration: "外部連携",
  security: "セキュリティ",
  ux: "UX / モバイル / i18n",
};

export const CATEGORY_ORDER: FeatureCategory[] = [
  "core",
  "compliance",
  "billing",
  "ai",
  "email",
  "fax",
  "telephony",
  "ocr",
  "integration",
  "security",
  "ux",
];
