import {
  EmploymentType,
  FacilityCategory,
  JobOrderStatus,
  JobOrderUrgency,
  JobPosition,
} from "@prisma/client";
import { z } from "zod";

export const shiftPatternSchema = z.object({
  dayShift: z.boolean().default(true),
  nightShift: z.boolean().default(false),
  oncall: z.boolean().default(false),
  weeklyDays: z.number().int().min(1).max(7).default(5),
});

export type ShiftPattern = z.infer<typeof shiftPatternSchema>;

export const jobOrderFormSchema = z
  .object({
    facilityId: z.string().min(1, "施設を選択してください"),
    title: z.string().min(1, "タイトルを入力してください").max(120),
    position: z.nativeEnum(JobPosition),
    employmentType: z.nativeEnum(EmploymentType),
    hourlyWageMin: z.number().int().min(800).max(20000).optional(),
    hourlyWageMax: z.number().int().min(800).max(20000).optional(),
    monthlyWageMin: z.number().int().min(150000).max(2000000).optional(),
    monthlyWageMax: z.number().int().min(150000).max(2000000).optional(),
    shiftPattern: shiftPatternSchema.optional(),
    requiredQualifications: z.array(z.string().min(1).max(60)).default([]),
    preferredQualifications: z.array(z.string().min(1).max(60)).default([]),
    minExperienceYears: z.number().int().min(0).max(50).default(0),
    headcount: z.number().int().min(1).max(50).default(1),
    status: z.nativeEnum(JobOrderStatus).default(JobOrderStatus.OPEN),
    urgency: z.nativeEnum(JobOrderUrgency).default(JobOrderUrgency.NORMAL),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    nearestStation: z.string().max(60).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine(
    (v) =>
      v.hourlyWageMin === undefined ||
      v.hourlyWageMax === undefined ||
      v.hourlyWageMin <= v.hourlyWageMax,
    { message: "時給帯の下限は上限以下にしてください", path: ["hourlyWageMax"] },
  )
  .refine(
    (v) =>
      v.monthlyWageMin === undefined ||
      v.monthlyWageMax === undefined ||
      v.monthlyWageMin <= v.monthlyWageMax,
    { message: "月給帯の下限は上限以下にしてください", path: ["monthlyWageMax"] },
  );

export type JobOrderFormInput = z.infer<typeof jobOrderFormSchema>;

/**
 * 求職者プロファイル (マッチング入力)。
 * Applicant + SkillSheet + ResidenceStatus を 1 つに正規化したもの。
 */
export const applicantMatchingProfileSchema = z.object({
  applicantId: z.string(),
  prefecture: z.string().optional(),
  city: z.string().optional(),
  desiredCategories: z.array(z.nativeEnum(FacilityCategory)).default([]),
  qualifications: z.array(z.string()).default([]),
  experienceYears: z.number().int().min(0).max(60).default(0),
  desiredHourlyWage: z.number().int().optional(),
  desiredMonthlyWage: z.number().int().optional(),
  shiftPreference: shiftPatternSchema.optional(),
});

export type ApplicantMatchingProfile = z.infer<typeof applicantMatchingProfileSchema>;
