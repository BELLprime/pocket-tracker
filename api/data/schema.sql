-- Setting SQLite Engine (Performance & Integrity Pragmas)
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;

CREATE TABLE IF NOT EXISTS categories (
  id        INTEGER PRIMARY KEY,
  type      INTEGER NOT NULL CHECK (type IN (1, 2)), -- 1 = Expense, 2 = Income
  name      TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE (id, type)
) STRICT;

CREATE TABLE IF NOT EXISTS transactions (
  id            INTEGER PRIMARY KEY,
  type          INTEGER NOT NULL CHECK (type IN (1, 2)),
  amount_satang INTEGER NOT NULL CHECK (amount_satang > 0),
  title         TEXT NOT NULL,
  tx_date       INTEGER NOT NULL,
  month_key     INTEGER NOT NULL,
  category_id   INTEGER DEFAULT NULL,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (category_id, type) REFERENCES categories(id, type) ON DELETE RESTRICT
) STRICT;

CREATE TABLE IF NOT EXISTS monthly_budgets (
  month_key           INTEGER PRIMARY KEY,
  budget_limit_satang INTEGER NOT NULL CHECK (budget_limit_satang >= 0),
  updated_at          INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE INDEX IF NOT EXISTS idx_tx_month_type ON transactions(month_key, type);
CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(tx_date);

-- Seed Categories (ปลอดภัย รันซ้ำได้ด้วย INSERT OR IGNORE)
INSERT OR IGNORE INTO categories (id, type, name) VALUES
  (1, 1, 'Food & Snack'),
  (2, 1, 'Transport'),
  (3, 1, 'Internet(ISP)'),
  (4, 1, 'Other Expense'),
  (5, 2, 'Salary'),
  (6, 2, 'Other Income');