// 统一编辑弹窗（0.1.19 字段抽离到 TransactionForm）。
// 本文件仅保留：弹窗外壳 + 「保存 / 删除」的 store 写入逻辑（含日期归一、clear_reminder 标志）。
// 字段顺序与展示规则（标题→备注→[类型]→优先级→时间要求→提醒）由 TransactionForm 负责。
// Inbox 条目编辑：只改标题/备注，不改类别与状态（避免把灵感误转成正式事务）。
import { useState } from "react";
import Modal from "./common/Modal";
import TransactionForm, { type TxFormValues } from "./TransactionForm";
import { useTxStore } from "../store/useTxStore";
import { normalizeDeadline, type Transaction } from "../types/transaction";

interface EditModalProps {
  tx: Transaction;
  onClose: () => void;
  // Inbox 条目编辑：只改标题/备注，不改类别与状态（避免把灵感误转成正式事务）
  inbox?: boolean;
  // 自定义删除行为（Inbox 用 removeInbox 而非 deleteTx）
  onDelete?: () => void;
  // 0.1.16：隐藏「类型」分段选择（Project 子事务 / Next 展示项：子事务·waiting·someday 凭 show_in_next 透出）
  hideCategory?: boolean;
}

export default function EditModal({ tx, onClose, inbox, onDelete, hideCategory }: EditModalProps) {
  const { updateTx, deleteTx } = useTxStore();
  const [confirmDel, setConfirmDel] = useState(false);

  function handleSave(v: TxFormValues) {
    const t = v.title.trim();
    if (!t) return;
    // 备注：空串视为清空。Rust 端 note 是 Option<String>，传 null 会被反序列化为
    // None 而「跳过该列不更新」，导致清不掉；故用 clear_note 标志显式置 NULL
    // （与 clear_reminder 同一范式）。非空则照常写入。
    const noteTrim = v.note.trim();
    const notePatch = noteTrim ? { note: noteTrim } : { clear_note: true };
    if (inbox) {
      // Inbox 灵感编辑：仅改标题与备注，保持 status=inbox、category=null
      updateTx(tx.id, { title: t, ...notePatch });
    } else {
      // 0.1.16：日期检测——具体日期若是今天，自动归一成「今日」并清空日期。
      const dl = normalizeDeadline(
        v.deadlineType,
        v.deadlineType === "date" ? (v.deadlineDate || null) : null,
      );
      updateTx(tx.id, {
        title: t,
        ...notePatch,
        category: v.category,
        deadline_type: dl.type,
        deadline_date: dl.date,
        priority: v.priority,
        reminder_time: v.reminderTime || null,
        // 0.1.19：清空提醒（reminderTime 为空）时带 clear_reminder 标志，
        // 让 Rust 端把 reminder_time 真正置 NULL（否则传 null 会被后端「有值才改」逻辑跳过）。
        clear_reminder: v.reminderTime === "" ? true : undefined,
        reminder_done: 0,
      });
    }
    onClose();
  }

  async function remove() {
    if (!confirmDel) {
      setConfirmDel(true);
      return;
    }
    if (onDelete) {
      onDelete();
      onClose();
      return;
    }
    await deleteTx(tx.id);
    onClose();
  }

  const showCategory = !inbox && !hideCategory;

  return (
    <Modal title={inbox ? "编辑灵感" : "编辑事务"} onClose={onClose}>
      <TransactionForm
        initial={{
          title: tx.title,
          note: tx.note ?? "",
          category: tx.category ?? "next_action",
          priority: tx.priority ?? 1,
          deadlineType: tx.deadline_type,
          deadlineDate: tx.deadline_date ?? "",
          reminderTime: tx.reminder_time ?? "",
        }}
        inbox={inbox}
        showCategory={showCategory}
        submitLabel="保存"
        onCancel={onClose}
        onSubmit={handleSave}
        extraActions={
          <button
            className={`btn-danger ${confirmDel ? "on" : ""}`}
            onClick={remove}
          >
            {confirmDel ? "确认删除？" : "删除"}
          </button>
        }
      />
    </Modal>
  );
}
