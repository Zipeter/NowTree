import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import InboxView from "./components/InboxView";
import CategoryListView from "./components/CategoryListView";
import ProjectListView from "./components/ProjectListView";
import NextView from "./components/NextView";
import StartupModal from "./components/StartupModal";
import TrashModal from "./components/TrashModal";
import ShortcutsModal from "./components/ShortcutsModal";
import ThemeModal from "./components/ThemeModal";
import DataModal from "./components/DataModal";
import SettingsModal from "./components/SettingsModal";
import Modal from "./components/common/Modal";
import { useTxStore } from "./store/useTxStore";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import type { TimeSlot } from "./types/transaction";
import { useToast } from "./hooks/useToast";
import { useTheme } from "./hooks/useTheme";
import {
  useReminderScan,
  useDeadlineNormalize,
  useToastSubscription,
} from "./hooks/useLifecycle";

// 侧边栏导航 key。
// inbox → InboxView；project → 专用 ProjectListView（树状）；next/waiting/someday → 通用 CategoryListView。
type ViewKey = "inbox" | "next" | "project" | "waiting" | "someday";

const NAV: { key: ViewKey; label: string }[] = [
  { key: "inbox", label: "Inbox" },
  { key: "next", label: "Next Actions" },
  { key: "project", label: "Projects" },
  { key: "waiting", label: "Waiting for" },
  { key: "someday", label: "Someday" },
];

export default function App() {
  const [view, setView] = useState<ViewKey>("inbox");
  // 0.1.19：记住 Next 视图当前展开的时段，切走再切回时恢复（默认「早」，不重置）
  const [openSlot, setOpenSlot] = useState<TimeSlot | null>("morning");
  const [trashOpen, setTrashOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // 0.1.13：快捷键弹窗 / 开机自启动开关 / 操作提示 toast
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // 0.1.20：主题弹窗 / 数据管理弹窗
  const [themeOpen, setThemeOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  // 0.2.0：导入确认弹窗的元信息（选文件后回填，确认再真正导入）
  const [importMeta, setImportMeta] = useState<{
    path: string;
    exported_at: string | null;
    count: number;
    latest_updated: string | null;
  } | null>(null);
  // 0.2.0：清空数据二次确认弹窗
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  // 0.2.0：设置弹窗（聚合所有开关类设置：开机自启动 / 勾选提示音…）
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autostart, setAutostart] = useState(false);
  // 0.2.0：勾选提示音开关（纯前端偏好，默认开启，存 localStorage）
  const [checkSoundOn, setCheckSoundOn] = useState(true);
  // 0.2.0：关闭确认框（窗口可见时弹，问「托盘 / 退出」）。dontAskAgain 即「不再提示」。
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  // 0.1.16：每次启动弹「今天」介绍弹窗（开发刷新也会弹）
  const [startupOpen, setStartupOpen] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const loadActive = useTxStore((s) => s.loadActive);
  const loadInbox = useTxStore((s) => s.loadInbox);
  const loadTrash = useTxStore((s) => s.loadTrash);
  const checkReminders = useTxStore((s) => s.checkReminders);
  const normalizeDeadlines = useTxStore((s) => s.normalizeDeadlines);

  // 0.1.19：toast / 主题 / 提醒扫描 / deadline 归一 抽离为独立 hook，降低 App 体积。
  const { toast, toastAction, showToast } = useToast();
  const { theme, chooseTheme } = useTheme();
  useReminderScan(checkReminders);
  useDeadlineNormalize(normalizeDeadlines);
  useToastSubscription(showToast);

  // 挂载：预拉取 active；请求通知权限。
  useEffect(() => {
    loadActive();
    (async () => {
      try {
        let granted = await isPermissionGranted();
        if (!granted) {
          const res = await requestPermission();
          granted = res === "granted";
        }
      } catch {
        /* 非 Tauri 环境（浏览器）忽略 */
      }
    })();
  }, [loadActive]);

  // 0.2.0：后端拦截 X 关闭后 emit "window-close-requested"（此时窗口仍可见、未被隐藏）。
  // 若已「不再提示」→ 按记住的默认（托盘/退出）直接 invoke 执行；
  // 否则弹模态确认框，由用户选择后再 invoke 对应命令。
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        unlisten = await listen("window-close-requested", () => {
          let dismissed = false;
          let choice = "tray";
          try {
            dismissed = localStorage.getItem("nowtree_tray_hint_dismissed") === "1";
            choice = localStorage.getItem("nowtree_tray_choice") || "tray";
          } catch { /* ignore */ }
          if (dismissed) {
            if (choice === "exit") invoke("quit_app");
            else invoke("minimize_to_tray");
            return;
          }
          setCloseConfirm(true);
        });
      } catch { /* 非 Tauri 环境（浏览器）忽略 */ }
    })();
    return () => { unlisten?.(); };
  }, []);

  // 关闭确认框：用户明确选择「最小化到托盘」或「退出」；勾了「不再提示」则记住该选择。
  const chooseClose = (action: "tray" | "exit") => {
    if (dontAskAgain) {
      try {
        localStorage.setItem("nowtree_tray_hint_dismissed", "1");
        localStorage.setItem("nowtree_tray_choice", action);
      } catch { /* ignore */ }
    }
    setCloseConfirm(false);
    setDontAskAgain(false);
    invoke(action === "exit" ? "quit_app" : "minimize_to_tray");
  };

  // 0.1.13：进入时读取开机自启动状态（非 Tauri 环境静默忽略）
  useEffect(() => {
    (async () => {
      try {
        const ok = await invoke<boolean>("get_autostart");
        setAutostart(ok);
      } catch {
        /* 浏览器 / 插件未就绪：保持 false */
      }
    })();
  }, []);

  // 0.2.0：进入时读取勾选提示音开关（localStorage，默认开启）
  useEffect(() => {
    try {
      setCheckSoundOn(localStorage.getItem("nowtree_check_sound") !== "off");
    } catch {
      /* localStorage 不可用：保持默认开启 */
    }
  }, []);

  // 0.1.13：点击左下角菜单外部区域自动关闭菜单
  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        menuBtnRef.current && !menuBtnRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [menuOpen]);

  // 当前是否处于开发模式（tauri dev / Vite dev server）。
  // release 版本该值为 false，前端内嵌在 exe 中；dev 版本为 true，依赖 localhost:1420。
  const isDev = import.meta.env.DEV;

  // 0.1.13：数据导出 / 导入（经 Rust 命令调用系统文件选择器）
  async function handleExport() {
    try {
      const res = await invoke<string>("export_data");
      showToast(res === "cancelled" ? "已取消导出" : "数据已导出");
    } catch (e) {
      showToast("导出失败：" + (e as Error).message);
      return; // 失败保持窗口以便重试
    }
    setDataOpen(false); // 0.2.0：完成后自动关闭数据管理窗口
  }
  async function handleImport() {
    try {
      // 0.2.0：两步走——先选文件读元信息，关闭数据窗后弹确认框显示「哪天备份 / 多少条」，
      // 用户确认后再真正导入（避免误覆盖当前数据）。
      const meta = await invoke<{
        path: string;
        exported_at: string | null;
        count: number;
        latest_updated: string | null;
      } | null>("read_backup_meta");
      if (!meta) {
        showToast("已取消导入");
        setDataOpen(false);
        return;
      }
      setDataOpen(false);
      setImportMeta(meta);
    } catch (e) {
      showToast("读取备份失败：" + (e as Error).message);
    }
  }
  async function confirmImport() {
    if (!importMeta) return;
    try {
      const res = await invoke<string>("import_data", { path: importMeta.path });
      await Promise.all([loadActive(), loadInbox(), loadTrash()]);
      const m = res.match(/(\d+)/);
      showToast(`成功导入 ${m ? m[1] : "?"} 条事务`);
    } catch (e) {
      showToast("导入失败：" + (e as Error).message);
    } finally {
      setImportMeta(null);
    }
  }
  async function confirmReset() {
    try {
      await invoke("reset_all_data");
      await Promise.all([loadActive(), loadInbox(), loadTrash()]);
      showToast("已清空所有数据");
    } catch (e) {
      showToast("清空失败：" + (e as Error).message);
    } finally {
      setResetConfirmOpen(false);
      setDataOpen(false);
    }
  }
  async function toggleAutostart() {
    // 开发模式完全禁止修改自启动：dev 二进制指向 localhost:1420，且会与 release
    // 共用同一注册表键（productName 均为 NowTree）。在 dev 中「开启」会指向坏掉的
    // dev 二进制导致白屏；在 dev 中「关闭」会误删 release 已注册的自启动。
    // 因此 dev 版对自启动只读，统一由 release 版本（nowtree.exe）管理。
    if (isDev) {
      showToast("开发模式不能修改自启动，请在 release 版本（nowtree.exe）中设置");
      return;
    }
    try {
      const next = !autostart;
      const ok = await invoke<boolean>("set_autostart", { enable: next });
      setAutostart(ok);
      showToast(ok ? "已开启开机自启动" : "已关闭开机自启动");
    } catch (e) {
      showToast("自启动设置失败：" + (e as Error).message);
    }
  }

  // 0.2.0：切换勾选提示音（仅写 localStorage，无需 Rust）
  function toggleCheckSound() {
    const next = !checkSoundOn;
    setCheckSoundOn(next);
    try {
      localStorage.setItem("nowtree_check_sound", next ? "on" : "off");
    } catch {
      /* 忽略存储异常 */
    }
  }

  // 快捷键：1-5 切换视图；Enter 打开当前视图的加号（nowtree:quick-add 由各视图监听）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing =
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.tagName === "BUTTON" ||
          el.isContentEditable);
      const hasModal = !!document.querySelector(".modal-overlay");
      const blocked = typing || hasModal;
      if (blocked) {
        // 0.1.20：无弹窗且焦点落在按钮上（如保存后焦点回落到 FAB / 编辑按钮）时，
        // 回车既会触发全局「新增」，又会默认「点击该按钮」。这里拦截其默认点击行为，
        // 杜绝「保存后回车又弹出新增」的连锁反应；弹窗内（hasModal）则放行按钮默认点击，
        // 保证在弹窗里 Tab 到「保存」按钮按回车仍能正常保存。
        if (!hasModal && el?.tagName === "BUTTON" && e.key === "Enter") {
          e.preventDefault();
        }
        return;
      }

      const map: Record<string, ViewKey> = {
        "1": "inbox",
        "2": "next",
        "3": "project",
        "4": "waiting",
        "5": "someday",
      };
      const v = map[e.key];
      if (v) {
        setView(v);
        // 0.2.0：数字键切换视图后，把当前焦点（鼠标点过的 nav-item）失焦，
        // 避免浏览器因键盘操作点亮 :focus-visible 环、残留绿框。
        if (el && el !== document.body) el.blur();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("nowtree:quick-add"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">NowTree</div>
        <nav className="nav">
          {NAV.map((n) => (
            <a
              key={n.key}
              data-cat={n.key}
              className={`nav-item ${view === n.key ? "active" : ""}`}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setView(n.key);
              }}
            >
              {n.label}
            </a>
          ))}
        </nav>

        {/* 左下角下拉：回收站 / 主题 / 版本信息 */}
        <div className="side-drop">
          <button
            ref={menuBtnRef}
            className="side-drop-btn"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span>☰ 菜单</span>
            <span className="side-drop-caret">{menuOpen ? "▴" : "▾"}</span>
          </button>
          {menuOpen && (
            <div ref={menuRef} className="side-menu">
              <button
                className="side-menu-item"
                onClick={() => {
                  setTrashOpen(true);
                  setMenuOpen(false);
                }}
              >
                🗑 回收站
              </button>
              <button
                className="side-menu-item"
                onClick={() => {
                  setShortcutsOpen(true);
                  setMenuOpen(false);
                }}
              >
                ⌨ 快捷键
              </button>
              <div className="side-menu-sep" />
              <button
                className="side-menu-item"
                onClick={() => {
                  setThemeOpen(true);
                  setMenuOpen(false);
                }}
              >
                🎨 主题
              </button>
              <button
                className="side-menu-item"
                onClick={() => {
                  setDataOpen(true);
                  setMenuOpen(false);
                }}
              >
                💾 数据管理
              </button>
              <button
                className="side-menu-item"
                onClick={() => {
                  setSettingsOpen(true);
                  setMenuOpen(false);
                }}
              >
                ⚙ 设置
              </button>
              <div className="side-menu-sep" />
              <div className="side-menu-motto">种一棵树最好的时间是十年前，其次是现在</div>
              <div className="side-menu-version">v1.0.0 · 本地 SQLite</div>
            </div>
          )}
        </div>
      </aside>
      <main className="content">
        {view === "inbox" && <InboxView />}
        {view === "next" && (
          <NextView openSlot={openSlot} setOpenSlot={setOpenSlot} />
        )}
        {view === "project" && <ProjectListView />}
        {view === "waiting" && <CategoryListView category="waiting" />}
        {view === "someday" && <CategoryListView category="someday" />}
      </main>

      {trashOpen && <TrashModal onClose={() => setTrashOpen(false)} />}
      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}
      {themeOpen && (
        <ThemeModal theme={theme} onChoose={chooseTheme} onClose={() => setThemeOpen(false)} />
      )}
      {dataOpen && (
        <DataModal
          onExport={handleExport}
          onImport={handleImport}
          onReset={() => setResetConfirmOpen(true)}
          onClose={() => setDataOpen(false)}
        />
      )}
      {resetConfirmOpen && (
        <Modal title="确认清空所有数据" onClose={() => setResetConfirmOpen(false)}>
          <div className="close-confirm">
            <p className="close-confirm-tip">
              此操作将<strong>永久删除所有事务</strong>，包括 Inbox、Next Actions、Projects、Waiting、Someday 和回收站中的内容。
            </p>
            <p className="muted close-confirm-tip">
              删除后无法恢复；若还需要保留记录，请先导出备份。
            </p>
            <p className="muted close-confirm-tip" style={{ fontSize: 12 }}>
              数据文件位置：C:\Users\你\AppData\Roaming\com.nowtree.app\nowtree.sqlite
            </p>
            <div className="close-confirm-actions">
              <button type="button" className="btn-ghost" onClick={() => setResetConfirmOpen(false)}>
                取消
              </button>
              <button type="button" className="btn-danger" onClick={confirmReset}>
                确认清空
              </button>
            </div>
          </div>
        </Modal>
      )}
      {importMeta && (
        <Modal title="确认导入备份" onClose={() => setImportMeta(null)}>
          <div className="close-confirm">
            <p className="close-confirm-tip">
              此备份{importMeta.exported_at
                ? `生成于 ${new Date(importMeta.exported_at).toLocaleString("zh-CN")}`
                : importMeta.latest_updated
                  ? `最新记录时间为 ${new Date(importMeta.latest_updated).toLocaleString("zh-CN")}（旧版无备份日期）`
                  : "日期未知"}
              ，含 <strong>{importMeta.count}</strong> 条事务。
            </p>
            <p className="muted close-confirm-tip">
              导入将以备份内容<strong>覆盖当前全部数据</strong>，且不可撤销。
            </p>
            <div className="close-confirm-actions">
              <button type="button" className="btn-ghost" onClick={() => setImportMeta(null)}>
                取消
              </button>
              <button type="button" className="btn-danger" onClick={confirmImport}>
                确认导入
              </button>
            </div>
          </div>
        </Modal>
      )}
        {settingsOpen && (
          <SettingsModal
            autostart={autostart}
            onToggleAutostart={toggleAutostart}
            checkSoundOn={checkSoundOn}
            onToggleCheckSound={toggleCheckSound}
            isDev={isDev}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      {closeConfirm && (
        <Modal
          title="关闭 NowTree"
          onClose={() => { setCloseConfirm(false); setDontAskAgain(false); }}
        >
          <div className="close-confirm">
            <p className="close-confirm-tip">要最小化到托盘，还是退出程序？</p>
            <label className="close-confirm-ask">
              <input
                type="checkbox"
                checked={dontAskAgain}
                onChange={(e) => setDontAskAgain(e.target.checked)}
              />
              不再提示（按我选的默认执行）
            </label>
            <div className="close-confirm-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => chooseClose("tray")}
              >
                最小化到托盘
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => chooseClose("exit")}
              >
                退出
              </button>
            </div>
          </div>
        </Modal>
      )}
      {startupOpen && <StartupModal onClose={() => setStartupOpen(false)} />}
      {toast && (
        <div className="toast">
          <span>{toast}</span>
          {toastAction && (
            <button
              className="toast-action"
              type="button"
              onClick={() => toastAction.onClick()}
            >
              {toastAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
