// 0.1.20：拖拽浮层（drag-ghost）共享组件。
// 原 GenericListView / NextView / ProjectListView 三处各写了一份几乎逐字相同的浮层：
//   - 跟随光标定位（dragPos.x / dragPos.y）
//   - 显示被拖事务标题
//   - 截止类型不为 none 时显示 deadlineText
// 其中 GenericListView 多了一层 `!inboxMode` 判断，但 Inbox 事务 deadline_type 恒为 none，
// 因此该判断是死代码，三处行为完全一致，可安全收敛到此处。
import type { Transaction } from "../types/transaction";
import { deadlineText } from "../utils/txText";

export interface DragGhostProps {
  tx: Transaction | null;
  pos: { x: number; y: number } | null;
}

export default function DragGhost({ tx, pos }: DragGhostProps) {
  if (!pos || !tx) return null;
  return (
    <div className="drag-ghost" style={{ left: pos.x, top: pos.y }}>
      <span className="tx-title">{tx.title}</span>
      {tx.deadline_type !== "none" && (
        <span className="tx-deadline muted">{deadlineText(tx)}</span>
      )}
    </div>
  );
}
