import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import transactionRoutes from './routes/transactionRoutes.js';
import { handleIncomingText, handleCallbackQuery } from './bot/telegramHandlers.js';

const app = express();

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/api/bot/simulate', async (req, res) => {
  const { text, action, chatUserId = 'local-tester' } = req.body ?? {};
  if (action) {
    const response = await handleCallbackQuery(action, chatUserId);
    return res.status(200).json({ action, response });
  }
  const response = await handleIncomingText(text, chatUserId);
  return res.status(200).json({ input: text, response });
});

app.use('/api/transactions', transactionRoutes);

export default app;
