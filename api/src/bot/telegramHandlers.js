import * as transactionService from '../services/transactionService.js';
import { parseChatMessage } from '../validators/transactionValidator.js';
import { config } from '../config.js';

const pendingDrafts = new Map();

const TYPE_SELECTION_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '🔴 Expense', callback_data: 'type:1' },
      { text: '🟢 Income', callback_data: 'type:2' }
    ],
    [{ text: '❌ Cancel', callback_data: 'cancel' }]
  ]
};
const CONFIRM_KEYBOARD = {
  inline_keyboard: [
    [{ text: '✅ Confirm', callback_data: 'confirm' }],
    [
      { text: '🔄 Change', callback_data: 'back_type' },
      { text: '❌ Cancel', callback_data: 'cancel' }
    ]
  ]
};
function buildCategoryKeyboard(categories, type) {
  const filtered = categories.filter((c)=> c.type === type);
  const rows = [];
  for (let i = 0; i < filtered.length; i += 2) {
    rows.push(
      filtered.slice(i, i + 2).map((c)=>({
        text: c.name,
        callback_data: `cat:${c.id}`
      }))
    );
  }
  rows.push([
    {text:'🔄 Back', callback_data: 'back_type' },
    {text:'❌ Cancel', callback_data: 'cancel' }
  ]);
  return { inline_keyboard: rows };
}

export async function handleIncomingText(text, chatUserId) {
  if (config.allowedTelegramIds && String(chatUserId) !== String(config.allowedTelegramIds)) {
    return { text: '!!Access denied. Owner only.' };
  }
  const parsed = parseChatMessage(text);
  if (!parsed) return null;

  if (parsed.command === 'draft') {
    pendingDrafts.set(String(chatUserId), {
      title: parsed.title,
      amountBaht: parsed.amountBaht,
      type: null,
      categoryId: null
    });
    return {
      text: `List: ${parsed.title}\nAmount: ${parsed.amountBaht} ฿\n\nChoose type of list:`,
      replyMarkup: TYPE_SELECTION_KEYBOARD
    };
  }

  if (parsed.command === 'budget') {
    const b = await transactionService.setMonthlyBudget(parsed.limitBaht);
    return {
      text: `Set Budget for ${b.monthKey} successfully!\nLimit: ${b.budgetLimit.toLocaleString()} ฿`
    };
  }

  if (parsed.command === 'summary') {
    const s = await transactionService.getMonthlySummary();
    let text = `Summary ${s.monthKey}\n🟢 Income: +${s.totalIncome.toLocaleString()} ฿\n🔴 Expense: -${s.totalExpense.toLocaleString()} ฿\n💰 Balance: ${s.balance.toLocaleString()} ฿`;
    if (s.budgetLimit !== null) {
      const percentUsed = s.budgetLimit > 0 ? ((s.totalExpense / s.budgetLimit) * 100).toFixed(1) : 0;
      const status = s.budgetRemaining < 0 ? '❕❕❕❕' : '(¬‿¬)';
      text += `\n\n${status} Budget: ${s.totalExpense.toLocaleString()} / ${s.budgetLimit.toLocaleString()} ฿ (${percentUsed}%)`;
      if (s.budgetRemaining < 0) {
        text += `\nOver budget by ${Math.abs(s.budgetRemaining).toLocaleString()} ฿!`;
      } else {
        text += `\nRemaining: ${s.budgetRemaining.toLocaleString()} ฿`;
      }
    }
    return { text };
  }

  if (parsed.command === 'undo') {
    const undo = await transactionService.undoLastMessages();
    if (!undo) {
      return { text: 'List in this month is empty.' };
    }
    return {
      text: `↩"${undo.title}" (${transactionService.satangToBaht(undo.amountSatang)} ฿) → (Undo success.)`
    };
  }
  if (parsed.command === 'list') {
    const monthKey = transactionService.getCurrentMonthInt();
    const list = await transactionService.findAll({monthKey});
    if (list.length === 0) return { text: 'List in this month is empty.'};
    const rows = list.map((item, index) => {
      const sign = Number(item.type) === 1 ? '🔴 -' : '🟢 +';
      const baht = transactionService.satangToBaht(item.amountSatang).toLocaleString();
      const cat = item.categoryName ? ` [${item.categoryName}]` : '';
      return `${index + 1}. ${sign}${baht} ฿ — ${item.title}${cat}`;
    });
    const text = `List (${monthKey})\n` + rows.join('\n');
    return { text };
  }

  return { text: 'Send "<item> <amount>" (e.g., Snack 20) or /summary' };
}

export async function handleCallbackQuery(action, chatUserId) {
  const userKey = String(chatUserId);
  const draft = pendingDrafts.get(userKey);

  if (!draft) return { text: '!!Please,type list again.' };
  if (action === 'cancel') {
    pendingDrafts.delete(userKey);
    return { text: `Canceled "${draft.title}".` };
  }

  if (action === 'type:1' || action === 'type:2') {
    draft.type = action === 'type:1' ? 1 : 2;
    draft.categoryId = null;
    const categories = await transactionService.getCategories();
    const typeLabel = draft.type === 1 ? '🔴 Expense' : '🟢 Income';
    return {
      text: `📝 List: ${draft.title} (${draft.amountBaht} ฿)\n• Type: ${typeLabel}\n\n🏷️ Select category:`,
      replyMarkup: buildCategoryKeyboard(categories, draft.type)
    };
  }

  if (action.startsWith('cat:')) {
    const catId = Number(action.slice(4));
    const categories = await transactionService.getCategories();
    const matched = categories.find((c) => c.id === catId && c.type === draft.type);
    if (!matched) {
      return {
        text: `!!Invalid category for this type. Please select again:`,
        replyMarkup: buildCategoryKeyboard(categories, draft.type)
      };
    }
    draft.categoryId = matched.id;
    const typeLabel = draft.type === 1 ? 'Expense' : 'Income';
    return {
      text: `📋 Confirm to save?\n• ${draft.title} (${draft.amountBaht} ฿)\n• Type: ${typeLabel}\n• Category: ${matched.name}`,
      replyMarkup: CONFIRM_KEYBOARD
    };
  }

  if (action === 'back_type') {
    draft.type = null;
    draft.categoryId = null;
    return {
      text: `📝 List: ${draft.title} (${draft.amountBaht} ฿)\nchoose type of list:`,
      replyMarkup: TYPE_SELECTION_KEYBOARD
    };
  }

  if (action === 'confirm' && draft.type) {
    const created = await transactionService.create(draft);
    pendingDrafts.delete(userKey);
    const isExpend = Number(created.type) === 1;
    const typeLabel = isExpend ? '🔴 Expense' : '🟢 Income';
    const catLabel = created.categoryName ? ` [${created.categoryName}]` : '';
    const gifUrl = isExpend
      ? 'https://media.tenor.com/WuVVP5QKTsYAAAAM/well-there%27s-nothing-we-can-do-napoleon.gif'
      : 'https://media.tenor.com/X4H0T0VxgokAAAAM/robert-redford-robert.gif';
    return {
      text: `✅ Saved! (#${created.id})\n${typeLabel}${catLabel}: ${created.title} (${draft.amountBaht} ฿)`,
      gifUrl
    };
  }
  return { text: 'Please select an option below.↓' };
}
