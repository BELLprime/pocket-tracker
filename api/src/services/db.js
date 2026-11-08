import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

export let db;

export async function loadSeed() {
  mkdirSync(path.dirname(config.dbFile), { recursive: true });
  db = new DatabaseSync(config.dbFile);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA temp_store = MEMORY;
  `);
  const ready = db
    .prepare("SELECT COUNT(*) c FROM sqlite_master WHERE type='table' AND name='transactions'")
    .get().c;
  if (!ready && existsSync(config.schemaFile)) {
    const sql = readFileSync(config.schemaFile, 'utf8');
    if (sql.trim()) {
      db.exec(sql);
    }
  }
}

export function getDb() {
  if (!db) throw new Error ('call loadSeed() first!');
  return db;
}