import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API_ROOT = path.resolve(HERE, '..');
const DB_FILE = process.env.DB_FILE
  ? path.resolve(process.cwd(), process.env.DB_FILE)
  : path.join(API_ROOT, 'data', 'pocket.db');
const SCHEMA_FILE = path.join(API_ROOT, 'data', 'schema.sql');
const FORCE = process.argv.includes('--force');

console.log('');
console.log('  ฐานข้อมูล :', DB_FILE);
console.log('  schema    :', SCHEMA_FILE);
console.log('');

if (!existsSync(SCHEMA_FILE)) {
  console.error('ไม่พบไฟล์ api/data/schema.sql');
  process.exit(1);
}

if (existsSync(DB_FILE) && !FORCE) {
  console.log('มีไฟล์ฐานข้อมูลอยู่แล้ว (ถ้าต้องการล้างแล้วสร้างใหม่ให้รัน npm run db:reset)');
  process.exit(0);
}

mkdirSync(path.dirname(DB_FILE), { recursive: true });
if (existsSync(DB_FILE) && FORCE) {
  unlinkSync(DB_FILE);
  console.log('ลบฐานข้อมูลเดิมเรียบร้อย');
}

const db = new DatabaseSync(DB_FILE);
const sql = readFileSync(SCHEMA_FILE, 'utf8');
db.exec(sql);

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
  .all()
  .map((r) => r.name);

console.log('สร้างตารางสำเร็จ :', tables.join(', ') || '(ยังไม่มีตาราง — CREATE TABLE ใน schema.sql)');
console.log('');
db.close();
