/**
 * 電子契約 (e-Sign) のプロバイダ抽象。
 * CloudSign / GMO サインを後から挿せるよう、provider 切替インターフェースで統一。
 */
export type ESignSigner = {
  email: string;
  name: string;
};

export type ESignSendInput = {
  pdfBuffer: Buffer;
  signers: ESignSigner[];
  subject: string;
  message?: string;
};

export type ESignStatus = "pending" | "signed" | "declined" | "expired";

export interface ESignProvider {
  name: string;
  sendForSignature(input: ESignSendInput): Promise<{ docId: string }>;
  getStatus(docId: string): Promise<{ status: ESignStatus; signedAt?: Date }>;
  downloadSigned(docId: string): Promise<Buffer>;
}
