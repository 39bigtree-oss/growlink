import "server-only";

/**
 * AI 出力のバイアス検査 (Bias Evaluator)。
 *
 * 派遣業 / 紹介業の AI が、年齢・性別・国籍・障害・宗教などで差別的な
 * 表現や推論を出していないかを **出力前段でチェック** するためのレイヤ。
 *
 * v1.6 はルールベース mock provider:
 *   - 禁止語リストとの正規表現マッチ
 *   - 「外国人だから / 女性だから / 高齢だから」のような帰属推論パターン検出
 *
 * 本物の eval は v1.7 で Claude Haiku ベースのジャッジに切替予定 (環境変数
 * BIAS_EVAL_PROVIDER=claude_haiku で切替できる構造)。
 *
 * 出力を生成する側 (buildDiagnosis / buildNextQuestion / fax-cover 等) は
 * 公開前に `evaluateBias(text)` を呼び、findings.severity が "block" の場合は
 * 出力を抑止して再生成する想定。
 */

export type BiasSeverity = "ok" | "warn" | "block";

export type BiasFinding = {
  category: "age" | "gender" | "nationality" | "disability" | "religion" | "marriage" | "other";
  severity: BiasSeverity;
  matchedText: string;
  reason: string;
};

export type BiasEvalResult = {
  overall: BiasSeverity;
  findings: BiasFinding[];
  provider: string;
};

export interface BiasEvalProvider {
  readonly name: string;
  evaluate(text: string): Promise<BiasEvalResult>;
}

// ----- Mock provider -----

type Rule = {
  pattern: RegExp;
  category: BiasFinding["category"];
  severity: BiasSeverity;
  reason: string;
};

/**
 * 帰属推論 (X だから Y) のパターンを軸別にハードコード。
 * 求人領域で実例の多い不当表現を中心に並べる。
 *
 * 注意: false positive は避けるため、属性語と理由付け語の **連結** を要求する。
 * 例: 「外国人」だけでは block しない。「外国人だから〜」を block する。
 */
const RULES: Rule[] = [
  // 年齢差別
  {
    pattern: /高齢(者|だ).{0,8}(向(かない|きません)|不向き|難しい|苦手)/,
    category: "age",
    severity: "block",
    reason: "年齢を理由に適性を否定する表現は雇用機会均等法に反する可能性",
  },
  {
    pattern: /若い.{0,5}(方|人).{0,6}(限定|歓迎|のみ|に限る)/,
    category: "age",
    severity: "block",
    reason: "年齢制限の表現は職安法 第 5 条の 4 に反する可能性",
  },
  {
    pattern: /(?:[2-6]0)代まで/,
    category: "age",
    severity: "warn",
    reason: "年齢帯の上限表現は採用差別と見なされる場合あり",
  },
  // 性別差別
  {
    pattern: /女性(だから|なので).{0,10}(無理|難しい|向か|不向き|オンコール)/,
    category: "gender",
    severity: "block",
    reason: "性別を理由に業務適性を否定する表現",
  },
  {
    pattern: /男性(歓迎|のみ|限定)|女性(歓迎|のみ|限定)/,
    category: "gender",
    severity: "block",
    reason: "性別を募集要件にすると男女雇用機会均等法 第 5 条違反",
  },
  // 国籍差別
  {
    pattern: /外国人(だから|なので).{0,12}(日本語|コミュ|難しい|不安|向か)/,
    category: "nationality",
    severity: "block",
    reason: "国籍を理由に推論する表現",
  },
  {
    pattern: /日本人(限定|のみ|歓迎)/,
    category: "nationality",
    severity: "block",
    reason: "国籍を募集要件にするのは差別表現",
  },
  // 障害
  {
    pattern: /障(害|がい).{0,4}(者).{0,8}(無理|難しい|不向き)/,
    category: "disability",
    severity: "block",
    reason: "障害を理由に適性を否定する表現は障害者差別解消法に反する可能性",
  },
  // 婚姻・家族
  {
    pattern: /(独身|既婚|未婚)(限定|のみ|歓迎|不可)/,
    category: "marriage",
    severity: "block",
    reason: "婚姻状態による募集は男女雇用機会均等法 第 5 条違反",
  },
  // 宗教
  {
    pattern: /(宗教|信仰).{0,10}(不問|問わない).{0,15}(配慮|考慮)/,
    category: "religion",
    severity: "warn",
    reason: "宗教関連の表現は慎重に",
  },
];

export const mockBiasEvalProvider: BiasEvalProvider = {
  name: "bias-eval:mock",
  async evaluate(text: string): Promise<BiasEvalResult> {
    const findings: BiasFinding[] = [];
    for (const r of RULES) {
      const m = text.match(r.pattern);
      if (m) {
        findings.push({
          category: r.category,
          severity: r.severity,
          matchedText: m[0],
          reason: r.reason,
        });
      }
    }
    const overall: BiasSeverity =
      findings.some((f) => f.severity === "block")
        ? "block"
        : findings.some((f) => f.severity === "warn")
          ? "warn"
          : "ok";
    return { overall, findings, provider: "bias-eval:mock" };
  },
};

let cached: BiasEvalProvider | null = null;

/** プロバイダ取得。BIAS_EVAL_PROVIDER で切替 (mock / claude_haiku)。default: mock */
export function getBiasEvalProvider(): BiasEvalProvider {
  if (cached) return cached;
  const choice = process.env.BIAS_EVAL_PROVIDER ?? "mock";
  if (choice === "claude_haiku") {
    // v1.7 で実装予定 (Claude Haiku でジャッジ)
    // 現状は mock にフォールバックして API 呼び出しゼロを保証
    cached = mockBiasEvalProvider;
  } else {
    cached = mockBiasEvalProvider;
  }
  return cached;
}

/** ショートカット: 1 回限りのテキスト評価 */
export async function evaluateBias(text: string): Promise<BiasEvalResult> {
  return getBiasEvalProvider().evaluate(text);
}

/** テスト用: プロバイダキャッシュをリセット。 */
export function __resetBiasEvalProviderForTests(): void {
  cached = null;
}
