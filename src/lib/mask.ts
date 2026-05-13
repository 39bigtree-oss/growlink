// PII マスキングユーティリティ。AI API / ログ / FAX 送信票 PDF など外部に出る前に必ず通す。

import type { Applicant, Gender, Qualification } from "@prisma/client";

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const head = local.slice(0, 1);
  const tail = local.length > 2 ? local.slice(-1) : "";
  return `${head}***${tail}@${domain}`;
}

export function maskName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .split(/\s+/)
    .map((part) => (part.length <= 1 ? "*" : `${part[0]}${"*".repeat(part.length - 1)}`))
    .join(" ");
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

/**
 * 生年月日から年齢層 (20s / 30s / ... / 60s+) を返す。
 * AI API へは生年月日そのものではなく年齢層のみ渡し、PII を最小化する。
 */
export function ageBand(birthDate: Date | string, now: Date = new Date()): string {
  const d = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(d.getTime())) return "unknown";
  let age = now.getFullYear() - d.getFullYear();
  const beforeBirthday =
    now.getMonth() < d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
  if (beforeBirthday) age -= 1;
  if (age < 20) return "10s";
  if (age < 30) return "20s";
  if (age < 40) return "30s";
  if (age < 50) return "40s";
  if (age < 60) return "50s";
  return "60s+";
}

// =========================
// FAX 送信票向け追加マスク
// =========================

/**
 * 氏名 (姓 / 名) を「T.S 様」形式のイニシャルに変換する。
 * - 漢字は最初の 1 文字をそのまま採用
 * - 仮名・アルファベット・記号も最初の 1 文字
 * - 姓 / 名いずれかが空のときはあるほうのみ使う
 * - 何も取れない場合は "N.N" を返す
 */
export function maskInitials(lastName: string | null | undefined, firstName: string | null | undefined): string {
  const ln = (lastName ?? "").trim();
  const fn = (firstName ?? "").trim();
  const lnInit = ln ? [...ln][0] ?? "" : "";
  const fnInit = fn ? [...fn][0] ?? "" : "";
  if (!lnInit && !fnInit) return "N.N";
  if (!fnInit) return `${lnInit}.`;
  if (!lnInit) return `.${fnInit}`;
  return `${lnInit}.${fnInit}`;
}

/**
 * 生年月日を「40代前半」「30代後半」など、5 歳刻みでマスクして返す。
 */
export function maskAge(birthDate: Date | string, now: Date = new Date()): string {
  const d = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(d.getTime())) return "年代不明";
  let age = now.getFullYear() - d.getFullYear();
  const beforeBirthday =
    now.getMonth() < d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
  if (beforeBirthday) age -= 1;
  if (age < 20) return "10代";
  if (age >= 70) return "70代以上";
  const decade = Math.floor(age / 10) * 10;
  const half = age - decade < 5 ? "前半" : "後半";
  return `${decade}代${half}`;
}

/**
 * 住所から市区町村より細かい部分を伏字にして返す。
 *
 *  "東京都新宿区西新宿1-2-3"     → "東京都新宿区"
 *  "千葉県船橋市本町0-0-0"       → "千葉県船橋市"
 *  "北海道余市郡余市町大川町0"   → "北海道余市郡余市町"
 *
 * 郡+町/村 を優先し、次に 市/区、最後に単独の 市/区/町/村 の順で打ち切る。
 */
export function maskLocation(address: string | null | undefined): string {
  if (!address) return "地域不明";
  const trimmed = address.trim();
  const patterns = [
    /^(.*?[都道府県].*?[郡].*?[町村])/,
    /^(.*?[都道府県].*?[市区])/,
    /^(.*?[市区町村])/,
  ];
  for (const re of patterns) {
    const m = re.exec(trimmed);
    if (m) return m[1];
  }
  return trimmed.slice(0, 6);
}

export type MaskedApplicantForFax = {
  initials: string;
  gender: Gender | string;
  genderLabel: string;
  ageLabel: string;
  ageBand: string;
  qualifications: string[];
  desiredCategories: string[];
  prefecture: string | null;
  language: string | null;
  nationality: string | null;
};

const GENDER_LABEL: Record<string, string> = {
  MALE: "男性",
  FEMALE: "女性",
  OTHER: "回答しない",
};

/**
 * FAX 送信票に載せられる安全な求職者オブジェクトを返す。
 * 姓名・連絡先・生年月日そのものは含めず、イニシャル・年代・市区町村レベルだけに抑える。
 */
export function maskApplicantForFax(
  applicant: Pick<
    Applicant,
    "lastName"
    | "firstName"
    | "birthDate"
    | "gender"
    | "desiredCategories"
    | "language"
    | "nationality"
  > & { qualifications?: Pick<Qualification, "name">[] },
  options: { prefecture?: string | null } = {},
): MaskedApplicantForFax {
  return {
    initials: maskInitials(applicant.lastName, applicant.firstName),
    gender: applicant.gender,
    genderLabel: GENDER_LABEL[applicant.gender] ?? "回答しない",
    ageLabel: maskAge(applicant.birthDate),
    ageBand: ageBand(applicant.birthDate),
    qualifications: applicant.qualifications?.map((q) => q.name) ?? [],
    desiredCategories: applicant.desiredCategories,
    prefecture: options.prefecture ?? null,
    language: applicant.language ?? null,
    nationality: applicant.nationality ?? null,
  };
}
