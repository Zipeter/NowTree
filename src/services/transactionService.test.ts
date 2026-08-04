import { describe, it, expect } from "vitest";
import { buildCategoryPatch, canShowInNext, sourceText } from "./transactionService";
import type { Transaction } from "../types/transaction";

function mk(p: Partial<Transaction>): Transaction {
  return {
    id: 1,
    title: "t",
    note: null,
    category: "next_action",
    status: "active",
    deadline_type: "none",
    deadline_date: null,
    priority: null,
    created_time: "2026-01-01T00:00:00.000Z",
    completed_time: null,
    updated_time: null,
    parent_id: null,
    show_in_next: false,
    deleted: false,
    order_index: null,
    reminder_time: null,
    reminder_done: 0,
    time_slot: "none",
    sync_id: null,
    deleted_at: null,
    wait_auto_next: false,
    ...p,
  };
}

describe("buildCategoryPatch", () => {
  it("next_action 离开 Next：清 parent_id / time_slot / show_in_next", () => {
    const tx = mk({ category: "next_action", parent_id: 5, time_slot: "morning", show_in_next: true });
    const patch = buildCategoryPatch(tx, "waiting");
    expect(patch).toEqual({
      category: "waiting",
      clear_parent: true,
      time_slot: "none",
      show_in_next: false,
    });
  });
  it("waiting/someday 改类别：仅改 category，保留 show_in_next", () => {
    const tx = mk({ category: "someday", show_in_next: true });
    const patch = buildCategoryPatch(tx, "waiting");
    expect(patch).toEqual({ category: "waiting" });
  });
});

describe("canShowInNext", () => {
  it("waiting / someday → true", () => {
    expect(canShowInNext("waiting")).toBe(true);
    expect(canShowInNext("someday")).toBe(true);
  });
  it("next_action / project → false", () => {
    expect(canShowInNext("next_action")).toBe(false);
    expect(canShowInNext("project")).toBe(false);
  });
});

describe("sourceText", () => {
  it("有父事务 → Project 来源", () => {
    expect(sourceText(mk({ parent_id: 3 }))).toBe("来源：Project");
  });
  it("waiting 透出 → Waiting 来源", () => {
    expect(sourceText(mk({ category: "waiting" }))).toBe("来源：Waiting");
  });
  it("someday 透出 → Someday 来源", () => {
    expect(sourceText(mk({ category: "someday" }))).toBe("来源：Someday");
  });
  it("普通 next_action 无父 → null", () => {
    expect(sourceText(mk({ category: "next_action", parent_id: null }))).toBeNull();
  });
});
