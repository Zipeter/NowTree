// Zustand 状态管理：作为 UI 与数据访问层之间的薄状态层。
// 第一、二步覆盖 Inbox；第三、四步覆盖 Inbox 录入与转换；第五、六步扩展四类视图与 Project 树。
import { create } from "zustand";
import { transactionRepo } from "../data";
import type { Transaction, DeadlineType, Status, Category } from "../types/transaction";
import { normalizeDeadline } from "../types/transaction";
import type { ConvertInput } from "../data/repository";
import { sendNotification } from "@tauri-apps/plugin-notification";

// 生成当前 ISO 时间；用于完成时间等字段
const nowISO = () => new Date().toISOString();

// 0.1.20：新建事务的「缺省填充」助手——把三处 create 里重复的
// note/priority/deadline_type/deadline_date/reminder_time 默认值规则收敛到一处。
// 调用方用 ...applyTxDefaults({...}) 展开，再补上 status/category/parent_id 等差异字段。
interface TxDraft {
  title: string;
  note?: string | null;
  priority?: number | null;
  deadline_type?: DeadlineType;
  deadline_date?: string | null;
  reminder_time?: string | null;
}
function applyTxDefaults(d: TxDraft) {
  return {
    title: d.title,
    note: d.note || null,
    priority: d.priority ?? 1,
    deadline_type: d.deadline_type ?? "none",
    deadline_date: d.deadline_date || null,
    reminder_time: d.reminder_time || null,
  };
}

interface TxStore {
  inbox: Transaction[];
  // 所有未删除事务（含 completed）。completed 也保留在数组里，
  // 由视图渲染「划线 + 虚化」样式，不再从列表消失。
  active: Transaction[];
  // 回收站：已软删除（deleted=1）的事务，供恢复 / 彻底删除
  trash: Transaction[];
  loading: boolean;
  error: string | null;
  loadInbox: () => Promise<void>;
  loadActive: () => Promise<void>;
  addInbox: (title: string, note?: string) => Promise<void>;
  removeInbox: (id: number) => Promise<void>;
  convertInbox: (id: number, input: ConvertInput) => Promise<void>;
  // 第六步：在某个项目下新增子事务（可带完整字段）。
  addChild: (
    parentId: number,
    input: {
      title: string;
      note?: string;
      priority?: number;
      deadline_type?: DeadlineType;
      deadline_date?: string;
      reminder_time?: string;
    },
  ) => Promise<void>;
  // 通用就地更新（切换 show_in_next、编辑、设提醒等复用）
  updateTx: (id: number, patch: Partial<Transaction> & { clear_parent?: boolean; clear_reminder?: boolean; clear_note?: boolean }) => Promise<void>;
  // 列表/树的勾选框：在 completed 与 active 之间切换
  toggleComplete: (id: number) => Promise<void>;
  // 第七步：软删除（移出 active）
  deleteTx: (id: number) => Promise<void>;
  // 0.1.6：悬浮加号按钮——在当前界面直接新增对应类别的事务（跳过 Inbox 收集）
  createTx: (input: {
    title: string;
    note?: string;
    category: Category | null;
    status?: Status;
    priority?: number;
    deadline_type?: DeadlineType;
    deadline_date?: string | null;
    reminder_time?: string | null;
  }) => Promise<void>;
  // 0.1.7：手动拖拽排序。传入某视图内当前顺序的 id 列表，按位置写回 order_index。
  reorder: (ids: number[]) => Promise<void>;
  // 回收站：加载 / 恢复 / 彻底删除 / 清空
  loadTrash: () => Promise<void>;
  restoreTx: (id: number) => Promise<void>;
  purgeTx: (id: number) => Promise<void>;
  emptyTrash: () => Promise<void>;
  // 0.1.18：启动/跨天时扫描，把「具体日期=今天」的 deadline 自动归一为「今日」
  normalizeDeadlines: () => Promise<void>;
  // 提醒：扫描到期且未弹过的 active 事务，弹系统通知并标记已弹。
  checkReminders: () => Promise<void>;
}

export const useTxStore = create<TxStore>((set, get) => ({
  inbox: [],
  active: [],
  trash: [],
  loading: false,
  error: null,

  loadInbox: async () => {
    set({ loading: true, error: null });
    try {
      const list = await transactionRepo.list({ status: "inbox" });
      set({ inbox: list, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  // 拉取所有未删除事务（active + completed 都包含，completed 用于划线虚化展示）
  loadActive: async () => {
    set({ loading: true, error: null });
    try {
      const list = await transactionRepo.list({});
      set({ active: list, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  addInbox: async (title, note) => {
    const created = await transactionRepo.create({
      ...applyTxDefaults({ title, note }),
      status: "inbox",
    });
    set({ inbox: [created, ...get().inbox] });
  },

  removeInbox: async (id) => {
    await transactionRepo.softDelete(id);
    set({ inbox: get().inbox.filter((t) => t.id !== id) });
  },

  // 整理转换：调用 Repository 原地改写该 Inbox 记录；成功后它不再是 inbox，
  // 从 inbox 列表移除，并替换/追加到 active 数组中（避免 loadActive 已加载全部时产生重复）。
  convertInbox: async (id, input) => {
    const converted = await transactionRepo.convertFromInbox(id, input);
    const existing = get().active.some((t) => t.id === id);
    set({
      inbox: get().inbox.filter((t) => t.id !== id),
      active: existing
        ? get().active.map((t) => (t.id === id ? converted : t))
        : [converted, ...get().active],
    });
  },

  // 第六步：在某个项目下新增子事务。默认 category=next_action、status=active、parent_id=项目 id；
  // 默认 show_in_next=0（仅在该项目内显示），由用户手动「加入 Next」。
  addChild: async (parentId, input) => {
    const created = await transactionRepo.create({
      ...applyTxDefaults({
        title: input.title,
        note: input.note,
        priority: input.priority,
        deadline_type: input.deadline_type,
        deadline_date: input.deadline_date,
        reminder_time: input.reminder_time,
      }),
      category: "next_action",
      status: "active",
      parent_id: parentId,
    });
    set({ active: [created, ...get().active] });
  },

  // 就地更新某条事务（调用 Repository.update 并同步到 active 数组）。
  updateTx: async (id, patch) => {
    const updated = await transactionRepo.update(id, patch);
    // 0.1.20：同时同步 active 与 inbox 两个数组。
    // 灵感（status=inbox）只存在于 inbox 数组，若只更新 active，编辑灵感后内存里仍是旧数据，
    // 弹窗关闭后 UI 回退成旧备注（DB 已写入但界面不刷新）——表现为「备注存不进去」。
    // 这里把两个数组都 map 一遍：id 命中的那个被替换，另一个 map 无变化。
    set((s) => ({
      active: s.active.map((t) => (t.id === id ? updated : t)),
      inbox: s.inbox.map((t) => (t.id === id ? updated : t)),
    }));
  },

  // 勾选框切换：已完成 ↔ 进行中。取消勾选回到 active。
  toggleComplete: async (id) => {
    const t = get().active.find((x) => x.id === id);
    if (!t) return;
    const patch =
      t.status === "completed"
        ? { status: "active" as const, completed_time: null }
        : { status: "completed" as const, completed_time: nowISO() };
    const updated = await transactionRepo.update(id, patch);
    set({ active: get().active.map((x) => (x.id === id ? updated : x)) });
  },

  // 第七步：软删除（deleted=1，数据仍在库，未来可恢复）。
  // 连同整棵子树（任意层级）一并从 active 移除，避免孤儿残留于内存列表。
  deleteTx: async (id) => {
    await transactionRepo.softDelete(id);
    const active = get().active;
    const remove = new Set<number>([id]);
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const t of active) {
        if (t.parent_id === cur) {
          remove.add(t.id);
          stack.push(t.id);
        }
      }
    }
    set({ active: active.filter((t) => !remove.has(t.id)) });
  },

  // 0.1.6：悬浮加号直接创建。inbox 写入 inbox 列表，其余写入 active。
  createTx: async (input) => {
    const created = await transactionRepo.create({
      ...applyTxDefaults({
        title: input.title,
        note: input.note,
        priority: input.priority,
        deadline_type: input.deadline_type,
        deadline_date: input.deadline_date,
        reminder_time: input.reminder_time,
      }),
      category: input.category,
      status: input.status ?? "active",
    });
    if (input.status === "inbox") {
      set({ inbox: [created, ...get().inbox] });
    } else {
      set({ active: [created, ...get().active] });
    }
  },

  // 0.1.7：手动拖拽排序。按顺序写回 order_index（0..n），并同步内存数组。
  reorder: async (ids) => {
    const jobs = ids.map((id, idx) =>
      transactionRepo.update(id, { order_index: idx }),
    );
    await Promise.all(jobs);
    const map = new Map<number, number>();
    ids.forEach((id, idx) => map.set(id, idx));
    set({
      active: get().active.map((t) =>
        map.has(t.id) ? { ...t, order_index: map.get(t.id)! } : t,
      ),
      inbox: get().inbox.map((t) =>
        map.has(t.id) ? { ...t, order_index: map.get(t.id)! } : t,
      ),
    });
  },

  // 回收站：拉取已软删除（deleted=1）的事务
  loadTrash: async () => {
    const list = await transactionRepo.listDeleted();
    set({ trash: list });
  },

  // 恢复：deleted 复位 0，重新进入正常列表（刷新 active / inbox / trash）。
  // 注意：必须刷新 loadInbox —— 灵感(status=inbox)不在 active 视图里，
  // 若不刷新 inbox，恢复后的灵感只会从回收站消失、却回不到 Inbox。
  restoreTx: async (id) => {
    await transactionRepo.restore(id);
    await Promise.all([get().loadActive(), get().loadInbox(), get().loadTrash()]);
  },

  // 彻底删除：从库物理移除（释放磁盘空间，不可恢复）。
  // 连同整棵子树从 trash 列表移除（与数据层 purge 级联保持一致）。
  purgeTx: async (id) => {
    await transactionRepo.purge(id);
    const trash = get().trash;
    const remove = new Set<number>([id]);
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const t of trash) {
        if (t.parent_id === cur) {
          remove.add(t.id);
          stack.push(t.id);
        }
      }
    }
    set({ trash: trash.filter((t) => !remove.has(t.id)) });
  },

  // 清空回收站：删除全部已软删除记录
  emptyTrash: async () => {
    await transactionRepo.emptyTrash();
    set({ trash: [] });
  },

  // 0.1.18：启动或跨天时，把 deadline_type=date 且 deadline_date=今天的事务自动归一为 today
  normalizeDeadlines: async () => {
    const today = new Date();
    const jobs: Promise<void>[] = [];
    for (const t of get().active) {
      if (t.deadline_type === "date" && t.deadline_date) {
        const norm = normalizeDeadline(t.deadline_type, t.deadline_date, today);
        if (norm.type !== t.deadline_type || norm.date !== t.deadline_date) {
          jobs.push(get().updateTx(t.id, { deadline_type: norm.type, deadline_date: norm.date }));
        }
      }
    }
    await Promise.all(jobs);
  },

  // 提醒检查：遍历到期且未弹过的 active 事务，弹系统通知并标记已弹。
  checkReminders: async () => {
    const now = Date.now();
    const due = get().active.filter(
      (t) =>
        t.status !== "completed" &&
        t.reminder_time &&
        t.reminder_done !== 1 &&
        new Date(t.reminder_time).getTime() <= now,
    );
    for (const t of due) {
      try {
        await sendNotification({
          title: "NowTree 提醒",
          body: t.title + (t.note ? "\n" + t.note : ""),
        });
        await get().updateTx(t.id, { reminder_done: 1 });
      } catch {
        // 通知失败（如未授权）静默忽略，不阻断
      }
    }
  },
}));
