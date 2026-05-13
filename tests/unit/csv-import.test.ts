import { describe, expect, it } from "vitest";

import { parseCsv } from "@/lib/facilities/csv-import";

describe("parseCsv", () => {
  it("ヘッダ + データ 1 行を 2 行として返す", () => {
    const rows = parseCsv("a,b\n1,2\n");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("ダブルクオート + エスケープを処理", () => {
    const rows = parseCsv('"a,b","c""d"\n');
    expect(rows).toEqual([["a,b", 'c"d']]);
  });

  it("CRLF を 1 改行として扱う", () => {
    const rows = parseCsv("a,b\r\n1,2\r\n");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("空行を1行として保持しない (改行終端で確定済み)", () => {
    const rows = parseCsv("a,b\n1,2");
    expect(rows).toHaveLength(2);
  });
});
