// 轻量 toast：显示一段时间后自动消失（0.1.19 从 App 抽离）。
// 返回当前文案、可选动作按钮与 showToast 派发函数，供各视图 / 拖拽钩子调用。
// 0.2.0：showToast 支持第二个参数 action（带按钮，如「不再提示」），带动作时停留更久方便点击。
import { useRef, useState } from "react";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const [toastAction, setToastAction] = useState<ToastAction | null>(null);
  const toastTimer = useRef<number | null>(null);

  function showToast(msg: string, action?: ToastAction) {
    setToast(msg);
    setToastAction(action ?? null);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    // 带动作时给更长停留（6s）方便点击；无动作 1.6s 自动消失。
    const delay = action ? 6000 : 1600;
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      setToastAction(null);
    }, delay);
  }

  return { toast, toastAction, showToast };
}
