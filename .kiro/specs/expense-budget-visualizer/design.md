# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a single-page, client-side web application built with plain HTML, CSS, and Vanilla JavaScript. It lets users record personal expense transactions (name, amount, category), review them in a scrollable list, monitor their running balance, and visualize spending distribution by category through a live-updating pie chart.

All state is persisted in the browser's Local Storage as a JSON array, so data survives page reloads without any backend. Chart rendering delegates to Chart.js loaded from a public CDN.

### Key Design Goals

- **Zero dependencies at build time** — no bundlers, transpilers, or frameworks; open `index.html` and it works.
- **Single source of truth** — one in-memory `transactions` array drives every UI component (list, balance, chart) to guarantee consistency.
- **Fail-safe storage** — every Local Storage operation is wrapped in a try/catch so a quota or security error never crashes the app.
- **Progressive rendering** — empty states for both the list and the chart are explicit UI states, not absent DOM nodes.

---

## Architecture

The application follows a lightweight **Model → Render** pattern without a virtual DOM:

```
User Action
    │
    ▼
Event Handler (in app.js)
    │
    ├─► Validate input (Validator module)
    │
    ├─► Mutate in-memory state (transactions array)
    │
    ├─► Persist to Local Storage (Storage module)
    │
    └─► Re-render all UI components
            ├─ renderTransactionList()
            ├─ renderBalance()
            └─ renderChart()
```

Because the app is single-page with no routing, the entire render cycle runs synchronously on every mutation. This keeps the logic simple and avoids stale-view bugs at the cost of some redundant DOM work — acceptable for the expected data volumes (hundreds of transactions at most).

### File Structure

```
/
├── index.html          ← single HTML shell; loads CSS and JS
├── css/
│   └── styles.css      ← all styling; no inline styles
└── js/
    └── app.js          ← all JavaScript; no additional files
```

---

## Components and Interfaces

### 1. Input Form (`#expense-form`)

Collects a new transaction from the user.

| Element | Type | Constraints |
|---|---|---|
| `#item-name` | `<input type="text">` | required, maxlength=100 |
| `#amount` | `<input type="number">` | required, min=0.01, max=9999999.99, step=0.01 |
| `#category` | `<select>` | required; options: Food, Transport, Fun |
| Submit button | `<button type="submit">` | triggers validation then add |

**Behavior:**
- On submit, the `Validator` checks all fields before mutating state.
- On success, `form.reset()` is called to clear fields.
- Validation errors are rendered in a `#form-error` element adjacent to the form.

### 2. Balance Display (`#balance`)

Shows the formatted running total of all transaction amounts.

- Reads from the in-memory `transactions` array on every render.
- Uses `toFixed(2)` for formatting.
- Always visible; shows `0.00` when the list is empty.

### 3. Transaction List (`#transaction-list`)

A scrollable `<ul>` (or `<div>` with `overflow-y: auto`) containing one `<li>` per transaction.

Each list item displays:
- Item name
- Formatted amount (2 decimal places, prefixed with `$`)
- Category badge
- Delete button (`data-id` attribute holds the transaction `id`)

**Empty state:** When no transactions exist, a single child element with the message *"No transactions added yet."* is rendered instead of list items.

**Order:** Transactions are rendered in reverse chronological order (newest first). Because the in-memory array grows by `push()`, rendering iterates the array in reverse.

### 4. Pie Chart (`#chart-container` / `#expense-chart`)

A `<canvas id="expense-chart">` managed by Chart.js.

- On every render, totals are aggregated per category from the `transactions` array.
- A Chart.js `Pie` instance is destroyed and recreated on each update (simplest correct approach for Chart.js; avoids stale dataset bugs).
- Categories with zero spending are excluded from the dataset.
- **Empty state:** When `transactions` is empty, the `<canvas>` is hidden and a `#chart-empty-message` element is shown.
- **CDN failure state:** If `window.Chart` is undefined after page load, the `#chart-container` shows a fallback message: *"Chart unavailable — failed to load Chart.js."* All other features remain functional.

### 5. Validator Module (internal functions in `app.js`)

Pure functions that validate form field values before a transaction is added.

| Function | Input | Returns |
|---|---|---|
| `validateItemName(value)` | string | `{ valid: boolean, error: string }` |
| `validateAmount(value)` | string | `{ valid: boolean, error: string }` |
| `validateCategory(value)` | string | `{ valid: boolean, error: string }` |

### 6. Storage Module (internal functions in `app.js`)

Wraps Local Storage with error handling.

| Function | Behavior |
|---|---|
| `saveTransactions(array)` | Serializes array to JSON and writes to `localStorage['expense_transactions']`; catches exceptions and returns `{ ok: boolean, error?: string }` |
| `loadTransactions()` | Reads and parses the stored JSON; returns `[]` on missing key, parse failure, or non-array result |

---

## Data Models

### Transaction Object

```js
{
  id: string,          // crypto.randomUUID() or Date.now().toString() fallback
  itemName: string,    // 1–100 characters
  amount: number,      // float, 0.01–9999999.99, stored with full precision
  category: string,    // "Food" | "Transport" | "Fun"
  createdAt: number    // Date.now() timestamp (ms since epoch)
}
```

### Local Storage Schema

- **Key:** `expense_transactions`
- **Value:** JSON-serialized array of Transaction objects (e.g., `"[{...}, {...}]"`)

### In-Memory State

```js
let transactions = [];   // single source of truth; loaded from LS on init
let chartInstance = null; // reference to the current Chart.js instance (for destroy/recreate)
```

### Category Aggregation (for Chart)

```js
// Computed on each render; not stored
const totals = {
  Food: 0,
  Transport: 0,
  Fun: 0
};
transactions.forEach(t => { totals[t.category] += t.amount; });
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid transaction addition grows the list

*For any* valid transaction (non-empty item name ≤ 100 chars, amount between 0.01 and 9,999,999.99, valid category), adding it to an existing transaction list shall result in the list length increasing by exactly one, and the new transaction shall be retrievable by its `id`.

**Validates: Requirements 1.2, 2.1**

### Property 2: Whitespace-only and over-length item names are rejected

*For any* string that is empty, composed entirely of whitespace characters, or longer than 100 characters, the Validator shall reject it as an Item_Name and the transaction list shall remain unchanged.

**Validates: Requirements 1.4, 1.6**

### Property 3: Invalid amounts are rejected by the Validator

*For any* amount value that is non-numeric, less than 0.01, greater than 9,999,999.99, or has more than 2 decimal places, the Validator shall reject the value and the transaction list shall remain unchanged.

**Validates: Requirements 1.5**

### Property 4: Balance always equals the sum of all transaction amounts

*For any* sequence of add and delete operations on the transaction list, the computed balance value shall always equal the arithmetic sum of the `amount` field of all current transactions, formatted to 2 decimal places. This property holds for any list size including zero (empty list → `"0.00"`).

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 5: Local Storage serialization round-trip preserves transaction data

*For any* array of valid transaction objects, serializing the array to a JSON string and then deserializing it shall produce an array where each element has identical `id`, `itemName`, `amount`, `category`, and `createdAt` fields as the original.

**Validates: Requirements 5.1, 5.2**

### Property 6: Delete removes exactly the targeted transaction and no others

*For any* transaction list containing at least one transaction and any `id` from that list, calling `deleteTransaction(id)` shall produce a list that (a) does not contain a transaction with that `id`, and (b) contains every other transaction from the original list with all fields unchanged.

**Validates: Requirements 2.4**

### Property 7: Chart dataset matches category totals with zero-exclusion

*For any* array of transactions, the chart data built by the aggregation function shall contain exactly one entry per category that has a non-zero total, and each entry's value shall equal the sum of `amount` for all transactions in that category. Categories with no transactions shall be absent from the dataset.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 8: Corrupt or missing Local Storage data initializes to empty list

*For any* stored value that is absent, cannot be parsed as JSON, or parses to a non-array value, `loadTransactions()` shall return an empty array `[]` without throwing an exception.

**Validates: Requirements 5.4**

---

## Error Handling

| Scenario | Detection | Response |
|---|---|---|
| Form submitted with empty fields | `validateItemName / validateAmount / validateCategory` return invalid | Show error message in `#form-error`; block submission |
| Amount out of range or wrong format | `validateAmount` returns invalid | Show specific error in `#form-error`; block submission |
| Item name > 100 chars | `validateItemName` returns invalid | Show character limit error; block submission |
| Local Storage write fails (quota, SecurityError) | `saveTransactions()` returns `{ ok: false }` | Do NOT add/remove transaction from in-memory state; show error in `#storage-error` |
| Local Storage read returns corrupt JSON | `JSON.parse` throws inside `loadTransactions()` | Catch exception, return `[]`, initialize with empty state |
| Parsed Local Storage value is not an array | Type check after parse | Treat as `[]`, initialize with empty state |
| Chart.js CDN fails to load | `typeof window.Chart === 'undefined'` on DOMContentLoaded | Hide `<canvas>`, show fallback message; rest of app unaffected |

All error messages are rendered into dedicated DOM elements (never `alert()`), keeping the UX non-blocking. Error messages are cleared on the next successful operation.

---

## Testing Strategy

This feature is a client-side DOM application with no server and no build step. PBT is applicable to the pure business logic layer (validator functions, storage serialization/deserialization, balance calculation, category aggregation). DOM interaction and visual rendering are covered by example-based unit tests.

### Unit Tests (Example-Based)

Focus on specific scenarios and integration points:

- Form renders with correct default state (empty fields, no error messages visible)
- Adding a valid transaction appends a list item with correct text content
- Deleting a transaction removes the correct list item
- Empty state messages appear when transaction list is empty
- Balance shows `0.00` on initial load with no data
- Chart hidden and fallback message shown when no transactions exist
- `loadTransactions()` returns `[]` for missing key, corrupt JSON, and non-array values
- CDN failure: `#chart-container` shows fallback message while form/list/balance still work

### Property-Based Tests

Use a PBT library (e.g., **fast-check** for JavaScript, loaded via CDN or a minimal test harness) to verify universal properties. Each test runs a minimum of 100 iterations.

**Property test configuration:**

| Property | Tag | Generator Inputs |
|---|---|---|
| Property 1 | `Feature: expense-budget-visualizer, Property 1: valid transaction addition grows the list` | Random valid `{itemName, amount, category}` tuples |
| Property 2 | `Feature: expense-budget-visualizer, Property 2: whitespace/over-length item names rejected` | `fc.string()` filtered to whitespace-only, empty, or length > 100 |
| Property 3 | `Feature: expense-budget-visualizer, Property 3: invalid amounts rejected` | Arbitrary strings, negatives, values > 9999999.99, > 2 decimal places |
| Property 4 | `Feature: expense-budget-visualizer, Property 4: balance equals sum of amounts` | Random valid transaction arrays of varying sizes (including empty) |
| Property 5 | `Feature: expense-budget-visualizer, Property 5: local storage round-trip` | Random valid transaction arrays |
| Property 6 | `Feature: expense-budget-visualizer, Property 6: delete removes only targeted transaction` | Random list of ≥1 transactions + random target id from that list |
| Property 7 | `Feature: expense-budget-visualizer, Property 7: chart data mirrors category totals` | Random valid transaction arrays with any mix of categories |
| Property 8 | `Feature: expense-budget-visualizer, Property 8: corrupt storage initializes to empty list` | Arbitrary non-JSON strings, valid JSON non-arrays (numbers, objects), null |

### Testing Scope Notes

- Validator functions and `loadTransactions`/`saveTransactions` are pure or near-pure and are the primary PBT targets.
- Balance calculation (`transactions.reduce(...)`) is a pure function — ideal for property testing.
- Category aggregation for the chart is a pure function — testable with generated transaction arrays.
- DOM rendering, CSS layout, and visual chart appearance are not covered by automated tests; these require manual or visual-regression testing.
