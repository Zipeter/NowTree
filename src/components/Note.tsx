import type { Transaction } from "../types/transaction";

// 备注渲染（0.1.16）：默认一行收起，点击在「一行 ↔ 完整」间切换；
// 点其它地方由 useNoteExpand 的全局监听自动收起。
export default function Note({
  t,
  expandedNoteId,
  setExpandedNoteId,
}: {
  t: Transaction;
  expandedNoteId: number | null;
  setExpandedNoteId: (id: number | null) => void;
}) {
  if (!t.note) return null;
  const expanded = expandedNoteId === t.id;
  return (
    <div
      className={`tx-note muted${expanded ? " note-expanded" : ""}`}
      data-note-id={t.id}
      onClick={(e) => {
        e.stopPropagation();
        setExpandedNoteId(expanded ? null : t.id);
      }}
    >
      {t.note}
    </div>
  );
}
