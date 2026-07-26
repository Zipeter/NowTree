#!/usr/bin/env python3
# NowTree 数据层回归自检脚本（只读，绝不修改数据库）
#
# 用法（在项目根目录执行）：
#   python scripts/regression_db.py
#
# 作用：自动检查 SQLite 数据完整性，供发布前 / 日常自查。
# 输出带 ✅ / ⚠️ / ❌ 标记，方便一眼评估。
import os
import sqlite3


def find_db():
    candidates = [
        os.path.expandvars(r"%APPDATA%\com.nowtree.app\nowtree.sqlite"),
        os.path.expanduser("~/AppData/Roaming/com.nowtree.app/nowtree.sqlite"),
        os.path.expanduser("~/Library/Application Support/com.nowtree.app/nowtree.sqlite"),
        os.path.expanduser("~/.local/share/com.nowtree.app/nowtree.sqlite"),
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return c
    return None


def main():
    db = find_db()
    print("=" * 52)
    print("NowTree 数据层回归自检（只读）")
    print("=" * 52)
    if not db:
        print("❌ 未找到 nowtree.sqlite（首次运行 / 未在 Tauri 中启动过？）")
        return
    print(f"📍 数据库：{db}")

    con = sqlite3.connect(db)
    cur = con.cursor()
    try:
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cur.fetchall()]
        print(f"📋 表：{tables}")
        if "transactions" not in tables:
            print("❌ 缺少 transactions 表")
            return

        cur.execute("SELECT status, count(*) FROM transactions GROUP BY status")
        dist = dict(cur.fetchall())
        total = sum(dist.values())
        print(f"\n— 状态分布（共 {total} 条）—")
        for s in ("inbox", "active", "completed"):
            print(f"  {s:<9}: {dist.get(s, 0)}")

        # completed_time 写入率（统计视图依赖）
        done = dist.get("completed", 0)
        cur.execute(
            "SELECT count(*) FROM transactions "
            "WHERE status='completed' AND completed_time IS NOT NULL AND completed_time != ''"
        )
        done_ok = cur.fetchone()[0]
        miss = done - done_ok
        print("\n— completed_time 写入（统计视图依赖）—")
        if done == 0:
            print("  ⚠️ 暂无已完成事务，无法验证（勾选完成后再跑一次）")
        elif miss == 0:
            print(f"  ✅ {done} 条已完成全部写入 completed_time")
        else:
            print(f"  ❌ {miss}/{done} 条已完成缺少 completed_time（统计会漏算）")

        # 数据一致性
        cur.execute(
            "SELECT count(*) FROM transactions "
            "WHERE status='inbox' AND completed_time IS NOT NULL"
        )
        bad = cur.fetchone()[0]
        print("\n— 数据一致性 —")
        print(f"  {'✅' if bad == 0 else '❌'} inbox 误带 completed_time：{bad}（应为 0）")

        cur.execute(
            "SELECT count(*) FROM transactions t "
            "WHERE t.parent_id IS NOT NULL AND t.parent_id != '' "
            "AND NOT EXISTS (SELECT 1 FROM transactions p WHERE p.id=t.parent_id)"
        )
        orph = cur.fetchone()[0]
        print(f"  {'✅' if orph == 0 else '❌'} 孤儿子事务：{orph}（应为 0，级联删除正常则 0）")

        # 软删除（回收站）统计，列名兼容
        try:
            cur.execute("SELECT count(*) FROM transactions WHERE deleted=1")
            soft = cur.fetchone()[0]
        except sqlite3.OperationalError:
            try:
                cur.execute("SELECT count(*) FROM transactions WHERE deleted_at IS NOT NULL")
                soft = cur.fetchone()[0]
            except sqlite3.OperationalError:
                soft = "N/A"
        print(f"  ℹ️ 软删除（回收站）事务：{soft}")

        print("\n" + "=" * 52)
        print("评估：全部 ✅ 即数据层健康，可放心推进；")
        print("出现 ❌ 请记录并反馈修复后再发布。")
        print("=" * 52)
    finally:
        con.close()


if __name__ == "__main__":
    main()
