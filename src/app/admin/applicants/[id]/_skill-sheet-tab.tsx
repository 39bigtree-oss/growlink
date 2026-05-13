"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { SkillSheetTabData } from "./_skill-sheet-data";

export function SkillSheetTab({
  applicantId,
  data,
  canWrite,
}: {
  applicantId: string;
  data: SkillSheetTabData;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resentInfo, setResentInfo] = useState<string | null>(null);

  async function resendInvite() {
    setPending(true);
    setError(null);
    setResentInfo(null);
    try {
      const res = await fetch(
        `/api/admin/applicants/${encodeURIComponent(applicantId)}/skill-sheet/invite`,
        { method: "POST" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setResentInfo(body.url ?? "送信しました");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!data.skillSheet) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">スキルシート</CardTitle>
          {canWrite && (
            <Button size="sm" onClick={() => setOpen(true)}>
              入力リンクを再送
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <CardDescription>
            求職者によるスキルシート入力はまだ着手されていません。
            {data.activeToken ? (
              <span className="ml-1">
                有効リンク (期限 {data.activeToken.expiresAt.toISOString().slice(0, 10)}) あり。
              </span>
            ) : (
              <span className="ml-1">有効リンクがありません。再送してください。</span>
            )}
          </CardDescription>
          {resentInfo && (
            <p className="mt-3 break-all text-xs text-emerald-700">
              再送しました。リンク: <code>{resentInfo}</code>
            </p>
          )}
          <ResendDialog
            open={open}
            onOpenChange={setOpen}
            pending={pending}
            error={error}
            onResend={resendInvite}
          />
        </CardContent>
      </Card>
    );
  }

  const s = data.skillSheet;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">スキルシート</CardTitle>
            <CardDescription className="mt-1">
              {s.submittedAt ? (
                <Badge variant="success">提出済み</Badge>
              ) : s.savedAt ? (
                <Badge variant="warning">下書き保存中</Badge>
              ) : (
                <Badge variant="muted">未着手</Badge>
              )}
              <span className="ml-2 text-xs text-muted-foreground">
                最終編集: {s.lastEditedBy ?? "未編集"} / 更新{" "}
                {s.updatedAt.toISOString().slice(0, 10)}
              </span>
            </CardDescription>
          </div>
          {canWrite && (
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              入力リンクを再送
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <Section title="学歴">
            {s.educations.length === 0 ? (
              <Empty />
            ) : (
              <ul className="space-y-1">
                {s.educations.map((e, i) => (
                  <li key={i}>
                    {e.schoolName} {e.department && `(${e.department})`}{" "}
                    <span className="text-xs text-muted-foreground">{e.graduatedOn}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title="職歴">
            {s.careers.length === 0 ? (
              <Empty />
            ) : (
              <ul className="space-y-2">
                {s.careers.map((c, i) => (
                  <li key={i} className="rounded border bg-muted/30 p-2">
                    <div className="font-medium">
                      {c.company} — {c.role}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.from} 〜 {c.to || "現職"}
                    </div>
                    {c.achievements && <p className="mt-1 text-xs">{c.achievements}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title="スキル">
            {s.skills.length === 0 ? (
              <Empty />
            ) : (
              <div className="flex flex-wrap gap-2">
                {s.skills.map((sk, i) => (
                  <Badge key={i} variant="muted">
                    {sk.name} ★{sk.level}
                  </Badge>
                ))}
              </div>
            )}
          </Section>
          <Section title="希望条件">
            <ul className="space-y-1 text-xs">
              <li>勤務地: {s.desired.areas.length ? s.desired.areas.join(", ") : "未指定"}</li>
              <li>勤務形態: {s.desired.schedule || "未指定"}</li>
              <li>開始時期: {s.desired.startMonth || "未指定"}</li>
              <li>
                希望年収:{" "}
                {s.desired.salary != null ? `${s.desired.salary} 万円` : "未指定"}
              </li>
              {s.desired.notes && <li>メモ: {s.desired.notes}</li>}
            </ul>
          </Section>
          <Section title="自己 PR">
            {s.selfPR ? <p className="whitespace-pre-wrap text-sm">{s.selfPR}</p> : <Empty />}
          </Section>
        </CardContent>
      </Card>

      {data.resumes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">履歴書アップロード履歴</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1 pr-2">日時</th>
                  <th className="py-1 pr-2">サイズ</th>
                  <th className="py-1 pr-2">OCR</th>
                  <th className="py-1 pr-2">AI</th>
                  <th className="py-1 pr-2">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {data.resumes.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-1 pr-2">{r.createdAt.toISOString().slice(0, 16)}</td>
                    <td className="py-1 pr-2">{Math.round(r.bytes / 1024)} KB</td>
                    <td className="py-1 pr-2">{r.ocrProvider ?? "—"}</td>
                    <td className="py-1 pr-2">{r.llmProvider ?? "—"}</td>
                    <td className="py-1 pr-2">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {resentInfo && (
        <p className="break-all text-xs text-emerald-700">
          再送しました。リンク: <code>{resentInfo}</code>
        </p>
      )}

      <ResendDialog
        open={open}
        onOpenChange={setOpen}
        pending={pending}
        error={error}
        onResend={resendInvite}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div>{children}</div>
    </section>
  );
}

function Empty() {
  return <p className="text-xs text-muted-foreground">未入力</p>;
}

function ResendDialog({
  open,
  onOpenChange,
  pending,
  error,
  onResend,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pending: boolean;
  error: string | null;
  onResend: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>スキルシート入力リンクを再送</DialogTitle>
          <DialogDescription>
            登録メールアドレスへスキルシート入力リンクを送信します。EMAIL_PROVIDER=mock の場合は実送信はされず、ログのみ記録されます。
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            キャンセル
          </Button>
          <Button onClick={onResend} disabled={pending}>
            {pending ? "送信中..." : "送信する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
