import { TauriTransactionRepository } from "./tauriRepo";
import { MemoryTransactionRepository } from "./memoryRepo";
import type { TransactionRepository } from "./repository";

// ★ 环境检测 + 一行切换后端（核心扩展 seam）
// 在 Tauri 运行环境（window.__TAURI_INTERNALS__ 存在）使用真实 SQLite 后端；
// 否则（纯浏览器 / 测试）回退到内存实现，保证 UI 不依赖 Rust 即可运行与预览。
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export const transactionRepo: TransactionRepository = isTauri()
  ? new TauriTransactionRepository()
  : new MemoryTransactionRepository();
