import { config } from '../config.js';
import { handleIncomingText, handleCallbackQuery } from './telegramHandlers.js';

// Telegram Bot API Polling & Transport
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
  console.log('[Telegram Bot] Running...');

  async function poll() {
    try {
      const res = await fetch(`${baseUrl}/getUpdates?offset=${offset}&timeout=25`);
      const data = await res.json();
      if (data?.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;

          // 1: Normal text message
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
