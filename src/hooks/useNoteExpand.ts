import { useEffect, useRef, useState } from "react";

// 备注展开/收起（0.1.16）：所有视图默认备注一行收起，点击展开，点外部自动收起。
// 用法：解构 { expandedNoteId, setExpandedNoteId, containerRef }，
// 把 containerRef 挂到包含备注的滚动容器（如 .sub-panel / .next-split）；
// 备注用 <Note> 组件渲染（自带 data-note-id 与点击切换）。
export function useNoteExpand() {
  const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (expandedNoteId == null) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      const expandedEl = containerRef.current?.querySelector(
        `[data-note-id="${expandedNoteId}"]`,
      );
      // 点的是当前已展开的备注本身 → 交给它的 onClick 处理（切换收起）
      if (expandedEl && expandedEl.contains(t)) return;
      setExpandedNoteId(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [expandedNoteId]);

  return { expandedNoteId, setExpandedNoteId, containerRef };
}
