import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FACILITY_CATEGORY_OPTIONS } from "@/lib/constants/applicant-options";
import { requireAdminSession } from "@/lib/auth/session";
import {
  listFacilities,
  type ListFacilitiesInput,
} from "@/lib/repositories/facility";
import { prisma } from "@/lib/db";
import type { FacilityCategory } from "@prisma/client";

import { CreateFaxSheetsForm } from "./_create-form";
import { FacilityFilterBar } from "./_filter-bar";

export const metadata = { title: "FAX 送信票 新規作成 | グロウリンク" };
export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  FACILITY_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
);

export default async function NewFaxSheetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession("fax:create");
  const sp = await searchParams;
  const applicantId = typeof sp.applicantId === "string" ? sp.applicantId : undefined;
  const prefecture = typeof sp.prefecture === "string" ? sp.prefecture : undefined;
  const categoryRaw = typeof sp.category === "string" ? sp.category : undefined;
  const faxOnly = sp.faxOnly === "1";

  const validCategory = FACILITY_CATEGORY_OPTIONS.some((o) => o.value === categoryRaw)
    ? (categoryRaw as FacilityCategory)
    : undefined;

  const [applicants, currentApplicant, facilities] = await Promise.all([
    prisma.applicant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, lastName: true, firstName: true, status: true },
    }),
    applicantId
      ? prisma.applicant.findFirst({
          where: { id: applicantId, deletedAt: null },
          select: { id: true, lastName: true, firstName: true },
        })
      : Promise.resolve(null),
    listFacilities({
      prefecture,
      category: validCategory,
      faxPublicOnly: faxOnly,
      take: 100,
    } satisfies ListFacilitiesInput),
  ]);

  const applicantLabel = currentApplicant
    ? `${currentApplicant.lastName} ${currentApplicant.firstName}`
    : "未選択";

  return (
    <div className="space-y-5 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">FAX 送信票 新規作成 / 一括生成</h1>
        <p className="text-sm text-muted-foreground">
          求職者 1 名 × 複数施設に対して送信票を一気に作成します。
        </p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">求職者を選択</CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicantSelect
            applicantId={applicantId}
            options={applicants.map((a) => ({
              value: a.id,
              label: `${a.lastName} ${a.firstName} (${a.status})`,
            }))}
            keepSearchParams={sp}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">施設フィルタ</CardTitle>
        </CardHeader>
        <CardContent>
          <FacilityFilterBar
            initial={{ prefecture, category: categoryRaw, faxOnly, applicantId }}
          />
        </CardContent>
      </Card>

      {applicantId ? (
        <CreateFaxSheetsForm
          applicantId={applicantId}
          applicantLabel={applicantLabel}
          facilities={facilities.map((f) => ({
            id: f.id,
            name: f.name,
            categoryLabel: CATEGORY_LABELS[f.category] ?? f.category,
            prefecture: f.prefecture,
            city: f.city,
            fax: f.fax,
            isFaxPublic: f.isFaxPublic,
          }))}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          まず上のドロップダウンから求職者を選択してください。
          <Link href="/admin/applicants" className="ml-2 underline">
            申込一覧へ
          </Link>
        </p>
      )}

      <Button asChild variant="outline" size="sm">
        <Link href="/admin/fax-sheets">送信票一覧へ戻る</Link>
      </Button>
    </div>
  );
}

function ApplicantSelect({
  applicantId,
  options,
  keepSearchParams,
}: {
  applicantId: string | undefined;
  options: Array<{ value: string; label: string }>;
  keepSearchParams: Record<string, string | string[] | undefined>;
}) {
  // Server Component なのでフォームで遷移する。client コンポーネントを 1 つ増やすコストを避ける。
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(keepSearchParams)) {
    if (k === "applicantId") continue;
    if (typeof v === "string") params.set(k, v);
  }
  return (
    <form className="flex items-end gap-2" action="/admin/fax-sheets/new">
      <div className="flex-1">
        <Select name="applicantId" defaultValue={applicantId ?? undefined}>
          <SelectTrigger>
            <SelectValue placeholder="選択してください" />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* keep other filters */}
      {Array.from(params.entries()).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Button type="submit" size="sm">
        選択
      </Button>
    </form>
  );
}
