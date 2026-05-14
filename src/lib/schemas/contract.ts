import { ContractStatus, ContractType, ESignProvider } from "@prisma/client";
import { z } from "zod";

export const refundTierSchema = z.object({
  withinDays: z.number().int().min(1).max(365),
  refundRate: z.number().min(0).max(1),
});

export type RefundTier = z.infer<typeof refundTierSchema>;

export const refundPolicySchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  // 並び順は API/UI 側で withinDays ASC に正規化される想定
  tiers: z.array(refundTierSchema).min(1, "最低 1 段階の返金規定が必要です"),
});

export type RefundPolicyInput = z.infer<typeof refundPolicySchema>;

export const contractFormSchema = z.object({
  facilityId: z.string().min(1, "施設を選択してください"),
  contractType: z.nativeEnum(ContractType),
  feeRate: z.number().min(0).max(1, "feeRate は 0〜1 の小数 (例: 0.30 = 30%) で指定してください"),
  refundPolicyId: z.string().optional(),
  paymentTermDays: z.number().int().min(0).max(365).default(60),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  signedBy: z.string().max(80).optional(),
  eSignProvider: z.nativeEnum(ESignProvider).default(ESignProvider.MOCK),
  status: z.nativeEnum(ContractStatus).default(ContractStatus.DRAFT),
});

export type ContractFormInput = z.infer<typeof contractFormSchema>;
