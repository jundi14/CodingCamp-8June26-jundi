/* Expense & Budget Visualizer App */

const STORAGE_KEY = 'expense_transactions';

/**
 * Serializes the transactions array to JSON and writes it to localStorage.
 * @param {Array} array - The transactions array to persist.
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function saveTransactions(array) {
  try {
    const json = JSON.stringify(array);
    localStorage[STORAGE_KEY] = json;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Reads and deserializes the transactions array from localStorage.
 * Returns an empty array if the key is missing, if JSON.parse throws,
 * or if the parsed value is not an array.
 * @returns {Array}
 */
function loadTransactions() {
  const raw = localStorage[STORAGE_KEY];
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

/**
 * Validates the item name field value.
 * @param {string} value - The raw input value from the item name field.
 * @returns {{ valid: true } | { valid: false, error: string }}
 */
function validateItemName(value) {
  if (value.trim().length === 0) {
    return { valid: false, error: 'Item name is required.' };
  }
  if (value.trim().length > 100) {
    return { valid: false, error: 'Item name must be 100 characters or fewer.' };
  }
  return { valid: true };
}

/**
 * Validates the amount field value.
 * @param {string} value - The raw input value from the amount field.
 * @returns {{ valid: true } | { valid: false, error: string }}
 */
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

  if (/\.\d{3,}Rp/.test(trimmed)) {
    return { valid: false, error: 'Amount must have no more than 2 decimal places.' };
  }

  return { valid: true };
}

/**
 * Validates the category field value.
 * @param {string} value - The raw input value from the category field.
 * @returns {{ valid: true } | { valid: false, error: string }}
 */
function validateCategory(value) {
  const allowedCategories = ['Food', 'Transport', 'Fun'];
  if (!allowedCategories.includes(value)) {
    return { valid: false, error: 'Please select a valid category (Food, Transport, or Fun).' };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// In-memory state — single source of truth
// ---------------------------------------------------------------------------

/** @type {Array} All expense transactions loaded/saved during the session. */
let transactions = [];

/** @type {Chart|null} Reference to the active Chart.js instance; null when no chart is rendered. */
let chartInstance = null;

/**
 * Generates a unique identifier for a transaction.
 * Uses `crypto.randomUUID()` when available, falling back to `Date.now().toString()`.
 * @returns {string} A unique ID string.
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString();
}

/**
 * Calculates the total balance by summing all `amount` fields in the transactions array.
 * @param {Array} transactionsArray - Array of transaction objects with an `amount` field.
 * @returns {string} The total balance formatted to 2 decimal places (e.g. "123.45").
 *                   Returns "0.00" for an empty array.
 */
function calculateBalance(transactionsArray) {
  if (transactionsArray.length === 0) {
    return '0.00';
  }
  const total = transactionsArray.reduce((sum, transaction) => sum + transaction.amount, 0);
  return total.toFixed(2);
}

/**
 * Aggregates transaction amounts by category.
 * @param {Array} transactionsArray - Array of transaction objects with `amount` and `category` fields.
 * @returns {{ Food: number, Transport: number, Fun: number }} Per-category sums; categories with no
 *   transactions default to 0.
 */
function aggregateCategoryTotals(transactionsArray) {
  const totals = { Food: 0, Transport: 0, Fun: 0 };
  for (const transaction of transactionsArray) {
    if (transaction.category in totals) {
      totals[transaction.category] += transaction.amount;
    }
  }
  return totals;
}

/**
 * Builds the dataset object required by Chart.js from per-category totals.
 * Categories with a value of 0 are excluded from the output.
 * @param {{ Food: number, Transport: number, Fun: number }} totals - Per-category expense totals.
 * @returns {{ labels: string[], data: number[], colors: string[] }} Chart-ready arrays; all three
 *   arrays are empty when every category total is 0.
 */
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

/**
 * Memformat amount ke format currency Indonesia (titik sebagai pemisah ribuan).
 * @param {number} amount - Jumlah yang akan diformat.
 * @returns {string} Amount yang sudah diformat (contoh: "5.000,00")
 */
function formatCurrency(amount) {
  return amount.toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
/**
 * Renders the current balance to the #balance element.
 * Computes the total from the module-level `transactions` array and
 * sets the text content of #balance to the formatted value.
 */
function renderBalance() {
  const balance = calculateBalance(transactions);
  document.getElementById('balance').textContent = 'Rp' + formatCurrency(parseFloat(balance));
}

/**
 * Renders the transaction list to the #transaction-list element.
 * Clears the list, then either shows an empty-state message or renders
 * one <li> per transaction in reverse order (newest first).
 * Each item shows: item name, formatted amount, category badge, delete button.
 */
function renderTransactionList() {
  const list = document.getElementById('transaction-list');

  // Clear all existing children
  list.innerHTML = '';

  // Empty state
  if (transactions.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = 'No transactions added yet.';
    list.appendChild(empty);
    return;
  }

  // Iterate in reverse (newest first)
  for (let i = transactions.length - 1; i >= 0; i--) {
    const transaction = transactions[i];

    const li = document.createElement('li');

    // Item name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'tx-name';
    nameSpan.textContent = transaction.itemName;

    // Formatted amount
    const amountSpan = document.createElement('span');
    amountSpan.className = 'tx-amount';
    amountSpan.textContent = 'Rp' + formatCurrency(transaction.amount);

    // Category badge
    const categorySpan = document.createElement('span');
    categorySpan.className = 'tx-category';
    categorySpan.textContent = transaction.category;

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'tx-delete';
    deleteBtn.dataset.id = transaction.id;
    deleteBtn.setAttribute('aria-label', 'Delete transaction');
    deleteBtn.textContent = 'Delete';

    li.appendChild(nameSpan);
    li.appendChild(amountSpan);
    li.appendChild(categorySpan);
    li.appendChild(deleteBtn);

    list.appendChild(li);
  }
}

/**
 * Renders the expense pie chart into #expense-chart.
 *
 * Behaviour:
 *  - If Chart.js is not available (CDN failed), hides the canvas,
 *    shows #chart-fallback-message, hides #chart-empty-message, and returns.
 *  - If there are no transactions, hides the canvas, shows
 *    #chart-empty-message, hides #chart-fallback-message, and returns.
 *  - Otherwise destroys any existing Chart instance, shows the canvas,
 *    hides both message elements, and creates a new Chart.js pie chart
 *    using data built from the current transactions.
 */
function renderChart() {
  const canvas = document.getElementById('expense-chart');
  const emptyMsg = document.getElementById('chart-empty-message');
  const fallbackMsg = document.getElementById('chart-fallback-message');

  // Case 1: Chart.js CDN failed to load
  if (typeof window.Chart === 'undefined') {
    canvas.style.display = 'none';
    fallbackMsg.classList.remove('hidden');
    emptyMsg.classList.add('hidden');
    return;
  }

  // Case 2: No transactions — nothing to chart
  if (transactions.length === 0) {
    canvas.style.display = 'none';
    emptyMsg.classList.remove('hidden');
    fallbackMsg.classList.add('hidden');
    return;
  }

  // Case 3: Render (or re-render) the pie chart
  if (chartInstance !== null) {
    chartInstance.destroy();
    chartInstance = null;
  }

  canvas.style.display = '';
  emptyMsg.classList.add('hidden');
  fallbackMsg.classList.add('hidden');

  const dataset = buildChartDataset(aggregateCategoryTotals(transactions));

  chartInstance = new window.Chart(canvas, {
    type: 'pie',
    data: {
      labels: dataset.labels,
      datasets: [
        {
          data: dataset.data,
          backgroundColor: dataset.colors,
        },
      ],
    },
  });
}

/**
 * Re-renders the entire UI by calling all three render functions in sequence.
 * This is the single re-render entry point that must be called after every
 * state mutation (add or delete a transaction).
 */
function renderAll() {
  renderBalance();
  renderTransactionList();
  renderChart();
}

/**
 * Builds a new Transaction object and persists it.
 *
 * Requirements: 1.2, 1.7, 2.4, 5.1
 *
 * @param {string} itemName  - The expense item name (already validated).
 * @param {string|number} amount - The expense amount (will be parsed as float).
 * @param {string} category - One of "Food", "Transport", or "Fun".
 */
function addTransaction(itemName, amount, category) {
  const newTx = {
    id: generateId(),
    itemName: itemName,
    amount: parseFloat(amount),
    category: category,
    createdAt: Date.now(),
  };

  const result = saveTransactions([...transactions, newTx]);

  const storageError = document.getElementById('storage-error');

  if (!result.ok) {
    // Storage failed — show error, do NOT mutate in-memory state
    storageError.textContent = result.error || 'Failed to save transaction.';
    storageError.classList.remove('hidden');
    return;
  }

  // Storage succeeded — commit to in-memory state and clear any prior error
  transactions.push(newTx);
  storageError.textContent = '';
  storageError.classList.add('hidden');
}

/**
 * Removes the transaction with the given id and persists the result.
 *
 * Requirements: 2.4, 2.5, 5.3
 *
 * @param {string} id - The id of the transaction to remove.
 */
function deleteTransaction(id) {
  const filtered = transactions.filter(tx => tx.id !== id);

  const result = saveTransactions(filtered);

  const storageError = document.getElementById('storage-error');

  if (!result.ok) {
    // Storage failed — show error, leave transactions unchanged
    storageError.textContent = result.error || 'Failed to delete transaction.';
    storageError.classList.remove('hidden');
    return;
  }

  // Storage succeeded — commit filtered list and clear any prior error
  transactions = filtered;
  storageError.textContent = '';
  storageError.classList.add('hidden');
}

/**
 * Attaches a submit event listener to `#expense-form`.
 *
 * On submit:
 *  1. Prevents the default form submission.
 *  2. Runs all three validators and collects any error messages.
 *  3. If any validation fails: displays all error messages in `#form-error`
 *     (removes `hidden`) and returns early without mutating state.
 *  4. If all valid: clears `#form-error` (adds `hidden`), calls
 *     `addTransaction()`, resets the form, and calls `renderAll()`.
 *
 * Requirements: 1.2, 1.3, 1.4, 1.5, 1.6
 */
function attachFormHandler() {
  const form = document.getElementById('expense-form');
  const formError = document.getElementById('form-error');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const itemName = document.getElementById('item-name').value;
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;

    // Run all three validators and collect errors
    const nameResult = validateItemName(itemName);
    const amountResult = validateAmount(amount);
    const categoryResult = validateCategory(category);

    const errors = [];
    if (!nameResult.valid) errors.push(nameResult.error);
    if (!amountResult.valid) errors.push(amountResult.error);
    if (!categoryResult.valid) errors.push(categoryResult.error);

    if (errors.length > 0) {
      formError.textContent = errors.join(' ');
      formError.classList.remove('hidden');
      return;
    }

    // All valid — clear error, add transaction, reset form, re-render
    formError.textContent = '';
    formError.classList.add('hidden');

    addTransaction(itemName, amount, category);
    form.reset();
    renderAll();
  });
}

/**
 * Attaches a delegated `click` listener to `#transaction-list`.
 *
 * Uses event delegation so it works even as list items are dynamically
 * added and removed. When the clicked element has a `data-id` attribute,
 * the corresponding transaction is deleted and the UI is re-rendered.
 *
 * Requirements: 1.7, 2.4
 */
function attachListHandler() {
  const list = document.getElementById('transaction-list');

  list.addEventListener('click', function (e) {
    const id = e.target.dataset.id;
    if (id) {
      deleteTransaction(id);
      renderAll();
    }
  });
}

// ---------------------------------------------------------------------------
// App initialization
// ---------------------------------------------------------------------------

/**
 * Entry point: load persisted transactions, attach all event handlers,
 * and paint the initial UI.
 *
 * Requirements: 5.2, 7.3, 7.6
 */
document.addEventListener('DOMContentLoaded', function () {
  transactions = loadTransactions();
  attachFormHandler();
  attachListHandler();
  renderAll();
});
