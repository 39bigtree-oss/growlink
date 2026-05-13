"use client";

import { Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { type SupportedLocale } from "@/lib/i18n/config";
import type { SkillSheetContent } from "@/lib/schemas/skill-sheet";

import jaMessages from "@/../messages/ja.json";
import enMessages from "@/../messages/en.json";
import viMessages from "@/../messages/vi.json";
import idMessages from "@/../messages/id.json";
import zhMessages from "@/../messages/zh.json";

const MESSAGES: Record<SupportedLocale, typeof jaMessages> = {
  ja: jaMessages,
  en: enMessages,
  vi: viMessages as unknown as typeof jaMessages,
  id: idMessages as unknown as typeof jaMessages,
  zh: zhMessages as unknown as typeof jaMessages,
};

type T = (path: string, vars?: Record<string, string | number>) => string;

function buildT(messages: typeof jaMessages): T {
  return (path, vars) => {
    const parts = path.split(".");
    let cur: unknown = messages;
    for (const p of parts) {
      if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        return path;
      }
    }
    if (typeof cur !== "string") return path;
    if (!vars) return cur;
    return cur.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
  };
}

export function SkillSheetForm({
  token,
  applicantName,
  locale,
  initial,
}: {
  token: string;
  applicantName: string;
  locale: SupportedLocale;
  initial: SkillSheetContent;
}) {
  const [currentLocale, setCurrentLocale] = useState<SupportedLocale>(locale);
  const t = useMemo(() => buildT(MESSAGES[currentLocale] ?? MESSAGES.ja), [currentLocale]);
  const { toast } = useToast();
  const [data, setData] = useState<SkillSheetContent>(initial);
  const [tab, setTab] = useState<string>("education");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done" | "error">(
    "idle",
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitPending, setSubmitPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function save(opts: { silent?: boolean } = {}): Promise<boolean> {
    setSaving(true);
    try {
      const res = await fetch(`/api/skill-sheet/${encodeURIComponent(token)}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        if (!opts.silent) {
          toast({ title: t("common.loading"), description: `HTTP ${res.status}`, variant: "destructive" });
        }
        return false;
      }
      const body = (await res.json()) as { savedAt: string };
      setSavedAt(body.savedAt);
      if (!opts.silent) {
        toast({ title: t("common.saved"), variant: "success" });
      }
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    setSubmitPending(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/skill-sheet/${encodeURIComponent(token)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setSubmitError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setSubmitOpen(false);
      setSubmitted(true);
    } finally {
      setSubmitPending(false);
    }
  }

  async function uploadResume(file: File) {
    setUploadState("uploading");
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/skill-sheet/${encodeURIComponent(token)}/resume`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setUploadError(body.error ?? `HTTP ${res.status}`);
        setUploadState("error");
        return;
      }
      // OCR で SkillSheet がサーバ側で更新されたので、フォームにも反映する。
      const reloaded = await fetch(`/api/skill-sheet/${encodeURIComponent(token)}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      void reloaded;
      // サーバから最新を引きたいので、ページ再取得を要求する。
      setUploadState("done");
      window.location.reload();
    } catch (e) {
      setUploadError((e as Error).message);
      setUploadState("error");
    }
  }

  // 自動保存 (30 秒ごと)。提出後・保存中は走らせない。
  useEffect(() => {
    if (submitted) return;
    const id = setInterval(() => {
      if (!saving) void save({ silent: true });
    }, 30_000);
    return () => clearInterval(id);
    // dataはdepにいれない (ループ防止)。setInterval 内が最新の closure を参照する形にする。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, saving]);

  if (submitted) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-emerald-900">
        <h1 className="mb-2 text-xl font-semibold">{t("skillSheet.actions.submitted")}</h1>
      </div>
    );
  }

  const remaining = 400 - (data.selfPR?.length ?? 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("skillSheet.pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">{applicantName} 様</p>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            {t("skillSheet.intro")}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Label className="text-xs">{t("common.language")}</Label>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            value={currentLocale}
            onChange={(e) => {
              const v = e.target.value as SupportedLocale;
              setCurrentLocale(v);
              document.cookie = `growlink_locale=${v}; path=/; max-age=31536000`;
            }}
          >
            <option value="ja">{t("locale.ja")}</option>
            <option value="en">{t("locale.en")}</option>
            <option value="vi">{t("locale.vi")}</option>
            <option value="id">{t("locale.id")}</option>
            <option value="zh">{t("locale.zh")}</option>
          </select>
          {savedAt && (
            <span className="text-emerald-700">
              {t("common.saved")} ({new Date(savedAt).toLocaleTimeString()})
            </span>
          )}
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="education">{t("skillSheet.tabs.education")}</TabsTrigger>
          <TabsTrigger value="career">{t("skillSheet.tabs.career")}</TabsTrigger>
          <TabsTrigger value="skills">{t("skillSheet.tabs.skills")}</TabsTrigger>
          <TabsTrigger value="desired">{t("skillSheet.tabs.desired")}</TabsTrigger>
          <TabsTrigger value="selfPR">{t("skillSheet.tabs.selfPR")}</TabsTrigger>
          <TabsTrigger value="resume">{t("skillSheet.tabs.resume")}</TabsTrigger>
        </TabsList>

        <TabsContent value="education" className="mt-4 space-y-3">
          <h2 className="text-base font-semibold">{t("skillSheet.education.title")}</h2>
          {data.educations.map((e, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-md border p-3 md:grid-cols-3">
              <Input
                placeholder={t("skillSheet.education.schoolName")}
                value={e.schoolName}
                onChange={(v) =>
                  setData((d) => ({
                    ...d,
                    educations: d.educations.map((x, j) =>
                      i === j ? { ...x, schoolName: v.target.value } : x,
                    ),
                  }))
                }
              />
              <Input
                placeholder={t("skillSheet.education.department")}
                value={e.department}
                onChange={(v) =>
                  setData((d) => ({
                    ...d,
                    educations: d.educations.map((x, j) =>
                      i === j ? { ...x, department: v.target.value } : x,
                    ),
                  }))
                }
              />
              <div className="flex items-center gap-2">
                <Input
                  placeholder="YYYY-MM"
                  value={e.graduatedOn}
                  onChange={(v) =>
                    setData((d) => ({
                      ...d,
                      educations: d.educations.map((x, j) =>
                        i === j ? { ...x, graduatedOn: v.target.value } : x,
                      ),
                    }))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setData((d) => ({
                      ...d,
                      educations: d.educations.filter((_, j) => j !== i),
                    }))
                  }
                >
                  {t("skillSheet.education.remove")}
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setData((d) => ({
                ...d,
                educations: [
                  ...d.educations,
                  { schoolName: "", department: "", graduatedOn: "" },
                ],
              }))
            }
          >
            + {t("skillSheet.education.addRow")}
          </Button>
        </TabsContent>

        <TabsContent value="career" className="mt-4 space-y-3">
          <h2 className="text-base font-semibold">{t("skillSheet.career.title")}</h2>
          {data.careers.map((c, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-md border p-3 md:grid-cols-2">
              <Input
                placeholder={t("skillSheet.career.company")}
                value={c.company}
                onChange={(v) =>
                  setData((d) => ({
                    ...d,
                    careers: d.careers.map((x, j) =>
                      i === j ? { ...x, company: v.target.value } : x,
                    ),
                  }))
                }
              />
              <Input
                placeholder={t("skillSheet.career.role")}
                value={c.role}
                onChange={(v) =>
                  setData((d) => ({
                    ...d,
                    careers: d.careers.map((x, j) =>
                      i === j ? { ...x, role: v.target.value } : x,
                    ),
                  }))
                }
              />
              <Input
                placeholder={`${t("skillSheet.career.from")} (YYYY-MM)`}
                value={c.from}
                onChange={(v) =>
                  setData((d) => ({
                    ...d,
                    careers: d.careers.map((x, j) =>
                      i === j ? { ...x, from: v.target.value } : x,
                    ),
                  }))
                }
              />
              <Input
                placeholder={`${t("skillSheet.career.to")} (YYYY-MM)`}
                value={c.to}
                onChange={(v) =>
                  setData((d) => ({
                    ...d,
                    careers: d.careers.map((x, j) =>
                      i === j ? { ...x, to: v.target.value } : x,
                    ),
                  }))
                }
              />
              <Textarea
                className="md:col-span-2"
                placeholder={t("skillSheet.career.achievements")}
                value={c.achievements}
                onChange={(v) =>
                  setData((d) => ({
                    ...d,
                    careers: d.careers.map((x, j) =>
                      i === j ? { ...x, achievements: v.target.value } : x,
                    ),
                  }))
                }
              />
              <div className="md:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setData((d) => ({
                      ...d,
                      careers: d.careers.filter((_, j) => j !== i),
                    }))
                  }
                >
                  {t("skillSheet.education.remove")}
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setData((d) => ({
                ...d,
                careers: [
                  ...d.careers,
                  { company: "", role: "", from: "", to: "", achievements: "" },
                ],
              }))
            }
          >
            + {t("skillSheet.career.addRow")}
          </Button>
        </TabsContent>

        <TabsContent value="skills" className="mt-4 space-y-3">
          <h2 className="text-base font-semibold">{t("skillSheet.skills.title")}</h2>
          {data.skills.map((s, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-md border p-3 md:grid-cols-[1fr_120px_auto]">
              <Input
                placeholder={t("skillSheet.skills.name")}
                value={s.name}
                onChange={(v) =>
                  setData((d) => ({
                    ...d,
                    skills: d.skills.map((x, j) =>
                      i === j ? { ...x, name: v.target.value } : x,
                    ),
                  }))
                }
              />
              <Input
                type="number"
                min={1}
                max={5}
                value={s.level}
                onChange={(v) =>
                  setData((d) => ({
                    ...d,
                    skills: d.skills.map((x, j) =>
                      i === j ? { ...x, level: Math.max(1, Math.min(5, Number(v.target.value) || 3)) } : x,
                    ),
                  }))
                }
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setData((d) => ({
                    ...d,
                    skills: d.skills.filter((_, j) => j !== i),
                  }))
                }
              >
                {t("skillSheet.education.remove")}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setData((d) => ({ ...d, skills: [...d.skills, { name: "", level: 3 }] }))
            }
          >
            + {t("skillSheet.skills.addRow")}
          </Button>
        </TabsContent>

        <TabsContent value="desired" className="mt-4 space-y-3">
          <h2 className="text-base font-semibold">{t("skillSheet.desired.title")}</h2>
          <div className="space-y-2">
            <Label>{t("skillSheet.desired.areas")}</Label>
            <Input
              placeholder="例: 東京都新宿区, 渋谷区"
              value={data.desired.areas.join(", ")}
              onChange={(v) =>
                setData((d) => ({
                  ...d,
                  desired: {
                    ...d.desired,
                    areas: v.target.value
                      .split(/[,、]/)
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .slice(0, 20),
                  },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{t("skillSheet.desired.schedule")}</Label>
            <Input
              placeholder={t("skillSheet.desired.scheduleHint")}
              value={data.desired.schedule}
              onChange={(v) =>
                setData((d) => ({
                  ...d,
                  desired: { ...d.desired, schedule: v.target.value },
                }))
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("skillSheet.desired.startMonth")}</Label>
              <Input
                placeholder="YYYY-MM"
                value={data.desired.startMonth}
                onChange={(v) =>
                  setData((d) => ({
                    ...d,
                    desired: { ...d.desired, startMonth: v.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("skillSheet.desired.salary")}</Label>
              <Input
                type="number"
                min={0}
                max={99999}
                value={data.desired.salary ?? ""}
                onChange={(v) =>
                  setData((d) => ({
                    ...d,
                    desired: {
                      ...d.desired,
                      salary: v.target.value === "" ? null : Math.max(0, Number(v.target.value) || 0),
                    },
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("skillSheet.desired.notes")}</Label>
            <Textarea
              value={data.desired.notes}
              onChange={(v) =>
                setData((d) => ({
                  ...d,
                  desired: { ...d.desired, notes: v.target.value },
                }))
              }
            />
          </div>
        </TabsContent>

        <TabsContent value="selfPR" className="mt-4 space-y-3">
          <h2 className="text-base font-semibold">{t("skillSheet.selfPR.title")}</h2>
          <Textarea
            placeholder={t("skillSheet.selfPR.placeholder")}
            value={data.selfPR}
            maxLength={400}
            onChange={(v) => setData((d) => ({ ...d, selfPR: v.target.value }))}
            rows={8}
          />
          <p className="text-xs text-muted-foreground">
            {t("skillSheet.selfPR.remaining", { n: remaining })}
          </p>
        </TabsContent>

        <TabsContent value="resume" className="mt-4 space-y-3">
          <h2 className="text-base font-semibold">{t("skillSheet.resume.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("skillSheet.resume.description")}</p>
          <label className="flex items-center gap-3">
            <Input
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadResume(f);
              }}
            />
            <Upload className="h-4 w-4 text-muted-foreground" aria-hidden />
          </label>
          {uploadState === "uploading" && (
            <p className="text-sm text-muted-foreground">{t("skillSheet.resume.processing")}</p>
          )}
          {uploadState === "done" && (
            <p className="text-sm text-emerald-700">{t("skillSheet.resume.done")}</p>
          )}
          {uploadState === "error" && uploadError && (
            <p className="text-sm text-destructive">
              {t("skillSheet.resume.error")} ({uploadError})
            </p>
          )}
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button type="button" variant="outline" onClick={() => save()} disabled={saving}>
          {saving ? t("common.saving") : t("skillSheet.actions.savePartial")}
        </Button>
        <Button type="button" onClick={() => setSubmitOpen(true)}>
          {t("skillSheet.actions.submit")}
        </Button>
      </div>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("skillSheet.actions.submit")}</DialogTitle>
            <DialogDescription>{t("skillSheet.actions.submitConfirm")}</DialogDescription>
          </DialogHeader>
          {submitError && (
            <p role="alert" className="text-sm text-destructive">
              {submitError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)} disabled={submitPending}>
              {t("common.back")}
            </Button>
            <Button onClick={submit} disabled={submitPending}>
              {submitPending ? t("common.saving") : t("skillSheet.actions.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
