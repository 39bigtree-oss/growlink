/**
 * Tsumugi (紡) プロダクトブランド定数。
 *
 * 製品名と運営会社名を分離 (会社: 株式会社グロウリンク)。
 * すべての文言・メタデータ・PDF・メールはこの定数を参照すること。
 */

export const BRAND = {
  /** プロダクト英字名 (URL / メタ / コード参照向け) */
  name: "Tsumugi",
  /** 同 + 漢字 (UI 装飾用) */
  nameJp: "紡",
  /** 表示用フルネーム */
  fullName: "Tsumugi",
  /** 製品キャッチコピー (日本語) */
  taglineJa: "AI が、人と現場を丁寧に紡ぐ。",
  /** 同 (英語) */
  taglineEn: "Weave people into the right place, with care.",
  /** 1〜2 文の説明 */
  descriptionJa:
    "医療・福祉に特化した AI 採用・営業自動化プラットフォーム。求職者の申込から AI 適職診断・AI 面接・施設紹介までを一気通貫で支援します。",
  descriptionEn:
    "An AI-powered recruitment & sales-automation platform built for healthcare and welfare staffing. From application to AI interview to facility referral, end-to-end.",
  /** 運営会社 */
  company: {
    nameJa: "株式会社グロウリンク",
    nameEn: "Growlink Inc.",
  },
  /** 連絡 / 法務リンク (placeholder) */
  contact: {
    supportEmail: "support@growlink.example",
    websiteUrl: "https://growlink.example",
  },
} as const;

export type Brand = typeof BRAND;
