import { error } from "node:console";

export function parseChatMessage(rawText) {
  const text = String(rawText ?? '').trim();
  if (!text) return null;
  if (text === '/summary') return { command: 'summary' };
  
  const budgetMatch = text.match(/^(?:\/budget)\s+(\d+(?:\.\d+)?)$/i);
  if (budgetMatch) {
    const limitBaht = Number(budgetMatch[1]);
    if (limitBaht >= 0) return { command: 'budget', limitBaht };
  }

  const splitTxt = text.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
  if (splitTxt) {
    const title = splitTxt[1].trim();
    const amountBaht = Number(splitTxt[2]);
    if (title && amountBaht > 0) return { command: 'draft', title, amountBaht };
  }
  return { command: 'unknown' };
}

export function validateTransactionInput({ title, amountBaht, type, txDate } = {}) {
  if (!title || typeof title!=='string' || !title.trim()) 
    return {valid: false,error: 'please type the title!'}
  if (Number.isNaN(Number(amountBaht)) || Number(amountBaht) <= 0)
    return {valid: false,error: 'amountBaht must > 0'}
  if (type !== undefined && ![1,2].includes(Number(type)))
    return {valid: false,error: 'type of list must be 1(expend) or 2(income)'}
  return { valid: true };
}
