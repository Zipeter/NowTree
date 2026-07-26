import { defineConfig } from "vitest/config";

// 单元测试配置（0.1.19）：纯逻辑（排序/日期/类别规则/拖拽几何）跑 node 环境即可；
// 需要真实 DOM 的用例可在此切到 environment: "jsdom"。
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
});
