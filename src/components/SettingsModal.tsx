// 设置弹窗：统一收纳所有「开关类」偏好（开机自启动、勾选提示音…）。
// 设计意图：后续新增开关类设置时，只需在 SETTINGS 数组加一项 + 给本组件透传对应 props，
// 无需新增独立弹窗或散落到侧边菜单——本组件即「开关类设置的统一容器」。
// 现有开关逻辑（autostart 走 Tauri 命令 / checkSound 走 localStorage）全部复用 App 的 state 与 setter，不重写。
import Modal from "./common/Modal";

interface SettingsModalProps {
  autostart: boolean;
  onToggleAutostart: () => void;
  checkSoundOn: boolean;
  onToggleCheckSound: () => void;
  isDev?: boolean;
  onClose: () => void;
}

// 开关清单：新增开关在此追加一项即可（label / hint 用于展示，key 用于映射值与控制函数）。
const SETTINGS: { key: "autostart" | "sound"; label: string; hint: string }[] = [
  { key: "autostart", label: "开机自启动", hint: "登录系统后自动启动 NowTree" },
  { key: "sound", label: "勾选提示音", hint: "勾选完成事务时播放提示音" },
];

export default function SettingsModal({
  autostart,
  onToggleAutostart,
  checkSoundOn,
  onToggleCheckSound,
  isDev,
  onClose,
}: SettingsModalProps) {
  const isOn = (k: "autostart" | "sound") =>
    k === "autostart" ? autostart : checkSoundOn;
  const handleToggle = (k: "autostart" | "sound") => {
    if (k === "autostart") onToggleAutostart();
    else onToggleCheckSound();
  };

  return (
    <Modal title="设置" onClose={onClose}>
      <p className="muted shortcut-tip">
        所有开关类设置集中于此，点击右侧开关即可实时切换。
      </p>
      <div className="settings-list">
        {SETTINGS.map((s) => {
          const on = isOn(s.key);
          const readOnly = s.key === "autostart" && isDev;
          const hint =
            s.key === "autostart" && isDev
              ? "开发模式只读，自启动由 release 版本（nowtree.exe）统一管理"
              : s.hint;
          return (
            <button
              key={s.key}
              type="button"
              className={"settings-row" + (readOnly ? " disabled" : "")}
              disabled={readOnly}
              onClick={() => handleToggle(s.key)}
            >
              <span className="settings-row-text">
                <span className="settings-row-label">{s.label}</span>
                <span className="settings-row-hint muted">{hint}</span>
              </span>
              <span className={"switch" + (on ? " on" : "")} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
