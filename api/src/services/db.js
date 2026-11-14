import { createClient } from '@libsql/client';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

export let db;

export async function loadSeed() {
  if (config.isProd && config.tursoUrl) {
    console.log('[DB] Connecting to Turso Cloud SQLite...');
    db = createClient({
      url: config.tursoUrl,
      authToken: config.tursoAuthToken
    });
  } else {
    console.log('[DB] Using local SQLite file:', config.dbFile);
    mkdirSync(path.dirname(config.dbFile), { recursive: true });
    db = createClient({
      url: `file:${config.dbFile}`
    });
  }

  await db.execute('PRAGMA foreign_keys = ON;');
  const check = await db.execute(
    "SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name='transactions'"
  );
  const ready = Number(check.rows[0]?.c ?? 0) > 0;

  if (!ready && existsSync(config.schemaFile)) {
    console.log('[DB] Initializing database tables from schema.sql...');
    const rawSql = readFileSync(config.schemaFile, 'utf8');
    const cleanSql = rawSql
      .split('\n')
      .filter((line) => !line.trim().toUpperCase().startsWith('PRAGMA '))
      .join('\n');
    if (cleanSql.trim()) {
      await db.executeMultiple(cleanSql);
    }
  } 
  else {
    await db.executeMultiple(`
      CREATE TABLE IF NOT EXISTS categories (
        id   INTEGER PRIMARY KEY,
        type INTEGER NOT NULL CHECK (type IN (1, 2)),
        name TEXT NOT NULL UNIQUE
      ) STRICT;
      INSERT OR IGNORE INTO categories (id, type, name) VALUES
        (1, 1, 'Food & Snack'),
        (2, 1, 'Transport'),
        (3, 1, 'Bills'),
        (4, 1, 'Other Expense'),
        (5, 2, 'Salary'),
        (6, 2, 'Other Income');
    `);
  }
}

export function getDb() {
  if (!db) throw new Error('call loadSeed() first!');
  return db;
}