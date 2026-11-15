import * as transactionService from '../services/transactionService.js';

export async function getAllTransactions(req, res, next) {
  try {
    const { monthKey, type } = req.query;
    const items = await transactionService.findAll({ monthKey, type });
    return res.status(200).json(items);
  } catch (err) {
    next(err);
  }
}

export async function getMonthlySummary(req, res, next) {
  try {
    const summary = await transactionService.getMonthlySummary(req.query.monthKey);
    return res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
}

export async function createTransaction(req, res, next) {
  try {
    const created = await transactionService.create(req.body);
    return res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

export async function deleteTransaction(req, res, next) {
  try {
    const removed = await transactionService.remove(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Transaction not found' });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}