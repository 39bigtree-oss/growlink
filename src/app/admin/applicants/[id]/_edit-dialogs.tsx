"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import type { FacilityCategory } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  GENDER_OPTIONS,
  QUALIFICATION_OPTIONS,
  FACILITY_CATEGORY_OPTIONS,
  LANGUAGE_OPTIONS,
  NATIONALITY_OPTIONS,
} from "@/lib/constants/applicant-options";

import {
  updateApplicantBasicInfoAction,
  updateApplicantQualificationsAction,
  updateApplicantDesiredCategoriesAction,
  type EditResult,
} from "./actions";

/** 共通の控えめなトリガーボタン (鉛筆アイコン + 「編集」テキスト) */
function EditTrigger({ label = "編集" }: { label?: string }) {
  return (
    <DialogTrigger asChild>
      <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground">
        <Pencil className="h-3 w-3" />
        {label}
      </Button>
    </DialogTrigger>
  );
}

type BasicInfo = {
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  email: string;
  phone: string;
  birthDate: string; // YYYY-MM-DD
  gender: "MALE" | "FEMALE" | "OTHER";
  nationality: string | null;
  language: string | null;
};

export function EditBasicInfoButton({
  applicantId,
  current,
}: {
  applicantId: string;
  current: BasicInfo;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(form: FormData) {
    setError(null);
    start(async () => {
      const res: EditResult = await updateApplicantBasicInfoAction(applicantId, form);
      if (res.ok) setOpen(false);
      else setError(res.message ?? "更新に失敗しました");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <EditTrigger />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>基本情報を編集</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="grid grid-cols-2 gap-3 text-sm">
          <Field label="姓" name="lastName" defaultValue={current.lastName} />
          <Field label="名" name="firstName" defaultValue={current.firstName} />
          <Field label="姓 (カナ)" name="lastNameKana" defaultValue={current.lastNameKana} />
          <Field label="名 (カナ)" name="firstNameKana" defaultValue={current.firstNameKana} />
          <Field label="メール" name="email" type="email" defaultValue={current.email} />
          <Field label="電話" name="phone" defaultValue={current.phone} />
          <Field label="生年月日" name="birthDate" type="date" defaultValue={current.birthDate} />
          <div className="space-y-1">
            <Label className="text-xs">性別</Label>
            <select
              name="gender"
              defaultValue={current.gender}
              className="block h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">国籍</Label>
            <select
              name="nationality"
              defaultValue={current.nationality ?? ""}
              className="block h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="">未選択</option>
              {NATIONALITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">希望言語</Label>
            <select
              name="language"
              defaultValue={current.language ?? "ja"}
              className="block h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              {LANGUAGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {error && (
            <div className="col-span-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </div>
          )}
          <DialogFooter className="col-span-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name} className="text-xs">{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}

export function EditQualificationsButton({
  applicantId,
  current,
}: {
  applicantId: string;
  current: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(current);
  const [custom, setCustom] = useState<string>(
    current.filter((c) => !QUALIFICATION_OPTIONS.includes(c as never)).join(", "),
  );

  function onSubmit() {
    setError(null);
    const extras = custom
      .split(/[,、,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const final = Array.from(new Set([...selected, ...extras]));
    start(async () => {
      const res = await updateApplicantQualificationsAction(applicantId, final);
      if (res.ok) setOpen(false);
      else setError(res.message ?? "更新に失敗しました");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <EditTrigger />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>保有資格を編集</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {QUALIFICATION_OPTIONS.map((q) => (
              <label key={q} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selected.includes(q)}
                  onCheckedChange={(c) =>
                    setSelected((prev) =>
                      c ? Array.from(new Set([...prev, q])) : prev.filter((x) => x !== q),
                    )
                  }
                />
                {q}
              </label>
            ))}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">その他 (カンマ区切り)</Label>
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="例: 認定看護師, 認知症ケア専門士"
            />
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={onSubmit} disabled={pending}>
            {pending ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditDesiredCategoriesButton({
  applicantId,
  current,
}: {
  applicantId: string;
  current: FacilityCategory[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FacilityCategory[]>(current);

  const groups = Array.from(
    new Set(FACILITY_CATEGORY_OPTIONS.map((o) => o.group)),
  );

  function toggle(cat: FacilityCategory) {
    setSelected((prev) => {
      if (prev.includes(cat)) return prev.filter((c) => c !== cat);
      if (prev.length >= 5) return prev;
      return [...prev, cat];
    });
  }

  function onSubmit() {
    setError(null);
    start(async () => {
      const res = await updateApplicantDesiredCategoriesAction(applicantId, selected);
      if (res.ok) setOpen(false);
      else setError(res.message ?? "更新に失敗しました");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <EditTrigger />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>希望業態を編集 (最大 5 件)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground">
            選択中: <span className="font-medium">{selected.length}</span> / 5
          </p>
          {groups.map((group) => (
            <div key={group} className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">{group}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {FACILITY_CATEGORY_OPTIONS.filter((o) => o.group === group).map((o) => (
                  <label key={o.value} className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={selected.includes(o.value)}
                      disabled={!selected.includes(o.value) && selected.length >= 5}
                      onCheckedChange={() => toggle(o.value)}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {error && (
            <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={onSubmit} disabled={pending}>
            {pending ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
