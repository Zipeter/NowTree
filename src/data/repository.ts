import type { Transaction, Status, Category, DeadlineType } from "../types/transaction";

export interface TransactionQuery {
  status?: Status;
  category?: Category | null;
  parentId?: number | null;
}

export interface NewTransactionInput {
  title: string;
  note?: string | null;
  category?: Category | null;
  status?: Status;
  deadline_type?: DeadlineType;
  deadline_date?: string | null;
  priority?: number | null;
  reminder_time?: string | null;
  parent_id?: number | null;
  time_slot?: "none" | "morning" | "noon" | "evening";
  sync_id?: string | null; // 0.1.19：Rust 端生成；前端 fallback（内存库）可带
}

export interface ConvertInput {
  title: string;
  note?: string | null;
  category: Category;
  deadline_type?: DeadlineType;
  deadline_date?: string | null;
  priority?: number | null;
  reminder_time?: string | null;
}

// ★ 数据访问层抽象（扩展 seam）。当前实现见 tauriRepo.ts
export interface TransactionRepository {
  list(query?: TransactionQuery): Promise<Transaction[]>;
  get(id: number): Promise<Transaction | null>;
  create(input: NewTransactionInput): Promise<Transaction>;
  // clear_parent=true 时把 parent_id 置 NULL（脱离父事务）。Rust 端单独用布尔标志，
  // 因为 JSON 下 Option<Option<i64>> 无法表达 Some(None)。
  // clear_reminder=true 时把 reminder_time 置 NULL（清空提醒）。
  // clear_note=true 时把 note 置 NULL（清空备注）。
  update(id: number, patch: Partial<Transaction> & { clear_parent?: boolean; clear_reminder?: boolean; clear_note?: boolean }): Promise<Transaction>;
  softDelete(id: number): Promise<void>;
  convertFromInbox(id: number, input: ConvertInput): Promise<Transaction>;
  // 回收站：列出已软删除、恢复、彻底删除、清空
  listDeleted(): Promise<Transaction[]>;
  restore(id: number): Promise<void>;
  purge(id: number): Promise<void>;
  emptyTrash(): Promise<void>;
}
