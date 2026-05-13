import "server-only";

import { mockSttProvider } from "./providers/mock";
import type { SttProvider, SttResult } from "./types";

let cached: SttProvider | null = null;

export function getSttProvider(): SttProvider {
  if (cached) return cached;
  const choice = process.env.STT_PROVIDER ?? "mock";
  if (choice === "whisper" || choice === "deepgram") {
    cached = {
      name: choice,
      async transcribe() {
        throw new Error(
          `STT provider "${choice}" is not implemented yet. Set STT_PROVIDER=mock for Phase 3.`,
        );
      },
    };
  } else {
    cached = mockSttProvider;
  }
  return cached;
}

export function __resetSttProviderForTests(): void {
  cached = null;
}

export async function transcribe(input: {
  bytes?: Buffer;
  audioKey?: string;
  language?: string;
  hint?: { turnIndex?: number; seed?: string };
}): Promise<SttResult> {
  return getSttProvider().transcribe(input);
}
