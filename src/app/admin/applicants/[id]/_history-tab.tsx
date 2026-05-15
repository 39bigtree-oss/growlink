import { prisma } from "@/lib/db";

const ACTION_LABEL: Record<string, string> = {
  "applicant.basic_info.updated": "基本情報の編集",
  "applicant.qualifications.updated": "保有資格の編集",
  "applicant.desired_categories.updated": "希望業態の編集",
  "applicant.diagnosis_v2.regenerated": "AI 診断やり直し",
};

const FIELD_LABEL: Record<string, string> = {
  lastName: "姓",
  firstName: "名",
  lastNameKana: "姓 (カナ)",
  firstNameKana: "名 (カナ)",
  email: "メール",
  phone: "電話",
  birthDate: "生年月日",
  gender: "性別",
  nationality: "国籍",
  language: "希望言語",
  names: "資格",
  desiredCategories: "希望業態",
  removedCacheFiles: "破棄したキャッシュ件数",
};

type Json = unknown;

export async function ApplicantHistoryTab({ applicantId }: { applicantId: string }) {
  const events = await prisma.auditEvent.findMany({
    where: { entityType: "Applicant", entityId: applicantId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      action: true,
      actorEmail: true,
      before: true,
      after: true,
      createdAt: true,
    },
  });

  if (events.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        この申込に関する修正履歴はまだありません。基本情報・資格・希望業態を編集すると、ここに記録されます。
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {events.map((e) => {
        const diff = diffSummary(e.before, e.after);
        return (
          <li key={e.id} className="rounded-md border bg-muted/20 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {ACTION_LABEL[e.action] ?? e.action}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {formatTs(e.createdAt)}
              </span>
            </div>
            <div className="mt-1 text-muted-foreground">
              実行: {e.actorEmail ?? "システム"}
            </div>
            {diff.length > 0 && (
              <ul className="mt-2 space-y-1">
                {diff.map((d, i) => (
                  <li key={i} className="grid grid-cols-[6rem_1fr] gap-2">
                    <span className="text-muted-foreground">{FIELD_LABEL[d.key] ?? d.key}</span>
                    <span>
                      <span className="text-muted-foreground line-through">{d.before}</span>
                      <span className="mx-1 text-muted-foreground">→</span>
                      <span className="font-medium">{d.after}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function diffSummary(beforeJson: Json, afterJson: Json): Array<{ key: string; before: string; after: string }> {
  const before = (beforeJson ?? {}) as Record<string, unknown>;
  const after = (afterJson ?? {}) as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  const result: Array<{ key: string; before: string; after: string }> = [];
  for (const k of keys) {
    const b = stringify(before[k]);
    const a = stringify(after[k]);
    if (b === a) continue;
    result.push({ key: k, before: b, after: a });
  }
  return result;
}

function stringify(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.length === 0 ? "(なし)" : v.join(" / ");
  if (typeof v === "boolean") return v ? "あり" : "なし";
  if (typeof v === "string") {
    // ISO 日付っぽければ YYYY-MM-DD に短縮
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
    return v;
  }
  return String(v);
}

function formatTs(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm}`;
}
