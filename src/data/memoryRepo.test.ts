import { describe, it, expect, beforeEach } from "vitest";
import { MemoryTransactionRepository } from "./memoryRepo";
import type { Transaction } from "../types/transaction";

function mk(repo: MemoryTransactionRepository, title: string, parentId: number | null = null): Promise<Transaction> {
  return repo.create({ title, parent_id: parentId });
}

describe("MemoryTransactionRepository 子树级联（0.1.21）", () => {
  let repo: MemoryTransactionRepository;
  let root: Transaction;
  let child: Transaction;
  let grandchild: Transaction;
  let leaf: Transaction; // root 的另一个叶子子项，无后代

  beforeEach(async () => {
    repo = new MemoryTransactionRepository();
    root = await mk(repo, "项目A");
    child = await mk(repo, "子1", root.id);
    grandchild = await mk(repo, "孙1", child.id);
    leaf = await mk(repo, "叶1", root.id);
  });

  it("软删除父项 → 整棵子树一起进回收站", async () => {
    await repo.softDelete(root.id);
    const trash = await repo.listDeleted();
    const ids = trash.map((t) => t.id).sort((a, b) => a - b);
    expect(ids).toEqual([root.id, child.id, grandchild.id, leaf.id].sort((a, b) => a - b));
    // 活着的列表里不应再出现它们
    const active = await repo.list({});
    expect(active.find((t) => t.id === root.id)).toBeUndefined();
  });

  it("恢复子项 → 整棵分支（祖先+后代）一起恢复", async () => {
    await repo.softDelete(root.id);
    // 只恢复「孙」节点，应连带恢复父与子
    await repo.restore(grandchild.id);
    const active = (await repo.list({})).map((t) => t.id).sort((a, b) => a - b);
    expect(active).toEqual([root.id, child.id, grandchild.id].sort((a, b) => a - b));
  });

  it("彻底删除父项 → 整棵子树一并物理移除", async () => {
    await repo.softDelete(root.id);
    await repo.purge(root.id);
    expect((await repo.list({})).length).toBe(0);
    expect((await repo.listDeleted()).length).toBe(0);
  });

  it("删除叶子子项不会连累父项目", async () => {
    await repo.softDelete(leaf.id);
    const trash = (await repo.listDeleted()).map((t) => t.id);
    expect(trash).toEqual([leaf.id]);
    const active = (await repo.list({})).map((t) => t.id).sort((a, b) => a - b);
    expect(active).toEqual([root.id, child.id, grandchild.id].sort((a, b) => a - b));
  });
});

// 1.0.1 回归：A3 修复——内存回退路径下 update / convertFromInbox 必须返回「全新对象」，
// 否则 React 因引用相等跳过重渲染，界面表现为「编辑/备注存不进去」。
describe("MemoryTransactionRepository A3 引用相等修复（1.0.1）", () => {
  let repo: MemoryTransactionRepository;
  let t: Transaction;

  beforeEach(async () => {
    repo = new MemoryTransactionRepository();
    t = await repo.create({ title: "原事务", note: "旧备注" });
  });

  it("update 返回新引用，且不污染旧引用", async () => {
    const before = t;
    const updated = await repo.update(t.id, { note: "新备注" });
    expect(updated).not.toBe(before); // 必须返回全新对象
    expect(before.note).toBe("旧备注"); // 旧引用不应被原地改写
    expect(updated.note).toBe("新备注");
    expect(updated.id).toBe(t.id);
    expect(updated.updated_time).toBeTruthy();
  });

  it("convertFromInbox 返回新引用，旧引用保持 inbox 状态", async () => {
    const inbox = await repo.create({ title: "灵感", status: "inbox" });
    const before = inbox;
    const converted = await repo.convertFromInbox(inbox.id, {
      title: "正式事务",
      category: "next_action",
    });
    expect(converted).not.toBe(before); // 必须返回全新对象
    expect(converted.status).toBe("active");
    expect(before.status).toBe("inbox"); // 旧引用未被污染
    expect(converted.id).toBe(inbox.id);
  });
});
