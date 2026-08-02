// 通知能力抽成独立 seam（候选A）：store 不再直接依赖 @tauri-apps/plugin-notification，
// 统一经此发送。与数据层的 TransactionRepository 同构——将来可在 node 下用内存 adapter
// 验证「何时/通知了什么」，无需 mock 整个通知插件。
import { sendNotification } from "@tauri-apps/plugin-notification";

export async function notify(title: string, body: string): Promise<void> {
  await sendNotification({ title, body });
}
