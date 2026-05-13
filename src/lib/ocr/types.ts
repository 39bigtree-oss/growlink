/**
 * OCR プロバイダ抽象。
 * 入力は raw bytes、出力はテキストブロック (page index と confidence を保持)。
 */

export type OcrPage = {
  pageIndex: number;
  text: string;
  confidence: number;
};

export type OcrResult = {
  pages: OcrPage[];
  /** 全ページを改行で連結した結合テキスト。AI への入力で主に使う。 */
  fullText: string;
  provider: string;
};

export interface OcrProvider {
  readonly name: string;
  recognize(input: { bytes: Buffer; mimeType: string; fileName?: string }): Promise<OcrResult>;
}
