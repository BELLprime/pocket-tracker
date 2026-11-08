import app from './app.js';
import { config } from './config.js';
import { loadSeed } from './services/db.js';
import { startTelegramPolling } from './bot/telegramBot.js';

await loadSeed();

const HOST = process.env.HOST || '127.0.0.1';

app.listen(config.port, HOST, () => {
  console.log(`PocketTracker API running at http://${HOST}:${config.port} (Private Local Only)`);
  startTelegramPolling();
});
