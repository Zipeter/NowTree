// 业务规则收口层（0.1.19）
// 把散落在各列表视图里的「类别迁移规则 / 是否在 Next 展示 / 来源标签」等纯逻辑
// 收拢到一处。视图只管渲染与交互，规则都在这里——以后改做法只翻这一本「食谱」。
import type { Category, Transaction } from "../types/transaction";

// 类别迁移补丁（原 GenericListView.catTarget 的业务核心）：
//   - inbox 禁止互转、拖到自己所在类别无操作：由调用方（视图）早返回拦截，本函数只产补丁；
//   - 原生 next_action 离开 Next：清 parent_id / time_slot / show_in_next（脱离 Next 上下文）；
//   - someday / waiting 改类别：仅改 category，保持 show_in_next 与 time_slot 不变。
export function buildCategoryPatch(
  tx: Transaction,
  target: Category,
): Partial<Transaction> & { clear_parent?: boolean } {
  if (tx.category === "next_action") {
    return { category: target, clear_parent: true, time_slot: "none", show_in_next: 0 };
  }
  return { category: target };
}

// Next 视图里「加入 Next」按钮何时出现：waiting / someday 透出到全局 Next。
export function canShowInNext(category: Category): boolean {
  return category === "waiting" || category === "someday";
}

// Next 行内「来源」标签（Project 子项 / Waiting / Someday 凭 show_in_next 透出）。
export function sourceText(t: Transaction): string | null {
  if (t.parent_id) return "来源：Project";
  if (t.category === "waiting") return "来源：Waiting";
  if (t.category === "someday") return "来源：Someday";
  return null;
}
