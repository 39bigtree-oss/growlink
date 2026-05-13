import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  FileText,
  Globe2,
  HeartHandshake,
  PhoneCall,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { SiteFooter } from "@/components/brand/footer";
import { TsumugiLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

export const metadata = {
  title: `${BRAND.fullName} — ${BRAND.taglineJa}`,
  description: BRAND.descriptionJa,
};

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI 適職診断",
    body:
      "11 業態 × 5 ランクの構造化スコアで、求職者にも施設にも納得感のあるマッチング根拠を提示。",
  },
  {
    icon: FileText,
    title: "スキルシート自動生成",
    body:
      "履歴書 PDF / 画像を OCR + LLM で構造化。本人入力欄は上書きせず、空欄だけ埋める安全マージ。",
  },
  {
    icon: PhoneCall,
    title: "AI 電話面接",
    body:
      "Twilio + STT + LLM で 5 ターンの対話を自動進行。要約は SkillSheet に差分マージ。",
  },
  {
    icon: Send,
    title: "FAX 営業自動化",
    body:
      "業態別テンプレで A4 2 枚を自動生成。一括送信ジョブと反応集計までを 1 つの動線で。",
  },
  {
    icon: BarChart3,
    title: "KPI ダッシュボード",
    body:
      "申込・診断完了率・FAX 返信率・成約率を 1 画面に。施設別の反応率 Top 20 と日次トレンドを可視化。",
  },
  {
    icon: Globe2,
    title: "多言語 5 言語",
    body:
      "ja / en / vi / id / zh の UI と AI 面接。外国人材の採用導線を母語ファーストで設計。",
  },
  {
    icon: ShieldCheck,
    title: "プライバシー設計",
    body:
      "氏名・住所・連絡先は LLM に送る前段で必ずマスク。在留資格は別エンティティで権限分離。",
  },
  {
    icon: HeartHandshake,
    title: "現場フィット",
    body:
      "医療・福祉 11 業態に特化。看護師・介護福祉士・特定技能まで業務の語彙を内蔵。",
  },
];

const SECTIONS = [
  {
    label: "求職者向け",
    title: "応募から面接までを、スマホで完結。",
    items: [
      "4 ステップ申込フォーム + 多言語切替",
      "メールリンクからスキルシート編集 (30 秒自動保存)",
      "履歴書を 1 枚アップするだけで自動入力",
      "AI 面接は 5 問・10〜15 分で完了",
    ],
    cta: { href: "/apply", label: "応募する" },
  },
  {
    label: "人材紹介会社向け",
    title: "営業フローを 1 画面で握る。",
    items: [
      "AI 診断と AI 面接のサマリで、提案前にスクリーニング完了",
      "施設マスタは CSV インポート + エリア/業態フィルタ",
      "FAX 一括送信 + 反応 QR で施設からの返信を自動集計",
      "KPI ダッシュボードで日次の数字を朝イチで把握",
    ],
    cta: { href: "/login", label: "管理画面ログイン" },
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col gradient-tsumugi">
      <header className="border-b bg-background/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" aria-label={`${BRAND.fullName} ホーム`}>
            <TsumugiLogo withWordmark />
          </Link>
          <nav aria-label="グローバル" className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">機能</a>
            <a href="#audiences" className="hover:text-foreground">利用シーン</a>
            <a href="https://github.com/39bigtree-oss/growlink" target="_blank" rel="noreferrer" className="hover:text-foreground">
              GitHub
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/apply">応募する</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">ログイン</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
            <div className="space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-widest text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden /> 医療・福祉に特化 AI 採用
              </p>
              <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
                {BRAND.taglineJa}
              </h1>
              <p className="max-w-prose text-base text-muted-foreground sm:text-lg">
                {BRAND.descriptionJa}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/apply">
                    求職者として応募 <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">管理画面にログイン</Link>
                </Button>
              </div>
              <dl className="grid grid-cols-3 gap-4 pt-4 text-sm">
                <Stat label="対応業態" value="11" />
                <Stat label="多言語" value="5" />
                <Stat label="モック完結" value="課金 0" />
              </dl>
            </div>
            <aside aria-hidden className="relative hidden md:block">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/10 to-warning/10 blur-2xl" />
              <div className="relative rounded-3xl border bg-card p-6 shadow-sm">
                <div className="space-y-3 text-sm">
                  <Card title="AI 適職診断 → ランク A">
                    <ScoreRow label="訪問看護" value={82} />
                    <ScoreRow label="クリニック外来" value={71} />
                    <ScoreRow label="通所介護" value={64} />
                  </Card>
                  <Card title="AI 面接サマリ">
                    <p className="text-xs text-muted-foreground">
                      強み: ご家族対応 / 新人育成 / 観察力
                    </p>
                    <p className="text-xs text-muted-foreground">
                      推奨: 営業フローに進める
                    </p>
                  </Card>
                  <Card title="FAX 反応">
                    <ScoreRow label="(架空) みなと総合病院" value={1} suffix=" 件 興味あり" />
                    <ScoreRow label="(架空) サンライズ" value={1} suffix=" 件 検討中" />
                  </Card>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t bg-background">
          <div className="mx-auto w-full max-w-6xl px-6 py-16">
            <h2 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              採用と営業をひとつの流れに。
            </h2>
            <p className="max-w-prose text-muted-foreground">
              バラバラだった「申込フォーム / 履歴書 OCR / 面接日程 / 提案資料 / FAX 送信」を、
              {BRAND.fullName} は 1 つのワークフローに統合します。
            </p>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <li key={f.title} className="rounded-2xl border bg-card p-5">
                    <Icon aria-hidden className="mb-3 h-5 w-5 text-primary" />
                    <h3 className="text-base font-semibold">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Audiences */}
        <section id="audiences" className="border-t bg-muted/30">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 md:grid-cols-2">
            {SECTIONS.map((s) => (
              <article key={s.label} className="rounded-2xl border bg-card p-6">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {s.label}
                </p>
                <h3 className="text-xl font-semibold">{s.title}</h3>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {s.items.map((it) => (
                    <li key={it} className="flex gap-2">
                      <span aria-hidden className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  <Button asChild variant="outline">
                    <Link href={s.cta.href}>
                      {s.cta.label} <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value}</dd>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function ScoreRow({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="truncate text-foreground">{label}</span>
      <span className="text-muted-foreground">
        {value}
        {suffix ?? " 点"}
      </span>
    </div>
  );
}
