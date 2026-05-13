import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "メールを確認してください | グロウリンク",
};

export default function VerifyRequestPage() {
  return (
    <main className="container mx-auto flex min-h-screen max-w-md flex-col justify-center py-12">
      <Card>
        <CardHeader className="space-y-1 text-center">
          <CardTitle>メールを確認してください</CardTitle>
          <CardDescription>
            ご入力のメールアドレス宛にログインリンクをお送りしました。
            リンクをクリックしてログインを完了してください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>メールが届かない場合は迷惑メールフォルダもご確認ください。</p>
          <p>
            <Link href="/login" className="underline">
              ログイン画面に戻る
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
