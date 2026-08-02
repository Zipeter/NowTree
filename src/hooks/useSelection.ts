// 0.1.20：把三个列表视图里重复的选择状态逻辑收敛成共享 hook。
// 负责管理：多选模式开关、已选集合、批量删除二次确认。
// 视图仍自己决定「全选范围」「批量删除/移动/清理」的具体行为，通过回调传回。
import { useState, useCallback } from "react";

export interface UseSelectionOptions<T> {
  items: T[];
  getId?: (item: T) => number;
}

export interface UseSelectionReturn {
  selMode: boolean;
  setSelMode: (v: boolean) => void;
  selected: Set<number>;
  setSelected: React.Dispatch<React.SetStateAction<Set<number>>>;
  confirmBatch: boolean;
  setConfirmBatch: (v: boolean) => void;
  toggleSelMode: () => void;
  toggleSel: (id: number) => void;
  selectAll: () => void;
  selectAllFiltered: (predicate: (item: unknown) => boolean) => void;
  clearSel: () => void;
}

export function useSelection<T>({
  items,
  getId = (x: unknown) => (x as { id: number }).id,
}: UseSelectionOptions<T>): UseSelectionReturn {
  const [selMode, setSelMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmBatch, setConfirmBatch] = useState(false);

  const reset = useCallback(() => {
    setSelected(new Set());
    setConfirmBatch(false);
  }, []);

  const toggleSelMode = useCallback(() => {
    setSelMode((v) => {
      if (v) reset();
      return !v;
    });
  }, [reset]);

  const toggleSel = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(items.map(getId)));
  }, [items, getId]);

  const selectAllFiltered = useCallback(
    (predicate: (item: unknown) => boolean) => {
      setSelected(new Set(items.filter(predicate as (item: T) => boolean).map(getId)));
    },
    [items, getId]
  );

  const clearSel = useCallback(() => {
    setSelected(new Set());
    setConfirmBatch(false);
  }, []);

  return {
    selMode,
    setSelMode,
    selected,
    setSelected,
    confirmBatch,
    setConfirmBatch,
    toggleSelMode,
    toggleSel,
    selectAll,
    selectAllFiltered,
    clearSel,
  };
}
