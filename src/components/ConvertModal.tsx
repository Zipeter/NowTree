// Inbox → 正式事务 的整理转换弹窗（第四步）
// 行为：预填原 Inbox 的标题/备注，用户在此基础上"加工/重填"；
//       选择类别、设优先级、设时间要求、设提醒；确认后原地转换。
import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "./common/Modal";
import { useTxStore } from "../store/useTxStore";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  deadlineOptionLabel,
  normalizeDeadline,
  PRIORITY_MAX,
  type Category,
  type DeadlineType,
  type Transaction,
} from "../types/transaction";

interface ConvertModalProps {
  tx: Transaction;
  onClose: () => void;
  // 批量转换模式：单个灵感转换成功后调用，用于弹出下一个（替代 onClose 关闭）
  onConverted?: () => void;
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

export default function ConvertModal({ tx, onClose, onConverted }: ConvertModalProps) {
  const { convertInbox, updateTx, active, loadActive } = useTxStore();
  // 0.1.13：恢复「标题预填」——仅预填原记录的标题，不预填备注（备注需用户自行决定）。
  const [title, setTitle] = useState(tx.title);
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<Category>("next_action");
  const [deadlineType, setDeadlineType] = useState<DeadlineType>("none");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [priority, setPriority] = useState<number>(1);
  const [reminderTime, setReminderTime] = useState("");
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

  const savingRef = useRef(false);
  const dateRef = useRef<HTMLInputElement>(null);
  const reminderRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (savingRef.current) return;
    const t = title.trim();
    if (!t) return;
    savingRef.current = true;
    // 若在 project 类型下选择了父事务，则转成该父的子事务（category=next_action，进项目内）
    const asChild = category === "project" && parentId != null;
    // 0.1.16：日期检测——具体日期若是今天，自动归一成「今日」。
    const dl = normalizeDeadline(
      deadlineType,
      deadlineType === "date" ? (deadlineDate || null) : null,
    );
    await convertInbox(tx.id, {
      title: t,
      note: note.trim() || null,
      category: asChild ? "next_action" : category,
      deadline_type: dl.type,
      deadline_date: dl.date,
      priority,
      reminder_time: reminderTime || null,
    });
    if (asChild) {
      // 转换后就地补写 parent_id，使其挂到目标父事务下（默认不进全局 Next）
      await updateTx(tx.id, { parent_id: parentId, show_in_next: 0 });
    }
    // 批量模式：优先触发 onConverted（弹下一个）；否则正常关闭
    if (onConverted) onConverted();
    else onClose();
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
    <Modal title="整理为正式事务" onClose={onClose}>
      <p className="muted convert-origin">
        原记录：{tx.title}{tx.note ? ` · ${tx.note}` : ""}
      </p>

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

      <div className="field">
        <span>类型</span>
        <div className="seg">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`seg-item ${category === c ? "on" : ""}`}
              onClick={() => setCategory(c)}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {category === "project" && (
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
      )}

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

      <label className="field">
        <span>备注</span>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={handleNoteKeyDown}
        />
      </label>

      <div className="modal-actions">
        <button className="btn-ghost" onClick={onClose}>
          取消
        </button>
        <button className="btn-primary" onClick={submit} disabled={!title.trim()}>
          确认转换
        </button>
      </div>
    </Modal>
  );
}
