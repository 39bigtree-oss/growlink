import type { CompleteOptions, CompleteResult } from "../client";

import diagnosisTemplates from "./mock-data/diagnosis-comments.json";

type CategoryTemplate = {
  pro: { S?: string[]; A?: string[]; B?: string[]; C?: string[]; D?: string[] };
  con: { S?: string[]; A?: string[]; B?: string[]; C?: string[]; D?: string[] };
};

type DiagnosisTemplates = {
  overview: { S: string[]; A: string[]; B: string[]; C: string[]; D: string[] };
  categories: Record<string, CategoryTemplate>;
};

const TEMPLATES = diagnosisTemplates as unknown as DiagnosisTemplates;

/**
 * 文字列の決定論的ハッシュ。同じ入力で必ず同じ整数を返す (FNV-1a 32-bit)。
 * crypto.subtle はテストで不便なため自前で実装する。
 */
function deterministicHash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], seed: string): T {
  return arr[deterministicHash(seed) % arr.length];
}

type DiagnosisPayload = {
  applicant: { lastName?: string; firstName?: string };
  ranked: Array<{ category: string; rank: "S" | "A" | "B" | "C" | "D"; score: number }>;
};

type DiagnosisOut = Record<string, { proComment: string; conComment: string }>;

function generateDiagnosis(payload: DiagnosisPayload): DiagnosisOut {
  const out: DiagnosisOut = {};
  // 名前そのものは PII なので、ハッシュ計算のためにのみ使う。返り値には混入させない。
  const nameKey = `${payload.applicant.lastName ?? ""}|${payload.applicant.firstName ?? ""}`;

  for (const row of payload.ranked) {
    const tmpl = TEMPLATES.categories[row.category];
    const proPool = tmpl?.pro[row.rank] ?? tmpl?.pro.B ?? ["前向きに取り組めます。"];
    const conPool = tmpl?.con[row.rank] ?? tmpl?.con.B ?? ["状況に応じた配慮が必要です。"];
    out[row.category] = {
      proComment: pick(proPool, `${nameKey}|${row.category}|pro`),
      conComment: pick(conPool, `${nameKey}|${row.category}|con`),
    };
  }
  return out;
}

function generateOverview(payload: DiagnosisPayload): { overview: string } {
  const top = [...payload.ranked].sort((a, b) => b.score - a.score)[0];
  const rank = top?.rank ?? "B";
  const pool = TEMPLATES.overview[rank] ?? TEMPLATES.overview.B;
  const nameKey = `${payload.applicant.lastName ?? ""}|${payload.applicant.firstName ?? ""}`;
  return { overview: pick(pool, `${nameKey}|overview`) };
}

export const mockProvider = {
  name: "mock",
  async complete<T = unknown>(opts: CompleteOptions): Promise<CompleteResult<T>> {
    // プロンプト名で分岐し、payload に応じた構造化レスポンスを返す。
    try {
      const userPayload = safeParseJson(opts.user);
      if (opts.promptName === "diagnosis.system") {
        const data = generateDiagnosis(userPayload as DiagnosisPayload) as unknown as T;
        return { ok: true, kind: "json", data, provider: "mock" };
      }
      if (opts.promptName === "diagnosis.overview") {
        const data = generateOverview(userPayload as DiagnosisPayload) as unknown as T;
        return { ok: true, kind: "json", data, provider: "mock" };
      }
      // それ以外は、システムプロンプトの先頭を要約として返す素朴な挙動。
      // Phase 1-5 で必要になれば case を増やす。
      return {
        ok: true,
        kind: "text",
        text: `[mock] (${opts.promptName}) ${opts.system.slice(0, 80)}`,
        provider: "mock",
      };
    } catch (err) {
      return { ok: false, error: `mock_failed: ${(err as Error).message}`, provider: "mock" };
    }
  },
};

function safeParseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
