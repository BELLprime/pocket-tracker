import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import transactionRoutes from './routes/transactionRoutes.js';
import { config } from './config.js';
import { requireApiKey } from './middleware/requireApiKey.js';

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

app.use('/api/transactions',requireApiKey,transactionRoutes);
app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  console.error('[API Error]:', err.message);
  const message = status >= 500 && config.isProd ? 'Internal Server Error' : err.message;
  res.status(status).json({ error: message });
});
export default app;
