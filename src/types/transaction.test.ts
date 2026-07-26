import { describe, it, expect } from "vitest";
import {
  normalizeDeadline,
  byOrder,
  byPriority,
  byCompletion,
  byTime,
  deadlineEndTime,
  isDeadlineOverdue,
  deadlineOptionLabel,
  type Transaction,
} from "./transaction";

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
    show_in_next: 0,
    deleted: 0,
    order_index: null,
    reminder_time: null,
    reminder_done: 0,
    time_slot: "none",
    sync_id: null,
    deleted_at: null,
    ...p,
  };
}

describe("normalizeDeadline", () => {
  it("把今天的具体日期归一成今日", () => {
    const today = new Date();
    const d = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate(),
    ).padStart(2, "0")}`;
    const r = normalizeDeadline("date", d, today);
    expect(r.type).toBe("today");
    expect(r.date).toBeNull();
  });
  it("非今天的日期保持原样", () => {
    const r = normalizeDeadline("date", "2030-05-20", new Date("2026-01-01"));
    expect(r.type).toBe("date");
    expect(r.date).toBe("2030-05-20");
  });
  it("非 date 类型原样返回", () => {
    const r = normalizeDeadline("week", null);
    expect(r.type).toBe("week");
  });
});

describe("排序比较器", () => {
  it("byOrder：有 order_index 的排前面并升序，其余按 created_time", () => {
    const a = mk({ id: 1, order_index: 2, created_time: "2026-01-01" });
    const b = mk({ id: 2, order_index: null, created_time: "2026-01-02" });
    const c = mk({ id: 3, order_index: 1, created_time: "2026-01-03" });
    const sorted = [a, b, c].sort(byOrder);
    expect(sorted.map((t) => t.id)).toEqual([3, 1, 2]);
  });
  it("byPriority：高优先在前，同优先回退 byOrder（null 视为最低 0）", () => {
    const lo = mk({ id: 1, priority: 1, order_index: 0 });
    const hi = mk({ id: 2, priority: 5, order_index: 1 });
    const nu = mk({ id: 3, priority: null, order_index: 2 });
    const sorted = [lo, hi, nu].sort(byPriority);
    expect(sorted.map((t) => t.id)).toEqual([2, 1, 3]);
  });
  it("byCompletion：未完成在前，已完成在后", () => {
    const done = mk({ id: 1, status: "completed" });
    const active = mk({ id: 2, status: "active" });
    const sorted = [done, active].sort(byCompletion);
    expect(sorted.map((t) => t.id)).toEqual([2, 1]);
  });
});

describe("截止时间 / 逾期", () => {
  it("byTime：无时间要求的排最后", () => {
    const none = mk({ id: 1, deadline_type: "none" });
    const today = mk({ id: 2, deadline_type: "today" });
    const sorted = [none, today].sort(byTime);
    expect(sorted[0].id).toBe(2);
  });
  it("deadlineEndTime：today 取当天 23:59:59.999", () => {
    const base = new Date(2026, 0, 15, 10, 0, 0);
    const end = deadlineEndTime("today", null, base)!;
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(0);
    expect(end.getDate()).toBe(15);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });
  it("isDeadlineOverdue：未完成且已越过具体日期截止→true；已完成/未到→false", () => {
    const base = new Date(2026, 0, 21, 12, 0, 0); // 2026-01-21 中午
    const past = mk({ id: 1, deadline_type: "date", deadline_date: "2026-01-10", status: "active" });
    const done = mk({ id: 2, deadline_type: "date", deadline_date: "2026-01-10", status: "completed" });
    const future = mk({ id: 3, deadline_type: "month", status: "active" }); // 当月 1-31 月底，晚于 base
    expect(isDeadlineOverdue(past, base)).toBe(true);
    expect(isDeadlineOverdue(done, base)).toBe(false);
    expect(isDeadlineOverdue(future, base)).toBe(false);
  });
});

describe("deadlineOptionLabel", () => {
  it("today 带中文日期", () => {
    const base = new Date(2026, 0, 15);
    expect(deadlineOptionLabel("today", base)).toContain("今日");
  });
  it("none 返回 无", () => {
    expect(deadlineOptionLabel("none")).toBe("无");
  });
});
