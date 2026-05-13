"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  FACILITY_CATEGORY_OPTIONS,
  GENDER_OPTIONS,
  LANGUAGE_OPTIONS,
  NATIONALITY_OPTIONS,
  QUALIFICATION_OPTIONS,
} from "@/lib/constants/applicant-options";
import type { FacilityCategory, Gender } from "@prisma/client";

/**
 * v1.2 社内スタッフ向け代理登録フォーム。
 *
 * UX 方針:
 *  - 必須項目は冒頭に集約 (氏名、生年月日、性別、メール、電話)
 *  - 希望条件 (業態 / 資格) は複数選択
 *  - 登録 = AI 診断実行 + 招待メール送信、なので「登録」ボタンに確認意図を込めた文言
 */
export function NewApplicantForm() {
  const router = useRouter();
  const { toast } = useToast();

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastNameKana, setLastNameKana] = useState("");
  const [firstNameKana, setFirstNameKana] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender>("OTHER");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationality, setNationality] = useState("JP");
  const [language, setLanguage] = useState("ja");
  const [qualifications, setQualifications] = useState<string[]>([]);
  const [desiredCategories, setDesiredCategories] = useState<FacilityCategory[]>([]);
  const [wantsDiagnosis, setWantsDiagnosis] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // クライアント側の最小バリデーション (Zod はサーバ側で厳格に再検査)
    if (
      !lastName ||
      !firstName ||
      !lastNameKana ||
      !firstNameKana ||
      !birthDate ||
      !email ||
      !phone
    ) {
      setError("氏名・カナ・生年月日・連絡先は必須です");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastName,
          firstName,
          lastNameKana,
          firstNameKana,
          birthDate,
          gender,
          email,
          phone,
          nationality: nationality === "OTHER" || !nationality ? "" : nationality,
          language,
          qualifications,
          desiredCategories,
          wantsDiagnosis,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        applicantId?: string;
        error?: string;
        issues?: Array<{ message: string }>;
        inviteSent?: boolean;
        pdfAttached?: boolean;
      };
      if (!res.ok || !body.ok) {
        if (body.error === "ALREADY_REGISTERED") {
          setError("このメールアドレスは既に登録済みです");
        } else if (body.error === "VALIDATION_ERROR") {
          setError(body.issues?.map((i) => i.message).join(" / ") ?? "入力に誤りがあります");
        } else if (body.error === "FORBIDDEN") {
          setError("この操作の権限がありません (ADMIN または CONSULTANT のみ)");
        } else {
          setError(body.error ?? `HTTP ${res.status}`);
        }
        return;
      }

      toast({
        title: "登録しました",
        description: body.inviteSent
          ? body.pdfAttached
            ? "AI 適職診断 PDF を添付した招待メールを送信しました"
            : "招待メールを送信しました (PDF 添付は失敗)"
          : "招待メール送信に失敗しました。詳細から再送できます",
        variant: body.inviteSent ? "success" : "warning",
      });
      router.push(`/admin/applicants/${body.applicantId}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* 氏名 + カナ */}
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field id="lastName" label="姓 *">
          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </Field>
        <Field id="firstName" label="名 *">
          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </Field>
        <Field id="lastNameKana" label="セイ (カナ) *">
          <Input id="lastNameKana" value={lastNameKana} onChange={(e) => setLastNameKana(e.target.value)} placeholder="ヤマダ" required />
        </Field>
        <Field id="firstNameKana" label="メイ (カナ) *">
          <Input id="firstNameKana" value={firstNameKana} onChange={(e) => setFirstNameKana(e.target.value)} placeholder="ハナコ" required />
        </Field>
      </fieldset>

      {/* 生年月日 + 性別 */}
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field id="birthDate" label="生年月日 *">
          <Input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
        </Field>
        <Field id="gender" label="性別 *">
          <RadioGroup value={gender} onValueChange={(v) => setGender(v as Gender)} className="flex flex-wrap gap-3 pt-1">
            {GENDER_OPTIONS.map((g) => (
              <label key={g.value} className="inline-flex items-center gap-1.5 text-sm">
                <RadioGroupItem value={g.value} id={`gender-${g.value}`} />
                <span>{g.label}</span>
              </label>
            ))}
          </RadioGroup>
        </Field>
      </fieldset>

      {/* 連絡先 */}
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field id="email" label="メール *">
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hanako@example.com" required />
        </Field>
        <Field id="phone" label="電話 *">
          <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="090-0000-0000" required />
        </Field>
      </fieldset>

      {/* 国籍 + 言語 */}
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field id="nationality" label="国籍">
          <Select value={nationality} onValueChange={setNationality}>
            <SelectTrigger id="nationality">
              <SelectValue placeholder="選択" />
            </SelectTrigger>
            <SelectContent>
              {NATIONALITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="language" label="連絡言語">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger id="language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </fieldset>

      {/* 資格 */}
      <fieldset>
        <Label className="mb-2 block text-sm font-medium">保有資格 (複数選択可)</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {QUALIFICATION_OPTIONS.map((q) => (
            <label key={q} className="inline-flex items-center gap-2 text-sm">
              <Checkbox
                checked={qualifications.includes(q)}
                onCheckedChange={() => setQualifications((prev) => toggle(prev, q))}
              />
              <span>{q}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* 希望業態 */}
      <fieldset>
        <Label className="mb-2 block text-sm font-medium">希望業態 (複数選択可)</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {FACILITY_CATEGORY_OPTIONS.map((c) => (
            <label key={c.value} className="inline-flex items-center gap-2 text-sm">
              <Checkbox
                checked={desiredCategories.includes(c.value)}
                onCheckedChange={() => setDesiredCategories((prev) => toggle(prev, c.value))}
              />
              <span>
                {c.label} <span className="text-xs text-muted-foreground">({c.group})</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* 診断オプション */}
      <fieldset>
        <label className="inline-flex items-start gap-2 text-sm">
          <Checkbox
            checked={wantsDiagnosis}
            onCheckedChange={(v) => setWantsDiagnosis(v === true)}
          />
          <span>
            AI 適職診断を希望する (推奨)
            <span className="block text-xs text-muted-foreground">
              チェックを外しても登録後に手動実行できます。本人への招待メールに診断 PDF を添付するため、通常は ON のままにしてください。
            </span>
          </span>
        </label>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/applicants")} disabled={submitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "登録中..." : "登録 → AI 診断 → 招待メール送信"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      {children}
    </div>
  );
}
