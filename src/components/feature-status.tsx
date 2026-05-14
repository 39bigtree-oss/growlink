import Link from "next/link";
import { AlertTriangle, CheckCircle2, Construction, FlaskConical, Hourglass } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getFeature,
  resolveFeatureState,
  STATE_BADGE_VARIANT,
  STATE_LABEL,
  type FeatureKey,
  type FeatureState,
} from "@/lib/system-status/features";

/**
 * 機能状態を表す小さなバッジ。サイドバーや見出しの横に置く。
 * key 不明 / 状態 READY の場合は何も表示しない (UI ノイズ最小化)。
 */
export function FeatureStatusBadge({
  featureKey,
  showWhenReady = false,
  className,
}: {
  featureKey: FeatureKey;
  /** READY でも明示的に出したい場合は true */
  showWhenReady?: boolean;
  className?: string;
}) {
  const meta = getFeature(featureKey);
  if (!meta) return null;
  const state = resolveFeatureState(meta);
  if (state === "READY" && !showWhenReady) return null;
  return (
    <Badge variant={STATE_BADGE_VARIANT[state]} className={cn("ml-2", className)}>
      {STATE_LABEL[state]}
    </Badge>
  );
}

const STATE_ICON: Record<FeatureState, typeof CheckCircle2> = {
  READY: CheckCircle2,
  MOCK: FlaskConical,
  LIMITED: AlertTriangle,
  PLANNED: Construction,
  ROADMAP: Hourglass,
};

const STATE_TONE: Record<FeatureState, string> = {
  READY: "border-emerald-200 bg-emerald-50 text-emerald-900",
  MOCK: "border-amber-200 bg-amber-50 text-amber-900",
  LIMITED: "border-amber-200 bg-amber-50 text-amber-900",
  PLANNED: "border-muted bg-muted/40 text-muted-foreground",
  ROADMAP: "border-muted bg-muted/40 text-muted-foreground",
};

/**
 * 機能の制限内容を表示するバナー。ページ上部に置くと、スタッフが
 * 「この機能はまだ mock です」「月 N 件まで」をすぐ理解できる。
 *
 * READY の場合はデフォルト非表示 (showWhenReady で出せる)。
 */
export function FeatureStatusBanner({
  featureKey,
  showWhenReady = false,
  className,
}: {
  featureKey: FeatureKey;
  showWhenReady?: boolean;
  className?: string;
}) {
  const meta = getFeature(featureKey);
  if (!meta) return null;
  const state = resolveFeatureState(meta);
  if (state === "READY" && !showWhenReady) return null;
  const Icon = STATE_ICON[state];

  return (
    <div
      role="status"
      className={cn(
        "flex flex-col gap-1 rounded-md border p-3 text-sm md:flex-row md:items-start md:gap-3",
        STATE_TONE[state],
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{meta.name}</span>
          <Badge variant={STATE_BADGE_VARIANT[state]} className="text-[10px]">
            {STATE_LABEL[state]}
          </Badge>
          {meta.provider ? (
            <span className="text-xs opacity-75">プロバイダ: {meta.provider}</span>
          ) : null}
        </div>
        <p className="text-xs md:text-sm">{meta.summary}</p>
        {meta.limits && meta.limits.length > 0 ? (
          <ul className="list-disc space-y-0.5 pl-4 text-xs">
            {meta.limits.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        ) : null}
        {(meta.plannedVersion || meta.productionCost) ? (
          <div className="flex flex-wrap gap-3 text-xs opacity-75">
            {meta.plannedVersion ? <span>本番接続予定: {meta.plannedVersion}</span> : null}
            {meta.productionCost ? <span>本番コスト目安: {meta.productionCost}</span> : null}
          </div>
        ) : null}
        <Link
          href="/admin/system-status"
          className="inline-block text-xs underline-offset-2 hover:underline"
        >
          全機能の状態を見る →
        </Link>
      </div>
    </div>
  );
}
