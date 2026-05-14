"use client";

import { useActionState, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
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

import {
  createPlacementAction,
  type CreatePlacementState,
} from "../actions";

type Applicant = { id: string; lastName: string; firstName: string; status: string };
type Facility = { id: string; name: string };
type JobOrder = {
  id: string;
  title: string;
  facilityId: string;
  employmentType: string;
  monthlyWageMin: number | null;
  monthlyWageMax: number | null;
};
type Contract = {
  id: string;
  facilityId: string;
  contractType: string;
  feeRate: number;
  paymentTermDays: number;
};

const initialState: CreatePlacementState = { ok: false };

export function PlacementWizardForm({
  applicants,
  facilities,
  jobOrders,
  contracts,
}: {
  applicants: Applicant[];
  facilities: Facility[];
  jobOrders: JobOrder[];
  contracts: Contract[];
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [applicantId, setApplicantId] = useState<string>("");
  const [facilityId, setFacilityId] = useState<string>("");
  const [jobOrderId, setJobOrderId] = useState<string>("");
  const [contractId, setContractId] = useState<string>("");
  const [monthlyWage, setMonthlyWage] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [state, formAction, pending] = useActionState(createPlacementAction, initialState);

  const facilityJobs = useMemo(
    () => (facilityId ? jobOrders.filter((j) => j.facilityId === facilityId) : []),
    [facilityId, jobOrders],
  );
  const facilityContracts = useMemo(
    () => (facilityId ? contracts.filter((c) => c.facilityId === facilityId) : []),
    [facilityId, contracts],
  );
  const selectedJob = jobOrders.find((j) => j.id === jobOrderId);
  const selectedContract = contracts.find((c) => c.id === contractId);
  const isDispatch = selectedJob?.employmentType === "DISPATCH";

  const introductionFeePreview = useMemo(() => {
    if (!selectedContract || selectedContract.contractType !== "INTRODUCTION_FEE") return 0;
    return Math.round(monthlyWage * 12 * selectedContract.feeRate);
  }, [monthlyWage, selectedContract]);

  return (
    <form action={formAction} className="space-y-5">
      {/* ステップインジケータ */}
      <ol className="flex flex-wrap items-center gap-2 text-xs">
        {[
          { num: 1, label: "求職者と施設" },
          { num: 2, label: "案件と契約" },
          { num: 3, label: "条件と確定" },
        ].map((s) => (
          <li key={s.num}>
            <Badge variant={step === s.num ? "default" : step > s.num ? "success" : "outline"}>
              Step {s.num}: {s.label}
            </Badge>
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="applicantId">求職者</Label>
            <Select name="applicantId" value={applicantId} onValueChange={setApplicantId}>
              <SelectTrigger id="applicantId">
                <SelectValue placeholder="営業対象の求職者を選択" />
              </SelectTrigger>
              <SelectContent>
                {applicants.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.lastName} {a.firstName} ({a.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              SALES_READY / IN_INTRODUCTION / INTERVIEW_DONE の求職者のみ表示。
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="facilityId">施設</Label>
            <Select name="facilityId" value={facilityId} onValueChange={(v) => {
              setFacilityId(v);
              setJobOrderId("");
              setContractId("");
            }}>
              <SelectTrigger id="facilityId">
                <SelectValue placeholder="施設を選択" />
              </SelectTrigger>
              <SelectContent>
                {facilities.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={!applicantId || !facilityId}
              onClick={() => setStep(2)}
            >
              次へ
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="jobOrderId">求人案件 (施設で絞り込み済)</Label>
            <Select name="jobOrderId" value={jobOrderId} onValueChange={setJobOrderId}>
              <SelectTrigger id="jobOrderId">
                <SelectValue placeholder="この施設の OPEN な案件" />
              </SelectTrigger>
              <SelectContent>
                {facilityJobs.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">案件がありません</div>
                ) : (
                  facilityJobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.title} ({j.employmentType})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="contractId">取引契約</Label>
            <Select name="contractId" value={contractId} onValueChange={setContractId}>
              <SelectTrigger id="contractId">
                <SelectValue placeholder="施設の有効な契約" />
              </SelectTrigger>
              <SelectContent>
                {facilityContracts.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">契約がありません</div>
                ) : (
                  facilityContracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contractType} ({(c.feeRate * 100).toFixed(2)}%)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              戻る
            </Button>
            <Button
              type="button"
              disabled={!jobOrderId || !contractId}
              onClick={() => setStep(3)}
            >
              次へ
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="startDate">入社日</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="monthlyWage">決定月給 (税込, 円)</Label>
              <Input
                id="monthlyWage"
                name="monthlyWage"
                type="number"
                value={monthlyWage || ""}
                onChange={(e) => setMonthlyWage(Number(e.target.value || 0))}
                min={0}
                required
              />
            </div>
          </div>

          {selectedContract?.contractType === "INTRODUCTION_FEE" ? (
            <div className="space-y-1">
              <Label htmlFor="introductionFee">
                紹介手数料 (空欄で自動計算: 年収 × {(selectedContract.feeRate * 100).toFixed(2)}%)
              </Label>
              <Input
                id="introductionFee"
                name="introductionFee"
                type="number"
                placeholder={`例: ${introductionFeePreview.toLocaleString()}`}
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                プレビュー: ¥{introductionFeePreview.toLocaleString()} (税抜)
              </p>
            </div>
          ) : (
            <input type="hidden" name="introductionFee" value="0" />
          )}

          {isDispatch ? (
            <fieldset className="space-y-3 rounded-md border p-3">
              <legend className="px-1 text-xs font-semibold text-muted-foreground">
                派遣台帳情報 (派遣形態の場合は自動生成)
              </legend>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="dispatchPeriodEnd">派遣終了日</Label>
                  <Input id="dispatchPeriodEnd" name="dispatchPeriodEnd" type="date" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dispatchManagerName">派遣元責任者</Label>
                  <Input id="dispatchManagerName" name="dispatchManagerName" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="receivingManagerName">派遣先責任者</Label>
                  <Input id="receivingManagerName" name="receivingManagerName" />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox name="socialInsuranceEnrolled" /> 社会保険加入済
                </label>
              </div>
            </fieldset>
          ) : null}

          <input type="hidden" name="applicantId" value={applicantId} />
          <input type="hidden" name="facilityId" value={facilityId} />
          <input type="hidden" name="jobOrderId" value={jobOrderId} />
          <input type="hidden" name="contractId" value={contractId} />

          {state.message ? (
            <p className={state.ok ? "text-sm text-green-700" : "text-sm text-destructive"}>
              {state.message}
            </p>
          ) : null}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              戻る
            </Button>
            <Button type="submit" disabled={pending || monthlyWage <= 0}>
              {pending ? "登録中..." : "紹介成立を作成"}
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
