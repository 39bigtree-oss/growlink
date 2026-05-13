export type SttResult = {
  text: string;
  language: string;
  provider: string;
  confidence?: number;
};

export interface SttProvider {
  readonly name: string;
  transcribe(input: {
    bytes?: Buffer;
    audioKey?: string;
    language?: string;
    /** Phase 3 mock 用: 質問インデックスを渡すと、それに応じた答えのバリエーションを返す。 */
    hint?: { turnIndex?: number; seed?: string };
  }): Promise<SttResult>;
}
