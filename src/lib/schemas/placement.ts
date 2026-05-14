import { PlacementFeeStatus } from "@prisma/client";
import { z } from "zod";

export const placementFormSchema = z.object({
  applicantId: z.string().min(1),
  facilityId: z.string().min(1),
  jobOrderId: z.string().min(1),
  contractId: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  monthlyWage: z.number().min(0).max(10_000_000),
  introductionFee: z.number().min(0).max(10_000_000),
  feeStatus: z.nativeEnum(PlacementFeeStatus).default(PlacementFeeStatus.PENDING),
  refundDueDate: z.coerce.date().optional(),
});

export type PlacementFormInput = z.infer<typeof placementFormSchema>;
