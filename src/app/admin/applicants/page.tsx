import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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
import { FACILITY_CATEGORY_OPTIONS } from "@/lib/constants/applicant-options";
import { requireAdminSession } from "@/lib/auth/session";
import {
  ageFromBirthDate,
  parseApplicantListFilter,
  queryApplicants,
} from "@/lib/applicants/list-query";
import { statusLabel } from "@/lib/applicants/status-machine";
import { prisma } from "@/lib/db";

import { ApplicantsFilterBar } from "./_filter-bar";
import { ApplicantsStatusTabs, type StatusTabValue } from "./_status-tabs";
import { Pagination } from "./_pagination";

export const metadata = { title: "申込一覧 | グロウリンク" };
export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  FACILITY_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
);
const GENDER_LABEL: Record<string, string> = { MALE: "男性", FEMALE: "女性", OTHER: "回答しない" };

export default async function ApplicantsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession("applicants:read");
  const sp = await searchParams;
  const filter = parseApplicantListFilter(sp);

  const [page, allCount, statusGroups] = await Promise.all([
    queryApplicants(filter),
    prisma.applicant.count({ where: { deletedAt: null } }),
    prisma.applicant.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const counts: Partial<Record<StatusTabValue, number>> = { ALL: allCount };
  for (const row of statusGroups) {
    counts[row.status as StatusTabValue] = row._count._all;
  }

  const currentTab: StatusTabValue = (filter.status ?? "ALL") as StatusTabValue;

  return (
    <div className="space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">申込一覧</h1>
        <p className="text-sm text-muted-foreground">{page.total} 件 (フィルタ適用後)</p>
      </header>

      <ApplicantsStatusTabs current={currentTab} searchParams={sp} counts={counts} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">フィルタ</CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicantsFilterBar initial={{ q: filter.q, from: filter.from, to: filter.to }} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>氏名 (フリガナ)</TableHead>
                <TableHead>性別</TableHead>
                <TableHead>年齢</TableHead>
                <TableHead>希望業態</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>申込日</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    条件に合致する申込はありません。
                  </TableCell>
                </TableRow>
              ) : (
                page.items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium">
                        {a.lastName} {a.firstName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.lastNameKana} {a.firstNameKana}
                      </div>
                    </TableCell>
                    <TableCell>{GENDER_LABEL[a.gender] ?? a.gender}</TableCell>
                    <TableCell>{ageFromBirthDate(a.birthDate)}</TableCell>
                    <TableCell className="max-w-[14rem]">
                      <div className="truncate text-xs text-muted-foreground">
                        {a.desiredCategories.length === 0
                          ? "未選択"
                          : a.desiredCategories
                              .map((c) => CATEGORY_LABELS[c] ?? c)
                              .join(" / ")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="muted">{statusLabel(a.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {a.createdAt.toISOString().slice(0, 10)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/applicants/${a.id}`}>詳細</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Pagination page={page.page} totalPages={page.totalPages} searchParams={sp} />
    </div>
  );
}
