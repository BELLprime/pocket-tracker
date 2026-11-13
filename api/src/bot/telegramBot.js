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

export async function handleIncomingText(text, chatUserId) {
  if (config.allowedTelegramIds && String(chatUserId) !== String(config.allowedTelegramIds)) {
    return { text: '!!Access denied. Owner only.' };
  }
  const parsed = parseChatMessage(text);
  if (!parsed) return null;
  if (parsed.command === 'draft') {
    pendingDrafts.set(String(chatUserId), {
      title: parsed.title, amountBaht: parsed.amountBaht, type: null
    });
    return {
      text: `List: ${parsed.title}\n Amount: ${parsed.amountBaht} ฿\n\nChoose type of list:`,
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
    // ถ้ามีการตั้งงบไว้ ให้แสดงสถานะงบเพิ่ม
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
    return { text: `↩"${undo.title}" (${transactionService.satangToBaht(undo.amountSatang)} ฿) → (Undo success.)` };
  }
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
    const typeLabel = draft.type === 1 ? 'Expense' : 'Income';
    return {
      text: `📋 Confirm to save?\n• ${draft.title} (${draft.amountBaht} ฿)\n• Type: ${typeLabel}`,
      replyMarkup: CONFIRM_KEYBOARD
    };
  }

  if (action === 'back_type') {
    draft.type = null;
    return {
      text: `📝 List: ${draft.title} (${draft.amountBaht} ฿)\nchoose type of list:`,
      replyMarkup: TYPE_SELECTION_KEYBOARD
    };
  }

   if (action === 'confirm' && draft.type) {
    const created = await transactionService.create(draft);
    pendingDrafts.delete(userKey);
    const isExpend  = Number(created.type) === 1;
    const typeLabel = isExpend ? '🔴 Expense' : '🟢 Income';
    const gifUrl = isExpend? 'https://media.tenor.com/WuVVP5QKTsYAAAAM/well-there%27s-nothing-we-can-do-napoleon.gif'
                           : 'https://media.tenor.com/X4H0T0VxgokAAAAM/robert-redford-robert.gif';
    return {
      text: `✅ Saved! (#${created.id})\n${typeLabel}: ${created.title} (${draft.amountBaht} ฿)`,
      gifUrl
    };
  }
  return { text: 'Please select an option below.↓' };
}

// Telegram Bot API 
export function startTelegramPolling() {
  if (!config.telegramBotToken) {
    console.log('[Telegram Bot] ยังไม่ได้ตั้งค่า TELEGRAM_BOT_TOKEN ใน .env');
    return;
  }

  const baseUrl = `https://api.telegram.org/bot${config.telegramBotToken}`;
  fetch(`${baseUrl}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commands: [
        { command: 'summary', description: 'Summary this month' },
        { command: 'budget', description: 'Set budget (e.g. /budget 5000)' },
        { command: 'undo', description: 'Undo latest transaction' }
      ]
    })
  }).catch((err) => console.error('Failed to set bot commands:', err));

  let offset = 0;
  console.log('[Telegram Bot] เริ่มต้นรอรับข้อความและการกดปุ่มจากมือถือ...');

  async function poll() {
    try {
      const res = await fetch(`${baseUrl}/getUpdates?offset=${offset}&timeout=25`);
      const data = await res.json();
      if (data?.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          //normal input message
          if (update.message?.text && update.message?.chat) {
            const msg = update.message;
            const senderId = msg.from?.id ?? msg.chat.id;
            if (!config.allowedTelegramIds) {
              console.log(`[Security Hint] Your Telegram Chat ID is: ${senderId} (Add ALLOWED_TELEGRAM_IDS=${senderId} in .env to lock bot)`);
            }
            const response = await handleIncomingText(msg.text, senderId);
            if (response?.text) {
              await fetch(`${baseUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: msg.chat.id,
                  text: response.text,
                  reply_markup: response.replyMarkup
                })
              });
            }
          }
          // 2: Inline Keyboard (callback_query)
          if (update.callback_query) {
            const cq = update.callback_query;
            const chatId = cq.message?.chat?.id;
            const messageId = cq.message?.message_id;
            const userId = cq.from?.id ?? chatId;
            const response = await handleCallbackQuery(cq.data, userId);

            await Promise.all([
              fetch(`${baseUrl}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: cq.id })
              }),
              // edit / change
              chatId && messageId && response?.text
                ? fetch(`${baseUrl}/editMessageText`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: chatId,
                      message_id: messageId,
                      text: response.text,
                      reply_markup: response.replyMarkup
                    })
                  })
                : null,
              //gif
              chatId && response?.gifUrl
                ? fetch(`${baseUrl}/sendAnimation`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: chatId,
                      animation: response.gifUrl
                    })
                  })
                : null
            ]);
          }
        }
      }
    } catch {
      await new Promise((r) => setTimeout(r, 3000));
    }
    setImmediate(poll);
  }
  poll();
}