use std::sync::Mutex;
use rusqlite::Connection;
use tauri::Manager;

// 薄封装：持有一个 SQLite 连接（用 Mutex 保证 Sync，供 Tauri State 共享）
pub struct Db(pub Mutex<Connection>);

impl Db {
    pub fn new(handle: &tauri::AppHandle) -> Result<Self, String> {
        let path = handle
            .path()
            .app_data_dir()
            .map_err(|e| e.to_string())?
            .join("nowtree.sqlite");
        // 确保父目录存在
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let conn = Connection::open(&path).map_err(|e| e.to_string())?;
        // 并发保护：dev 与 release exe 共享同一 DB 文件，rusqlite 默认无 busy 超时，
        // 双开时并发写会立刻抛 "database is locked" 导致清空/移动/软删偶发失败。
        // 设为等待而非立即报错，避免这类间歇性写锁错误。
        let _ = conn.execute_batch("PRAGMA busy_timeout = 3000;");
        Ok(Db(Mutex::new(conn)))
    }

    // 首次启动执行建表 DDL
    pub fn init(&self) -> Result<(), String> {
        let conn = self.0.lock().unwrap();
        conn.execute_batch(include_str!("schema.sql"))
            .map_err(|e| e.to_string())?;
        // 迁移：老库可能缺新列，补齐（列已存在时 ALTER 报错，忽略即可）
        let _ = conn.execute("ALTER TABLE transactions ADD COLUMN reminder_time TEXT", []);
        let _ = conn.execute(
            "ALTER TABLE transactions ADD COLUMN reminder_done INTEGER NOT NULL DEFAULT 0",
            [],
        );
        let _ = conn.execute(
            "ALTER TABLE transactions ADD COLUMN time_slot TEXT NOT NULL DEFAULT 'none'",
            [],
        );
        // 0.1.19：补齐 sync_id / deleted_at（老库无这两列时 ALTER 加上）。
        let _ = conn.execute("ALTER TABLE transactions ADD COLUMN sync_id TEXT", []);
        let _ = conn.execute("ALTER TABLE transactions ADD COLUMN deleted_at TEXT", []);
        // 0.1.19：为历史数据补 sync_id（未来多端同步需要稳定全局唯一 ID）。
        // 仅对 sync_id IS NULL 的行补，已是 UUID 的不动；一行一个独立 UUID。
        let ids: Vec<i64> = {
            let mut stmt = conn
                .prepare("SELECT id FROM transactions WHERE sync_id IS NULL")
                .map_err(|e| e.to_string())?;
            let rows = stmt.query_map([], |r| r.get::<_, i64>(0)).map_err(|e| e.to_string())?;
            let mut v = Vec::new();
            for r in rows {
                v.push(r.map_err(|e| e.to_string())?);
            }
            v
        };
        for id in ids {
            let sid = uuid::Uuid::new_v4().to_string();
            conn
                .execute(
                    "UPDATE transactions SET sync_id = ?1 WHERE id = ?2",
                    (&sid, id),
                )
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}
