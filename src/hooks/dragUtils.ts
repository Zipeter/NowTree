// 共享拖拽底层原语（0.1.19）：useListDrag 与 NextView.startSlotDrag 共用。
// 把两套装里「字面重复、行为一致」的纯几何/查找逻辑抽出来，消除真正的重复，
// 又完全不动任何已验证的拖拽行为（编排逻辑、class 高亮、计时器都留在各自文件）。
export const LONG_PRESS_MS = 220; // 长按阈值
export const DRAG_THRESHOLD = 10; // 长按前移动超过此像素视为滑动/滚动，取消拖拽

// 拖拽行的列表根（.tx-list 或 .tx-children），用于限定自动滚动的首末行。
export function listRootOf(el: Element | null): HTMLElement | null {
  return el?.closest(".tx-list, .tx-children") as HTMLElement | null;
}

// 向上找到实际可滚动祖先（overflow-y: auto/scroll），而非硬编码 .tx-list。
// Inbox/Category/Project 的滚动容器是 .sub-panel，Next 是 .tx-list。
export function findScrollableAncestor(el: Element | null): HTMLElement | null {
  let cur: Element | null = el;
  while (cur && cur !== document.body && cur !== document.documentElement) {
    const style = window.getComputedStyle(cur);
    const overflowY = style.overflowY;
    if (overflowY === "auto" || overflowY === "scroll") {
      return cur as HTMLElement;
    }
    cur = cur.parentElement;
  }
  return null;
}

export interface RowRect {
  id: number;
  top: number;
  height: number;
}

// 给定行元素几何与光标 Y，判定上半 / 下半（落点插入方向：top=插上、bottom=插下）。
export function rowHalfOf(rectTop: number, rectHeight: number, clientY: number): "top" | "bottom" {
  return clientY < rectTop + rectHeight / 2 ? "top" : "bottom";
}

// 纯函数：在候选行里找「最接近光标 Y」的行 id（带 valid 过滤、排除自身 id）。
// 把几何喂进来即可测试，不依赖真实 DOM。
export function nearestRowId(
  rows: RowRect[],
  clientY: number,
  valid: Set<number>,
  selfId: number,
): number | null {
  let best: number | null = null;
  let minDist = Infinity;
  for (const r of rows) {
    if (!valid.has(r.id) || r.id === selfId) continue;
    const mid = r.top + r.height / 2;
    const dist = Math.abs(clientY - mid);
    if (dist < minDist) {
      minDist = dist;
      best = r.id;
    }
  }
  return best;
}

// DOM 包装：在某容器内收集所有 data-drag-idx 行的几何，找出最近行元素。
// valid 为 null 时仅排除自身（NextView 的用法：目标栏内所有行皆合法落点）；
// 否则额外要求 id 在 valid 集合内（useListDrag 的用法：排除跨组行）。
// root 允许 undefined（调用处 `a ?? b ?? el?.closest(...)` 在 el 为 null 时会得 undefined）。
export function nearestRowEl(
  root: Element | null | undefined,
  clientY: number,
  valid: Set<number> | null,
  selfId: number,
): HTMLElement | null {
  if (!root) return null;
  const rects: RowRect[] = (Array.from(root.querySelectorAll("[data-drag-idx]")) as HTMLElement[])
    .filter((r) => {
      const id = Number(r.dataset.dragIdx);
      if (id === selfId) return false;
      if (valid && !valid.has(id)) return false;
      return true;
    })
    .map((r) => {
      const rect = r.getBoundingClientRect();
      return { id: Number(r.dataset.dragIdx), top: rect.top, height: rect.height };
    });
  const best = nearestRowId(rects, clientY, new Set(rects.map((r) => r.id)), selfId);
  if (best == null) return null;
  return root.querySelector(`[data-drag-idx="${best}"]`) as HTMLElement | null;
}
