import { randomBytes } from "node:crypto";

import { saveObject } from "@/lib/storage/local";

import type { TtsProvider, TtsResult } from "../types";

/**
 * 課金回避用の TTS。実音声は作らず、ログ目的の "stub mp3" を保存する。
 * MP3 ヘッダの先頭バイト列だけ持つ、無音バイトを書く (テスト時のサイズ比較用)。
 */
export const mockTtsProvider: TtsProvider = {
  name: "mock",
  async synthesize({ text }): Promise<TtsResult> {
    const id = `${Date.now()}-${randomBytes(4).toString("hex")}`;
    const audioKey = `tts/${id}.mp3`;
    // ID3v2.4 header + minimal silent frame風 (再生はできないがマジックバイトはある)。
    const header = Buffer.from([
      0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    const filler = Buffer.alloc(Math.max(32, text.length * 4), 0);
    const data = Buffer.concat([header, filler]);
    await saveObject(audioKey, data);
    // 1 文字 = 約 0.08 秒の喋り (適当)。
    const durationSec = Math.max(1, Math.round(text.length * 0.08));
    return {
      audioKey,
      bytes: data.length,
      durationSec,
      provider: "mock",
      mimeType: "audio/mpeg",
    };
  },
};
