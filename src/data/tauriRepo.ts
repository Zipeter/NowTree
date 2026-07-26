import { invoke } from "@tauri-apps/api/core";
import type { Transaction } from "../types/transaction";
import type {
  TransactionRepository,
  TransactionQuery,
  NewTransactionInput,
  ConvertInput,
} from "./repository";

// 当前实现：经 Tauri 命令访问本地 SQLite
export class TauriTransactionRepository implements TransactionRepository {
  list(query?: TransactionQuery): Promise<Transaction[]> {
    return invoke("list_transactions", { query: query ?? {} });
  }
  get(id: number): Promise<Transaction | null> {
    return invoke("get_transaction", { id });
  }
  create(input: NewTransactionInput): Promise<Transaction> {
    return invoke("create_transaction", { input });
  }
  update(id: number, patch: Partial<Transaction> & { clear_parent?: boolean; clear_reminder?: boolean; clear_note?: boolean }): Promise<Transaction> {
    return invoke("update_transaction", { id, patch });
  }
  async softDelete(id: number): Promise<void> {
    await invoke("delete_transaction", { id });
  }
  convertFromInbox(id: number, input: ConvertInput): Promise<Transaction> {
    return invoke("convert_inbox", { id, input });
  }
  listDeleted(): Promise<Transaction[]> {
    return invoke("list_deleted");
  }
  restore(id: number): Promise<void> {
    return invoke("restore_transaction", { id });
  }
  purge(id: number): Promise<void> {
    return invoke("purge_transaction", { id });
  }
  emptyTrash(): Promise<void> {
    return invoke("empty_trash");
  }
}
