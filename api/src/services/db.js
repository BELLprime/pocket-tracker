import { createClient } from '@libsql/client';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

export let db;

export async function loadSeed() {
  if (config.isProd && !config.tursoUrl) 
    throw new Error('Production requires TURSO_DATABASE_URL (refusing to use ephemeral local file)');
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

  if (existsSync(config.schemaFile)) {
    const rawSql = readFileSync(config.schemaFile, 'utf8');
    const cleanSql = rawSql
      .split('\n')
      .filter((line) => !line.trim().toUpperCase().startsWith('PRAGMA '))
      .join('\n');
    if (cleanSql.trim()) {
      await db.executeMultiple(cleanSql);
    }
  }
}

export function getDb() {
  if (!db) throw new Error('call loadSeed() first!');
  return db;
}