import * as transactionService from '../services/transactionService.js';

// GET /api/transactions?monthKey=202611&type=1
export async function getAllTransactions(req, res) {
  const { monthKey, type } = req.query;
  const items = await transactionService.findAll({ monthKey, type });
  return res.status(200).json(items);
}
// GET /api/transactions/summary?monthKey=202611
export async function getMonthlySummary(req, res) {
  const summary = await transactionService.getMonthlySummary(req.query.monthKey);
  return res.status(200).json(summary);
}
// POST /api/transactions
export async function createTransaction(req, res) {
  const created = await transactionService.create(req.body);
  return res.status(201).json(created);
}
// DELETE /api/transactions/:id
export async function deleteTransaction(req, res) {
  const removed = await transactionService.remove(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Transaction not found' });
  return res.status(204).send();
}