import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

/**
 * Phase 1-7 はローカル FS にファイルを置く簡易ストレージ。
 * STORAGE_DIR で保存先を切替可能。本番では S3 等に差し替える前提。
 */
const STORAGE_ROOT = path.resolve(process.cwd(), process.env.STORAGE_DIR ?? ".storage");

export type StoredObject = {
  key: string; // 例: "fax-sheets/clxx.pdf"
  bytes: number;
  absolutePath: string;
};

export async function saveObject(key: string, data: Buffer): Promise<StoredObject> {
  const absolutePath = pathFor(key);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, data);
  return { key, bytes: data.length, absolutePath };
}

export async function readObject(key: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(pathFor(key));
  } catch {
    return null;
  }
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await fs.access(pathFor(key));
    return true;
  } catch {
    return false;
  }
}

export function pathFor(key: string): string {
  // 危険な .. を弾く
  const normalized = path.normalize(key);
  if (normalized.startsWith("..") || normalized.includes(`..${path.sep}`)) {
    throw new Error(`invalid storage key: ${key}`);
  }
  return path.join(STORAGE_ROOT, normalized);
}

export function getStorageRoot(): string {
  return STORAGE_ROOT;
}
