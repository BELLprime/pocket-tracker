import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadSeed } from '../src/services/db.js';
import * as transactionService from '../src/services/transactionService.js';
import { parseChatMessage, validateTransactionInput } from '../src/validators/transactionValidator.js';
import { handleIncomingText, handleCallbackQuery } from '../src/bot/telegramBot.js';
import { config } from '../src/config.js';

// Initialize DB before running tests
before(async () => {
  await loadSeed();
});

// 1. Chat parser test
test('1. parseChatMessage extracts title and amount correctly', () => {
  const draft = parseChatMessage('Coffee 55');
  assert.equal(draft.command, 'draft');
  assert.equal(draft.title, 'Coffee');
  assert.equal(draft.amountBaht, 55);

  const summaryCmd = parseChatMessage('/summary');
  assert.equal(summaryCmd.command, 'summary');
});

// 2. Input validator test
test('2. validateTransactionInput rejects invalid amount', () => {
  const bad = validateTransactionInput({ title: 'Snack', amountBaht: -10, type: 1 });
  assert.equal(bad.valid, false);

  const good = validateTransactionInput({ title: 'Snack', amountBaht: 20, type: 1 });
  assert.equal(good.valid, true);
});

// 3. Full Telegram bot flow + DB save & cleanup test
test('3. Telegram bot 3-step flow saves to DB, returns GIF, and cleans up', async () => {
  const testUserId = config.allowedTelegramIds || '999999';

  // Step 1: Send item text
  const step1 = await handleIncomingText('TestItem 99', testUserId);
  assert.ok(step1.text.includes('TestItem'));

  // Step 2: Select Expense (type:1)
  const step2 = await handleCallbackQuery('type:1', testUserId);
  assert.ok(step2.text.includes('Confirm to save?'));

  // Step 3: Confirm save and check GIF
  const step3 = await handleCallbackQuery('confirm', testUserId);
  assert.ok(step3.text.includes('✅ Saved!'));
  assert.ok(step3.gifUrl.includes('napoleon.gif'));

  // Extract created ID and delete test record from DB
  const matchId = step3.text.match(/#(\d+)/);
  assert.ok(matchId, 'Expected created transaction ID');
  const createdId = Number(matchId[1]);

  const removed = await transactionService.remove(createdId);
  assert.equal(Number(removed.id), createdId);
});
