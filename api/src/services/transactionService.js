import { getDb } from './db.js';
export const TX_TYPE = {
  EXPENSE: 1,
  INCOME: 2
};

//util funtion
export function getTodayInt() { //INTEGER: YYYYMMDD
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}
export function getCurrentMonthInt() {
  const now = new Date();
  return now.getFullYear() * 100 + (now.getMonth() + 1);
}
export function bahtToSatang(baht) {
  return Math.round(Number(baht) * 100);
}
export function satangToBaht(satang) {
  return Number(satang || 0) / 100;
}

const SHAPE = `
      SELECT  t.id, t.type, t.amount_satang   AS amountSatang,
              t.title, t.tx_date              AS txDate,
              t.month_key                     AS monthKey, 
              t.created_at                    AS createdAt
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id`;
export function findAll({ monthKey, type } = {}) {
  let sql = `${SHAPE} WHERE 1=1`;
  const params = [];
  if (monthKey) {sql += ' AND t.month_key = ?'; params.push(Number(monthKey));}
  if (type) { sql += ' AND t.type = ?'; params.push(Number(type)); }
  sql += ' ORDER BY t.tx_date DESC, t.id DESC';
  return getDb().prepare(`${sql}`).all(...params);
}
export function findById(id) {
  return getDb().prepare(`${SHAPE} WHERE t.id = ?`).get(Number(id)) ?? null;
}
//basic function
export function create(data) {
  const typeInt = Number(data.type ?? TX_TYPE.EXPENSE);
  const amountSatang = bahtToSatang(data.amountBaht);
  const txDate = data.txDate ? Number(data.txDate) : getTodayInt();
  const monthKey = Math.floor(txDate / 100);
  const result = getDb().prepare(`
    INSERT INTO transactions (type, amount_satang, title, tx_date, month_key)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    typeInt, 
    amountSatang, 
    data.title.trim(), 
    txDate, 
    monthKey
  );
  return findById(result.lastInsertRowid);
}
export function getMonthlySummary(monthKey = getCurrentMonthInt()) {
  const list = findAll({monthKey});
  let incomeSatang=0;
  let expenseSatang=0;

  for (const l of list) {
    if (l.type === TX_TYPE.INCOME) incomeSatang += l.amountSatang;
    else expenseSatang += l.amountSatang;
  }
  const totalIncome = satangToBaht(incomeSatang);
  const totalExpense = satangToBaht(expenseSatang);
  return {
    monthKey: Number(monthKey),
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    transactionCount: list.length
  };
}
export function remove(id) {
  const existing = findById(id);
  if (!existing) return null;
  getDb().prepare(`DELETE FROM transactions WHERE id = ?`).run(Number(id));
  return existing;
}
