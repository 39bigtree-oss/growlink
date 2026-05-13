import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { CredentialsForm, MagicLinkForm } from "./login-forms";

export const metadata = {
  title: "ログイン | グロウリンク",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="container mx-auto flex min-h-screen max-w-md flex-col justify-center py-12">
      <Card>
        <CardHeader className="space-y-1 text-center">
          <CardTitle>管理画面ログイン</CardTitle>
          <CardDescription>
            メールアドレスとパスワード、またはマジックリンクでログインしてください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              メールアドレスとパスワード
            </h2>
            <CredentialsForm />
          </section>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">または</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">マジックリンク</h2>
            <MagicLinkForm />
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
