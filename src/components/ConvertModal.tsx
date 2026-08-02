// Inbox → 正式事务 的整理转换弹窗（第四步）
// 行为：预填原 Inbox 的标题，用户在此基础上"加工/重填"；
//       选择类别、设优先级、设时间要求、设提醒；确认后原地转换。
// 字段表单复用 TransactionForm（0.1.20 收口），本弹窗只负责「父事务选择器」与转换业务逻辑。
import { useEffect, useMemo, useState } from "react";
import Modal from "./common/Modal";
import TransactionForm, { type TxFormValues } from "./TransactionForm";
import { useTxStore } from "../store/useTxStore";
import { normalizeDeadline, resolveDeadline, type Transaction } from "../types/transaction";

interface ConvertModalProps {
  tx: Transaction;
  onClose: () => void;
  // 批量转换模式：单个灵感转换成功后调用，用于弹出下一个（替代 onClose 关闭）
  onConverted?: () => void;
}

export default function ConvertModal({ tx, onClose, onConverted }: ConvertModalProps) {
  const { convertInbox, updateTx, active, loadActive } = useTxStore();
  // 0.1.13：类型为 project 时可选父事务——选中则把这条灵感转成该父事务的子事务；
  // 默认「无」= 作为独立 Project（自身即父）。
  const [parentId, setParentId] = useState<number | null>(null);

  // 弹窗内需要现有 project 父事务列表：若 active 尚未加载则拉一次
  useEffect(() => {
    if (active.length === 0) loadActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const projectParents = useMemo(
    () =>
      active.filter(
        (t) => t.category === "project" && t.parent_id === null && t.status !== "completed",
      ),
    [active],
  );

  async function handleSubmit(v: TxFormValues) {
    const asChild = v.category === "project" && parentId != null;
    // 0.1.16 + 1.0.2：日期检测 + 相对类型把锚点日期写入 deadline_date
    const norm = normalizeDeadline(
      v.deadlineType,
      v.deadlineType === "date" ? (v.deadlineDate || null) : null,
    );
    const dl = resolveDeadline(norm.type, norm.date);
    await convertInbox(tx.id, {
      title: v.title,
      note: v.note || null,
      category: asChild ? "next_action" : v.category,
      deadline_type: dl.type,
      deadline_date: dl.date,
      priority: v.priority,
      reminder_time: v.reminderTime || null,
    });
    if (asChild) {
      // 转换后就地补写 parent_id，使其挂到目标父事务下（默认不进全局 Next）
      await updateTx(tx.id, { parent_id: parentId, show_in_next: false });
    }
    // 批量模式：优先触发 onConverted（弹下一个）；否则正常关闭
    if (onConverted) onConverted();
    else onClose();
  }

  return (
    <Modal title="整理为正式事务" onClose={onClose}>
      <p className="muted convert-origin">
        原记录：{tx.title}{tx.note ? ` · ${tx.note}` : ""}
      </p>

      <TransactionForm
        initial={{ title: tx.title, note: "", category: "next_action", priority: 1, deadlineType: "none", deadlineDate: "", reminderTime: "" }}
        showCategory
        submitLabel="确认转换"
        onCancel={onClose}
        onSubmit={handleSubmit}
        parentSelect={
          <div className="field">
            <span>父事务</span>
            <select
              className="deadline-select parent-select"
              value={parentId ?? ""}
              onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">无</option>
              {projectParents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        }
      />
    </Modal>
  );
}
