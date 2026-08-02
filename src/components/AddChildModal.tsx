// Project 子步骤 / 批量子事项创建弹窗。
// 0.1.16：新增 batch 模式——每成功添加一个不清空弹窗、继续添加下一个，直到点「完成」。
// 字段表单复用 TransactionForm（0.1.20 收口），本弹窗只负责「挂到固定父事务」与批量重置逻辑。
import { useState } from "react";
import Modal from "./common/Modal";
import TransactionForm, { type TxFormValues } from "./TransactionForm";
import { useTxStore } from "../store/useTxStore";
import { normalizeDeadline, resolveDeadline } from "../types/transaction";

interface AddChildModalProps {
  parentId: number;
  onClose: () => void;
  // 0.1.16：批量模式——添加后不关闭，继续下一个（需 onAdded 收尾外部态）。
  batch?: boolean;
  onAdded?: () => void;
}

export default function AddChildModal({ parentId, onClose, batch, onAdded }: AddChildModalProps) {
  const { addChild } = useTxStore();
  // 0.1.20：批量「添加并继续」时递增 resetKey，让 TransactionForm 清空字段准备下一条。
  const [resetKey, setResetKey] = useState(0);

  async function handleSubmit(v: TxFormValues) {
    // 0.1.16 + 1.0.2：日期检测 + 相对类型把锚点日期写入 deadline_date
    const norm = normalizeDeadline(
      v.deadlineType,
      v.deadlineType === "date" ? (v.deadlineDate || null) : null,
    );
    const dl = resolveDeadline(norm.type, norm.date);
    await addChild(parentId, {
      title: v.title,
      note: v.note || undefined,
      priority: v.priority,
      deadline_type: dl.type,
      deadline_date: dl.date ?? undefined,
      reminder_time: v.reminderTime || undefined,
    });
    if (batch && onAdded) {
      setResetKey((k) => k + 1);
      onAdded();
      return;
    }
    onClose();
  }

  return (
    <Modal title={batch ? "批量添加子事项" : "添加子步骤"} onClose={onClose}>
      <TransactionForm
        initial={{ title: "", note: "", category: "next_action", priority: 1, deadlineType: "none", deadlineDate: "", reminderTime: "" }}
        submitLabel={batch ? "添加并继续" : "添加子步骤"}
        onCancel={onClose}
        onSubmit={handleSubmit}
        resetKey={resetKey}
        extraActions={
          batch ? (
            <button className="btn-ghost" onClick={onClose}>
              完成
            </button>
          ) : undefined
        }
      />
    </Modal>
  );
}
