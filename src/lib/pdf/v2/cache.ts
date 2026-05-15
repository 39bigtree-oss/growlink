import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

/**
 * v2 PDF のディスクキャッシュ。
 *
 * 問題: React-PDF + 日本語フォント (NotoSansJP) の組み合わせは初回レンダリングが
 *      30〜90 秒かかる。iframe が待ちきれず空白になる。
 *
 * 解決: 1 回レンダリングしたら .storage/diagnosis-v2/<key>.pdf に保存して
 *      2 回目以降はそこから読むだけにする (ミリ秒で返る)。
 *
 * キャッシュキー: `<applicantId>-<variant>-v<updatedAt-unix>` 形式。
 *               applicant が更新されると自動的にキャッシュも無効化される。
 */

const CACHE_ROOT = path.resolve(
  process.cwd(),
  process.env.STORAGE_DIR ?? ".storage",
  "diagnosis-v2",
);

/**
 * PDF レンダリングコードのバージョン。
 * フォント・レイアウト変更時にここを上げると古いキャッシュが自動で無視される。
 */
const RENDER_VERSION = 4; // v2.0.4 (施設PDF 改善 + イニシャル ローマ字化)

export function makeCacheKey(
  applicantId: string,
  variant: "applicant" | "facility",
  applicantUpdatedAt: Date,
): string {
  const versionTag = Math.floor(applicantUpdatedAt.getTime() / 1000);
  return `${applicantId}-${variant}-r${RENDER_VERSION}-v${versionTag}`;
}

export async function getCachedPdf(key: string): Promise<Buffer | null> {
  try {
    const filePath = path.join(CACHE_ROOT, `${key}.pdf`);
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

export async function setCachedPdf(key: string, buffer: Buffer): Promise<void> {
  await fs.mkdir(CACHE_ROOT, { recursive: true });
  const filePath = path.join(CACHE_ROOT, `${key}.pdf`);
  await fs.writeFile(filePath, buffer);
}

/**
 * applicantId に紐づく古いキャッシュをすべて削除 (新しい version のものは残す)。
 * 通常は updatedAt が変わると自動で別 key になるため不要だが、
 * 明示的に invalidate したい時に使う。
 */
export async function purgeApplicantCache(applicantId: string): Promise<number> {
  try {
    const files = await fs.readdir(CACHE_ROOT);
    let removed = 0;
    for (const f of files) {
      if (f.startsWith(`${applicantId}-`)) {
        await fs.unlink(path.join(CACHE_ROOT, f));
        removed++;
      }
    }
    return removed;
  } catch {
    return 0;
  }
}

/**
 * 「キャッシュにあればそれを返す、なければ render を呼んでキャッシュに保存」のラッパー。
 */
export async function getCachedOrRender(
  key: string,
  render: () => Promise<Buffer>,
): Promise<Buffer> {
  const cached = await getCachedPdf(key);
  if (cached) return cached;
  const buffer = await render();
  // ベストエフォートで保存 (失敗しても本処理は続行)
  setCachedPdf(key, buffer).catch((err) => {
    console.warn("[diagnosis-v2:cache] save failed", err);
  });
  return buffer;
}
