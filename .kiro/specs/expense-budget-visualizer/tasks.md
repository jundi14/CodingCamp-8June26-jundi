# Implementation Plan: Expense & Budget Visualizer

## Overview

Implementation tasks for the Expense & Budget Visualizer — a single-page, client-side web app built with plain HTML, CSS, and Vanilla JavaScript. Tasks are ordered by dependency: HTML shell → CSS → core JS pure functions → rendering layer → event handlers → initialization → tests. No frameworks, bundlers, or backend are required.

## Notes

The existing `index.html` is a bare stub with a misplaced `<h1>` in `<head>`. The files `css/styles.css` and `js/app.js` do not yet exist and must be created. All JavaScript logic lives in a single `js/app.js` file following the Model → Render pattern described in the design document.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1"],
      "description": "HTML shell and file structure — foundation for all other tasks"
    },
    {
      "wave": 2,
      "tasks": ["2", "3"],
      "description": "CSS layout and Storage module — can be implemented in parallel after Task 1"
    },
    {
      "wave": 3,
      "tasks": ["4"],
      "description": "Validator module — depends on app.js file existing (Task 1)"
    },
    {
      "wave": 4,
      "tasks": ["5"],
      "description": "Pure helper functions — depends on state variables from Task 4 setup"
    },
    {
      "wave": 5,
      "tasks": ["6"],
      "description": "Rendering functions — depends on helper functions (Task 5) and Storage (Task 3)"
    },
    {
      "wave": 6,
      "tasks": ["7"],
      "description": "Event handlers — depends on all rendering (Task 6) and validation (Task 4)"
    },
    {
      "wave": 7,
      "tasks": ["8"],
      "description": "App initialization — depends on all handlers and rendering being in place"
    },
    {
      "wave": 8,
      "tasks": ["9", "10"],
      "description": "Unit and property-based tests — depend on all implementation being complete"
    }
  ]
}
```

## Tasks

- [x] 1. Set up the HTML shell and file structure
  - [x] 1.1 Fix `index.html`: move `<h1>` into `<body>`, add `<link rel="stylesheet">` pointing to `css/styles.css`, and add `<script defer src="js/app.js">` before `</body>`
  - [x] 1.2 Add a pinned Chart.js CDN `<script>` tag (e.g., `https://cdn.jsdelivr.net/npm/chart.js@4`) before the `js/app.js` script tag
  - [x] 1.3 Create the `#expense-form` with `#item-name` (text, maxlength=100), `#amount` (number, min=0.01, max=9999999.99, step=0.01), `#category` (select: Food / Transport / Fun), and a submit button
  - [x] 1.4 Add a `#form-error` element for validation error messages and a `#storage-error` element for storage error messages (both hidden by default via CSS class)
  - [x] 1.5 Add a `#balance` element to display the running total
  - [x] 1.6 Add a `#transaction-list` `<ul>` element with an initial empty-state child element containing the text "No transactions added yet."
  - [x] 1.7 Add a `#chart-container` containing `<canvas id="expense-chart">`, a `#chart-empty-message` element (shown when no data), and a `#chart-fallback-message` element (shown when Chart.js fails to load)
  - [x] 1.8 Create empty placeholder files `css/styles.css` and `js/app.js`
  - _Requirements: 1.1, 3.1, 4.4, 4.5, 6.3, 7.4_

- [x] 2. Implement CSS responsive layout and visual styles
  - [x] 2.1 Add a CSS reset/base: `box-sizing: border-box`, readable font stack, `margin: 0`
  - [x] 2.2 Implement a single-column centered layout with `max-width` that works from 320px to 1440px with no horizontal scrolling
  - [x] 2.3 Style the `#expense-form` inputs, select, and submit button (full-width fields, clear spacing, visible focus states)
  - [x] 2.4 Style the `#balance` section so the total is prominently readable
  - [x] 2.5 Style `#transaction-list` with `overflow-y: auto` and a `max-height` so it scrolls when content overflows; style each `<li>` to show name, amount, category badge, and delete button in a single row
  - [x] 2.6 Style `#chart-container` so the canvas is fully visible on a 375px viewport without horizontal scrolling
  - [x] 2.7 Style `#form-error` and `#storage-error` with a visible error colour; hide them with `display: none` by default
  - [x] 2.8 Style empty-state messages for list and chart (centered, muted text)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.4_

- [x] 3. Implement the Storage module in `js/app.js`
  - [x] 3.1 Define the constant `STORAGE_KEY = 'expense_transactions'`
  - [x] 3.2 Implement `saveTransactions(array)`: serialize the array to JSON, write to `localStorage[STORAGE_KEY]` inside a `try/catch`, return `{ ok: true }` on success or `{ ok: false, error: <message> }` on failure
  - [x] 3.3 Implement `loadTransactions()`: read `localStorage[STORAGE_KEY]`, parse JSON inside a `try/catch`; return `[]` if the key is missing, if `JSON.parse` throws, or if the parsed value is not an array
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4. Implement the Validator module in `js/app.js`
  - [x] 4.1 Implement `validateItemName(value)`: return `{ valid: false, error: '...' }` if the trimmed value is empty, whitespace-only, or longer than 100 characters; return `{ valid: true }` otherwise
  - [x] 4.2 Implement `validateAmount(value)`: return `{ valid: false, error: '...' }` if the value is non-numeric, less than 0.01, greater than 9,999,999.99, or has more than 2 decimal places; return `{ valid: true }` otherwise
  - [x] 4.3 Implement `validateCategory(value)`: return `{ valid: false, error: '...' }` if the value is not one of `"Food"`, `"Transport"`, or `"Fun"`; return `{ valid: true }` otherwise
  - _Requirements: 1.4, 1.5, 1.6_

- [x] 5. Implement core state and pure helper functions in `js/app.js`
  - [x] 5.1 Declare `let transactions = []` and `let chartInstance = null` as the single source of truth
  - [x] 5.2 Implement `generateId()`: return `crypto.randomUUID()` when available, falling back to `Date.now().toString()`
  - [x] 5.3 Implement `calculateBalance(transactionsArray)`: return the sum of all `amount` fields as a string with `toFixed(2)`; return `"0.00"` for an empty array
  - [x] 5.4 Implement `aggregateCategoryTotals(transactionsArray)`: iterate the array and return `{ Food: number, Transport: number, Fun: number }` with per-category sums; categories with no transactions default to `0`
  - [x] 5.5 Implement `buildChartDataset(totals)`: filter out categories whose value is `0` and return `{ labels: string[], data: number[], colors: string[] }` ready for Chart.js; assign a visually distinct, non-identical colour to each category
  - _Requirements: 3.1, 3.4, 4.1, 4.2, 4.3_

- [x] 6. Implement the rendering functions in `js/app.js`
  - [x] 6.1 Implement `renderBalance()`: compute `calculateBalance(transactions)` and set the text content of `#balance`
  - [x] 6.2 Implement `renderTransactionList()`: clear `#transaction-list`, iterate `transactions` in reverse order and append one `<li>` per transaction showing item name, formatted amount (`$X.XX`), category badge, and a delete button with `data-id`; render the empty-state message when `transactions` is empty
  - [x] 6.3 Implement `renderChart()`: if `window.Chart` is undefined show `#chart-fallback-message` and return; if `transactions` is empty hide `<canvas>` and show `#chart-empty-message`; otherwise destroy any existing `chartInstance`, show `<canvas>`, hide messages, and create a new `Chart` pie instance using `buildChartDataset(aggregateCategoryTotals(transactions))`
  - [x] 6.4 Implement `renderAll()`: call `renderBalance()`, `renderTransactionList()`, and `renderChart()` in sequence — invoke after every state mutation
  - _Requirements: 2.1, 2.2, 2.3, 2.6, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_

- [x] 7. Implement transaction add and delete event handlers in `js/app.js`
  - [x] 7.1 Implement `addTransaction(itemName, amount, category)`: build a Transaction object with `id`, `itemName`, `amount` (as float), `category`, and `createdAt = Date.now()`; call `saveTransactions([...transactions, newTx])`; if `ok: false` display the storage error and do NOT mutate `transactions`; if `ok: true` push the new transaction and clear the storage error display
  - [x] 7.2 Implement `deleteTransaction(id)`: compute the filtered array without the target; call `saveTransactions(filtered)`; if `ok: false` display the storage error and leave `transactions` unchanged; if `ok: true` assign `transactions = filtered`
  - [x] 7.3 Attach a `submit` listener to `#expense-form`: run all three validators; if any fail collect error messages, display them in `#form-error`, and return early; clear `#form-error`, call `addTransaction()`, call `form.reset()`, then call `renderAll()`
  - [x] 7.4 Attach a delegated `click` listener to `#transaction-list`: when the click target has `data-id`, call `deleteTransaction(id)` then `renderAll()`
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.4, 2.5_

- [x] 8. Implement app initialization in `js/app.js`
  - [x] 8.1 Add a `DOMContentLoaded` listener: call `loadTransactions()` and assign the result to `transactions`; call `renderAll()` to paint the initial UI from persisted data
  - [x] 8.2 Inside `renderChart()`, handle the CDN failure case idempotently: check `typeof window.Chart === 'undefined'` and show `#chart-fallback-message` while hiding `<canvas>` so the check works on both init and subsequent renders
  - _Requirements: 5.2, 7.6_

- [ ] 9. Write unit tests (example-based)
  - [ ] 9.1 Set up a minimal test harness: create `js/app.test.js` compatible with Node (no build step); export pure functions from `app.js` or replicate them in the test file; use Node's built-in `assert` module or a lightweight library
  - [~] 9.2 Test `validateItemName`: empty string → invalid; whitespace-only string → invalid; 100-char string → valid; 101-char string → invalid; normal word → valid
  - [~] 9.3 Test `validateAmount`: `"abc"` → invalid; `"0"` → invalid; `"0.001"` → invalid; `"9999999.99"` → valid; `"10000000"` → invalid; `"5.5"` → valid
  - [~] 9.4 Test `validateCategory`: `"Food"` / `"Transport"` / `"Fun"` → valid; empty string → invalid; `"Other"` → invalid
  - [~] 9.5 Test `calculateBalance`: empty array → `"0.00"`; single transaction of 1.5 → `"1.50"`; two transactions summing to 10.99 → `"10.99"`
  - [~] 9.6 Test `loadTransactions`: missing key → `[]`; corrupt JSON string → `[]`; valid JSON non-array value → `[]`; valid JSON array → returns the array
  - [~] 9.7 Test `saveTransactions` + `loadTransactions` round-trip: save an array, load it back, assert all fields are identical
  - [~] 9.8 Test `aggregateCategoryTotals`: empty array → all zeros; mixed transactions → correct per-category sums
  - [~] 9.9 Test `buildChartDataset`: all-zero totals → empty labels and data arrays; one non-zero category → single entry; all three non-zero → three entries with correct values and distinct colours
  - _Requirements: 1.4, 1.5, 1.6, 3.1, 3.4, 4.1, 4.2, 4.3, 5.2, 5.4_

- [ ] 10. Write property-based tests
  - [~] 10.1 Set up fast-check: install via npm or add a CDN script for fast-check v3; create `js/app.pbt.test.js` runnable in Node
  - [~] 10.2 **Property 1** — Valid transaction addition grows the list: generate random valid `{itemName, amount, category}` tuples; assert that after `addTransaction()` the list length increases by exactly 1 and the new entry is findable by its `id` — **Validates: Requirements 1.2, 2.1**
  - [~] 10.3 **Property 2** — Whitespace-only and over-length item names are rejected: generate strings that are empty, whitespace-only, or longer than 100 characters; assert `validateItemName()` returns `{ valid: false }` for all — **Validates: Requirements 1.4, 1.6**
  - [~] 10.4 **Property 3** — Invalid amounts are rejected: generate non-numeric strings, negatives, values > 9,999,999.99, and strings with > 2 decimal places; assert `validateAmount()` returns `{ valid: false }` for all — **Validates: Requirement 1.5**
  - [~] 10.5 **Property 4** — Balance always equals sum of amounts: generate random valid transaction arrays including empty; assert `calculateBalance(arr)` equals `arr.reduce((s, t) => s + t.amount, 0).toFixed(2)` — **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
  - [~] 10.6 **Property 5** — Local Storage serialization round-trip preserves data: generate random valid transaction arrays; call `saveTransactions()` then `loadTransactions()`; assert each element has identical `id`, `itemName`, `amount`, `category`, and `createdAt` — **Validates: Requirements 5.1, 5.2**
  - [~] 10.7 **Property 6** — Delete removes exactly the targeted transaction: generate random lists of ≥1 transactions and a random target `id` from that list; call `deleteTransaction(id)`; assert the result contains no entry with that `id` and all other entries are unchanged — **Validates: Requirement 2.4**
  - [~] 10.8 **Property 7** — Chart dataset matches category totals with zero-exclusion: generate random valid transaction arrays; assert `buildChartDataset(aggregateCategoryTotals(arr))` contains exactly one entry per non-zero category, each value equals the sum for that category, and zero-total categories are absent — **Validates: Requirements 4.1, 4.2, 4.3**
  - [~] 10.9 **Property 8** — Corrupt or missing storage initializes to empty list: write arbitrary non-JSON strings, valid JSON non-arrays, and `null` directly to `localStorage[STORAGE_KEY]`; call `loadTransactions()`; assert it returns `[]` without throwing — **Validates: Requirement 5.4**
  - _Requirements: 1.2, 1.4, 1.5, 1.6, 2.1, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 5.1, 5.2, 5.4_
