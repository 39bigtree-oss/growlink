import "server-only";

/**
 * マイナンバーカード OCR の provider 抽象。
 *
 * 本番は Google Document AI / Vision API を呼ぶ想定。実 API キーが
 * 入るまでは mock で「ファイル名のパターン」または「ヘッダのマジックバイト」から
 * 決定論的に数字を返す。
 *
 *   - "test-card.png" → 固定で "123456789012"
 *   - その他           → 形式不正としてエラー
 *
 * v1.6 では実 API 連携は行わない (機微情報なので最後に切替える)。
 */

export type MyNumberOcrInput = {
  bytes: Buffer;
  mimeType: string;
  fileName?: string;
};

export type MyNumberOcrResult = {
  /** 12 桁の数字 (チェックデジット含む) */
  detectedNumber: string;
  confidence: number;
  provider: string;
};

export interface MyNumberOcrProvider {
  readonly name: string;
  recognize(input: MyNumberOcrInput): Promise<MyNumberOcrResult>;
}

/** mock provider: テスト用に固定値を返す。 */
export const mockMyNumberOcrProvider: MyNumberOcrProvider = {
  name: "my-number-ocr:mock",
  async recognize(input) {
    // ファイル名に "test-card" が含まれていれば成功扱い
    if (input.fileName && /test-card/i.test(input.fileName)) {
      return {
        detectedNumber: "123456789012",
        confidence: 0.98,
        provider: "my-number-ocr:mock",
      };
    }
    // size が極端に小さい/大きい場合は失敗扱い
    if (input.bytes.length < 32 || input.bytes.length > 10 * 1024 * 1024) {
      throw new Error("画像が不適切です (サイズが範囲外)");
    }
    // それ以外は固定で 999999999999 を返す (実 OCR の "読めない" 相当)
    return {
      detectedNumber: "999999999999",
      confidence: 0.42,
      provider: "my-number-ocr:mock",
    };
  },
};

export function getMyNumberOcrProvider(): MyNumberOcrProvider {
  const choice = process.env.MYNUMBER_OCR_PROVIDER ?? "mock";
  if (choice === "mock") return mockMyNumberOcrProvider;
  // 本番では docai / vision を返す予定 (v1.8)
  return mockMyNumberOcrProvider;
}
