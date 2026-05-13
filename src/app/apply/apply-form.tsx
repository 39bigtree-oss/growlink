"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSessionStorageState } from "@/hooks/use-session-storage-state";
import {
  APPLICANT_FORM_DEFAULTS,
  APPLICANT_FORM_STEPS,
  STEP_FIELDS,
  applicantFormSchema,
  type ApplicantFormInput,
  type ApplicantFormStep,
} from "@/lib/schemas/applicant";
import {
  FACILITY_CATEGORY_OPTIONS,
  GENDER_OPTIONS,
  LANGUAGE_OPTIONS,
  NATIONALITY_OPTIONS,
  QUALIFICATION_OPTIONS,
} from "@/lib/constants/applicant-options";
import { cn } from "@/lib/utils";

const DRAFT_KEY = "growlink:apply:draft:v1";

const STEP_LABELS: Record<ApplicantFormStep, string> = {
  "basic-info": "基本情報",
  contact: "連絡先・国籍",
  "qualifications-and-desired": "保有資格と希望職種",
  confirm: "AI 診断希望と確認",
};

export function ApplyForm() {
  const router = useRouter();
  const draft = useSessionStorageState<Partial<ApplicantFormInput>>(DRAFT_KEY, {});
  const [stepIndex, setStepIndex] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ApplicantFormInput>({
    resolver: zodResolver(applicantFormSchema),
    defaultValues: APPLICANT_FORM_DEFAULTS,
    mode: "onTouched",
  });

  // sessionStorage に保存された値をフォームに流し込む。
  useEffect(() => {
    if (!draft.isHydrated) return;
    if (Object.keys(draft.value).length === 0) return;
    form.reset({ ...APPLICANT_FORM_DEFAULTS, ...draft.value, agreedToTerms: false as unknown as true });
    // 同意は毎回取り直す（規約改定時の取りこぼし防止）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.isHydrated]);

  // フォーム変更を sessionStorage に反映（同意フラグは保存しない）。
  useEffect(() => {
    const sub = form.watch((values) => {
      const { agreedToTerms: _ignored, ...rest } = values;
      draft.setValue(rest as Partial<ApplicantFormInput>);
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const currentStep: ApplicantFormStep = APPLICANT_FORM_STEPS[stepIndex];

  async function goNext() {
    setServerError(null);
    const ok = await form.trigger(STEP_FIELDS[currentStep]);
    if (!ok) return;
    if (stepIndex < APPLICANT_FORM_STEPS.length - 1) {
      setStepIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  function goPrev() {
    setServerError(null);
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function onSubmit(values: ApplicantFormInput) {
    setServerError(null);
    const { agreedToTerms: _ignored, ...rest } = values;
    const payload = { ...rest, recaptchaToken: await getRecaptchaToken() };

    const res = await fetch("/api/applicants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 201) {
      draft.clear();
      router.push("/apply/thanks");
      return;
    }
    if (res.status === 409) {
      setServerError("このメールアドレスではすでに申込が受付済みです。");
      return;
    }
    if (res.status === 400) {
      setServerError("入力内容に誤りがあります。各ステップをご確認ください。");
      return;
    }
    setServerError("送信に失敗しました。時間をおいて再度お試しください。");
  }

  return (
    <div className="space-y-6">
      <Stepper currentIndex={stepIndex} />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <h2 className="text-lg font-semibold">{STEP_LABELS[currentStep]}</h2>

        {currentStep === "basic-info" && <Step1Basic form={form} />}
        {currentStep === "contact" && <Step2Contact form={form} />}
        {currentStep === "qualifications-and-desired" && <Step3Qualifications form={form} />}
        {currentStep === "confirm" && <Step4Confirm form={form} />}

        {serverError && (
          <p
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {serverError}
          </p>
        )}

        <div className="flex gap-2">
          {stepIndex > 0 && (
            <Button type="button" variant="outline" onClick={goPrev}>
              戻る
            </Button>
          )}
          {stepIndex < APPLICANT_FORM_STEPS.length - 1 && (
            <Button type="button" onClick={goNext} className="flex-1">
              次へ
            </Button>
          )}
          {stepIndex === APPLICANT_FORM_STEPS.length - 1 && (
            <Button type="submit" disabled={form.formState.isSubmitting} className="flex-1">
              {form.formState.isSubmitting ? "送信中..." : "申込を送信"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function Stepper({ currentIndex }: { currentIndex: number }) {
  return (
    <ol className="flex w-full items-center gap-1 text-xs" aria-label="申込ステップ">
      {APPLICANT_FORM_STEPS.map((step, idx) => {
        const isActive = idx === currentIndex;
        const isDone = idx < currentIndex;
        return (
          <li key={step} className="flex flex-1 items-center gap-1">
            <span
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                isActive && "border-primary bg-primary text-primary-foreground",
                isDone && "border-primary bg-primary/15 text-primary",
                !isActive && !isDone && "border-muted-foreground/30 text-muted-foreground",
              )}
            >
              {idx + 1}
            </span>
            <span
              className={cn(
                "hidden truncate sm:inline",
                isActive ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {STEP_LABELS[step]}
            </span>
            {idx < APPLICANT_FORM_STEPS.length - 1 && (
              <span className="h-px flex-1 bg-border" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

type FormApi = ReturnType<typeof useForm<ApplicantFormInput>>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

function Step1Basic({ form }: { form: FormApi }) {
  const errors = form.formState.errors;
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="lastName">姓</Label>
          <Input id="lastName" autoComplete="family-name" {...form.register("lastName")} />
          <FieldError message={errors.lastName?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="firstName">名</Label>
          <Input id="firstName" autoComplete="given-name" {...form.register("firstName")} />
          <FieldError message={errors.firstName?.message} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="lastNameKana">セイ（カタカナ）</Label>
          <Input
            id="lastNameKana"
            inputMode="text"
            placeholder="ヤマダ"
            {...form.register("lastNameKana")}
          />
          <FieldError message={errors.lastNameKana?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="firstNameKana">メイ（カタカナ）</Label>
          <Input
            id="firstNameKana"
            inputMode="text"
            placeholder="ハナコ"
            {...form.register("firstNameKana")}
          />
          <FieldError message={errors.firstNameKana?.message} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="birthDate">生年月日</Label>
        <Input id="birthDate" type="date" {...form.register("birthDate")} />
        <FieldError message={errors.birthDate?.message} />
      </div>

      <Controller
        control={form.control}
        name="gender"
        render={({ field }) => (
          <div className="space-y-2">
            <Label>性別</Label>
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              className="grid grid-cols-3 gap-2"
              aria-label="性別"
            >
              {GENDER_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`gender-${opt.value}`}
                  className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem id={`gender-${opt.value}`} value={opt.value} />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
            <FieldError message={errors.gender?.message} />
          </div>
        )}
      />
    </div>
  );
}

function Step2Contact({ form }: { form: FormApi }) {
  const errors = form.formState.errors;
  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="example@example.com"
          {...form.register("email")}
        />
        <FieldError message={errors.email?.message} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">電話番号</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="090-0000-0000"
          {...form.register("phone")}
        />
        <p className="text-xs text-muted-foreground">AI 電話面接の発信先として利用します。</p>
        <FieldError message={errors.phone?.message} />
      </div>
      <Controller
        control={form.control}
        name="nationality"
        render={({ field }) => (
          <div className="space-y-2">
            <Label htmlFor="nationality">国籍（任意）</Label>
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <SelectTrigger id="nationality" aria-label="国籍">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>国籍</SelectLabel>
                  {NATIONALITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
      />
      <Controller
        control={form.control}
        name="language"
        render={({ field }) => (
          <div className="space-y-2">
            <Label htmlFor="language">希望言語</Label>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="language" aria-label="希望言語">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>希望言語</SelectLabel>
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError message={errors.language?.message} />
          </div>
        )}
      />
    </div>
  );
}

function Step3Qualifications({ form }: { form: FormApi }) {
  const grouped = useMemo(() => {
    const map = new Map<string, typeof FACILITY_CATEGORY_OPTIONS>();
    for (const opt of FACILITY_CATEGORY_OPTIONS) {
      const arr = map.get(opt.group) ?? [];
      arr.push(opt);
      map.set(opt.group, arr);
    }
    return Array.from(map.entries());
  }, []);

  return (
    <div className="grid gap-6">
      <Controller
        control={form.control}
        name="qualifications"
        render={({ field }) => (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">保有資格（任意・複数選択可）</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {QUALIFICATION_OPTIONS.map((q) => {
                const checked = field.value.includes(q);
                return (
                  <label
                    key={q}
                    className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        const next = v
                          ? Array.from(new Set([...field.value, q]))
                          : field.value.filter((x) => x !== q);
                        field.onChange(next);
                      }}
                      aria-label={q}
                    />
                    <span>{q}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
      />
      <Controller
        control={form.control}
        name="desiredCategories"
        render={({ field }) => (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">希望職種（任意・複数選択可）</legend>
            {grouped.map(([group, items]) => (
              <div key={group} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">{group}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {items.map((opt) => {
                    const checked = field.value.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const next = v
                              ? Array.from(new Set([...field.value, opt.value]))
                              : field.value.filter((x) => x !== opt.value);
                            field.onChange(next);
                          }}
                          aria-label={opt.label}
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </fieldset>
        )}
      />
    </div>
  );
}

function Step4Confirm({ form }: { form: FormApi }) {
  const values = form.watch();
  const errors = form.formState.errors;
  return (
    <div className="grid gap-6">
      <Controller
        control={form.control}
        name="wantsDiagnosis"
        render={({ field }) => (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">AI 適職診断を希望しますか？</legend>
            <RadioGroup
              value={String(field.value)}
              onValueChange={(v) => field.onChange(v === "true")}
              className="grid grid-cols-2 gap-2"
            >
              <label
                htmlFor="wd-yes"
                className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <RadioGroupItem id="wd-yes" value="true" />
                希望する
              </label>
              <label
                htmlFor="wd-no"
                className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <RadioGroupItem id="wd-no" value="false" />
                希望しない（スキルシート直行）
              </label>
            </RadioGroup>
            <FieldError message={errors.wantsDiagnosis?.message} />
          </fieldset>
        )}
      />

      <section className="rounded-md border bg-muted/30 p-4 text-sm">
        <h3 className="mb-2 font-semibold">入力内容の確認</h3>
        <dl className="grid grid-cols-[8rem_1fr] gap-y-1">
          <dt className="text-muted-foreground">氏名</dt>
          <dd>
            {values.lastName} {values.firstName}
          </dd>
          <dt className="text-muted-foreground">フリガナ</dt>
          <dd>
            {values.lastNameKana} {values.firstNameKana}
          </dd>
          <dt className="text-muted-foreground">生年月日</dt>
          <dd>{values.birthDate}</dd>
          <dt className="text-muted-foreground">性別</dt>
          <dd>{GENDER_OPTIONS.find((g) => g.value === values.gender)?.label}</dd>
          <dt className="text-muted-foreground">メール</dt>
          <dd className="break-all">{values.email}</dd>
          <dt className="text-muted-foreground">電話</dt>
          <dd>{values.phone}</dd>
          <dt className="text-muted-foreground">国籍</dt>
          <dd>
            {NATIONALITY_OPTIONS.find((n) => n.value === values.nationality)?.label ?? "未選択"}
          </dd>
          <dt className="text-muted-foreground">希望言語</dt>
          <dd>{LANGUAGE_OPTIONS.find((l) => l.value === values.language)?.label}</dd>
          <dt className="text-muted-foreground">保有資格</dt>
          <dd>{values.qualifications.length > 0 ? values.qualifications.join(" / ") : "なし"}</dd>
          <dt className="text-muted-foreground">希望職種</dt>
          <dd>
            {values.desiredCategories.length > 0
              ? values.desiredCategories
                  .map((c) => FACILITY_CATEGORY_OPTIONS.find((o) => o.value === c)?.label ?? c)
                  .join(" / ")
              : "未選択"}
          </dd>
        </dl>
      </section>

      <Controller
        control={form.control}
        name="agreedToTerms"
        render={({ field }) => (
          <div className="space-y-2">
            <label htmlFor="agree" className="flex cursor-pointer items-start gap-2 text-sm">
              <Checkbox
                id="agree"
                checked={field.value === true}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
              <span>
                <a href="/legal/terms" className="underline" target="_blank" rel="noreferrer">
                  利用規約
                </a>
                および
                <a href="/legal/privacy" className="underline" target="_blank" rel="noreferrer">
                  プライバシーポリシー
                </a>
                に同意します。
              </span>
            </label>
            <FieldError message={errors.agreedToTerms?.message} />
          </div>
        )}
      />
    </div>
  );
}

// reCAPTCHA v3 はサイトキー未設定なら null を返す。Phase 1-3 では雛形のみ。
async function getRecaptchaToken(): Promise<string | null> {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) return null;
  const g = (window as unknown as { grecaptcha?: { execute: (k: string, o: { action: string }) => Promise<string> } })
    .grecaptcha;
  if (!g) return null;
  try {
    return await g.execute(siteKey, { action: "apply_submit" });
  } catch {
    return null;
  }
}
