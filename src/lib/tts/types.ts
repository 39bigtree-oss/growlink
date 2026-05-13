export type TtsResult = {
  audioKey: string;
  bytes: number;
  durationSec: number | null;
  provider: string;
  /** mp3 / wav / ogg 等 */
  mimeType: string;
};

export interface TtsProvider {
  readonly name: string;
  synthesize(input: { text: string; language?: string; voice?: string }): Promise<TtsResult>;
}
