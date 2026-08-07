import type { TimeSlot } from "../types/transaction";

export type ClockSlot = "morning" | "noon" | "evening" | "rest";

// 按当前钟点映射时段（与启动弹窗的按时钟过滤一致）：
//   早 6:00–12:59 / 午 13:00–17:59 / 晚 18:00–23:59 / 休息 0:00–5:59
// 0–5 点视为「休息」，用于弹窗显示「早点休息」而非任务列表。
export function currentClockSlot(d: Date = new Date()): ClockSlot {
  const h = d.getHours();
  if (h < 6) return "rest";
  if (h < 13) return "morning";
  if (h < 18) return "noon";
  return "evening";
}

// 仅返回三个任务时段，供需要遍历时段的场景使用（不含 rest）。
export const TASK_SLOTS: TimeSlot[] = ["morning", "noon", "evening"];
