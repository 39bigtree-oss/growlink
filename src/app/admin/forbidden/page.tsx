import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "アクセス権限がありません | グロウリンク" };

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-8">
      <Card className="max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 rounded-full bg-amber-100 p-3 text-amber-800">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <CardTitle>このページにアクセスする権限がありません</CardTitle>
          <CardDescription>
            必要な権限を持っていません。担当の管理者へお問い合わせください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/admin/dashboard">ダッシュボードに戻る</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
