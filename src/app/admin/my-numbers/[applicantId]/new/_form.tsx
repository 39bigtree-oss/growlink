"use client";

import { useActionState, useState } from "react";

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

import {
  registerMyNumberAction,
  type MyNumberCreateState,
} from "../../actions";

const initialState: MyNumberCreateState = { ok: false };

const PURPOSE_OPTS = [
  { value: "WITHHOLDING", label: "源泉徴収" },
  { value: "SOCIAL_INSURANCE", label: "社会保険" },
  { value: "EMPLOYMENT_INSURANCE", label: "雇用保険" },
];

export function RegisterMyNumberForm({ applicantId }: { applicantId: string }) {
  const boundAction = registerMyNumberAction.bind(null, applicantId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [mode, setMode] = useState<"manual" | "ocr">("manual");

  // 保管期限のデフォルト: 7 年後
  const defaultRetention = new Date();
  defaultRetention.setFullYear(defaultRetention.getFullYear() + 7);
  const defaultRetentionStr = defaultRetention.toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-md border bg-amber-50 p-3 text-xs text-amber-900">
        マイナンバーは特定個人情報です。登録された値は即座に AES-256-GCM で暗号化され、
        平文は DB / ログ / メールに保存されません。閲覧時は必ず理由を残してください。
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "manual" ? "default" : "outline"}
          onClick={() => setMode("manual")}
        >
          手入力
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "ocr" ? "default" : "outline"}
          onClick={() => setMode("ocr")}
        >
          マイナンバーカード OCR
        </Button>
      </div>

      {mode === "manual" ? (
        <div className="space-y-1">
          <Label htmlFor="plainNumber">マイナンバー (12 桁)</Label>
          <Input
            id="plainNumber"
            name="plainNumber"
            inputMode="numeric"
            pattern="\d{12}"
            maxLength={12}
            placeholder="123456789012"
            autoComplete="off"
            required
          />
          <p className="text-xs text-muted-foreground">
            送信ボタンを押した瞬間に AES-256-GCM で暗号化されます。
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <Label htmlFor="ocrFile">マイナンバーカード画像 (image/*, 5MB 以下)</Label>
          <Input id="ocrFile" name="ocrFile" type="file" accept="image/*" required />
          <p className="text-xs text-muted-foreground">
            mock provider: ファイル名に <code>test-card</code> を含めると固定値で検出成功します
            (本番では Google Document AI に切替予定)。
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="purpose">利用目的</Label>
          <Select name="purpose" defaultValue="WITHHOLDING">
            <SelectTrigger id="purpose">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PURPOSE_OPTS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="retentionUntil">保管期限 (法定 7 年)</Label>
          <Input
            id="retentionUntil"
            name="retentionUntil"
            type="date"
            defaultValue={defaultRetentionStr}
            required
          />
        </div>
      </div>

      {state.message ? (
        <p className={state.ok ? "text-sm text-green-700" : "text-sm text-destructive"}>
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "暗号化・登録中..." : "登録"}
        </Button>
      </div>
    </form>
  );
}
