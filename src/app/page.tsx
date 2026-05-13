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
  UserPlus,
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
    icon: UserPlus,
    title: "ワンストップ代理登録",
    body:
      "電話や面談で聞いた情報をスタッフが 1 画面で代理入力。**AI 適職診断 → 診断 PDF 同封 → 招待メール送信** までを 1 アクションで完結。",
  },
  {
    icon: Sparkles,
    title: "AI 適職診断",
    body:
      "11 業態 × 5 ランクの構造化スコアで、求職者にも施設にも納得感のあるマッチング根拠を提示。A4 2 枚の PDF が自動で生成されメール添付されます。",
  },
  {
    icon: FileText,
    title: "スキルシート自動生成",
    body:
      "求職者は届いた招待メールから個人専用 URL でスキルシートを編集。履歴書 PDF / 画像をアップロードすれば OCR + LLM で学歴・職歴を自動転記。",
  },
  {
    icon: PhoneCall,
    title: "AI 電話面接",
    body:
      "Twilio + STT + LLM で 5 ターンの対話を自動進行。要約は SkillSheet に差分マージ。スタッフ用シミュレータでテキスト面接も可能。",
  },
  {
    icon: Send,
    title: "FAX 営業自動化",
    body:
      "業態別テンプレで A4 2 枚を自動生成。複数施設への一括送信ジョブと、QR から拾える反応集計までを 1 つの動線で。",
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
      "ja / en / vi / id / zh の UI と AI 面接。外国人材の採用導線を母語ファーストで設計。在留資格は別エンティティで権限分離。",
  },
  {
    icon: ShieldCheck,
    title: "プライバシー設計",
    body:
      "氏名・住所・連絡先は LLM に送る前段で必ずマスク。レート制限 + CSP + 反応トークン HMAC で外部公開フォームを保護。",
  },
];

const FLOW_STEPS = [
  {
    label: "① 代理登録",
    title: "電話・面談で聞いた情報を代理入力",
    body:
      "スタッフが氏名・連絡先・希望業態・保有資格を 1 画面で代理入力。求職者本人による Web 入力は不要。",
  },
  {
    label: "② AI 適職診断",
    title: "登録と同時に AI 診断 PDF を自動生成",
    body:
      "11 業態 × ランク S/A/B/C/D のスコアとコメントを A4 2 枚の PDF として即時出力。",
  },
  {
    label: "③ 招待メール送信",
    title: "診断 PDF を添付して本人へ送信",
    body:
      "求職者には診断結果と「スキルシート入力用 URL」を同時にお届け。本人はメールから個人専用ページで入力。",
  },
  {
    label: "④ スキルシート",
    title: "本人入力 or 履歴書添付で完了",
    body:
      "本人がフォームを直接入力するか、履歴書 PDF を添付すれば OCR + LLM が自動転記。本人入力欄は AI で上書きしません。",
  },
  {
    label: "⑤ 営業フロー",
    title: "FAX 送信票 → 反応集計 → 紹介",
    body:
      "業態別 FAX テンプレを一括生成。施設の反応 (興味あり/見送り) を QR で集計し、KPI ダッシュボードに反映。",
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
            <a href="#flow" className="hover:text-foreground">業務フロー</a>
            <a href="https://github.com/39bigtree-oss/growlink" target="_blank" rel="noreferrer" className="hover:text-foreground">
              GitHub
            </a>
          </nav>
          <Button asChild size="sm">
            <Link href="/login">管理画面にログイン</Link>
          </Button>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
            <div className="space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-widest text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden /> 医療・福祉 紹介会社 / 派遣会社向け
              </p>
              <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
                {BRAND.taglineJa}
              </h1>
              <p className="max-w-prose text-base text-muted-foreground sm:text-lg">
                求職者の代理登録から AI 適職診断、スキルシート、AI 面接、FAX 営業、反応集計までを
                スタッフ 1 人で動かせる、医療・福祉特化の **社内向け** プラットフォーム。
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/login">
                    管理画面にログイン <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#flow">業務フローを見る</a>
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
                  <Card title="代理登録 → AI 診断 → 招待メール">
                    <ScoreRow label="登録 → 診断 → メール送信" value="ワンクリック" />
                    <ScoreRow label="所要時間" value="約 30 秒" />
                  </Card>
                  <Card title="AI 適職診断 → ランク A">
                    <ScoreRow label="訪問看護" value={82} />
                    <ScoreRow label="クリニック外来" value={71} />
                    <ScoreRow label="通所介護" value={64} />
                  </Card>
                  <Card title="FAX 反応 (直近)">
                    <ScoreRow label="(架空) みなと総合病院" value={1} suffix=" 件 興味あり" />
                    <ScoreRow label="(架空) サンライズ" value={1} suffix=" 件 検討中" />
                  </Card>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* 業務フロー */}
        <section id="flow" className="border-t bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-6 py-16">
            <h2 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              5 ステップの業務フロー
            </h2>
            <p className="max-w-prose text-muted-foreground">
              求職者の自己応募を待つのではなく、<strong>スタッフが代理登録</strong>することで
              リード獲得から営業までを「スタッフ起点」で回します。
            </p>
            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FLOW_STEPS.map((s) => (
                <li key={s.label} className="rounded-2xl border bg-card p-5">
                  <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {s.label}
                  </p>
                  <h3 className="text-base font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10">
              <Button asChild size="lg">
                <Link href="/login">
                  管理画面で始める <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t bg-background">
          <div className="mx-auto w-full max-w-6xl px-6 py-16">
            <h2 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              採用と営業をひとつの流れに。
            </h2>
            <p className="max-w-prose text-muted-foreground">
              バラバラだった「電話ヒアリング / 履歴書 OCR / 面接日程 / 提案資料 / FAX 送信」を、
              {BRAND.fullName} は 1 つのワークフローに統合します。
            </p>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <li key={f.title} className="rounded-2xl border bg-card p-5">
                    <Icon aria-hidden className="mb-3 h-5 w-5 text-primary" />
                    <h3 className="text-base font-semibold">{f.title}</h3>
                    <p
                      className="mt-1 text-sm text-muted-foreground"
                      dangerouslySetInnerHTML={{
                        __html: f.body
                          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                          .replace(/<strong>/g, '<strong class="text-foreground">'),
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* 価値訴求 (社内向け) */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 md:grid-cols-2">
            <article className="rounded-2xl border bg-card p-6">
              <HeartHandshake aria-hidden className="mb-3 h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold">求職者にも丁寧な体験を</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span aria-hidden className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                  個人専用 URL からスマホで入力 (途中保存 + 自動 30 秒バックアップ)
                </li>
                <li className="flex gap-2">
                  <span aria-hidden className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                  履歴書 PDF / 画像を 1 枚送るだけで自動入力
                </li>
                <li className="flex gap-2">
                  <span aria-hidden className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                  AI 面接は 5 問・10〜15 分、24h いつでも完了
                </li>
              </ul>
            </article>
            <article className="rounded-2xl border bg-card p-6">
              <Sparkles aria-hidden className="mb-3 h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold">スタッフ作業を最小化</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span aria-hidden className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                  代理登録 → 診断 → 招待メール送信が 1 アクションで完了
                </li>
                <li className="flex gap-2">
                  <span aria-hidden className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                  営業フロー画面で「次にやるべき仕事」が一目
                </li>
                <li className="flex gap-2">
                  <span aria-hidden className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                  全ての書き込み操作を AuditLog に自動記録
                </li>
              </ul>
              <div className="mt-5">
                <Button asChild>
                  <Link href="/login">
                    管理画面にログイン <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </div>
            </article>
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

function ScoreRow({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="truncate text-foreground">{label}</span>
      <span className="text-muted-foreground">
        {value}
        {typeof value === "number" ? (suffix ?? " 点") : suffix ?? ""}
      </span>
    </div>
  );
}
