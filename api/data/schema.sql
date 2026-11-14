-- Setting SQLite Engine (Performance & Integrity Pragmas)
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;       -- (อ่าน-เขียนพร้อมกันได้เร็ว ไม่ล็อกทั้งไฟล์)
PRAGMA synchronous = NORMAL;     -- (ทำงานคู่กับ WAL ให้เขียนลงดิสก์เร็วขึ้นโดยข้อมูลไม่เสีย)
PRAGMA temp_store = MEMORY;      -- (ประมวลผล GROUP BY / ORDER BY ชั่วคราวใน RAM)

DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS monthly_budgets;
DROP TABLE IF EXISTS categories;

CREATE TABLE categories (
  id   INTEGER PRIMARY KEY,
  type INTEGER NOT NULL CHECK (type IN (1, 2)), 
  name TEXT NOT NULL UNIQUE
) STRICT;

CREATE TABLE transactions (
  id            INTEGER PRIMARY KEY,
  type          INTEGER NOT NULL CHECK (type IN (1, 2)),      -- 1 = รายจ่าย (expense), 2 = รายรับ (income)
  amount_satang INTEGER NOT NULL CHECK (amount_satang > 0),   -- เก็บเงินเป็น "สตางค์" เช่น 60.00 บาท = 6000
  title         TEXT NOT NULL,
  tx_date       INTEGER NOT NULL,                             -- YYYYMMDD 
  month_key     INTEGER NOT NULL,                             -- YYYYMM 
  category_id   INTEGER DEFAULT NULL,                         
  note          TEXT NOT NULL DEFAULT '',                     -- 🔌 
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER DEFAULT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) STRICT;

CREATE TABLE monthly_budgets (
  month_key           INTEGER PRIMARY KEY,
  budget_limit_satang INTEGER NOT NULL CHECK (budget_limit_satang >= 0),
  updated_at          INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE INDEX idx_tx_month_type ON transactions(month_key, type);
CREATE INDEX idx_tx_date ON transactions(tx_date DESC);

-- 🏷️ ข้อมูลหมวดหมู่เริ่มต้น (Seed Categories)
INSERT INTO categories (id, type, name) VALUES
  (1, 1, 'Food & Snack'),
  (2, 1, 'Transport'),
  (3, 1, 'Bills'),
  (4, 1, 'Other Expense'),
  (5, 2, 'Salary'),
  (6, 2, 'Other Income');