"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { JobOrderActionState } from "./actions";

export type JobOrderFormDefaults = {
  facilityId?: string;
  title?: string;
  position?: string;
  employmentType?: string;
  hourlyWageMin?: number | null;
  hourlyWageMax?: number | null;
  monthlyWageMin?: number | null;
  monthlyWageMax?: number | null;
  shiftPattern?:
    | { dayShift?: boolean; nightShift?: boolean; oncall?: boolean; weeklyDays?: number }
    | null;
  requiredQualifications?: string[];
  preferredQualifications?: string[];
  minExperienceYears?: number;
  headcount?: number;
  status?: string;
  urgency?: string;
  startDate?: string;
  endDate?: string;
  nearestStation?: string | null;
  notes?: string | null;
};

const POSITION_OPTS = [
  { value: "NURSE", label: "看護師" },
  { value: "CARE_WORKER", label: "介護職" },
  { value: "PT_OT_ST", label: "PT/OT/ST" },
  { value: "SOCIAL_WORKER", label: "社会福祉士/精神保健福祉士" },
  { value: "CARE_MANAGER", label: "ケアマネージャー" },
  { value: "OTHER", label: "その他" },
];

const EMPLOYMENT_OPTS = [
  { value: "DIRECT", label: "常勤 (直接雇用)" },
  { value: "DISPATCH", label: "派遣" },
  { value: "TEMP_TO_PERM", label: "紹介予定派遣" },
  { value: "PART_TIME", label: "パート" },
];

const STATUS_OPTS = [
  { value: "OPEN", label: "募集中" },
  { value: "HOLD", label: "一時保留" },
  { value: "FILLED", label: "充足" },
  { value: "CLOSED", label: "終了" },
];

const URGENCY_OPTS = [
  { value: "NORMAL", label: "通常" },
  { value: "URGENT", label: "急募" },
  { value: "CRITICAL", label: "最優先" },
];

const initialState: JobOrderActionState = { ok: false };

export function JobOrderForm({
  action,
  defaults,
  facilities,
  submitLabel,
}: {
  action: (s: JobOrderActionState, fd: FormData) => Promise<JobOrderActionState>;
  defaults?: JobOrderFormDefaults;
  facilities: Array<{ id: string; name: string; prefecture: string; city: string }>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const sp = defaults?.shiftPattern ?? {};
  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="facilityId">施設</Label>
          <Select name="facilityId" defaultValue={defaults?.facilityId}>
            <SelectTrigger id="facilityId">
              <SelectValue placeholder="施設を選択" />
            </SelectTrigger>
            <SelectContent>
              {facilities.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name} ({f.prefecture}{f.city})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="title">タイトル</Label>
          <Input id="title" name="title" defaultValue={defaults?.title ?? ""} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="position">職種</Label>
          <Select name="position" defaultValue={defaults?.position ?? "NURSE"}>
            <SelectTrigger id="position">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITION_OPTS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="employmentType">雇用形態</Label>
          <Select name="employmentType" defaultValue={defaults?.employmentType ?? "DIRECT"}>
            <SelectTrigger id="employmentType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_OPTS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <fieldset className="grid grid-cols-2 gap-3 rounded-md border p-3 md:grid-cols-4">
        <legend className="px-1 text-xs font-semibold text-muted-foreground">時給帯 / 月給帯</legend>
        <div className="space-y-1">
          <Label htmlFor="hourlyWageMin" className="text-xs">時給 下限</Label>
          <Input id="hourlyWageMin" name="hourlyWageMin" type="number" defaultValue={defaults?.hourlyWageMin ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="hourlyWageMax" className="text-xs">時給 上限</Label>
          <Input id="hourlyWageMax" name="hourlyWageMax" type="number" defaultValue={defaults?.hourlyWageMax ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="monthlyWageMin" className="text-xs">月給 下限</Label>
          <Input id="monthlyWageMin" name="monthlyWageMin" type="number" defaultValue={defaults?.monthlyWageMin ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="monthlyWageMax" className="text-xs">月給 上限</Label>
          <Input id="monthlyWageMax" name="monthlyWageMax" type="number" defaultValue={defaults?.monthlyWageMax ?? ""} />
        </div>
      </fieldset>

      <fieldset className="grid grid-cols-2 gap-3 rounded-md border p-3 md:grid-cols-4">
        <legend className="px-1 text-xs font-semibold text-muted-foreground">シフト</legend>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="dayShift" defaultChecked={sp.dayShift ?? true} /> 日勤
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="nightShift" defaultChecked={sp.nightShift ?? false} /> 夜勤
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="oncall" defaultChecked={sp.oncall ?? false} /> オンコール
        </label>
        <div className="space-y-1">
          <Label htmlFor="weeklyDays" className="text-xs">週日数</Label>
          <Input id="weeklyDays" name="weeklyDays" type="number" min={1} max={7} defaultValue={sp.weeklyDays ?? 5} />
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="requiredQualifications">必須資格 (カンマ/改行区切り)</Label>
          <Textarea
            id="requiredQualifications"
            name="requiredQualifications"
            rows={2}
            defaultValue={(defaults?.requiredQualifications ?? []).join(", ")}
            placeholder="例: 看護師"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="preferredQualifications">推奨資格 (カンマ/改行区切り)</Label>
          <Textarea
            id="preferredQualifications"
            name="preferredQualifications"
            rows={2}
            defaultValue={(defaults?.preferredQualifications ?? []).join(", ")}
            placeholder="例: 認知症ケア専門士"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="minExperienceYears">最低経験年数</Label>
          <Input id="minExperienceYears" name="minExperienceYears" type="number" defaultValue={defaults?.minExperienceYears ?? 0} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="headcount">採用人数</Label>
          <Input id="headcount" name="headcount" type="number" defaultValue={defaults?.headcount ?? 1} min={1} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="status">ステータス</Label>
          <Select name="status" defaultValue={defaults?.status ?? "OPEN"}>
            <SelectTrigger id="status"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="urgency">緊急度</Label>
          <Select name="urgency" defaultValue={defaults?.urgency ?? "NORMAL"}>
            <SelectTrigger id="urgency"><SelectValue /></SelectTrigger>
            <SelectContent>
              {URGENCY_OPTS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="startDate">開始日</Label>
          <Input id="startDate" name="startDate" type="date" defaultValue={defaults?.startDate ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="endDate">終了日</Label>
          <Input id="endDate" name="endDate" type="date" defaultValue={defaults?.endDate ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="nearestStation">最寄駅</Label>
          <Input id="nearestStation" name="nearestStation" defaultValue={defaults?.nearestStation ?? ""} />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">備考</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={defaults?.notes ?? ""} />
      </div>

      {state.message ? (
        <p className={state.ok ? "text-sm text-green-700" : "text-sm text-destructive"}>
          {state.message}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "送信中..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
