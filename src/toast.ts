// 轻量全局 toast：任意组件 / 钩子可调用 showToast(msg)，
// 由 App 订阅 onToast 渲染（复用其底部 .toast 样式与自动消失逻辑）。
const TOAST_EVENT = "nowtree:toast";

export function showToast(msg: string) {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: msg }));
}

export function onToast(cb: (msg: string) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<string>).detail);
  window.addEventListener(TOAST_EVENT, handler);
  return () => window.removeEventListener(TOAST_EVENT, handler);
}
