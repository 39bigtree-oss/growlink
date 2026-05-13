import { z } from "zod";

// YYYY-MM または空文字。卒業年月や在籍時期は粒度が粗いので「月」まで。
export const yearMonthSchema = z
  .string()
  .max(7)
  .refine((v) => v === "" || /^\d{4}-(0[1-9]|1[0-2])$/.test(v), {
    message: "YYYY-MM 形式で入力してください",
  });

export const educationSchema = z.object({
  schoolName: z.string().max(100).default(""),
  department: z.string().max(100).default(""),
  graduatedOn: yearMonthSchema.default(""),
});

export const careerSchema = z.object({
  company: z.string().max(100).default(""),
  role: z.string().max(100).default(""),
  from: yearMonthSchema.default(""),
  to: yearMonthSchema.default(""),
  achievements: z.string().max(500).default(""),
});

export const skillSchema = z.object({
  name: z.string().max(60).default(""),
  level: z.number().int().min(1).max(5).default(3),
});

export const desiredSchema = z.object({
  areas: z.array(z.string().max(100)).max(20).default([]),
  schedule: z.string().max(200).default(""),
  startMonth: yearMonthSchema.default(""),
  salary: z.number().int().min(0).max(99999).optional().nullable(),
  notes: z.string().max(500).default(""),
});

export const skillSheetContentSchema = z.object({
  educations: z.array(educationSchema).max(20).default([]),
  careers: z.array(careerSchema).max(40).default([]),
  skills: z.array(skillSchema).max(40).default([]),
  desired: desiredSchema.default({
    areas: [],
    schedule: "",
    startMonth: "",
    salary: null,
    notes: "",
  }),
  selfPR: z.string().max(800).default(""),
});

export type SkillSheetContent = z.infer<typeof skillSheetContentSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Career = z.infer<typeof careerSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Desired = z.infer<typeof desiredSchema>;

export function emptySkillSheetContent(): SkillSheetContent {
  return skillSheetContentSchema.parse({});
}

/**
 * AI / OCR で構造化済みの ParsedSkillSheet を、本人入力 SkillSheetContent にマージする。
 * - 既存値があるフィールドは上書きしない (本人の入力を優先)
 * - 空配列はソースで埋める
 */
export function mergeParsedIntoContent(
  current: SkillSheetContent,
  parsed: {
    educations: Array<{ schoolName: string; department: string; graduatedOn: string }>;
    careers: Array<{
      company: string;
      role: string;
      from: string;
      to: string;
      achievements: string;
    }>;
    skills: Array<{ name: string; level: number }>;
    selfPR: string;
  },
): SkillSheetContent {
  return {
    ...current,
    educations: current.educations.length > 0 ? current.educations : parsed.educations,
    careers: current.careers.length > 0 ? current.careers : parsed.careers,
    skills: current.skills.length > 0 ? current.skills : parsed.skills,
    selfPR: current.selfPR || parsed.selfPR,
  };
}
