// 0.1.20：把「截止时间翻译成中文标签」的 deadlineText 从三个视图收敛到单一来源。
// 三个视图原本各写一份几乎一模一样的函数，改文案要改三处；现在统一在此。
import type { Transaction } from "../types/transaction";
import { deadlineOptionLabel } from "../types/transaction";

// 返回某事务截止时间的简短人类可读标签（用于列表行 / 拖拽浮层）。
// - none：无截止（返回空串，调用方通常不渲染）
// - date 且带日期：直接显示日期串
// - 其余（today/week/month）：用 deadlineOptionLabel 生成「今日 / 本周…」等
export function deadlineText(t: Transaction): string {
  if (t.deadline_type === "none") return "";
  if (t.deadline_type === "date" && t.deadline_date) return t.deadline_date;
  return deadlineOptionLabel(t.deadline_type);
}
