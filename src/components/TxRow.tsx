// 0.1.20：把三个列表视图里「几乎一模一样」的事务行渲染收敛到此处。
// 抽三块：
//   - TxGutter：左侧勾选框（多选 sel-box / 完成 done-box）
//   - TxMain：行主体（标题 / 备注 / 截止 / 提醒 / 来源，及可选的折叠箭头、进度条插槽）
//   - TxRow：<li> 外壳，把上面两块 + 视图自定义的操作区(actions) 拼成完整一行
// 各视图只负责「自己独有的部分」：拖拽接线(startDrag/startSlotDrag)、data-drag-idx、
// 行 className 组合、以及视图专属按钮（加入 Next / 整理 / 子排序 …），通过 props 传入，
// 这样已验证过的拖拽行为完全不动，只消除重复 markup。
import type { Transaction } from "../types/transaction";
import { isDeadlineOverdue } from "../types/transaction";
import { deadlineText } from "../utils/txText";
import { sourceText } from "../services/transactionService";
import { playCheckSound } from "../utils/checkSound";
import Note from "./Note";
import type { HTMLAttributes, ReactNode } from "react";

type GutterMode = "sel" | "done" | "none";

// 左侧勾选 / 完成框。mode==="none" 时不渲染（如 Inbox 非多选 / Project 父项非多选）
export function TxGutter({
  mode,
  selected = false,
  onToggleSelect,
  done = false,
  onToggleDone,
}: {
  mode: GutterMode;
  selected?: boolean;
  onToggleSelect?: () => void;
  done?: boolean;
  onToggleDone?: () => void;
}) {
  if (mode === "none") return null;
  return (
    <div className="tx-gutter">
      {mode === "sel" ? (
        <label
          className="sel-box"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.();
          }}
        >
          <input type="radio" checked={selected} onChange={() => {}} />
        </label>
      ) : (
        <label className="done-box" title="标记完成">
          <input
            type="checkbox"
            checked={done}
            onChange={(e) => {
              // 仅「勾上」时播放音效；取消勾选保持静默。
              if (e.target.checked) playCheckSound();
              onToggleDone?.();
            }}
          />
        </label>
      )}
    </div>
  );
}

export function TxMain({
  tx,
  showMeta = true,
  showSource = false,
  leadingSlot,
  trailingSlot,
  onTitleClick,
  expandedNoteId,
  setExpandedNoteId,
}: {
  tx: Transaction;
  showMeta?: boolean; // 是否渲染截止 / 提醒（Inbox 行传 false）
  showSource?: boolean; // 是否渲染「来源」标签（next_action / Next 视图传 true）
  leadingSlot?: ReactNode; // tx-line 内、标题前的元素（如 Project 折叠箭头）
  trailingSlot?: ReactNode; // tx-main 末尾元素（如 Project 进度条）
  onTitleClick?: () => void; // 点击标题的额外动作（如 Project 父项点标题展开/收起）
  expandedNoteId: number | null;
  setExpandedNoteId: (id: number | null) => void;
}) {
  return (
    <div className="tx-main">
      <div className="tx-line">
        {leadingSlot}
        <span
          className="tx-title"
          onClick={(e) => {
            e.stopPropagation();
            onTitleClick?.();
          }}
        >
          {tx.title}
        </span>
      </div>
      <Note t={tx} expandedNoteId={expandedNoteId} setExpandedNoteId={setExpandedNoteId} />
      {showMeta && tx.deadline_type !== "none" && (
        <span className={`tx-deadline ${isDeadlineOverdue(tx) ? "overdue" : ""}`}>
          {isDeadlineOverdue(tx) ? "⚠ 注意：未完成" : `⏱ ${deadlineText(tx)}`}
        </span>
      )}
      {showMeta && tx.reminder_time && (
        <span className="tx-reminder">🔔 {tx.reminder_time.replace("T", " ")}</span>
      )}
      {showSource && sourceText(tx) && (
        <span className="tx-source">{sourceText(tx)}</span>
      )}
      {trailingSlot}
    </div>
  );
}

export interface TxRowProps {
  tx: Transaction;
  // 完整的 <li> className（已含 "tx-item" 基础类与拖拽/选中态，由各视图按自身规则组合）
  className: string;
  // 拖拽接线 + data-drag-idx + title + onClick，由各视图原样传入，确保拖拽行为零改动
  rowProps: HTMLAttributes<HTMLLIElement> & {
    "data-drag-idx": number;
    "data-parent-id"?: number;
  };
  gutter: GutterMode;
  selected?: boolean;
  onToggleSelect?: () => void;
  done?: boolean;
  onToggleDone?: () => void;
  showMeta?: boolean;
  showSource?: boolean;
  expandedNoteId: number | null;
  setExpandedNoteId: (id: number | null) => void;
  leadingSlot?: ReactNode;
  trailingSlot?: ReactNode;
  // 视图专属操作按钮区（加入 Next / 整理 / 编辑 / 删除 / 子排序 …），原样传入
  actions?: ReactNode;
}

export default function TxRow({
  tx,
  className,
  rowProps,
  gutter,
  selected,
  onToggleSelect,
  done,
  onToggleDone,
  showMeta,
  showSource,
  expandedNoteId,
  setExpandedNoteId,
  leadingSlot,
  trailingSlot,
  actions,
}: TxRowProps) {
  return (
    <li className={className} {...rowProps}>
      <TxGutter
        mode={gutter}
        selected={selected}
        onToggleSelect={onToggleSelect}
        done={done}
        onToggleDone={onToggleDone}
      />
      <TxMain
        tx={tx}
        showMeta={showMeta}
        showSource={showSource}
        leadingSlot={leadingSlot}
        trailingSlot={trailingSlot}
        expandedNoteId={expandedNoteId}
        setExpandedNoteId={setExpandedNoteId}
      />
      {actions}
    </li>
  );
}
