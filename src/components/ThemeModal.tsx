// 0.1.20：主题设置弹窗（从左侧 ☰ 菜单进入）。
// 复用 App 的 theme / chooseTheme（单一数据源，确保高亮与全局主题一致）。
import Modal from "./common/Modal";
import type { ThemeMode } from "../hooks/useTheme";

interface ThemeModalProps {
  theme: ThemeMode;
  onChoose: (m: ThemeMode) => void;
  onClose: () => void;
}

const OPTIONS: { mode: ThemeMode; label: string; hint: string }[] = [
  { mode: "dark", label: "深色", hint: "适合夜间使用，降低屏幕亮度" },
  { mode: "light", label: "浅色", hint: "明亮清晰，适合白天环境" },
  { mode: "system", label: "跟随系统", hint: "随系统的深色 / 浅色自动切换" },
];

export default function ThemeModal({ theme, onChoose, onClose }: ThemeModalProps) {
  return (
    <Modal title="主题" onClose={onClose}>
      <p className="muted shortcut-tip">选择外观主题，设置会立即生效并自动记忆。</p>
      <div className="theme-grid">
        {OPTIONS.map((o) => (
          <button
            key={o.mode}
            type="button"
            className={`theme-card ${theme === o.mode ? "on" : ""}`}
            onClick={() => onChoose(o.mode)}
          >
            {theme === o.mode && <span className="theme-card-check">✓</span>}
            <span className="theme-card-label">{o.label}</span>
            <span className="theme-card-hint muted">{o.hint}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
