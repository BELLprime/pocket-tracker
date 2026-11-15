import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { config } from '../src/config.js';

const DB_FILE = config.dbFile;
const SCHEMA_FILE = config.schemaFile;
const FORCE = process.argv.includes('--force');

console.log('');
console.log('  ฐานข้อมูล :', DB_FILE);
console.log('  schema    :', SCHEMA_FILE);
console.log('');

if (!existsSync(SCHEMA_FILE)) {
  console.error('Not found -> api/data/schema.sql');
  process.exit(1);
}

mkdirSync(path.dirname(DB_FILE), { recursive: true });
if (existsSync(DB_FILE) && FORCE) {
  unlinkSync(DB_FILE);
  console.log('Delete DB success.');
}

const db = new DatabaseSync(DB_FILE);
const sql = readFileSync(SCHEMA_FILE, 'utf8');
db.exec(sql);

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
  .all()
  .map((r) => r.name);

console.log('Create table :', tables.join(', '));
console.log('');
db.close();