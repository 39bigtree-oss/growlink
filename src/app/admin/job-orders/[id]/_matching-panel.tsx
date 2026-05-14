import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { scoreMatch, type JobOrderForMatching } from "@/lib/matching/score";
import type { ApplicantMatchingProfile } from "@/lib/schemas/job-order";

/**
 * 案件詳細から「マッチ度の高い求職者 Top 10」を出すパネル。
 * 全 applicant ループでスコアリングするのは件数が増えると重いので、
 * v1.5 では SALES_READY 以降の "営業対象" 求職者だけに絞る。
 */
export async function JobOrderMatchingPanel({ jobOrderId }: { jobOrderId: string }) {
  const jobOrder = await prisma.jobOrder.findUnique({
    where: { id: jobOrderId },
    include: { facility: { select: { prefecture: true, city: true } } },
  });
  if (!jobOrder) return null;

  const applicants = await prisma.applicant.findMany({
    where: {
      deletedAt: null,
      status: { in: ["DIAGNOSED", "SKILL_SHEET_DONE", "INTERVIEW_DONE", "SALES_READY"] },
    },
    include: {
      qualifications: { select: { name: true } },
      skillSheet: { select: { desired: true, careers: true } },
    },
    take: 200,
  });

  const jobForMatching: JobOrderForMatching = {
    facility: jobOrder.facility,
    position: jobOrder.position,
    employmentType: jobOrder.employmentType,
    hourlyWageMin: jobOrder.hourlyWageMin,
    hourlyWageMax: jobOrder.hourlyWageMax,
    monthlyWageMin: jobOrder.monthlyWageMin,
    monthlyWageMax: jobOrder.monthlyWageMax,
    shiftPattern: jobOrder.shiftPattern as JobOrderForMatching["shiftPattern"],
    requiredQualifications: jobOrder.requiredQualifications,
    preferredQualifications: jobOrder.preferredQualifications,
    minExperienceYears: jobOrder.minExperienceYears,
  };

  const scored = applicants
    .map((a) => {
      const profile: ApplicantMatchingProfile = {
        applicantId: a.id,
        prefecture: undefined,
        city: undefined,
        desiredCategories: a.desiredCategories,
        qualifications: a.qualifications.map((q) => q.name),
        experienceYears: Array.isArray(a.skillSheet?.careers)
          ? (a.skillSheet?.careers as Array<unknown>).length
          : 0,
      };
      return { applicant: a, score: scoreMatch(profile, jobForMatching) };
    })
    .filter((r) => !r.score.hardFiltered)
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, 10);

  if (scored.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        営業対象の求職者でこの案件に合う方は見つかりませんでした (必須資格未保持を除外)。
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>求職者</TableHead>
          <TableHead className="text-center">スコア</TableHead>
          <TableHead>内訳</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {scored.map(({ applicant, score }) => (
          <TableRow key={applicant.id}>
            <TableCell>
              <div className="font-medium">
                {applicant.lastName} {applicant.firstName}
              </div>
              <div className="text-xs text-muted-foreground">{applicant.status}</div>
            </TableCell>
            <TableCell className="text-center">
              <Badge variant={score.total >= 80 ? "default" : "secondary"}>
                {score.total}
              </Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              D:{score.breakdown.distance} / W:{score.breakdown.wage} /{" "}
              S:{score.breakdown.shift} / Q:{score.breakdown.qual} / E:{score.breakdown.exp}
            </TableCell>
            <TableCell className="text-right">
              <Link
                href={`/admin/applicants/${applicant.id}`}
                className="text-sm text-primary underline-offset-2 hover:underline"
              >
                詳細
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
