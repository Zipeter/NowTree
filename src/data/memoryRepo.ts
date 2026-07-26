// 浏览器内 fallback 实现：不依赖 Rust/Tauri，用内存数组存储。
// 用途：
//   1) 在装好 Rust 之前，就能用 `npm run dev` 在浏览器里预览/联调 UI；
//   2) 自动化测试、Storybook 等无 Tauri 环境可复用同一 Repository 接口。
// 它严格实现 TransactionRepository 接口，与未来的 RestApiRepository 行为一致。
import type { Transaction, DeadlineType } from "../types/transaction";
import type {
  TransactionRepository,
  TransactionQuery,
  NewTransactionInput,
  ConvertInput,
} from "./repository";

let counter = 1;
const nowISO = () => new Date().toISOString();

// 0.1.19：生成稳定唯一 ID（UUID v4，浏览器/Node 有原生 crypto.randomUUID；
// 老环境回退到「时间+随机」串，保证始终非空、跨会话不撞。
function genSyncId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `local-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

function makeTransaction(input: Partial<Transaction> & { title: string }): Transaction {
  return {
    id: counter++,
    title: input.title,
    note: input.note ?? null,
    category: input.category ?? null,
    status: input.status ?? "inbox",
    deadline_type: (input.deadline_type ?? "none") as DeadlineType,
    deadline_date: input.deadline_date ?? null,
    priority: input.priority ?? null,
    created_time: input.created_time ?? nowISO(),
    completed_time: input.completed_time ?? null,
    updated_time: input.updated_time ?? nowISO(),
    parent_id: input.parent_id ?? null,
    show_in_next: input.show_in_next ?? 0,
    deleted: input.deleted ?? 0,
    order_index: input.order_index ?? null,
    reminder_time: input.reminder_time ?? null,
    reminder_done: input.reminder_done ?? 0,
    time_slot: input.time_slot ?? "none",
    sync_id: input.sync_id ?? genSyncId(),
    deleted_at: input.deleted_at ?? null,
  };
}

export class MemoryTransactionRepository implements TransactionRepository {
  private items: Transaction[] = [];

  async list(query: TransactionQuery = {}): Promise<Transaction[]> {
    let result = [...this.items];

    if (query.status) {
      result = result.filter((t) => t.status === query.status);
    }
    if (query.category !== undefined) {
      result = result.filter((t) => t.category === query.category);
    }
    if (query.parentId !== undefined) {
      result = result.filter((t) =>
        query.parentId === null ? t.parent_id === null : t.parent_id === query.parentId,
      );
    }
    // 全局 Next 视图：只纳入无父级的独立事项，或用户手动「加入 Next」的子事务
    if (query.includeProjectChildrenInNext === false) {
      result = result.filter((t) => t.parent_id === null || t.show_in_next === 1);
    }
    result = result.filter((t) => t.deleted === 0);
    result.sort((a, b) => (a.created_time < b.created_time ? 1 : -1));
    return result;
  }

  async get(id: number): Promise<Transaction | null> {
    return this.items.find((t) => t.id === id) ?? null;
  }

  async create(input: NewTransactionInput): Promise<Transaction> {
    const t = makeTransaction({
      title: input.title,
      note: input.note ?? null,
      category: input.category ?? null,
      status: input.status ?? "inbox",
      deadline_type: input.deadline_type ?? "none",
      deadline_date: input.deadline_date ?? null,
      priority: input.priority ?? null,
      reminder_time: input.reminder_time ?? null,
      parent_id: input.parent_id ?? null,
    });
    this.items.push(t);
    return t;
  }

  async update(
    id: number,
    patch: Partial<Transaction> & { clear_parent?: boolean; clear_reminder?: boolean; clear_note?: boolean },
  ): Promise<Transaction> {
    const t = this.items.find((x) => x.id === id);
    if (!t) throw new Error(`Transaction ${id} not found`);
    // 把「清空标志」从 patch 中剥离并显式落实，避免它们作为杂散字段落到事务对象上。
    const { clear_parent, clear_reminder, clear_note, ...rest } = patch;
    if (clear_note) t.note = null;
    if (clear_reminder) t.reminder_time = null;
    if (clear_parent) t.parent_id = null;
    Object.assign(t, rest, { updated_time: nowISO() });
    return t;
  }

  // 收集某个根的全部后代 id（向下，任意层级）。不含根自身。
  private collectDescendantIds(rootId: number): number[] {
    const out: number[] = [];
    const stack = this.items.filter((t) => t.parent_id === rootId).map((t) => t.id);
    while (stack.length) {
      const cur = stack.pop()!;
      if (!out.includes(cur)) {
        out.push(cur);
        for (const c of this.items.filter((t) => t.parent_id === cur)) stack.push(c.id);
      }
    }
    return out;
  }

  // 收集某节点的全部祖先 id（向上到根）。不含自身。
  private collectAncestorIds(id: number): number[] {
    const out: number[] = [];
    let cur = this.items.find((t) => t.id === id)?.parent_id ?? null;
    while (cur != null) {
      out.push(cur);
      cur = this.items.find((t) => t.id === cur!)?.parent_id ?? null;
    }
    return out;
  }

  async softDelete(id: number): Promise<void> {
    const now = nowISO();
    // 0.1.21：软删除父项时，连带整棵子树（向下）一起进回收站。
    const ids = new Set<number>([id, ...this.collectDescendantIds(id)]);
    for (const t of this.items) {
      if (ids.has(t.id)) {
        t.deleted = 1;
        t.deleted_at = now;
        t.updated_time = now;
      }
    }
  }

  async convertFromInbox(id: number, input: ConvertInput): Promise<Transaction> {
    const t = this.items.find((x) => x.id === id);
    if (!t) throw new Error(`Transaction ${id} not found`);
    if (t.status !== "inbox") throw new Error(`Transaction ${id} is not in inbox`);
    // 原地转换：不新建记录，直接改写这条 Inbox 为正式事务
    t.title = input.title;
    t.note = input.note ?? null;
    t.category = input.category;
    t.status = "active";
    t.deadline_type = input.deadline_type ?? "none";
    t.deadline_date = input.deadline_date ?? null;
    t.priority = input.priority ?? null;
    t.updated_time = nowISO();
    return t;
  }

  // 回收站（与 Tauri 实现行为一致）
  async listDeleted(): Promise<Transaction[]> {
    return [...this.items]
      .filter((t) => t.deleted === 1)
      .sort((a, b) => ((a.updated_time ?? "") < (b.updated_time ?? "") ? 1 : -1));
  }
  async restore(id: number): Promise<void> {
    const now = nowISO();
    // 0.1.21：恢复时连带「祖先 + 自身 + 后代」整棵分支，防止只恢复子项再变孤儿。
    const ids = new Set<number>([
      id,
      ...this.collectDescendantIds(id),
      ...this.collectAncestorIds(id),
    ]);
    for (const t of this.items) {
      if (ids.has(t.id)) {
        t.deleted = 0;
        t.deleted_at = null;
        t.updated_time = now;
      }
    }
  }
  async purge(id: number): Promise<void> {
    // 0.1.21：彻底删除时连带整棵子树（向下）一并物理移除。
    const ids = new Set<number>([id, ...this.collectDescendantIds(id)]);
    this.items = this.items.filter((t) => !ids.has(t.id));
  }
  async emptyTrash(): Promise<void> {
    this.items = this.items.filter((t) => t.deleted !== 1);
  }
}
