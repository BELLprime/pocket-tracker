//config.js — โหลดไฟล์ .env และรวมการอ่าน environment variable ไว้ที่เดียว
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API_ROOT = path.resolve(HERE, '..');
const PROJECT_ROOT = path.resolve(API_ROOT, '..');

dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 4000),
  dbFile: process.env.DB_PATH
    ? path.resolve(process.cwd(), process.env.DB_PATH)
    : path.join(API_ROOT, 'data', 'pocket.db'),
  schemaFile: path.join(API_ROOT, 'data', 'schema.sql'),
  telegramBotToken: (process.env.TELEGRAM_BOT_TOKEN ?? '').trim(),
  allowedTelegramIds: (process.env.ALLOWED_TELEGRAM_IDS ?? '').trim()
};
