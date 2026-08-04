use serde::{Deserialize, Serialize};

// Rust 侧 Transaction 结构体，与前端 src/types/transaction.ts 字段一一对应
// 数据库列顺序固定，commands.rs 的 row_to_tx 依赖该顺序
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: i64,
    pub title: String,
    pub note: Option<String>,
    pub category: Option<String>,
    pub status: String,
    pub deadline_type: String,
    pub deadline_date: Option<String>,
    pub priority: Option<i64>,
    pub created_time: String,
    pub completed_time: Option<String>,
    pub updated_time: Option<String>,
    pub parent_id: Option<i64>,
    pub show_in_next: i64,
    pub deleted: i64,
    pub order_index: Option<i64>,
    pub reminder_time: Option<String>,
    pub reminder_done: i64,
    pub time_slot: String,
    pub sync_id: Option<String>,   // 0.1.19：稳定全局唯一 ID（UUID），为将来多端同步铺路
    pub deleted_at: Option<String>, // 0.1.19：软删除时间戳（ISO8601），deleted=1 时记录何时删
    pub wait_auto_next: i64, // 1.0.2：waiting 到期自动进 Next 后标记，避免重复触发
}
