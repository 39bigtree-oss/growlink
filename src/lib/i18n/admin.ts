/**
 * v1.9: 管理画面の i18n 基盤 (最小実装)。
 *
 * 設計判断:
 *   - 既存の求職者向け i18n (config.ts) は 5 言語 (ja/en/vi/id/zh) で動いている。
 *     管理画面は当面 ja/en の 2 言語のみ。外国人事務スタッフ運用が始まったら拡張。
 *   - 文字列はネストした dict object。`useAdminT()` (CSR) と `adminT()` (SSR) で参照。
 *   - 言語切替は Cookie `tsumugi_admin_locale` で永続化。
 *   - 不足キーは ja にフォールバック。
 */

export type AdminLocale = "ja" | "en";

export const ADMIN_LOCALES: AdminLocale[] = ["ja", "en"];
export const DEFAULT_ADMIN_LOCALE: AdminLocale = "ja";
export const ADMIN_LOCALE_COOKIE = "tsumugi_admin_locale";

export type AdminDict = {
  nav: {
    dashboard: string;
    applicants: string;
    sales: string;
    fax_sheets: string;
    facilities: string;
    job_orders: string;
    contracts: string;
    placements: string;
    invoices: string;
    my_numbers: string;
    nurture: string;
    audit: string;
    ai_reviews: string;
    system_status: string;
    settings: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    funnel: string;
    ar_aging: string;
    operating_mode: string;
  };
  ai_review: {
    page_title: string;
    pending: string;
    approved: string;
    edited: string;
    rejected: string;
    decision: string;
    approve: string;
    edit: string;
    reject: string;
  };
  common: {
    save: string;
    cancel: string;
    back: string;
    create: string;
    detail: string;
    loading: string;
    submit: string;
  };
};

const ja: AdminDict = {
  nav: {
    dashboard: "ダッシュボード",
    applicants: "申込一覧",
    sales: "営業フロー",
    fax_sheets: "FAX 送信票",
    facilities: "施設マスタ",
    job_orders: "求人案件",
    contracts: "取引契約",
    placements: "紹介成立",
    invoices: "請求書",
    my_numbers: "マイナンバー",
    nurture: "ナーチャ自動化",
    audit: "監査ログ",
    ai_reviews: "AI 出力レビュー",
    system_status: "機能状態",
    settings: "設定",
  },
  dashboard: {
    title: "ダッシュボード",
    subtitle: "主要 KPI と過去 30 日のトレンド、施設別反応率を表示します。",
    funnel: "採用ファネル (8 段階)",
    ar_aging: "売掛回収状況 (AR Aging)",
    operating_mode: "運用モード",
  },
  ai_review: {
    page_title: "AI 出力レビュー (Responsible AI)",
    pending: "未承認 (要対応)",
    approved: "承認",
    edited: "編集後承認",
    rejected: "却下",
    decision: "決定",
    approve: "そのまま承認",
    edit: "編集して承認",
    reject: "却下",
  },
  common: {
    save: "保存",
    cancel: "キャンセル",
    back: "戻る",
    create: "作成",
    detail: "詳細",
    loading: "読み込み中...",
    submit: "送信",
  },
};

const en: AdminDict = {
  nav: {
    dashboard: "Dashboard",
    applicants: "Applicants",
    sales: "Sales pipeline",
    fax_sheets: "Fax sheets",
    facilities: "Facilities",
    job_orders: "Job orders",
    contracts: "Contracts",
    placements: "Placements",
    invoices: "Invoices",
    my_numbers: "My Number records",
    nurture: "Nurture automation",
    audit: "Audit log",
    ai_reviews: "AI output review",
    system_status: "Feature status",
    settings: "Settings",
  },
  dashboard: {
    title: "Dashboard",
    subtitle: "KPIs, 30-day trends, and facility response rates.",
    funnel: "Hiring funnel (8 stages)",
    ar_aging: "Accounts Receivable Aging",
    operating_mode: "Operating mode",
  },
  ai_review: {
    page_title: "AI output review (Responsible AI)",
    pending: "Pending (needs action)",
    approved: "Approved",
    edited: "Edited & approved",
    rejected: "Rejected",
    decision: "Decision",
    approve: "Approve as is",
    edit: "Edit & approve",
    reject: "Reject",
  },
  common: {
    save: "Save",
    cancel: "Cancel",
    back: "Back",
    create: "Create",
    detail: "Detail",
    loading: "Loading...",
    submit: "Submit",
  },
};

export function getAdminDict(locale: AdminLocale | string | undefined): AdminDict {
  if (locale === "en") return en;
  return ja;
}

/**
 * SSR 用ヘルパ: ドット区切りキーで翻訳を引く。
 *   adminT("nav.dashboard", "en") → "Dashboard"
 *   adminT("nav.unknown", "en")   → "nav.unknown" (フォールバック)
 */
export function adminT(key: string, locale: AdminLocale | string | undefined = "ja"): string {
  const dict = getAdminDict(locale) as unknown as Record<string, unknown>;
  const parts = key.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return key;
    }
  }
  return typeof cur === "string" ? cur : key;
}
