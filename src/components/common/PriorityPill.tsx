// 优先级小药丸：1-5，5=最高（最紧急）。
// 颜色从暖到冷递进，未设置时不渲染（由调用方判断 priority != null 才显示）。
import { PRIORITY_MAX } from "../../types/transaction";

// 优先级 → 颜色：5 红(最急) → 1 灰(最低)。与深色背景对比清晰。
const PRIORITY_COLORS: Record<number, string> = {
  5: "#e06c75",
  4: "#e5925a",
  3: "#c9b44a",
  2: "#5aa0e5",
  1: "#8a8a8a",
};

export default function PriorityPill({ value }: { value: number }) {
  if (value < 1 || value > PRIORITY_MAX) return null;
  const color = PRIORITY_COLORS[value];
  return (
    <span
      className="pri-pill"
      style={{ background: color }}
      title={`优先级 P${value}（${value} 最高）`}
    >
      P{value}
    </span>
  );
}
