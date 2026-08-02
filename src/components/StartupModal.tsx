// 启动弹窗（0.1.16）：每次启动软件弹出，介绍今天，并列出分配到
// 早 / 午 / 晚 三个时段的任务（来自 Next 事务的 time_slot 分配）。
import { useMemo } from "react";
import Modal from "./common/Modal";
import { useTxStore } from "../store/useTxStore";
import type { TimeSlot } from "../types/transaction";
import { TIME_SLOT_LABELS } from "../types/transaction";

const SLOTS: TimeSlot[] = ["morning", "noon", "evening"];
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

export default function StartupModal({ onClose }: { onClose: () => void }) {
  const { active } = useTxStore();
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const week = WEEK[now.getDay()];

  // 收集已分配到各时段的未完成任务标题
  const tasks = useMemo(() => {
    const m: Record<TimeSlot, string[]> = { none: [], morning: [], noon: [], evening: [] };
    for (const t of active) {
      if (t.status === "completed") continue;
      if (
        ((t.category === "next_action" && t.parent_id === null) ||
          t.show_in_next) &&
        t.time_slot !== "none"
      ) {
        m[t.time_slot].push(t.title);
      }
    }
    return m;
  }, [active]);

  return (
    <Modal title="今天" onClose={onClose}>
      <p className="startup-date">
        今天是 {dateStr} 星期{week}
      </p>
      <p className="muted startup-sub">分配到早 / 午 / 晚 三个时段的任务：</p>

      <div className="startup-slots">
        {SLOTS.map((s) => (
          <div className="startup-slot" key={s}>
            <div className="startup-slot-head">{TIME_SLOT_LABELS[s]}</div>
            {tasks[s].length === 0 ? (
              <div className="muted startup-empty">暂无安排</div>
            ) : (
              <ul className="startup-task-list">
                {tasks[s].map((title, i) => (
                  <li key={i}>{title}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="modal-actions">
        <button className="btn-primary" onClick={onClose}>
          开始今天
        </button>
      </div>
    </Modal>
  );
}
