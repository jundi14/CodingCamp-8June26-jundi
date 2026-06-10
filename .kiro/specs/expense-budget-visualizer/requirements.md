# Requirements Document

## Introduction

The Expense & Budget Visualizer is a mobile-friendly, client-side web application that allows users to track personal expenses by category. Users can add transactions with a name, amount, and category, view a scrollable transaction list, see their total spending balance, and visualize spending distribution through an auto-updating pie chart. All data is persisted locally in the browser using the Local Storage API. The app is built with HTML, CSS, and Vanilla JavaScript only — no frameworks or backend required.

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense entry consisting of an Item Name, Amount, and Category.
- **Item_Name**: A text label (max 100 characters) identifying what the expense was for.
- **Amount**: A positive numeric value between 0.01 and 9,999,999.99 (up to 2 decimal places) representing the cost of a transaction.
- **Category**: One of three predefined expense types: Food, Transport, or Fun.
- **Transaction_List**: The scrollable UI component that displays all saved transactions.
- **Balance_Display**: The UI component at the top of the app showing the total sum of all transaction amounts, formatted to 2 decimal places.
- **Chart**: A pie chart rendered using Chart.js that visualizes spending distribution by category.
- **Local_Storage**: The browser's built-in Web Storage API used to persist transaction data client-side.
- **Input_Form**: The HTML form used to collect Item Name, Amount, and Category from the user.
- **Validator**: The client-side logic responsible for checking that all form fields are filled and valid before submission.

---

## Requirements

### Requirement 1: Add a Transaction via Input Form

**User Story:** As a user, I want to fill out a form with an item name, amount, and category so that I can record a new expense transaction.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for Item_Name (max 100 characters), a numeric field for Amount (accepting values between 0.01 and 9,999,999.99 with up to 2 decimal places), and a dropdown selector for Category with options: Food, Transport, and Fun.
2. WHEN the user submits the Input_Form with all fields filled and valid, THE App SHALL add the Transaction to the Transaction_List and persist it to Local_Storage.
3. WHEN the user submits the Input_Form with all fields filled and valid, THE Input_Form SHALL reset all fields to their default empty/unselected state after successful submission.
4. WHEN the user submits the Input_Form with one or more fields empty or unselected, THE Validator SHALL prevent form submission and display a validation error message identifying which fields are required.
5. IF the Amount field contains a non-numeric string, a value less than 0.01, a value greater than 9,999,999.99, or more than 2 decimal places, THEN THE Validator SHALL prevent form submission and display an error message indicating the valid Amount format.
6. IF the Item_Name field contains more than 100 characters, THEN THE Validator SHALL prevent form submission and display an error message indicating the maximum character limit.
7. IF Local_Storage is unavailable or a write operation fails when adding a Transaction, THEN THE App SHALL NOT add the Transaction to the Transaction_List and SHALL display an error message informing the user that the transaction could not be saved.

---

### Requirement 2: Display and Manage the Transaction List

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each Transaction with its Item_Name, Amount (formatted to 2 decimal places), and Category.
2. WHILE at least one Transaction exists, THE Transaction_List SHALL be scrollable when the total list height exceeds the visible container area.
3. THE Transaction_List SHALL display transactions in reverse chronological order, with the most recently added Transaction appearing at the top of the list.
4. WHEN the user clicks the delete button on a Transaction, THE App SHALL remove that Transaction from the Transaction_List and update Local_Storage to reflect the deletion.
5. IF a Local_Storage write operation fails when deleting a Transaction, THEN THE App SHALL NOT remove the Transaction from the Transaction_List and SHALL display an error message informing the user that the deletion could not be completed.
6. WHEN the last Transaction is deleted, THE Transaction_List SHALL display a visible text message within the list area indicating that no transactions have been added yet.

---

### Requirement 3: Display Total Balance

**User Story:** As a user, I want to see the total amount I have spent at the top of the page so that I have an immediate overview of my expenses.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of all Transaction Amount values formatted to 2 decimal places.
2. WHEN a new Transaction is added, THE Balance_Display SHALL update to reflect the new total immediately, without requiring a page reload or additional user interaction.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL update to reflect the new total immediately, without requiring a page reload or additional user interaction.
4. WHEN no Transactions exist, THE Balance_Display SHALL show a total of 0.00.

---

### Requirement 4: Visualize Spending with a Pie Chart

**User Story:** As a user, I want to see a pie chart of my spending by category so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL display a pie chart representing the proportion of total spending for each Category (Food, Transport, Fun), using a visually distinct, non-identical color for each category slice; categories with zero spending SHALL be excluded from the chart.
2. WHEN a new Transaction is added, THE Chart SHALL re-render to reflect the updated spending distribution without requiring a page reload.
3. WHEN a Transaction is deleted, THE Chart SHALL re-render to reflect the updated spending distribution without requiring a page reload.
4. WHEN no Transactions exist, THE Chart SHALL hide the pie chart canvas and display a visible text message indicating that no spending data is available.
5. THE Chart SHALL be rendered using Chart.js loaded via a public CDN link in the HTML file.

---

### Requirement 5: Persist Data Using Local Storage

**User Story:** As a user, I want my transactions to be saved so that my data is still available when I close and reopen the browser tab.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE App SHALL serialize the current Transaction_List as a JSON string and write it to Local_Storage using the same key consistently across all read and write operations.
2. WHEN the App initializes, THE App SHALL read the Transaction_List from Local_Storage and render all previously saved Transactions, the Balance_Display, and the Chart.
3. WHEN a Transaction is deleted, THE App SHALL update the Local_Storage entry to reflect the current Transaction_List after deletion.
4. IF Local_Storage is empty, the stored value cannot be parsed as valid JSON, or the parsed value is not an array, THEN THE App SHALL initialize with an empty Transaction_List and display a balance of 0.00.
5. IF a Local_Storage write operation throws an exception (e.g., storage quota exceeded), THEN THE App SHALL catch the exception and display an error message to the user without crashing.

---

### Requirement 6: Mobile-Friendly and Responsive Layout

**User Story:** As a user, I want to use the app on my phone as well as my desktop so that I can log expenses on the go.

#### Acceptance Criteria

1. THE App SHALL use a single-column responsive layout that adapts to screen widths from 320px to 1440px without horizontal scrolling or content overflow.
2. THE Input_Form, Balance_Display, Transaction_List, and Chart SHALL each be fully visible and interactive on a viewport width of 375px without requiring horizontal scrolling.
3. THE App SHALL include a meta viewport tag set to `width=device-width, initial-scale=1.0` in the HTML `<head>` to enable correct scaling on mobile devices.
4. THE App SHALL use a single CSS file located at `css/styles.css` for all styling; no inline styles or additional external stylesheets SHALL be used for layout or visual design.

---

### Requirement 7: Technical Stack and Code Organization

**User Story:** As a developer, I want the app to use only HTML, CSS, and Vanilla JavaScript so that it has no build dependencies and can run directly in a browser.

#### Acceptance Criteria

1. THE App SHALL be implemented using HTML, CSS, and Vanilla JavaScript only, with no front-end frameworks, transpilers, or bundlers.
2. THE App SHALL NOT require a backend server; all logic SHALL execute entirely in the browser.
3. THE App SHALL work correctly in the stable versions of Chrome, Firefox, Edge, and Safari current at the time of release, with all core features (form submission, transaction list, balance display, chart) rendering and functioning without JavaScript errors.
4. THE App SHALL contain exactly one CSS file located at `css/styles.css` and exactly one JavaScript file located at `js/app.js`.
5. THE App SHALL load Chart.js from a public CDN using a pinned version URL (e.g., `https://cdn.jsdelivr.net/npm/chart.js`) without requiring a local installation.
6. IF the Chart.js CDN fails to load, THEN THE App SHALL display a visible fallback message in the chart area indicating that the chart is unavailable, and all other app features (form, list, balance) SHALL remain fully functional.
