import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdminSession } from "@/lib/auth/session";
import { hasCapability } from "@/lib/auth/rbac";
import { FACILITY_CATEGORY_OPTIONS } from "@/lib/constants/applicant-options";
import { countFacilities, listFacilities } from "@/lib/repositories/facility";
import type { FacilityCategory } from "@prisma/client";

import { FacilitySearchBar } from "./_search-bar";

export const metadata = { title: "施設マスタ | グロウリンク" };
export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  FACILITY_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
);

export default async function FacilitiesListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requireAdminSession("facilities:read");
  const canWrite = hasCapability(staff.role, "facilities:write");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const prefecture = typeof sp.prefecture === "string" ? sp.prefecture : undefined;
  const city = typeof sp.city === "string" ? sp.city : undefined;
  const categoryRaw = typeof sp.category === "string" ? sp.category : undefined;
  const faxOnly = sp.faxOnly === "1";
  const validCategory = FACILITY_CATEGORY_OPTIONS.some((o) => o.value === categoryRaw)
    ? (categoryRaw as FacilityCategory)
    : undefined;
  const [facilities, total] = await Promise.all([
    listFacilities({ q, prefecture, city, category: validCategory, faxPublicOnly: faxOnly, take: 100 }),
    countFacilities({ q, prefecture, city, category: validCategory, faxPublicOnly: faxOnly }),
  ]);
  return (
    <div className="space-y-5 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">施設マスタ</h1>
          <p className="text-sm text-muted-foreground">{total} 件中 {facilities.length} 件を表示</p>
        </div>
        <div className="space-x-2">
          {canWrite && (
            <Button asChild variant="outline">
              <Link href="/admin/facilities/import">CSV 一括インポート</Link>
            </Button>
          )}
          {canWrite && (
            <Button asChild>
              <Link href="/admin/facilities/new">新規作成</Link>
            </Button>
          )}
        </div>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">検索 / 絞り込み</CardTitle>
        </CardHeader>
        <CardContent>
          <FacilitySearchBar initial={{ q, prefecture, city, category: categoryRaw, faxOnly }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">登録施設</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>施設名</TableHead>
                <TableHead>業態</TableHead>
                <TableHead>所在地</TableHead>
                <TableHead>FAX</TableHead>
                <TableHead>公開</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    条件に一致する施設がありません。
                  </TableCell>
                </TableRow>
              ) : (
                facilities.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell>{CATEGORY_LABELS[f.category] ?? f.category}</TableCell>
                    <TableCell className="text-xs">
                      {f.prefecture}
                      {f.city}
                    </TableCell>
                    <TableCell className="text-xs">{f.fax ?? "未登録"}</TableCell>
                    <TableCell className="text-xs">{f.isFaxPublic ? "公開可" : "非公開"}</TableCell>
                    <TableCell className="text-right">
                      {canWrite ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/facilities/${f.id}`}>編集</Link>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">閲覧のみ</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
