import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "受付完了 | グロウリンク",
};

export default function ApplyThanksPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col justify-center px-4 py-12">
      <Card>
        <CardHeader className="items-center space-y-3 text-center">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <CheckCircle2 className="h-8 w-8" aria-hidden />
          </div>
          <CardTitle>申込を受け付けました</CardTitle>
          <CardDescription>
            ご入力のメールアドレス宛に受付完了メールをお送りしました。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            AI 適職診断を希望された方には、診断結果を数営業日以内にメールでお送りします。
            希望されなかった方には担当よりご連絡いたします。
          </p>
          <p>このページを閉じてもお手続きは進みます。</p>
          <div className="pt-2">
            <Button asChild variant="outline" className="w-full">
              <Link href="/">トップに戻る</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
