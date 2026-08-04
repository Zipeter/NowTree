import { invoke } from "@tauri-apps/api/core";
import type { Transaction } from "../types/transaction";
import type {
  TransactionRepository,
  TransactionQuery,
  NewTransactionInput,
  ConvertInput,
} from "./repository";

// C2：把 Tauri invoke 的错误归一化——Tauri 抛出的可能是 Error 对象、字符串或未知结构，
// 统一包成带 message 的 Error，便于上层（store 的 try/catch）稳定读取 e.message。
async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (e) {
    throw new Error(normalizeError(e));
  }
}

function normalizeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

// 当前实现：经 Tauri 命令访问本地 SQLite
// C1：repo 边界的 0/1 ↔ boolean 转换。Rust/SQLite 以整数存储 show_in_next / deleted，
// TS 类型统一用 boolean；读时把整数字段归一为布尔、写时把布尔还原为整数，DB 契约不变。
function rowToTx(row: Transaction): Transaction {
  return { ...row, show_in_next: !!row.show_in_next, deleted: !!row.deleted, wait_auto_next: !!row.wait_auto_next };
}
function patchToRow(
  patch: Partial<Transaction> & { clear_parent?: boolean; clear_reminder?: boolean; clear_note?: boolean },
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...patch };
  if (typeof patch.show_in_next === "boolean") out.show_in_next = patch.show_in_next ? 1 : 0;
  if (typeof patch.deleted === "boolean") out.deleted = patch.deleted ? 1 : 0;
  if (typeof patch.wait_auto_next === "boolean") out.wait_auto_next = patch.wait_auto_next ? 1 : 0;
  return out;
}

export class TauriTransactionRepository implements TransactionRepository {
  list(query?: TransactionQuery): Promise<Transaction[]> {
    return call<Transaction[]>("list_transactions", { query: query ?? {} }).then((rows) => rows.map(rowToTx));
  }
  get(id: number): Promise<Transaction | null> {
    return call<Transaction | null>("get_transaction", { id }).then((r) => (r ? rowToTx(r) : null));
  }
  create(input: NewTransactionInput): Promise<Transaction> {
    return call<Transaction>("create_transaction", { input }).then(rowToTx);
  }
  update(
    id: number,
    patch: Partial<Transaction> & { clear_parent?: boolean; clear_reminder?: boolean; clear_note?: boolean },
  ): Promise<Transaction> {
    return call<Transaction>("update_transaction", { id, patch: patchToRow(patch) }).then(rowToTx);
  }
  async softDelete(id: number): Promise<void> {
    await call("delete_transaction", { id });
  }
  convertFromInbox(id: number, input: ConvertInput): Promise<Transaction> {
    return call<Transaction>("convert_inbox", { id, input }).then(rowToTx);
  }
  listDeleted(): Promise<Transaction[]> {
    return call<Transaction[]>("list_deleted").then((rows) => rows.map(rowToTx));
  }
  async restore(id: number): Promise<void> {
    await call("restore_transaction", { id });
  }
  async purge(id: number): Promise<void> {
    await call("purge_transaction", { id });
  }
  async emptyTrash(): Promise<void> {
    await call("empty_trash");
  }
}
