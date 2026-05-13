import "server-only";

import type { OcrProvider } from "../types";

/**
 * Phase 2 では本番接続は実装せず、IF だけ確保しておく。
 * `OCR_PROVIDER=docai` に切り替えると "未実装" 例外で落ちるので、
 * 課金される本物の Document AI を誤って叩く事故が起きない。
 */
export function createDocAiProvider(): OcrProvider {
  return {
    name: "docai",
    async recognize() {
      throw new Error(
        "Document AI provider is not implemented yet. Set OCR_PROVIDER=mock for Phase 2.",
      );
    },
  };
}
