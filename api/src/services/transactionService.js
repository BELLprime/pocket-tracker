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
export async function findAll({ monthKey, type } = {}) {
  let sql = `${SHAPE} WHERE 1=1`;
  const args = [];
  if (monthKey) {sql += ' AND t.month_key = ?'; args.push(Number(monthKey));}
  if (type) { sql += ' AND t.type = ?'; args.push(Number(type)); }
  sql += ' ORDER BY t.tx_date DESC, t.id DESC';
  const res = await getDb().execute({ sql, args });
  return res.rows;
}
export async function findById(id) {
  const res = await getDb().execute({
    sql: `${SHAPE} WHERE t.id = ?`,
    args: [Number(id)] 
  });
  return res.rows[0] ?? null;
}
//basic function (Table transactions)
export async function create(data) {
  const typeInt = Number(data.type ?? TX_TYPE.EXPENSE);
  const amountSatang = bahtToSatang(data.amountBaht);
  const txDate = data.txDate ? Number(data.txDate) : getTodayInt();
  const monthKey = Math.floor(txDate / 100);
  const result = await getDb().execute({
    sql: `
      INSERT INTO transactions (type, amount_satang, title, tx_date, month_key)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [typeInt, amountSatang, data.title.trim(), txDate, monthKey]
  });
  return await findById(Number(result.lastInsertRowid));
}
export async function getMonthlySummary(monthKey = getCurrentMonthInt()) {
  const list = await findAll({monthKey});
  const budget = await getMonthlyBudget(monthKey);
  let incomeSatang=0;
  let expenseSatang=0;

  for (const l of list) {
    if (Number(l.type) === TX_TYPE.INCOME) incomeSatang += Number(l.amountSatang);
    else expenseSatang += Number(l.amountSatang);
  }
  const totalIncome = satangToBaht(incomeSatang);
  const totalExpense = satangToBaht(expenseSatang);
  const budgetLimit = budget ? budget.budgetLimit : null;
  const budgetRemaining = budgetLimit !== null ? budgetLimit - totalExpense : null;
  return {
    monthKey: Number(monthKey),
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    transactionCount: list.length,
    budgetLimit,
    budgetRemaining
  };
}
export async function remove(id) {
  const existing = await findById(id);
  if (!existing) return null;
  await getDb().execute({
    sql: `DELETE FROM transactions WHERE id = ?`,
    args: [Number(id)]
  });
  return existing;
}

//(Table monthly_budgets)
export async function getMonthlyBudget(monthKey = getCurrentMonthInt()){
  const res = await getDb().execute({
    sql: `
      SELECT  month_key           AS monthKey,
              budget_limit_satang AS budgetLimitSatang,
              updated_at          AS updatedAt
      FROM monthly_budgets
      WHERE month_key = ? `,
    args:  [Number(monthKey)]
  });
  const row = res.rows[0];
  if (!row) return null;
  return {
    monthKey: Number(row.monthKey),
    budgetLimit: satangToBaht(row.budgetLimitSatang)
  }; 
}

export async function setMonthlyBudget(limitBaht,monthKey = getCurrentMonthInt()) {
  const limitSatang = bahtToSatang(limitBaht);
  await getDb().execute({
    sql:`
      INSERT INTO monthly_budgets (month_key,budget_limit_satang,updated_at)
      VALUES (?,?,unixepoch())
      ON CONFLICT(month_key) DO UPDATE SET
        budget_limit_satang = excluded.budget_limit_satang,
        updated_at = unixepoch()`,     //upsert 
    args: [Number(monthKey), limitSatang]
  });
  return await getMonthlyBudget(monthKey);
}