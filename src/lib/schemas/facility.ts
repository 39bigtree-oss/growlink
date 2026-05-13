import { FacilityCategory } from "@prisma/client";
import { z } from "zod";

export const facilityFormSchema = z.object({
  name: z.string().min(1, "名称を入力してください").max(120),
  category: z.nativeEnum(FacilityCategory, {
    errorMap: () => ({ message: "業態を選択してください" }),
  }),
  prefecture: z.string().min(1, "都道府県を入力してください").max(20),
  city: z.string().min(1, "市区町村を入力してください").max(40),
  address: z.string().min(1, "住所を入力してください").max(200),
  fax: z
    .string()
    .max(30)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  email: z
    .string()
    .email("メールアドレスの形式が正しくありません")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  isFaxPublic: z.boolean().default(false),
  notes: z
    .string()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export type FacilityFormInput = z.infer<typeof facilityFormSchema>;
