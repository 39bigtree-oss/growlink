import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { TsumugiLogo } from "@/components/brand/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND } from "@/lib/brand";

import { CredentialsForm, MagicLinkForm } from "./login-forms";

export const metadata = {
  title: "ログイン",
  description: `${BRAND.fullName} 管理画面のログインページ`,
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/admin/dashboard");
  }

  return (
    <main
      id="main"
      className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]"
    >
      {/* 左カラム: ブランド + 訴求 (lg+) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-primary-foreground">
            <TsumugiLogo withWordmark wordmarkClassName="text-primary-foreground" />
          </Link>
          <h1 className="mt-12 max-w-md text-balance text-3xl font-bold leading-tight">
            {BRAND.taglineJa}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-primary-foreground/80">
            {BRAND.descriptionJa}
          </p>
        </div>
        <ul className="space-y-3 text-sm text-primary-foreground/80">
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warning" /> 申込 → AI 診断 → 面接 → FAX を一気通貫
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warning" /> モック完結で API キーゼロでも動作
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warning" /> 多言語 5 言語 + 在留資格管理対応
          </li>
        </ul>
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-warning/20 blur-3xl"
        />
      </aside>

      {/* 右カラム: フォーム */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden">
            <Link href="/" aria-label="ホーム">
              <TsumugiLogo withWordmark />
            </Link>
          </div>
          <Card className="border bg-card shadow-sm">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl">管理画面ログイン</CardTitle>
              <CardDescription>
                メールアドレスとパスワード、またはマジックリンクでログインしてください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <section className="space-y-3" aria-labelledby="credentials-heading">
                <h2 id="credentials-heading" className="text-sm font-semibold text-muted-foreground">
                  メールアドレスとパスワード
                </h2>
                <CredentialsForm />
              </section>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">または</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <section className="space-y-3" aria-labelledby="magic-heading">
                <h2 id="magic-heading" className="text-sm font-semibold text-muted-foreground">
                  マジックリンク
                </h2>
                <MagicLinkForm />
              </section>
            </CardContent>
          </Card>
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              ← {BRAND.fullName} について
            </Link>
            <span aria-hidden> · </span>
            <Link href="/apply" className="hover:text-foreground">
              求職者として応募する
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
