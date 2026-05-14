"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ContractActionState } from "./actions";

const TYPE_OPTS = [
  { value: "INTRODUCTION_FEE", label: "紹介手数料契約" },
  { value: "DISPATCH_AGREEMENT", label: "派遣基本契約" },
  { value: "TEMP_TO_PERM", label: "紹介予定派遣" },
];

const STATUS_OPTS = [
  { value: "DRAFT", label: "草稿" },
  { value: "SENT", label: "送付済" },
  { value: "SIGNED", label: "締結済" },
  { value: "EXPIRED", label: "期限切れ" },
  { value: "CANCELLED", label: "解約" },
];

const ESIGN_OPTS = [
  { value: "MOCK", label: "mock (開発用)" },
  { value: "CLOUDSIGN", label: "CloudSign" },
  { value: "GMO_SIGN", label: "GMO サイン" },
];

const initialState: ContractActionState = { ok: false };

export function ContractForm({
  action,
  facilities,
  refundPolicies,
  submitLabel,
}: {
  action: (s: ContractActionState, fd: FormData) => Promise<ContractActionState>;
  facilities: Array<{ id: string; name: string }>;
  refundPolicies: Array<{ id: string; name: string }>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="facilityId">施設</Label>
          <Select name="facilityId">
            <SelectTrigger id="facilityId"><SelectValue placeholder="施設を選択" /></SelectTrigger>
            <SelectContent>
              {facilities.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="contractType">契約種別</Label>
          <Select name="contractType" defaultValue="INTRODUCTION_FEE">
            <SelectTrigger id="contractType"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPE_OPTS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="feeRate">手数料率 (0〜1 の小数 例: 0.30 = 30%)</Label>
          <Input id="feeRate" name="feeRate" type="number" step="0.0001" min={0} max={1} defaultValue={0.3} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="paymentTermDays">入金サイト (日)</Label>
          <Input id="paymentTermDays" name="paymentTermDays" type="number" defaultValue={60} min={0} max={365} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="refundPolicyId">返金規定 (任意)</Label>
          <Select name="refundPolicyId">
            <SelectTrigger id="refundPolicyId"><SelectValue placeholder="(未指定)" /></SelectTrigger>
            <SelectContent>
              {refundPolicies.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="signedBy">サイン者 (任意)</Label>
          <Input id="signedBy" name="signedBy" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="startDate">契約開始日</Label>
          <Input id="startDate" name="startDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="endDate">契約終了日 (任意)</Label>
          <Input id="endDate" name="endDate" type="date" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="eSignProvider">e-Sign プロバイダ</Label>
          <Select name="eSignProvider" defaultValue="MOCK">
            <SelectTrigger id="eSignProvider"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ESIGN_OPTS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="status">ステータス</Label>
          <Select name="status" defaultValue="DRAFT">
            <SelectTrigger id="status"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {state.message ? (
        <p className={state.ok ? "text-sm text-green-700" : "text-sm text-destructive"}>{state.message}</p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>{pending ? "送信中..." : submitLabel}</Button>
      </div>
    </form>
  );
}
