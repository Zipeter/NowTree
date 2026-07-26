CREATE TABLE IF NOT EXISTS transactions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT    NOT NULL,
  note            TEXT,
  category        TEXT,                       -- next_action|project|waiting|someday|NULL(Inbox)
  status          TEXT    NOT NULL DEFAULT 'inbox',   -- inbox|active|completed
  deadline_type   TEXT    NOT NULL DEFAULT 'none',   -- none|today|week|month|date
  deadline_date   TEXT,                        -- 仅 date 时填 YYYY-MM-DD
  priority        INTEGER,                     -- 1..5，可空
  created_time    TEXT    NOT NULL,           -- ISO 8601
  completed_time  TEXT,
  updated_time    TEXT,
  parent_id       INTEGER,                     -- -> transactions(id)
  show_in_next    INTEGER NOT NULL DEFAULT 0, -- 0/1
  deleted         INTEGER NOT NULL DEFAULT 0, -- 软删除
  order_index     INTEGER,
  reminder_time   TEXT,                        -- ISO 本地时间（datetime-local），到点弹窗
  reminder_done   INTEGER NOT NULL DEFAULT 0, -- 0/1，是否已弹过（避免重复）
  time_slot       TEXT NOT NULL DEFAULT 'none', -- none|morning|noon|evening（Next 三时段分配，0.1.16）
  sync_id         TEXT,                        -- 0.1.19：稳定全局唯一 ID（UUID），为将来多端同步铺路
  deleted_at      TEXT,                        -- 0.1.19：软删除时间戳（ISO8601），deleted=1 时记录何时删
  FOREIGN KEY (parent_id) REFERENCES transactions(id)
);

CREATE INDEX IF NOT EXISTS idx_tx_status     ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_tx_category   ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_tx_parent     ON transactions(parent_id);
CREATE INDEX IF NOT EXISTS idx_tx_status_cat ON transactions(status, category);
CREATE INDEX IF NOT EXISTS idx_tx_deleted    ON transactions(deleted);
