# MoneyKeeper frontend

React + TypeScript + Vite dashboard using the Obsidian Finance design system.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- Backend API running at http://127.0.0.1:8000

## Run locally

From the repository root:

    cd frontend
    npm install
    npm run dev

Open http://127.0.0.1:5173.

The API base URL defaults to `http://127.0.0.1:8000`. To override it, create `.env.local` in this directory:

    VITE_API_URL=http://127.0.0.1:8000

## Authentication

The frontend supports registration, login, current-user loading, refresh-token rotation, and logout through the FastAPI authentication endpoints.

The current development client stores tokens in `sessionStorage`, so the session is cleared when the browser tab is closed. This is a development-stage approach; before production, move refresh-token handling to Secure, HttpOnly, SameSite cookies and add a production CORS allowlist.

## Navigation

- **Обзор** — balance, income/expense totals, cashflow chart, category breakdown, latest transactions.
- **Операции** — searchable history of up to 500 latest transactions, with delete action.
- **Бюджеты** — actual category spending is visible; monthly limits and budget creation are not implemented yet.
- **Карты** — account and bank-card connection is a planned feature.
- **Умная аналитика** — actual period metrics, cashflow, categories, and a basic spending observation.
- **Отчёты** — download the 500 latest loaded transactions as CSV.
- **Настройки** — profile details and sign-out.

The desktop sidebar and mobile bottom navigation use the same destinations. Selecting a destination changes the page content; the active section is highlighted.

## Transactions and dashboard data

The dashboard reads transaction records and summary data from the authenticated API. Create and delete operations are persisted in PostgreSQL and scoped to the signed-in user. The balance card shows the lifetime balance; the income, expense, chart, and category breakdown follow the selected week/month/year period. Currency is RUB in this first ledger iteration.

Editing an existing transaction, monthly budget limits, bank accounts/cards, and advanced exports are not implemented yet. Tokens are held in `sessionStorage` for local development; before production, move refresh-token handling to Secure, HttpOnly, SameSite cookies and configure a production CORS allowlist.

## Production build

    npm run build
