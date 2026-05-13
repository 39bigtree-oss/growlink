import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth/session";

import { CsvImportForm } from "./_form";

export const metadata = { title: "施設 CSV 一括インポート | グロウリンク" };
export const dynamic = "force-dynamic";

export default async function FacilityImportPage() {
  await requireAdminSession("facilities:write");
  return (
    <div className="space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">施設マスタ CSV 一括インポート</h1>
        <p className="text-sm text-muted-foreground">
          UTF-8 / カンマ区切り。先頭行はヘッダ。既存 (施設名 + 都道府県 + 市区町村) 一致は上書き、未一致は新規作成します。
        </p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">フォーマット</CardTitle>
          <CardDescription>必須: name, category, prefecture, city, address / 任意: fax, email, isFaxPublic, notes</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
{`name,category,prefecture,city,address,fax,email,isFaxPublic,notes
(架空) 訪問看護ステーションあおぞら,HOMEVISIT_NURSE,東京都,新宿区,西新宿0-0-0,03-0000-0001,info@aozora.example,true,駅近
(架空) ケアハウスさくら,DAYCARE_ELDERLY,千葉県,船橋市,本町1-1-1,047-000-0001,,,送迎あり`}
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">
            category は <code>HOMEVISIT_NURSE</code> 等の英字キーまたは日本語ラベル (「訪問看護（一般）」等) を許容します。
          </p>
        </CardContent>
      </Card>

      <CsvImportForm />

      <Button asChild variant="outline" size="sm">
        <Link href="/admin/facilities">施設マスタへ戻る</Link>
      </Button>
    </div>
  );
}
