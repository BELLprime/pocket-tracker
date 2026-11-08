import { validateTransactionInput } from '../validators/transactionValidator.js';

// ============================================================================
// 🛡️ Middleware: validateTransaction.js
//  validators/transactionValidator.js
// ============================================================================

export function validateTransaction(req, res, next) {
  const result = validateTransactionInput(req.body);
  if (!result.valid) {
    return res.status(400).json({ error: result.error });
  }
  next();
}
