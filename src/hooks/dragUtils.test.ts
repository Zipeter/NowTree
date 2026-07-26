import { describe, it, expect } from "vitest";
import { rowHalfOf, nearestRowId, type RowRect } from "./dragUtils";

// 仅测纯函数（不碰真实 DOM）。DOM 包装层 nearestRowEl 在视图里靠交互验证。
describe("rowHalfOf", () => {
  it("光标在上半 → top", () => {
    expect(rowHalfOf(100, 40, 110)).toBe("top"); // mid = 120
  });
  it("光标在下半 → bottom", () => {
    expect(rowHalfOf(100, 40, 130)).toBe("bottom");
  });
  it("恰好中线（>=mid）→ bottom", () => {
    expect(rowHalfOf(100, 40, 120)).toBe("bottom");
  });
});

describe("nearestRowId", () => {
  const rows: RowRect[] = [
    { id: 1, top: 0, height: 20 }, // mid 10
    { id: 2, top: 20, height: 20 }, // mid 30
    { id: 3, top: 40, height: 20 }, // mid 50
  ];
  it("找最近行（默认带 valid 过滤）", () => {
    const valid = new Set([1, 2, 3]);
    // 光标 Y=25 → 离 row2(mid30) 最近
    expect(nearestRowId(rows, 25, valid, 99)).toBe(2);
  });
  it("排除自身 id", () => {
    const valid = new Set([1, 2, 3]);
    // 自身=2 被排除 → 离 25 最近变 row1(mid10)
    expect(nearestRowId(rows, 25, valid, 2)).toBe(1);
  });
  it("valid 过滤掉不在集合内的行", () => {
    const valid = new Set([3]);
    // 仅 3 合法，即使离 1 更近
    expect(nearestRowId(rows, 5, valid, 99)).toBe(3);
  });
  it("全被过滤 → null", () => {
    const valid = new Set([99]);
    expect(nearestRowId(rows, 25, valid, 99)).toBeNull();
  });
});
