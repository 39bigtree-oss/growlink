// 申込フォームで使うマスタ。spec.md §3.1 / §3.2 をベースにする。

import { FacilityCategory, Gender } from "@prisma/client";

export const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: "MALE", label: "男性" },
  { value: "FEMALE", label: "女性" },
  { value: "OTHER", label: "回答しない" },
];

export const QUALIFICATION_OPTIONS = [
  "看護師",
  "准看護師",
  "保健師",
  "助産師",
  "介護福祉士",
  "介護職員初任者研修",
  "介護職員実務者研修",
  "介護支援専門員（ケアマネージャー）",
  "理学療法士",
  "作業療法士",
  "言語聴覚士",
  "社会福祉士",
] as const;

export type QualificationOption = (typeof QUALIFICATION_OPTIONS)[number];

export const FACILITY_CATEGORY_OPTIONS: Array<{
  value: FacilityCategory;
  label: string;
  group: string;
}> = [
  { value: "HOSPITAL_ACUTE", label: "急性期病院", group: "病院" },
  { value: "HOSPITAL_GENERAL", label: "総合病院", group: "病院" },
  { value: "CLINIC", label: "外来クリニック", group: "病院" },
  { value: "DAYCARE_ELDERLY", label: "デイサービス（高齢者）", group: "高齢者・通所系" },
  { value: "REHAB_DAY", label: "通所リハビリ", group: "高齢者・通所系" },
  { value: "HOMEVISIT_NURSE", label: "訪問看護（一般）", group: "高齢者・訪問系" },
  { value: "HOMEVISIT_CARE", label: "訪問介護", group: "高齢者・訪問系" },
  {
    value: "HOMEVISIT_NURSE_PSYCHIATRY",
    label: "精神科訪問看護",
    group: "精神科系",
  },
  { value: "DAYCARE_DISABILITY", label: "障害者デイサービス", group: "障害福祉" },
  { value: "HOMEVISIT_DISABILITY", label: "障害者向け訪問介護", group: "障害福祉" },
  { value: "GROUP_HOME_DISABILITY", label: "グループホーム（障害）", group: "障害福祉" },
];

export const LANGUAGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "ja", label: "日本語" },
  { value: "en", label: "英語 / English" },
  { value: "vi", label: "ベトナム語 / Tiếng Việt" },
  { value: "id", label: "インドネシア語 / Bahasa Indonesia" },
  { value: "zh", label: "中国語 / 中文" },
  { value: "tl", label: "タガログ語 / Tagalog" },
];

// よく扱う国籍（ISO 3166-1 alpha-2）。フル一覧は将来別マスタへ。
export const NATIONALITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "JP", label: "日本" },
  { value: "VN", label: "ベトナム" },
  { value: "ID", label: "インドネシア" },
  { value: "PH", label: "フィリピン" },
  { value: "CN", label: "中国" },
  { value: "MM", label: "ミャンマー" },
  { value: "NP", label: "ネパール" },
  { value: "OTHER", label: "その他" },
];
