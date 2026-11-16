import app from './app.js';
import { config } from './config.js';
import { loadSeed } from './services/db.js';
import { startTelegramPolling } from './bot/telegramBot.js';

// Last-resort safety net: log instead of crashing the whole process
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

await loadSeed();

const HOST = process.env.HOST || '127.0.0.1';

app.listen(config.port, HOST, () => {
  console.log(`PocketTracker API running at http://${HOST}:${config.port} [${config.env}]`);
  startTelegramPolling();
});
