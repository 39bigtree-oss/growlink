import { z } from "zod";
import { FacilityCategory, Gender } from "@prisma/client";

const KATAKANA_RE = /^[ァ-ヶー　 ]+$/;
const PHONE_RE = /^[0-9+\-() 　]{8,20}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 16 歳未満は申込不可（労基法を考慮）。120 歳より昔は誤入力扱い。
const MIN_AGE_YEARS = 16;
const MAX_AGE_YEARS = 120;

function isReasonableBirthDate(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const min = new Date(now);
  min.setFullYear(now.getFullYear() - MAX_AGE_YEARS);
  const max = new Date(now);
  max.setFullYear(now.getFullYear() - MIN_AGE_YEARS);
  return d >= min && d <= max;
}

export const applicantStep1Schema = z.object({
  lastName: z.string().min(1, "姓を入力してください").max(40, "姓は40文字以内で入力してください"),
  firstName: z
    .string()
    .min(1, "名を入力してください")
    .max(40, "名は40文字以内で入力してください"),
  lastNameKana: z
    .string()
    .min(1, "セイ（カタカナ）を入力してください")
    .regex(KATAKANA_RE, "セイはカタカナで入力してください"),
  firstNameKana: z
    .string()
    .min(1, "メイ（カタカナ）を入力してください")
    .regex(KATAKANA_RE, "メイはカタカナで入力してください"),
  birthDate: z
    .string()
    .regex(ISO_DATE_RE, "生年月日を選択してください")
    .refine(isReasonableBirthDate, "16歳以上、120歳以下の生年月日を入力してください"),
  gender: z.nativeEnum(Gender, { errorMap: () => ({ message: "性別を選択してください" }) }),
});

export const applicantStep2Schema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("メールアドレスの形式が正しくありません"),
  phone: z
    .string()
    .min(1, "電話番号を入力してください")
    .regex(PHONE_RE, "電話番号の形式が正しくありません（数字・+・-のみ）"),
  nationality: z.string().optional(),
  language: z.string().min(1, "希望言語を選択してください"),
});

export const applicantStep3Schema = z.object({
  qualifications: z
    .array(z.string().min(1).max(80))
    .max(20, "保有資格は20件までです")
    .default([]),
  desiredCategories: z
    .array(z.nativeEnum(FacilityCategory))
    .max(11, "希望職種は11件までです")
    .default([]),
});

export const applicantStep4Schema = z.object({
  wantsDiagnosis: z.boolean({
    errorMap: () => ({ message: "AI 適職診断を希望するか選択してください" }),
  }),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: "利用規約とプライバシーポリシーに同意してください" }),
  }),
});

export const applicantFormSchema = applicantStep1Schema
  .merge(applicantStep2Schema)
  .merge(applicantStep3Schema)
  .merge(applicantStep4Schema);

export type ApplicantFormInput = z.infer<typeof applicantFormSchema>;

// API リクエスト用。利用規約同意フラグは API には送らず、reCAPTCHA トークンを足す。
export const applicantApiSchema = applicantFormSchema.omit({ agreedToTerms: true }).extend({
  recaptchaToken: z.string().nullable().optional(),
});

export type ApplicantApiInput = z.infer<typeof applicantApiSchema>;

export const APPLICANT_FORM_STEPS = [
  "basic-info",
  "contact",
  "qualifications-and-desired",
  "confirm",
] as const;
export type ApplicantFormStep = (typeof APPLICANT_FORM_STEPS)[number];

export const APPLICANT_FORM_DEFAULTS: ApplicantFormInput = {
  lastName: "",
  firstName: "",
  lastNameKana: "",
  firstNameKana: "",
  birthDate: "",
  gender: Gender.MALE,
  email: "",
  phone: "",
  nationality: "",
  language: "ja",
  qualifications: [],
  desiredCategories: [],
  wantsDiagnosis: true,
  agreedToTerms: false as unknown as true,
};

export const STEP_FIELDS: Record<ApplicantFormStep, Array<keyof ApplicantFormInput>> = {
  "basic-info": ["lastName", "firstName", "lastNameKana", "firstNameKana", "birthDate", "gender"],
  contact: ["email", "phone", "nationality", "language"],
  "qualifications-and-desired": ["qualifications", "desiredCategories"],
  confirm: ["wantsDiagnosis", "agreedToTerms"],
};
