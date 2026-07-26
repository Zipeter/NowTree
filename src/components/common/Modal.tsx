// 通用弹窗容器：遮罩 + 标题栏 + 关闭按钮 + children。
// 后续创建 / 编辑事务弹窗都复用它，避免重复遮罩与滚动锁逻辑。
import { useEffect } from "react";
import type { ReactNode, KeyboardEvent } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
}

export default function Modal({ title, onClose, children, onKeyDown }: ModalProps) {
  // 0.1.13：Esc 关闭当前弹窗（编辑 / 新增 / 整理 / 快捷键 / 回收站等）。
  // 批量转换模式下，ConvertModal 的 onClose 即「中断批量」，故 Esc 也会正确中断。
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          // 0.1.20：弹窗打开时，键盘事件不冒泡到 window。
          // 这样「回车」只会在弹窗内用于保存，绝不会被全局快捷键（打开 FAB 新增 / 数字切视图）拦截或冲突。
          // Esc 例外：放行给 window 上的 Esc 关闭逻辑。
          if (e.key === "Escape") return;
          e.stopPropagation();
        }}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="modal-body" onKeyDown={onKeyDown}>
          {children}
        </div>
      </div>
    </div>
  );
}
