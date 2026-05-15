"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FacilityCategory, Gender, Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { recordAuditEvent } from "@/lib/audit/event";
import { hasCapability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { purgeApplicantCache } from "@/lib/pdf/v2/cache";

/**
 * v2.1: 申込者の基本情報・資格・希望業態を編集する Server Actions。
 *
 * すべて変更前後を AuditEvent にスナップショットし、編集後は
 * - v2 PDF キャッシュを破棄 (= 古い数字の PDF が残らない)
 * - updatedAt を進める (= キャッシュキーが自動で別物になる)
 * - 詳細ページを revalidate
 */

export type EditResult = { ok: boolean; message?: string };

async function requireWritableSession(): Promise<EditResult | { staffId: string; staffEmail: string | null }> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ログインが必要です" };
  if (!hasCapability(session.user.role, "applicants:write")) {
    return { ok: false, message: "編集権限がありません" };
  }
  return { staffId: session.user.id, staffEmail: session.user.email ?? null };
}

const BasicInfoSchema = z.object({
  lastName: z.string().min(1).max(40),
  firstName: z.string().min(1).max(40),
  lastNameKana: z.string().min(1).max(40),
  firstNameKana: z.string().min(1).max(40),
  email: z.string().email(),
  phone: z.string().min(6).max(30),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  nationality: z.string().max(40).nullable(),
  language: z.string().max(10).nullable(),
});

export async function updateApplicantBasicInfoAction(
  applicantId: string,
  formData: FormData,
): Promise<EditResult> {
  const ctx = await requireWritableSession();
  if ("ok" in ctx) return ctx;
  const parsed = BasicInfoSchema.safeParse({
    lastName: formData.get("lastName"),
    firstName: formData.get("firstName"),
    lastNameKana: formData.get("lastNameKana"),
    firstNameKana: formData.get("firstNameKana"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    birthDate: formData.get("birthDate"),
    gender: formData.get("gender"),
    nationality: (formData.get("nationality") as string) || null,
    language: (formData.get("language") as string) || null,
  });
  if (!parsed.success) {
    return { ok: false, message: "入力エラー: " + parsed.error.issues[0]?.message };
  }
  const before = await prisma.applicant.findUnique({
    where: { id: applicantId },
    select: {
      lastName: true, firstName: true,
      lastNameKana: true, firstNameKana: true,
      email: true, phone: true, birthDate: true,
      gender: true, nationality: true, language: true,
    },
  });
  if (!before) return { ok: false, message: "申込が見つかりません" };

  const after = {
    lastName: parsed.data.lastName,
    firstName: parsed.data.firstName,
    lastNameKana: parsed.data.lastNameKana,
    firstNameKana: parsed.data.firstNameKana,
    email: parsed.data.email,
    phone: parsed.data.phone,
    birthDate: new Date(parsed.data.birthDate + "T00:00:00.000Z"),
    gender: parsed.data.gender as Gender,
    nationality: parsed.data.nationality,
    language: parsed.data.language,
  };

  try {
    await prisma.applicant.update({ where: { id: applicantId }, data: after });
  } catch (err) {
    return { ok: false, message: "更新に失敗: " + (err as Error).message };
  }

  await recordAuditEvent(prisma, {
    actorStaffId: ctx.staffId,
    actorEmail: ctx.staffEmail,
    action: "applicant.basic_info.updated",
    entityType: "Applicant",
    entityId: applicantId,
    before: snapshotForAudit(before),
    after: snapshotForAudit(after),
  });
  await purgeApplicantCache(applicantId);
  revalidatePath(`/admin/applicants/${applicantId}`);
  return { ok: true };
}

const QualificationsSchema = z.object({
  names: z.array(z.string().min(1).max(80)).max(30),
});

export async function updateApplicantQualificationsAction(
  applicantId: string,
  names: string[],
): Promise<EditResult> {
  const ctx = await requireWritableSession();
  if ("ok" in ctx) return ctx;
  const parsed = QualificationsSchema.safeParse({ names });
  if (!parsed.success) return { ok: false, message: "資格の入力が不正です" };

  const before = await prisma.qualification.findMany({
    where: { applicantId },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  const unique = Array.from(new Set(parsed.data.names.map((s) => s.trim()).filter(Boolean)));

  try {
    await prisma.$transaction([
      prisma.qualification.deleteMany({ where: { applicantId } }),
      prisma.qualification.createMany({
        data: unique.map((name) => ({ applicantId, name })),
      }),
      prisma.applicant.update({
        where: { id: applicantId },
        data: { updatedAt: new Date() },
      }),
    ]);
  } catch (err) {
    return { ok: false, message: "更新に失敗: " + (err as Error).message };
  }

  await recordAuditEvent(prisma, {
    actorStaffId: ctx.staffId,
    actorEmail: ctx.staffEmail,
    action: "applicant.qualifications.updated",
    entityType: "Applicant",
    entityId: applicantId,
    before: { names: before.map((q) => q.name) },
    after: { names: unique },
  });
  await purgeApplicantCache(applicantId);
  revalidatePath(`/admin/applicants/${applicantId}`);
  return { ok: true };
}

const CategoriesSchema = z.object({
  categories: z.array(z.string()).max(5),
});

export async function updateApplicantDesiredCategoriesAction(
  applicantId: string,
  categories: FacilityCategory[],
): Promise<EditResult> {
  const ctx = await requireWritableSession();
  if ("ok" in ctx) return ctx;
  const parsed = CategoriesSchema.safeParse({ categories });
  if (!parsed.success) return { ok: false, message: "希望業態の入力が不正です" };

  const before = await prisma.applicant.findUnique({
    where: { id: applicantId },
    select: { desiredCategories: true },
  });
  if (!before) return { ok: false, message: "申込が見つかりません" };

  try {
    await prisma.applicant.update({
      where: { id: applicantId },
      data: { desiredCategories: categories },
    });
  } catch (err) {
    return { ok: false, message: "更新に失敗: " + (err as Error).message };
  }

  await recordAuditEvent(prisma, {
    actorStaffId: ctx.staffId,
    actorEmail: ctx.staffEmail,
    action: "applicant.desired_categories.updated",
    entityType: "Applicant",
    entityId: applicantId,
    before: { desiredCategories: before.desiredCategories },
    after: { desiredCategories: categories },
  });
  await purgeApplicantCache(applicantId);
  revalidatePath(`/admin/applicants/${applicantId}`);
  return { ok: true };
}

/**
 * AI 診断 (v2) のキャッシュを破棄し updatedAt を進めるだけ。
 * 次に PDF を開いた瞬間に最新条件で再計算 + 再生成される。
 */
export async function regenerateDiagnosisAction(applicantId: string): Promise<EditResult> {
  const ctx = await requireWritableSession();
  if ("ok" in ctx) return ctx;
  await prisma.applicant.update({
    where: { id: applicantId },
    data: { updatedAt: new Date() },
  });
  const removed = await purgeApplicantCache(applicantId);
  await recordAuditEvent(prisma, {
    actorStaffId: ctx.staffId,
    actorEmail: ctx.staffEmail,
    action: "applicant.diagnosis_v2.regenerated",
    entityType: "Applicant",
    entityId: applicantId,
    after: { removedCacheFiles: removed },
  });
  revalidatePath(`/admin/applicants/${applicantId}`);
  return { ok: true };
}

function snapshotForAudit(o: Record<string, unknown>): Prisma.InputJsonValue {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    out[k] = v instanceof Date ? v.toISOString() : v;
  }
  return out as Prisma.InputJsonValue;
}
