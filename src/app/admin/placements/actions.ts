"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { recordAuditEvent } from "@/lib/audit/event";
import { hasCapability } from "@/lib/auth/rbac";
import {
  calculateIntroductionFee,
  calculateTax,
} from "@/lib/billing/calc";
import { formatInvoiceNumber } from "@/lib/billing/invoice-number";
import { calcAntiteishokuDate } from "@/lib/compliance/anti-teishoku";
import { prisma } from "@/lib/db";
import { recordAuditLog } from "@/lib/repositories/audit-log";
import { placementFormSchema } from "@/lib/schemas/placement";

export type CreatePlacementState = { ok: boolean; message?: string };

/**
 * 紹介成立 (Placement) を 1 件作成する。
 * 派遣形態 + 派遣管理者を指定すれば、同時に DispatchLedger も自動生成。
 * 紹介手数料形式なら、契約の feeRate を元に Invoice (発行済) も自動生成。
 */
export async function createPlacementAction(
  _prev: CreatePlacementState,
  formData: FormData,
): Promise<CreatePlacementState> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ログインが必要です" };
  if (!hasCapability(session.user.role, "placements:write")) {
    return { ok: false, message: "紹介成立の作成権限がありません" };
  }

  const startDate = String(formData.get("startDate") ?? "");
  const parsed = placementFormSchema.safeParse({
    applicantId: String(formData.get("applicantId") ?? ""),
    facilityId: String(formData.get("facilityId") ?? ""),
    jobOrderId: String(formData.get("jobOrderId") ?? ""),
    contractId: String(formData.get("contractId") ?? ""),
    startDate,
    monthlyWage: Number(formData.get("monthlyWage") ?? 0),
    introductionFee: Number(formData.get("introductionFee") ?? 0),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues.map((i) => i.message).join(" / ") };
  }

  const contract = await prisma.contract.findUnique({
    where: { id: parsed.data.contractId },
    select: { id: true, contractType: true, feeRate: true, paymentTermDays: true },
  });
  if (!contract) return { ok: false, message: "契約が見つかりません" };

  const jobOrder = await prisma.jobOrder.findUnique({
    where: { id: parsed.data.jobOrderId },
    select: { id: true, employmentType: true, title: true },
  });
  if (!jobOrder) return { ok: false, message: "求人案件が見つかりません" };

  // 紹介手数料が空なら契約の feeRate から自動計算
  let introductionFee = parsed.data.introductionFee;
  if (introductionFee === 0 && contract.contractType === "INTRODUCTION_FEE") {
    introductionFee = calculateIntroductionFee({
      monthlyWage: parsed.data.monthlyWage,
      feeRate: Number(contract.feeRate),
    });
  }

  // 返金期限 = 入社日 + 180 日 (返金規定上限の例)
  const refundDueDate = new Date(parsed.data.startDate);
  refundDueDate.setDate(refundDueDate.getDate() + 180);

  // ----- 一括書き込み (Placement → Invoice → DispatchLedger を tx で) -----
  const dispatchPeriodStart = parsed.data.startDate;
  const dispatchPeriodEndRaw = formData.get("dispatchPeriodEnd");
  const dispatchManagerName = String(formData.get("dispatchManagerName") ?? "");
  const receivingManagerName = String(formData.get("receivingManagerName") ?? "");

  const isDispatch = jobOrder.employmentType === "DISPATCH";
  const wantsLedger = isDispatch && dispatchManagerName && receivingManagerName;

  const placement = await prisma.$transaction(async (tx) => {
    const p = await tx.placement.create({
      data: {
        applicantId: parsed.data.applicantId,
        facilityId: parsed.data.facilityId,
        jobOrderId: parsed.data.jobOrderId,
        contractId: contract.id,
        startDate: parsed.data.startDate,
        monthlyWage: new Prisma.Decimal(parsed.data.monthlyWage),
        introductionFee: new Prisma.Decimal(introductionFee),
        feeStatus: "PENDING",
        refundDueDate,
      },
    });

    if (contract.contractType === "INTRODUCTION_FEE" && introductionFee > 0) {
      const year = parsed.data.startDate.getFullYear();
      const month = parsed.data.startDate.getMonth() + 1;
      const seqCount = await tx.invoice.count({
        where: {
          issuedAt: {
            gte: new Date(year, month - 1, 1),
            lt: new Date(year, month, 1),
          },
        },
      });
      const invoiceNumber = formatInvoiceNumber(year, month, seqCount + 1);
      const tax = calculateTax(introductionFee);
      const dueAt = new Date(parsed.data.startDate);
      dueAt.setDate(dueAt.getDate() + (contract.paymentTermDays ?? 60));
      await tx.invoice.create({
        data: {
          facilityId: parsed.data.facilityId,
          placementId: p.id,
          invoiceNumber,
          issuedAt: parsed.data.startDate,
          dueAt,
          amount: new Prisma.Decimal(introductionFee),
          tax: new Prisma.Decimal(tax),
          totalAmount: new Prisma.Decimal(introductionFee + tax),
          status: "ISSUED",
        },
      });
      await tx.placement.update({
        where: { id: p.id },
        data: { feeStatus: "INVOICED" },
      });
    }

    if (wantsLedger) {
      const periodEnd = dispatchPeriodEndRaw
        ? new Date(String(dispatchPeriodEndRaw))
        : new Date(parsed.data.startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
      await tx.dispatchLedger.create({
        data: {
          placementId: p.id,
          applicantId: parsed.data.applicantId,
          facilityId: parsed.data.facilityId,
          jobOrderId: parsed.data.jobOrderId,
          antiteishokuDate: calcAntiteishokuDate(dispatchPeriodStart),
          dispatchPeriodStart,
          dispatchPeriodEnd: periodEnd,
          dispatchManagerName,
          receivingManagerName,
          socialInsuranceEnrolled: formData.get("socialInsuranceEnrolled") === "on",
          contractCount: 1,
        },
      });
    }

    return p;
  });

  await Promise.all([
    recordAuditLog({
      staffId: session.user.id,
      action: "placement.create",
      target: placement.id,
      payload: {
        applicantId: parsed.data.applicantId,
        facilityId: parsed.data.facilityId,
        jobOrderId: parsed.data.jobOrderId,
        introductionFee,
      },
    }),
    recordAuditEvent(prisma, {
      actorStaffId: session.user.id,
      actorEmail: session.user.email ?? null,
      action: "placement.create",
      entityType: "Placement",
      entityId: placement.id,
      after: {
        applicantId: parsed.data.applicantId,
        facilityId: parsed.data.facilityId,
        jobOrderId: parsed.data.jobOrderId,
        introductionFee,
        ledgerCreated: !!wantsLedger,
      },
    }),
  ]);
  revalidatePath("/admin/placements");
  redirect(`/admin/placements/${placement.id}`);
}
