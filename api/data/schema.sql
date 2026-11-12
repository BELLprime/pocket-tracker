-- Setting SQLite Engine (Performance & Integrity Pragmas)
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;       -- (อ่าน-เขียนพร้อมกันได้เร็ว ไม่ล็อกทั้งไฟล์)
PRAGMA synchronous = NORMAL;     -- (ทำงานคู่กับ WAL ให้เขียนลงดิสก์เร็วขึ้นโดยข้อมูลไม่เสีย)
PRAGMA temp_store = MEMORY;      -- (ประมวลผล GROUP BY / ORDER BY ชั่วคราวใน RAM)

DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS monthly_budgets;

CREATE TABLE transactions (
  id            INTEGER PRIMARY KEY,
  type          INTEGER NOT NULL CHECK (type IN (1, 2)),      -- 1 = รายจ่าย (expense), 2 = รายรับ (income)
  amount_satang INTEGER NOT NULL CHECK (amount_satang > 0),   -- เก็บเงินเป็น "สตางค์" เช่น 60.00 บาท = 6000
  title         TEXT NOT NULL,
  tx_date       INTEGER NOT NULL,                             -- YYYYMMDD 
  month_key     INTEGER NOT NULL,                             -- YYYYMM 
  note          TEXT NOT NULL DEFAULT '',                     -- 🔌 เผื่ออนาคตจดหมายเหตุเพิ่ม
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER DEFAULT NULL                         -- 🔌 เผื่ออนาคตแก้ไขรายการผ่านหน้าเว็บ
) STRICT;

CREATE TABLE monthly_budgets (
  month_key           INTEGER PRIMARY KEY,
  budget_limit_satang INTEGER NOT NULL CHECK (budget_limit_satang >= 0),
  updated_at          INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE INDEX idx_tx_month_type ON transactions(month_key, type);
CREATE INDEX idx_tx_date ON transactions(tx_date DESC);
