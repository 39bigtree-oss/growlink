import { z } from "zod";

export const dispatchLedgerFormSchema = z.object({
  placementId: z.string().min(1),
  dispatchPeriodStart: z.coerce.date(),
  dispatchPeriodEnd: z.coerce.date(),
  dispatchManagerName: z.string().min(1).max(80),
  receivingManagerName: z.string().min(1).max(80),
  socialInsuranceEnrolled: z.boolean().default(false),
  contractCount: z.number().int().min(1).default(1),
  notes: z.string().max(2000).optional(),
});

export type DispatchLedgerFormInput = z.infer<typeof dispatchLedgerFormSchema>;
