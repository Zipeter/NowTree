// 新增 / 编辑弹窗共用的字段表单（0.1.19 抽离，消除 AddModal / EditModal 的字段重复）。
// 本组件只负责：渲染字段 + 收集字段值 + 基本的「标题非空 / 防重复提交」校验，
// 并通过 onSubmit 回调把值交出去；store 的写入（createTx / updateTx）、日期归一、
// clear_reminder 标志等「保存时的业务逻辑」由外层弹窗处理。
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  PRIORITY_MAX,
  CATEGORIES,
  CATEGORY_LABELS,
  deadlineOptionLabel,
  type Category,
  type DeadlineType,
} from "../types/transaction";

export interface TxFormValues {
  title: string;
  note: string;
  category: Category;
  priority: number;
  deadlineType: DeadlineType;
  deadlineDate: string;
  reminderTime: string;
}

interface TransactionFormProps {
  initial: TxFormValues;
  // inbox：仅 标题 + 备注（与 Inbox 收集语义一致），隐藏类型/优先级/时间要求/提醒。
  inbox?: boolean;
  // 是否显示「类型」分段选择（编辑弹窗在非 inbox 且非 hideCategory 时为 true）。
  showCategory?: boolean;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (v: TxFormValues) => void | Promise<void>;
  // 额外操作按钮（如编辑弹窗的「删除」），渲染在 取消 与 主按钮 之间。
  extraActions?: ReactNode;
  // 额外字段插槽（如 ConvertModal 的「父事务」选择器），仅在 category==="project" 时渲染。
  parentSelect?: ReactNode;
  // 批量场景：值变化时把字段重置回 initial（如 AddChildModal 的「添加并继续」）。
  resetKey?: number;
}

const DEADLINES: DeadlineType[] = ["none", "today", "week", "month", "date"];

function formatReminder(iso: string) {
  return iso.replace("T", " ");
}

// 程序化打开原生日期/时间选择器（必须在用户手势内调用）
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
      /* 不支持则忽略 */
    }
  }
}

export default function TransactionForm({
  initial,
  inbox,
  showCategory,
  submitLabel,
  onCancel,
  onSubmit,
  extraActions,
  parentSelect,
  resetKey,
}: TransactionFormProps) {
  const [title, setTitle] = useState(initial.title);
  const [note, setNote] = useState(initial.note);
  const [category, setCategory] = useState<Category>(initial.category);
  const [priority, setPriority] = useState<number>(initial.priority);
  const [deadlineType, setDeadlineType] = useState<DeadlineType>(initial.deadlineType);
  const [deadlineDate, setDeadlineDate] = useState(initial.deadlineDate);
  const [reminderTime, setReminderTime] = useState(initial.reminderTime);
  const savingRef = useRef(false);
  const dateRef = useRef<HTMLInputElement>(null);
  const reminderRef = useRef<HTMLInputElement>(null);

  // 批量添加场景：resetKey 递增时把字段重置回 initial（不清空父级状态，如 AddChildModal 的 batchId）。
  useEffect(() => {
    setTitle(initial.title);
    setNote(initial.note);
    setCategory(initial.category);
    setPriority(initial.priority);
    setDeadlineType(initial.deadlineType);
    setDeadlineDate(initial.deadlineDate);
    setReminderTime(initial.reminderTime);
    savingRef.current = false;
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    if (savingRef.current) return;
    const t = title.trim();
    if (!t) return;
    savingRef.current = true;
    try {
      await onSubmit({
        title: t,
        note: note.trim(),
        category,
        priority,
        deadlineType,
        deadlineDate,
        reminderTime,
      });
    } finally {
      savingRef.current = false;
    }
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
    <>
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

      {/* inbox 编辑、或 Next 展示项（子事务 / waiting / someday 凭 show_in_next 透出）由 hideCategory 统一隐藏类型模块 */}
      {!inbox && showCategory && (
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
      )}

      {/* parentSelect 插槽：如 ConvertModal 的「父事务」选择器，仅 project 类型时渲染 */}
      {!inbox && showCategory && category === "project" && parentSelect}

      {!inbox && (
        <>
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
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setReminderTime("")}
                >
                  清除
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <div className="modal-actions">
        <button className="btn-ghost" onClick={onCancel}>
          取消
        </button>
        {extraActions}
        <button
          className="btn-primary"
          onClick={submit}
          disabled={!title.trim()}
          onKeyDown={(e) => {
            // 0.1.20：显式支持「回车保存」——焦点落在保存按钮上时，回车直接保存。
            // preventDefault 阻止浏览器默认的「回车=点击」，避免重复提交（submit 内部有 savingRef 兜底）。
            if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        >
          {submitLabel}
        </button>
      </div>
    </>
  );
}
