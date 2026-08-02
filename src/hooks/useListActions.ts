// 列表视图共用的「工具栏动作」收口（0.1.20，B3 重构）。
// GenericListView / NextView / ProjectListView 三处 cleanCompleted / batchDelete /
// moveTo / cancelClean 逻辑逐字重复，仅「已完成 id 来源」「删除方式（inbox 走 removeInbox
// 还是类别走 deleteTx）」「移动拦截（Project 含子父事务不可移动）」有差异。
// 把不变的部分（二次确认态、加载回收站、清空选择、写回 store）收进本 hook，
// 差异点由各视图以回调注入，既消除重复又保留各自语义。
import { useTxStore } from "../store/useTxStore";
import type { Category } from "../types/transaction";

export interface ListActionsConfig {
  selected: Set<number>;
  setSelected: (s: Set<number>) => void;
  clearConfirm: boolean;
  setClearConfirm: (b: boolean) => void;
  confirmBatch: boolean;
  setConfirmBatch: (b: boolean) => void;
  selMode: boolean;
  setSelMode: (b: boolean) => void;
  // 选中「已完成」的 id（各视图语义不同：Project 含子事务）。
  getCompletedIds: () => number[];
  // 对一组 id 执行删除（Generic：区分 inbox/类别；Next/Project：直接 deleteTx 列表）。
  deleteSelected: (ids: number[]) => Promise<void>;
  // 移动前拦截：返回 { movable, blocked }（如 Project 过滤含子的父事务）。
  filterMovable?: (ids: number[]) => { movable: number[]; blocked: number[] };
  // 移动后回调（如 Project 设置「含子事务无法移动」提示）。
  onMoved?: (blocked: number[]) => void;
}

export function useListActions(cfg: ListActionsConfig) {
  const { reorder, updateTx, loadTrash } = useTxStore();

  // 排序：各视图保留自己的比较器（Project 完成度排序不同），只统一最后的 reorder 调用。
  function applySort(sortedIds: number[]) {
    reorder(sortedIds);
  }

  // 一键清理：首次仅选中已完成并进入确认态；二次才批量删除。
  async function cleanCompleted() {
    if (cfg.clearConfirm) {
      await cfg.deleteSelected([...cfg.selected]);
      await loadTrash();
      cfg.setSelected(new Set());
      cfg.setClearConfirm(false);
      return;
    }
    const ids = cfg.getCompletedIds();
    cfg.setSelected(new Set(ids));
    cfg.setClearConfirm(true);
  }

  function cancelClean() {
    cfg.setClearConfirm(false);
    cfg.setSelected(new Set());
  }

  // 批量删除：首次进入确认态，二次执行。
  async function batchDelete() {
    if (!cfg.confirmBatch) {
      cfg.setConfirmBatch(true);
      return;
    }
    await cfg.deleteSelected([...cfg.selected]);
    await loadTrash();
    cfg.setSelected(new Set());
    cfg.setConfirmBatch(false);
    cfg.setSelMode(false);
  }

  // 移动到其它类别：先按 filterMovable 过滤（如 Project 跳过含子的父事务），再批量改类。
  async function moveTo(target: Category) {
    const ids = [...cfg.selected];
    let movable = ids;
    let blocked: number[] = [];
    if (cfg.filterMovable) {
      const r = cfg.filterMovable(ids);
      movable = r.movable;
      blocked = r.blocked;
    }
    if (movable.length === 0) {
      if (cfg.onMoved) cfg.onMoved(blocked);
      return;
    }
    for (const id of movable) {
      await updateTx(id, { category: target, clear_parent: true });
    }
    cfg.setSelected(new Set());
    cfg.setSelMode(false);
    if (cfg.onMoved) cfg.onMoved(blocked);
  }

  return { applySort, cleanCompleted, cancelClean, batchDelete, moveTo };
}
