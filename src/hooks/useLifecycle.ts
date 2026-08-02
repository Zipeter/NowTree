// App 挂载期的副作用集群（0.1.19 从 App 抽离）：
//  - useReminderScan：每 30 秒扫描到期提醒。
//  - useDeadlineNormalize：启动时立即归一 deadline，并每天 0 点再扫一次。
//  - useToastSubscription：订阅全局 toast 事件。
import { useEffect } from "react";
import { onToast } from "../toast";

// 提醒扫描周期（毫秒）：每 30 秒检查一次到期且未弹过的提醒。
export const REMINDER_SCAN_MS = 30000;

export function useReminderScan(checkReminders: () => void) {
  useEffect(() => {
    const timer = setInterval(() => {
      checkReminders();
    }, REMINDER_SCAN_MS);
    return () => clearInterval(timer);
  }, [checkReminders]);
}

export function useDeadlineNormalize(normalize: () => void) {
  useEffect(() => {
    let timeoutId: number;
    const schedule = () => {
      normalize();
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      const ms = next.getTime() - now.getTime();
      timeoutId = window.setTimeout(() => {
        normalize();
        schedule(); // 递归安排下一天
      }, ms);
    };
    schedule();
    return () => clearTimeout(timeoutId);
  }, [normalize]);
}

export function useToastSubscription(showToast: (m: string) => void) {
  useEffect(() => onToast(showToast), [showToast]);
}
