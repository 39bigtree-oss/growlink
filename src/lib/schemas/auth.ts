import { z } from "zod";

export const credentialsLoginSchema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
});

export type CredentialsLoginInput = z.infer<typeof credentialsLoginSchema>;

export const magicLinkLoginSchema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません"),
});

export type MagicLinkLoginInput = z.infer<typeof magicLinkLoginSchema>;
