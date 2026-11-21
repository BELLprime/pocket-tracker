export function parseChatMessage(rawText) {
  const text = String(rawText ?? '').trim();
  if (!text) return null;
  if (text === '/summary') return { command: 'summary' };
  if (text === '/undo') return { command: 'undo'};
  if (text === '/list') return { command: 'list'};
  
  const budgetMatch = text.match(/^(?:\/budget)\s+(\d+(?:\.\d{1,2})?)$/i);
  if (budgetMatch) {
    const limitBaht = Number(budgetMatch[1]);
    if (limitBaht >= 0) return { command: 'budget', limitBaht };
  }
  if (text.startsWith('/')) return {command: 'unknow'}; 
  const splitTxt = text.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
  if (splitTxt) {
    const title = splitTxt[1].trim();
    const amountBaht = Number(splitTxt[2]);
    if (title && amountBaht > 0) return { command: 'draft', title, amountBaht };
  }
  return { command: 'unknown' };
}

function isValidDateInt(txDate) {
  const s = String(txDate);
  if (!/^\d{8}$/.test(s)) return false;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() + 1 === m && dt.getUTCDate() === d;
}

export function validateTransactionInput({ title, amountBaht, type, txDate, categoryId } = {}) {
  if (!title || typeof title !== 'string' || !title.trim())
    return { valid: false, error: 'please type the title!' };
  if (Number.isNaN(Number(amountBaht)) || Number(amountBaht) <= 0)
    return { valid: false, error: 'amountBaht must > 0' };
  const typeInt = type !== undefined ? Number(type) : 1;
  if (![1, 2].includes(typeInt))
    return { valid: false, error: 'type of list must be 1(expend) or 2(income)' };
  if (txDate !== undefined && !isValidDateInt(txDate))
    return { valid: false, error: 'txDate must be a valid YYYYMMDD date' };
  if (categoryId !== undefined && categoryId !== null) {
    const catInt = Number(categoryId);
    const validCat = typeInt === 1 ? [1, 2, 3, 4].includes(catInt) : [5, 6].includes(catInt);
    if (!validCat) {
      return { valid: false, error: 'categoryId does not match transaction type' };
    }
  }
  return { valid: true };
}
