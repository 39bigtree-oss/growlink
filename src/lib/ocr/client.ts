import "server-only";

import { createDocAiProvider } from "./providers/docai";
import { mockOcrProvider } from "./providers/mock";
import type { OcrProvider, OcrResult } from "./types";

let cached: OcrProvider | null = null;

export function getOcrProvider(): OcrProvider {
  if (cached) return cached;
  const choice = process.env.OCR_PROVIDER ?? "mock";
  cached = choice === "docai" ? createDocAiProvider() : mockOcrProvider;
  return cached;
}

export function __resetOcrProviderForTests(): void {
  cached = null;
}

export async function recognizeResume(input: {
  bytes: Buffer;
  mimeType: string;
  fileName?: string;
}): Promise<OcrResult> {
  return getOcrProvider().recognize(input);
}
