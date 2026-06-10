/**
 * app.test.js — Unit tests for Expense & Budget Visualizer pure functions
 *
 * Run with:  node js/app.test.js
 *
 * Pure functions are replicated here so this file works in Node without
 * requiring app.js (which uses DOM APIs unavailable in Node).
 *
 * Tasks covered: 9.1 – 9.9
 */

'use strict';

const assert = require('assert');

// ---------------------------------------------------------------------------
// Task 9.1 — Minimal test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures = [];

function it(description, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓', description);
  } catch (err) {
    failed++;
    failures.push({ description, message: err.message });
    console.log('  ✗', description);
    console.log('    →', err.message);
  }
}

function describe(label, fn) {
  console.log('\n' + label);
  fn();
}

// ---------------------------------------------------------------------------
// Mock localStorage (for tasks 9.6 and 9.7)
// ---------------------------------------------------------------------------

const localStorage = {
  _store: {},
  getItem(key) { return Object.prototype.hasOwnProperty.call(this._store, key) ? this._store[key] : null; },
  setItem(key, val) { this._store[key] = val; },
  removeItem(key) { delete this._store[key]; },
  _clear() { this._store = {}; },
};

// ---------------------------------------------------------------------------
// Replicated pure functions (no DOM, no global state)
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'expense_transactions';

function validateItemName(value) {
  if (value.trim().length === 0) {
    return { valid: false, error: 'Item name is required.' };
  }
  if (value.trim().length > 100) {
    return { valid: false, error: 'Item name must be 100 characters or fewer.' };
  }
  return { valid: true };
}

function validateAmount(value) {
  const trimmed = value.trim();
  const parsed = parseFloat(trimmed);
  if (trimmed === '' || isNaN(parsed)) {
    return { valid: false, error: 'Amount must be a number.' };
  }
  if (parsed < 0.01) {
    return { valid: false, error: 'Amount must be at least 0.01.' };
  }
  if (parsed > 9999999.99) {
    return { valid: false, error: 'Amount must be 9,999,999.99 or less.' };
  }
  if (/\.\d{3,}$/.test(trimmed)) {
    return { valid: false, error: 'Amount must have no more than 2 decimal places.' };
  }
  return { valid: true };
}

function validateCategory(value) {
  const allowedCategories = ['Food', 'Transport', 'Fun'];
  if (!allowedCategories.includes(value)) {
    return { valid: false, error: 'Please select a valid category (Food, Transport, or Fun).' };
  }
  return { valid: true };
}

function calculateBalance(transactionsArray) {
  if (transactionsArray.length === 0) {
    return '0.00';
  }
  const total = transactionsArray.reduce((sum, transaction) => sum + transaction.amount, 0);
  return total.toFixed(2);
}

// Uses the mock localStorage defined above
function saveTransactions(array) {
  try {
    const json = JSON.stringify(array);
    localStorage.setItem(STORAGE_KEY, json);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Uses the mock localStorage defined above
function loadTransactions() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null || raw === undefined) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (err) {
    return [];
  }
}

function aggregateCategoryTotals(transactionsArray) {
  const totals = { Food: 0, Transport: 0, Fun: 0 };
  for (const transaction of transactionsArray) {
    if (transaction.category in totals) {
      totals[transaction.category] += transaction.amount;
    }
  }
  return totals;
}

function buildChartDataset(totals) {
  const COLOR_MAP = {
    Food: '#e74c3c',
    Transport: '#3498db',
    Fun: '#2ecc71',
  };
  const labels = [];
  const data = [];
  const colors = [];
  for (const [category, value] of Object.entries(totals)) {
    if (value !== 0) {
      labels.push(category);
      data.push(value);
      colors.push(COLOR_MAP[category]);
    }
  }
  return { labels, data, colors };
}

// ---------------------------------------------------------------------------
// Task 9.2 — validateItemName tests
// ---------------------------------------------------------------------------

describe('validateItemName', () => {
  it('empty string → invalid', () => {
    const result = validateItemName('');
    assert.strictEqual(result.valid, false, 'Expected invalid for empty string');
  });

  it('whitespace-only string → invalid', () => {
    const result = validateItemName('   ');
    assert.strictEqual(result.valid, false, 'Expected invalid for whitespace-only string');
  });

  it('100-character string → valid', () => {
    const name100 = 'a'.repeat(100);
    const result = validateItemName(name100);
    assert.strictEqual(result.valid, true, 'Expected valid for 100-char string');
  });

  it('101-character string → invalid', () => {
    const name101 = 'a'.repeat(101);
    const result = validateItemName(name101);
    assert.strictEqual(result.valid, false, 'Expected invalid for 101-char string');
  });

  it('normal word → valid', () => {
    const result = validateItemName('Groceries');
    assert.strictEqual(result.valid, true, 'Expected valid for normal word');
  });
});

// ---------------------------------------------------------------------------
// Task 9.3 — validateAmount tests
// ---------------------------------------------------------------------------

describe('validateAmount', () => {
  it('"abc" → invalid', () => {
    const result = validateAmount('abc');
    assert.strictEqual(result.valid, false, 'Expected invalid for "abc"');
  });

  it('"0" → invalid (below minimum 0.01)', () => {
    const result = validateAmount('0');
    assert.strictEqual(result.valid, false, 'Expected invalid for "0"');
  });

  it('"0.001" → invalid (more than 2 decimal places)', () => {
    const result = validateAmount('0.001');
    assert.strictEqual(result.valid, false, 'Expected invalid for "0.001"');
  });

  it('"9999999.99" → valid', () => {
    const result = validateAmount('9999999.99');
    assert.strictEqual(result.valid, true, 'Expected valid for "9999999.99"');
  });

  it('"10000000" → invalid (above maximum)', () => {
    const result = validateAmount('10000000');
    assert.strictEqual(result.valid, false, 'Expected invalid for "10000000"');
  });

  it('"5.5" → valid', () => {
    const result = validateAmount('5.5');
    assert.strictEqual(result.valid, true, 'Expected valid for "5.5"');
  });
});

// ---------------------------------------------------------------------------
// Task 9.4 — validateCategory tests
// ---------------------------------------------------------------------------

describe('validateCategory', () => {
  it('"Food" → valid', () => {
    const result = validateCategory('Food');
    assert.strictEqual(result.valid, true, 'Expected valid for "Food"');
  });

  it('"Transport" → valid', () => {
    const result = validateCategory('Transport');
    assert.strictEqual(result.valid, true, 'Expected valid for "Transport"');
  });

  it('"Fun" → valid', () => {
    const result = validateCategory('Fun');
    assert.strictEqual(result.valid, true, 'Expected valid for "Fun"');
  });

  it('empty string → invalid', () => {
    const result = validateCategory('');
    assert.strictEqual(result.valid, false, 'Expected invalid for empty string');
  });

  it('"Other" → invalid', () => {
    const result = validateCategory('Other');
    assert.strictEqual(result.valid, false, 'Expected invalid for "Other"');
  });
});

// ---------------------------------------------------------------------------
// Task 9.5 — calculateBalance tests
// ---------------------------------------------------------------------------

describe('calculateBalance', () => {
  it('empty array → "0.00"', () => {
    const result = calculateBalance([]);
    assert.strictEqual(result, '0.00', 'Expected "0.00" for empty array');
  });

  it('single transaction of 1.5 → "1.50"', () => {
    const result = calculateBalance([{ amount: 1.5 }]);
    assert.strictEqual(result, '1.50', 'Expected "1.50" for single transaction of 1.5');
  });

  it('two transactions summing to 10.99 → "10.99"', () => {
    const result = calculateBalance([{ amount: 5.5 }, { amount: 5.49 }]);
    assert.strictEqual(result, '10.99', 'Expected "10.99" for two transactions summing to 10.99');
  });
});

// ---------------------------------------------------------------------------
// Task 9.6 — loadTransactions tests
// ---------------------------------------------------------------------------

describe('loadTransactions', () => {
  it('missing key → []', () => {
    localStorage._clear();
    const result = loadTransactions();
    assert.deepStrictEqual(result, [], 'Expected [] when key is missing');
  });

  it('corrupt JSON string → []', () => {
    localStorage._clear();
    localStorage.setItem(STORAGE_KEY, '{not valid json{{');
    const result = loadTransactions();
    assert.deepStrictEqual(result, [], 'Expected [] for corrupt JSON');
  });

  it('valid JSON non-array value (object) → []', () => {
    localStorage._clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    const result = loadTransactions();
    assert.deepStrictEqual(result, [], 'Expected [] for JSON object (non-array)');
  });

  it('valid JSON non-array value (number) → []', () => {
    localStorage._clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(42));
    const result = loadTransactions();
    assert.deepStrictEqual(result, [], 'Expected [] for JSON number (non-array)');
  });

  it('valid JSON array → returns the array', () => {
    localStorage._clear();
    const arr = [{ id: '1', itemName: 'Coffee', amount: 3.5, category: 'Food', createdAt: 1000 }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    const result = loadTransactions();
    assert.deepStrictEqual(result, arr, 'Expected the stored array to be returned');
  });
});

// ---------------------------------------------------------------------------
// Task 9.7 — saveTransactions + loadTransactions round-trip tests
// ---------------------------------------------------------------------------

describe('saveTransactions + loadTransactions round-trip', () => {
  it('saved array is returned identical by loadTransactions', () => {
    localStorage._clear();
    const original = [
      { id: 'abc-1', itemName: 'Lunch', amount: 12.5, category: 'Food', createdAt: 1700000000000 },
      { id: 'abc-2', itemName: 'Bus fare', amount: 2.0, category: 'Transport', createdAt: 1700000001000 },
    ];
    const saveResult = saveTransactions(original);
    assert.strictEqual(saveResult.ok, true, 'Expected saveTransactions to return { ok: true }');

    const loaded = loadTransactions();
    assert.strictEqual(loaded.length, original.length, 'Expected same number of transactions after round-trip');

    for (let i = 0; i < original.length; i++) {
      assert.strictEqual(loaded[i].id, original[i].id, `id mismatch at index ${i}`);
      assert.strictEqual(loaded[i].itemName, original[i].itemName, `itemName mismatch at index ${i}`);
      assert.strictEqual(loaded[i].amount, original[i].amount, `amount mismatch at index ${i}`);
      assert.strictEqual(loaded[i].category, original[i].category, `category mismatch at index ${i}`);
      assert.strictEqual(loaded[i].createdAt, original[i].createdAt, `createdAt mismatch at index ${i}`);
    }
  });

  it('empty array round-trip returns empty array', () => {
    localStorage._clear();
    saveTransactions([]);
    const loaded = loadTransactions();
    assert.deepStrictEqual(loaded, [], 'Expected empty array after round-trip with []');
  });
});

// ---------------------------------------------------------------------------
// Task 9.8 — aggregateCategoryTotals tests
// ---------------------------------------------------------------------------

describe('aggregateCategoryTotals', () => {
  it('empty array → all zeros', () => {
    const result = aggregateCategoryTotals([]);
    assert.deepStrictEqual(result, { Food: 0, Transport: 0, Fun: 0 }, 'Expected all zeros for empty array');
  });

  it('mixed transactions → correct per-category sums', () => {
    const transactions = [
      { category: 'Food', amount: 10 },
      { category: 'Transport', amount: 5 },
      { category: 'Food', amount: 7.5 },
      { category: 'Fun', amount: 20 },
      { category: 'Transport', amount: 3 },
    ];
    const result = aggregateCategoryTotals(transactions);
    assert.strictEqual(result.Food, 17.5, 'Expected Food total to be 17.5');
    assert.strictEqual(result.Transport, 8, 'Expected Transport total to be 8');
    assert.strictEqual(result.Fun, 20, 'Expected Fun total to be 20');
  });

  it('transactions with unknown category are ignored', () => {
    const transactions = [
      { category: 'Food', amount: 5 },
      { category: 'Unknown', amount: 100 },
    ];
    const result = aggregateCategoryTotals(transactions);
    assert.strictEqual(result.Food, 5, 'Expected Food to be 5');
    assert.strictEqual(result.Transport, 0, 'Expected Transport to be 0');
    assert.strictEqual(result.Fun, 0, 'Expected Fun to be 0');
  });
});

// ---------------------------------------------------------------------------
// Task 9.9 — buildChartDataset tests
// ---------------------------------------------------------------------------

describe('buildChartDataset', () => {
  it('all-zero totals → empty labels, data, and colors arrays', () => {
    const result = buildChartDataset({ Food: 0, Transport: 0, Fun: 0 });
    assert.deepStrictEqual(result.labels, [], 'Expected empty labels for all-zero totals');
    assert.deepStrictEqual(result.data, [], 'Expected empty data for all-zero totals');
    assert.deepStrictEqual(result.colors, [], 'Expected empty colors for all-zero totals');
  });

  it('one non-zero category → single entry in each array', () => {
    const result = buildChartDataset({ Food: 0, Transport: 15, Fun: 0 });
    assert.strictEqual(result.labels.length, 1, 'Expected 1 label');
    assert.strictEqual(result.labels[0], 'Transport', 'Expected label to be Transport');
    assert.strictEqual(result.data.length, 1, 'Expected 1 data value');
    assert.strictEqual(result.data[0], 15, 'Expected data value to be 15');
    assert.strictEqual(result.colors.length, 1, 'Expected 1 color');
  });

  it('all three non-zero → three entries with correct values', () => {
    const totals = { Food: 30, Transport: 20, Fun: 50 };
    const result = buildChartDataset(totals);
    assert.strictEqual(result.labels.length, 3, 'Expected 3 labels');
    assert.strictEqual(result.data.length, 3, 'Expected 3 data values');
    assert.strictEqual(result.colors.length, 3, 'Expected 3 colors');

    const foodIdx = result.labels.indexOf('Food');
    const transportIdx = result.labels.indexOf('Transport');
    const funIdx = result.labels.indexOf('Fun');

    assert.ok(foodIdx !== -1, 'Expected Food in labels');
    assert.ok(transportIdx !== -1, 'Expected Transport in labels');
    assert.ok(funIdx !== -1, 'Expected Fun in labels');

    assert.strictEqual(result.data[foodIdx], 30, 'Expected Food data to be 30');
    assert.strictEqual(result.data[transportIdx], 20, 'Expected Transport data to be 20');
    assert.strictEqual(result.data[funIdx], 50, 'Expected Fun data to be 50');
  });

  it('all three non-zero → colors are distinct', () => {
    const totals = { Food: 10, Transport: 10, Fun: 10 };
    const result = buildChartDataset(totals);
    const uniqueColors = new Set(result.colors);
    assert.strictEqual(uniqueColors.size, 3, 'Expected 3 distinct colors');
  });

  it('Food color matches expected hex value', () => {
    const result = buildChartDataset({ Food: 5, Transport: 0, Fun: 0 });
    assert.strictEqual(result.colors[0], '#e74c3c', 'Expected Food color to be #e74c3c');
  });

  it('Transport color matches expected hex value', () => {
    const result = buildChartDataset({ Food: 0, Transport: 5, Fun: 0 });
    assert.strictEqual(result.colors[0], '#3498db', 'Expected Transport color to be #3498db');
  });

  it('Fun color matches expected hex value', () => {
    const result = buildChartDataset({ Food: 0, Transport: 0, Fun: 5 });
    assert.strictEqual(result.colors[0], '#2ecc71', 'Expected Fun color to be #2ecc71');
  });
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const total = passed + failed;
console.log('');
if (failed === 0) {
  console.log(`All ${total} tests passed.`);
} else {
  console.log(`${passed} of ${total} tests passed. ${failed} failed:`);
  for (const f of failures) {
    console.log('  ✗', f.description);
    console.log('    →', f.message);
  }
  process.exit(1);
}
