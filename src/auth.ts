import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import bcrypt from "bcryptjs";

import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import { credentialsLoginSchema } from "@/lib/schemas/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsLoginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email },
          include: { staff: true },
        });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.staff?.role ?? "VIEWER",
        };
      },
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY ?? "re_dev_placeholder",
      from: process.env.AUTH_EMAIL_FROM ?? "noreply@growlink.local",
      async sendVerificationRequest({ identifier, url, provider }) {
        if (!process.env.RESEND_API_KEY) {
          // 開発時のフォールバック: コンソールにマジックリンクを出力する。
          // 本番では必ず RESEND_API_KEY を設定すること。
          console.log("[auth] magic link (dev): %s -> %s", identifier, url);
          return;
        }
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: provider.from,
            to: identifier,
            subject: "グロウリンク管理画面 ログインリンク",
            html: buildMagicLinkEmail(url),
          }),
        });
        if (!res.ok) {
          throw new Error(`Resend send failed: ${res.status}`);
        }
      },
    }),
  ],
});

function buildMagicLinkEmail(url: string): string {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
      <h2>グロウリンク管理画面ログイン</h2>
      <p>下のボタンからログインしてください。リンクの有効期限は24時間です。</p>
      <p style="margin:24px 0">
        <a href="${url}" style="background:#111;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">
          ログインする
        </a>
      </p>
      <p style="color:#666;font-size:12px">このメールに心当たりがない場合は破棄してください。</p>
    </div>
  `;
}
