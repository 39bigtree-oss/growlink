"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { recordAuditEvent } from "@/lib/audit/event";
import { hasCapability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { recordAuditLog } from "@/lib/repositories/audit-log";
import {
  createJobOrder,
  updateJobOrder,
} from "@/lib/repositories/job-order";
import { jobOrderFormSchema } from "@/lib/schemas/job-order";

export type JobOrderActionState = {
  ok: boolean;
  message?: string;
};

async function ensureWrite(): Promise<{ staffId: string; email: string | null } | JobOrderActionState> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ログインが必要です" };
  if (!hasCapability(session.user.role, "job-orders:write")) {
    return { ok: false, message: "求人案件の編集権限がありません" };
  }
  return { staffId: session.user.id, email: session.user.email ?? null };
}

function toOptionalNumber(v: FormDataEntryValue | null): number | undefined {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toIntList(v: FormDataEntryValue | null): string[] {
  if (!v) return [];
  return String(v)
    .split(/[,、\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function readFormData(formData: FormData) {
  return {
    facilityId: String(formData.get("facilityId") ?? ""),
    title: String(formData.get("title") ?? ""),
    position: String(formData.get("position") ?? "NURSE"),
    employmentType: String(formData.get("employmentType") ?? "DIRECT"),
    hourlyWageMin: toOptionalNumber(formData.get("hourlyWageMin")),
    hourlyWageMax: toOptionalNumber(formData.get("hourlyWageMax")),
    monthlyWageMin: toOptionalNumber(formData.get("monthlyWageMin")),
    monthlyWageMax: toOptionalNumber(formData.get("monthlyWageMax")),
    shiftPattern: {
      dayShift: formData.get("dayShift") === "on",
      nightShift: formData.get("nightShift") === "on",
      oncall: formData.get("oncall") === "on",
      weeklyDays: Number(formData.get("weeklyDays") ?? 5),
    },
    requiredQualifications: toIntList(formData.get("requiredQualifications")),
    preferredQualifications: toIntList(formData.get("preferredQualifications")),
    minExperienceYears: Number(formData.get("minExperienceYears") ?? 0),
    headcount: Number(formData.get("headcount") ?? 1),
    status: String(formData.get("status") ?? "OPEN"),
    urgency: String(formData.get("urgency") ?? "NORMAL"),
    startDate: formData.get("startDate") ? String(formData.get("startDate")) : undefined,
    endDate: formData.get("endDate") ? String(formData.get("endDate")) : undefined,
    nearestStation: String(formData.get("nearestStation") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  };
}

export async function createJobOrderAction(
  _prev: JobOrderActionState,
  formData: FormData,
): Promise<JobOrderActionState> {
  const guard = await ensureWrite();
  if ("ok" in guard) return guard;
  const parsed = jobOrderFormSchema.safeParse(readFormData(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues.map((i) => i.message).join(" / ") };
  }
  const created = await createJobOrder({
    facilityId: parsed.data.facilityId,
    title: parsed.data.title,
    position: parsed.data.position,
    employmentType: parsed.data.employmentType,
    hourlyWageMin: parsed.data.hourlyWageMin ?? null,
    hourlyWageMax: parsed.data.hourlyWageMax ?? null,
    monthlyWageMin: parsed.data.monthlyWageMin ?? null,
    monthlyWageMax: parsed.data.monthlyWageMax ?? null,
    shiftPattern: parsed.data.shiftPattern ?? undefined,
    requiredQualifications: parsed.data.requiredQualifications ?? [],
    preferredQualifications: parsed.data.preferredQualifications ?? [],
    minExperienceYears: parsed.data.minExperienceYears,
    headcount: parsed.data.headcount,
    status: parsed.data.status,
    urgency: parsed.data.urgency,
    startDate: parsed.data.startDate ?? null,
    endDate: parsed.data.endDate ?? null,
    nearestStation: parsed.data.nearestStation ?? null,
    notes: parsed.data.notes ?? null,
  });
  await Promise.all([
    recordAuditLog({
      staffId: guard.staffId,
      action: "job_order.create",
      target: created.id,
      payload: { title: created.title },
    }),
    recordAuditEvent(prisma, {
      actorStaffId: guard.staffId,
      actorEmail: guard.email,
      action: "job_order.create",
      entityType: "JobOrder",
      entityId: created.id,
      after: { title: created.title, facilityId: created.facilityId, status: created.status },
    }),
  ]);
  revalidatePath("/admin/job-orders");
  redirect(`/admin/job-orders/${created.id}`);
}

export async function updateJobOrderAction(
  id: string,
  _prev: JobOrderActionState,
  formData: FormData,
): Promise<JobOrderActionState> {
  const guard = await ensureWrite();
  if ("ok" in guard) return guard;
  const parsed = jobOrderFormSchema.safeParse(readFormData(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues.map((i) => i.message).join(" / ") };
  }
  const before = await prisma.jobOrder.findUnique({
    where: { id },
    select: { title: true, status: true, urgency: true },
  });
  await updateJobOrder(id, {
    facilityId: parsed.data.facilityId,
    title: parsed.data.title,
    position: parsed.data.position,
    employmentType: parsed.data.employmentType,
    hourlyWageMin: parsed.data.hourlyWageMin ?? null,
    hourlyWageMax: parsed.data.hourlyWageMax ?? null,
    monthlyWageMin: parsed.data.monthlyWageMin ?? null,
    monthlyWageMax: parsed.data.monthlyWageMax ?? null,
    shiftPattern: parsed.data.shiftPattern ?? undefined,
    requiredQualifications: parsed.data.requiredQualifications ?? [],
    preferredQualifications: parsed.data.preferredQualifications ?? [],
    minExperienceYears: parsed.data.minExperienceYears,
    headcount: parsed.data.headcount,
    status: parsed.data.status,
    urgency: parsed.data.urgency,
    startDate: parsed.data.startDate ?? null,
    endDate: parsed.data.endDate ?? null,
    nearestStation: parsed.data.nearestStation ?? null,
    notes: parsed.data.notes ?? null,
  });
  await Promise.all([
    recordAuditLog({
      staffId: guard.staffId,
      action: "job_order.update",
      target: id,
      payload: { title: parsed.data.title },
    }),
    recordAuditEvent(prisma, {
      actorStaffId: guard.staffId,
      actorEmail: guard.email,
      action: "job_order.update",
      entityType: "JobOrder",
      entityId: id,
      before,
      after: { title: parsed.data.title, status: parsed.data.status, urgency: parsed.data.urgency },
    }),
  ]);
  revalidatePath("/admin/job-orders");
  revalidatePath(`/admin/job-orders/${id}`);
  redirect(`/admin/job-orders/${id}`);
}
