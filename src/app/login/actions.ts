"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { credentialsLoginSchema, magicLinkLoginSchema } from "@/lib/schemas/auth";

export type LoginActionState = {
  ok: boolean;
  message?: string;
};

export async function loginWithCredentials(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = credentialsLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues.map((i) => i.message).join(" / "),
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { ok: false, message: "メールアドレスまたはパスワードが正しくありません" };
      }
      return { ok: false, message: "ログインに失敗しました" };
    }
    throw error;
  }
}

export async function loginWithMagicLink(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = magicLinkLoginSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues.map((i) => i.message).join(" / "),
    };
  }

  try {
    await signIn("resend", {
      email: parsed.data.email,
      redirectTo: "/dashboard",
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, message: "送信に失敗しました。時間をおいて再試行してください" };
    }
    throw error;
  }
}
