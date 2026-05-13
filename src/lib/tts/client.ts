import "server-only";

import { mockTtsProvider } from "./providers/mock";
import type { TtsProvider, TtsResult } from "./types";

let cached: TtsProvider | null = null;

export function getTtsProvider(): TtsProvider {
  if (cached) return cached;
  const choice = process.env.TTS_PROVIDER ?? "mock";
  if (choice === "elevenlabs" || choice === "voicevox") {
    cached = {
      name: choice,
      async synthesize() {
        throw new Error(
          `TTS provider "${choice}" is not implemented yet. Set TTS_PROVIDER=mock for Phase 3.`,
        );
      },
    };
  } else {
    cached = mockTtsProvider;
  }
  return cached;
}

export function __resetTtsProviderForTests(): void {
  cached = null;
}

export async function synthesize(input: {
  text: string;
  language?: string;
  voice?: string;
}): Promise<TtsResult> {
  return getTtsProvider().synthesize(input);
}
