import { InvoiceStatus } from "@prisma/client";
import { z } from "zod";

/**
 * 請求書番号フォーマット: INV-YYYY-MM-NNNN
 * 例: "INV-2026-05-0001"
 */
export const invoiceNumberRegex = /^INV-\d{4}-(0[1-9]|1[0-2])-\d{4}$/;

export const invoiceFormSchema = z.object({
  facilityId: z.string().min(1),
  placementId: z.string().optional(),
  invoiceNumber: z
    .string()
    .regex(invoiceNumberRegex, "請求書番号は INV-YYYY-MM-NNNN 形式で入力してください"),
  issuedAt: z.coerce.date(),
  dueAt: z.coerce.date(),
  amount: z.number().min(0),
  tax: z.number().min(0),
  totalAmount: z.number().min(0),
  status: z.nativeEnum(InvoiceStatus).default(InvoiceStatus.DRAFT),
  externalId: z.string().max(120).optional(),
});

export type InvoiceFormInput = z.infer<typeof invoiceFormSchema>;
