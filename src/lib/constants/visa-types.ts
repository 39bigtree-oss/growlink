/**
 * Phase 5: 在留資格の主要コード。値は内部キー、label は表示文字列。
 * 完全網羅ではなく、医療福祉系の採用で扱う頻度の高い区分を選定。
 */
export const VISA_TYPE_OPTIONS = [
  { value: "ENGINEER_HUMANITIES", label: "技術・人文知識・国際業務" },
  { value: "SSW1_CARE", label: "特定技能 1 号 (介護)" },
  { value: "SSW2_CARE", label: "特定技能 2 号 (介護)" },
  { value: "NURSE_TRAINEE", label: "在留資格「医療」(看護)" },
  { value: "TRAINEE_TECH_INTERN", label: "技能実習 (介護)" },
  { value: "PERMANENT", label: "永住者" },
  { value: "SPOUSE_OF_PERMANENT", label: "永住者の配偶者等" },
  { value: "LONG_TERM_RESIDENT", label: "定住者" },
  { value: "STUDENT", label: "留学" },
  { value: "FAMILY", label: "家族滞在" },
  { value: "DESIGNATED_ACTIVITIES", label: "特定活動" },
  { value: "OTHER", label: "その他" },
] as const;

export type VisaType = (typeof VISA_TYPE_OPTIONS)[number]["value"];

export function isVisaType(v: unknown): v is VisaType {
  return typeof v === "string" && VISA_TYPE_OPTIONS.some((o) => o.value === v);
}
