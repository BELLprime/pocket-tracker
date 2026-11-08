import { Router } from 'express';
import * as transactionController from '../controllers/transactionController.js';
import { validateTransaction } from '../middleware/validateTransaction.js';

const router = Router();

router.get('/',transactionController.getAllTransactions);
router.get('/summary', transactionController.getMonthlySummary);
router.post('/', validateTransaction, transactionController.createTransaction);
router.delete('/:id',transactionController.deleteTransaction);

export default router;
