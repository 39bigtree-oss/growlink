import "server-only";

import { randomBytes } from "node:crypto";

import { saveObject } from "@/lib/storage/local";

import type { ESignProvider, ESignSendInput, ESignStatus } from "./types";

/**
 * 電子契約 mock provider。
 * 課金される CloudSign / GMO サインを呼ばずに E2E でフロー確認できる。
 *
 *   sendForSignature  → docId 払い出し + PDF を .storage/e-sign/<docId>.pdf に保存
 *   getStatus         → メモリ上に保持した状態を返す (デフォルト 30 秒経過で signed に進む)
 *   downloadSigned    → 元 PDF を返す (実プロバイダではサイン入り PDF が返る想定)
 */
type State = {
  docId: string;
  status: ESignStatus;
  sentAt: Date;
  signedAt?: Date;
};

const STATE: Map<string, State> = new Map();

/** テスト用: メモリ状態をクリア */
export function _resetESignMockState(): void {
  STATE.clear();
}

/** テスト用: 任意の docId を強制サイン済みに */
export function _forceSign(docId: string, signedAt: Date = new Date()): void {
  const s = STATE.get(docId);
  if (s) {
    s.status = "signed";
    s.signedAt = signedAt;
  }
}

export const mockESignProvider: ESignProvider = {
  name: "e-sign:mock",
  async sendForSignature(input: ESignSendInput): Promise<{ docId: string }> {
    const docId = `mock-esign-${Date.now()}-${randomBytes(4).toString("hex")}`;
    await saveObject(`e-sign/${docId}.pdf`, input.pdfBuffer);
    STATE.set(docId, { docId, status: "pending", sentAt: new Date() });
    console.log("[e-sign:mock] 送信", {
      docId,
      subject: input.subject,
      signers: input.signers.map((s) => s.email),
    });
    return { docId };
  },
  async getStatus(docId: string): Promise<{ status: ESignStatus; signedAt?: Date }> {
    const s = STATE.get(docId);
    if (!s) return { status: "expired" };
    // 30 秒経過したら署名済みに進める (mock 用の擬似遷移)
    if (s.status === "pending" && Date.now() - s.sentAt.getTime() > 30_000) {
      s.status = "signed";
      s.signedAt = new Date();
    }
    return { status: s.status, signedAt: s.signedAt };
  },
  async downloadSigned(docId: string): Promise<Buffer> {
    const s = STATE.get(docId);
    if (!s || s.status !== "signed") {
      throw new Error(`Document not signed yet: ${docId}`);
    }
    // mock では元 PDF をそのまま返す (実プロバイダは署名情報付き PDF を返す)
    const { readObject } = await import("@/lib/storage/local");
    const buf = await readObject(`e-sign/${docId}.pdf`);
    if (!buf) throw new Error(`Document not found: ${docId}`);
    return buf;
  },
};
