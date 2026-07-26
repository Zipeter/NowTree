// Project 子步骤 / 批量子事项创建弹窗。
// 0.1.16：新增 batch 模式——每成功添加一个不清空弹窗、继续添加下一个，
// 直到点「完成」。非 batch 时行为同原先「添加子步骤」。
import { useRef, useState } from "react";
import Modal from "./common/Modal";
import { useTxStore } from "../store/useTxStore";
import {
  deadlineOptionLabel,
  normalizeDeadline,
  PRIORITY_MAX,
  type DeadlineType,
} from "../types/transaction";

interface AddChildModalProps {
  parentId: number;
  onClose: () => void;
  // 0.1.16：批量模式——添加后不关闭，继续下一个（需 onAdded 收尾外部态）。
  batch?: boolean;
  onAdded?: () => void;
}

const DEADLINES: DeadlineType[] = ["none", "today", "week", "month", "date"];

function formatReminder(iso: string) {
  return iso.replace("T", " ");
}

function openPicker(ref: React.RefObject<HTMLInputElement>) {
  const el = ref.current;
  if (!el) return;
  try {
    el.showPicker();
  } catch {
    try {
      el.focus();
      el.click();
    } catch {
      /* 忽略 */
    }
  }
}

export default function AddChildModal({ parentId, onClose, batch, onAdded }: AddChildModalProps) {
  const { addChild } = useTxStore();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [deadlineType, setDeadlineType] = useState<DeadlineType>("none");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [priority, setPriority] = useState<number>(1);
  const [reminderTime, setReminderTime] = useState("");

  const savingRef = useRef(false);
  const dateRef = useRef<HTMLInputElement>(null);
  const reminderRef = useRef<HTMLInputElement>(null);

  function resetFields() {
    setTitle("");
    setNote("");
    setDeadlineType("none");
    setDeadlineDate("");
    setPriority(1);
    setReminderTime("");
  }

  async function submit() {
    if (savingRef.current) return;
    const t = title.trim();
    if (!t) return;
    savingRef.current = true;
    // 0.1.16：日期检测——具体日期若是今天，自动归一成「今日」。
    const dl = normalizeDeadline(
      deadlineType,
      deadlineType === "date" ? (deadlineDate || null) : null,
    );
    await addChild(parentId, {
      title: t,
      note: note.trim() || undefined,
      priority,
      deadline_type: dl.type,
      deadline_date: dl.date ?? undefined,
      reminder_time: reminderTime || undefined,
    });
    if (batch && onAdded) {
      savingRef.current = false;
      resetFields();
      onAdded();
      return;
    }
    onClose();
  }

  function handleNoteKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.shiftKey)) {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart ?? note.length;
      const end = el.selectionEnd ?? note.length;
      const v = note.slice(0, start) + "\n" + note.slice(end);
      setNote(v);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 1;
      });
    } else if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function handleDeadlineChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value as DeadlineType;
    setDeadlineType(val);
    if (val === "date") openPicker(dateRef);
  }

  function clearDeadline() {
    setDeadlineType("none");
    setDeadlineDate("");
  }

  function onReminderChange(e: React.ChangeEvent<HTMLInputElement>) {
    setReminderTime(e.target.value);
  }

  return (
    <Modal title={batch ? "批量添加子事项" : "添加子步骤"} onClose={onClose}>
      <label className="field">
        <span>标题</span>
        <input
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
      </label>

      <label className="field">
        <span>备注</span>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={handleNoteKeyDown}
        />
      </label>

      <div className="field">
        <span>优先级</span>
        <div className="seg">
          {Array.from({ length: PRIORITY_MAX }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              className={`seg-item pri-${p} ${priority === p ? "on" : ""}`}
              onClick={() => setPriority(p)}
              title={`优先级 ${p}`}
            />
          ))}
        </div>
      </div>

      <div className="field inline-row">
        <span>时间要求</span>
        <div className="reminder-picker">
          <select
            className="deadline-select"
            value={deadlineType}
            onChange={handleDeadlineChange}
          >
            {DEADLINES.map((d) => (
              <option key={d} value={d}>
                {deadlineOptionLabel(d)}
              </option>
            ))}
          </select>
          <input
            ref={dateRef}
            type="date"
            className="reminder-input-hidden"
            value={deadlineDate}
            onChange={(e) => {
              setDeadlineDate(e.target.value);
            }}
          />
          {deadlineType === "date" && deadlineDate && (
            <>
              <span className="reminder-value" onClick={() => openPicker(dateRef)}>
                {deadlineDate}
              </span>
              <button type="button" className="btn-ghost" onClick={clearDeadline}>
                清除
              </button>
            </>
          )}
        </div>
      </div>

      <div className="field inline-row">
        <span>提醒</span>
        <div className="reminder-picker">
          <button
            type="button"
            className="reminder-icon-btn"
            title="选择提醒时间"
            onClick={() => openPicker(reminderRef)}
          >
            📅
          </button>
          <input
            ref={reminderRef}
            type="datetime-local"
            className="reminder-input-hidden"
            value={reminderTime}
            onChange={onReminderChange}
          />
          {reminderTime && (
            <span className="reminder-value">{formatReminder(reminderTime)}</span>
          )}
          {reminderTime && (
            <button type="button" className="btn-ghost" onClick={() => setReminderTime("")}>
              清除
            </button>
          )}
        </div>
      </div>

      <div className="modal-actions">
        {batch && (
          <button className="btn-ghost" onClick={onClose}>
            完成
          </button>
        )}
        <button className="btn-primary" onClick={submit} disabled={!title.trim()}>
          {batch ? "添加并继续" : "添加子步骤"}
        </button>
      </div>
    </Modal>
  );
}
