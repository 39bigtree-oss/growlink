import { MyNumberAccessAction, MyNumberPurpose } from "@prisma/client";
import { z } from "zod";

/**
 * マイナンバーは 12 桁の数字 (チェックデジット含む)。
 * 実運用ではここで厳密なチェックデジット検証 (M.Z 行列計算) を行うが、
 * v1.4 の mock provider は形式チェックのみ。検証ロジック本体は v1.6+ で。
 */
export const myNumberPlainSchema = z
  .string()
  .regex(/^\d{12}$/, "マイナンバーは 12 桁の数字で入力してください");

export const myNumberCreateInputSchema = z.object({
  applicantId: z.string().min(1),
  plainNumber: myNumberPlainSchema,
  purpose: z.nativeEnum(MyNumberPurpose),
  retentionUntil: z.coerce.date(),
});

export type MyNumberCreateInput = z.infer<typeof myNumberCreateInputSchema>;

export const myNumberAccessSchema = z.object({
  staffId: z.string().min(1),
  action: z.nativeEnum(MyNumberAccessAction),
  reason: z.string().min(5, "アクセス理由は 5 文字以上で入力してください").max(500),
  ipAddress: z.string().max(60).optional(),
});

export type MyNumberAccessInput = z.infer<typeof myNumberAccessSchema>;
